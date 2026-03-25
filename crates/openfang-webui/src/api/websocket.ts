import { useEffect, useRef, useState, useCallback } from 'react';
import { getWsBaseUrl } from '@/lib/tauri';

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketMessage {
  type: 'message' | 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'done' | 'step_status_change';
  payload: unknown;
  timestamp: string;
  data?: unknown;
}

export interface WebSocketCallbacks {
  onOpen?: () => void;
  onMessage?: (data: WebSocketMessage) => void;
  onClose?: () => void;
  onError?: (error?: Event) => void;
  /** @deprecated Use connection state listeners instead */
  onStateChange?: (state: ConnectionState) => void;
}

const MAX_RECONNECT = 5;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 10000];

class WebSocketManager {
  private ws: WebSocket | null = null;
  private agentId: string | null = null;
  private callbacks: WebSocketCallbacks = {};
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private connectionState: ConnectionState = 'disconnected';
  private listeners: Set<(state: ConnectionState) => void> = new Set();
  private authToken: string = '';
  private wsBaseUrl: string | null = null;
  private intentionalDisconnect = false;

  setAuthToken(token: string) {
    this.authToken = token;
  }

  async connect(
    agentId: string,
    onMessageOrCallbacks: WebSocketCallbacks | ((data: unknown) => void),
    legacyCallbacks?: WebSocketCallbacks
  ) {
    this.disconnect();
    this.agentId = agentId;
    this.reconnectAttempts = 0;
    this.intentionalDisconnect = false;

    // Support both old API: connect(agentId, onMessage, callbacks?) and new API: connect(agentId, callbacks)
    if (typeof onMessageOrCallbacks === 'function') {
      // Old API
      this.callbacks = {
        onMessage: legacyCallbacks?.onMessage ?? onMessageOrCallbacks as (data: WebSocketMessage) => void,
        onOpen: legacyCallbacks?.onOpen,
        onClose: legacyCallbacks?.onClose,
        onError: legacyCallbacks?.onError,
      };
    } else {
      // New API
      this.callbacks = onMessageOrCallbacks;
    }

    await this.doConnect();
  }

  private async doConnect() {
    if (!this.agentId) return;

    try {
      // Get WebSocket base URL (dynamic for Tauri, from window.location for dev)
      if (!this.wsBaseUrl) {
        this.wsBaseUrl = await getWsBaseUrl();
      }

      let url = `${this.wsBaseUrl}/api/agents/${this.agentId}/ws`;
      if (this.authToken) {
        url += `?token=${encodeURIComponent(this.authToken)}`;
      }

      console.log('[WebSocket] Connecting to:', url);
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setConnectionState('connected');
        this.callbacks.onOpen?.();
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WebSocketMessage;
          this.callbacks.onMessage?.(data);
        } catch {
          // Ignore parse errors
        }
      };

      this.ws.onclose = (event) => {
        const wasIntentional = this.intentionalDisconnect;
        this.ws = null;

        // Don't reconnect if this was an intentional disconnect (e.g., switching agents)
        if (wasIntentional || event.code === 1000) {
          this.setConnectionState('disconnected');
          this.callbacks.onClose?.();
          return;
        }

        // Attempt reconnection if not clean close and under max attempts
        if (this.agentId && this.reconnectAttempts < MAX_RECONNECT) {
          this.reconnectAttempts++;
          this.setConnectionState('reconnecting');

          const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempts - 1, RECONNECT_DELAYS.length - 1)];
          this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
          return;
        }

        this.setConnectionState('disconnected');
        this.callbacks.onClose?.();
      };

      this.ws.onerror = () => {
        this.callbacks.onError?.();
      };
    } catch {
      this.setConnectionState('disconnected');
    }
  }

  disconnect() {
    // Mark as intentional disconnect to prevent reconnection attempts
    this.intentionalDisconnect = true;
    this.agentId = null;
    this.reconnectAttempts = MAX_RECONNECT;
    this.wsBaseUrl = null;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      // Use code 1000 for normal closure
      this.ws.close(1000);
      this.ws = null;
    }

    this.setConnectionState('disconnected');
  }

  send(data: unknown): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  isConnected(): boolean {
    return this.connectionState === 'connected';
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.listeners.forEach((fn) => fn(state));
    // Call legacy onStateChange callback for backward compatibility
    this.callbacks.onStateChange?.(state);
  }

  onConnectionChange(fn: (state: ConnectionState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

export const wsManager = new WebSocketManager();

// React hook for WebSocket
export function useWebSocket(agentId: string | null, callbacks: WebSocketCallbacks) {
  const callbacksRef = useRef(callbacks);
  callbacksRef.current = callbacks;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  useEffect(() => {
    if (!agentId) {
      wsManager.disconnect();
      return;
    }

    wsManager.connect(agentId, {
      onOpen: () => callbacksRef.current.onOpen?.(),
      onMessage: (data) => callbacksRef.current.onMessage?.(data),
      onClose: () => callbacksRef.current.onClose?.(),
      onError: () => callbacksRef.current.onError?.(),
    });

    const unsubscribe = wsManager.onConnectionChange(setConnectionState);

    return () => {
      unsubscribe();
      wsManager.disconnect();
    };
  }, [agentId]);

  const send = useCallback((data: unknown) => {
    return wsManager.send(data);
  }, []);

  return { connectionState, send };
}

export default wsManager;
