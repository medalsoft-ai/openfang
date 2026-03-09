import { useEffect, useRef, useState, useCallback } from 'react';
import { getWsBaseUrl } from '@/lib/tauri';

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketMessage {
  type: 'message' | 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'done';
  payload: unknown;
  timestamp: string;
}

export interface WebSocketCallbacks {
  onOpen?: () => void;
  onMessage?: (data: WebSocketMessage) => void;
  onClose?: () => void;
  onError?: () => void;
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

  setAuthToken(token: string) {
    this.authToken = token;
  }

  async connect(agentId: string, callbacks: WebSocketCallbacks) {
    this.disconnect();
    this.agentId = agentId;
    this.callbacks = callbacks;
    this.reconnectAttempts = 0;
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
        this.ws = null;

        // Attempt reconnection if not clean close and under max attempts
        if (this.agentId && this.reconnectAttempts < MAX_RECONNECT && event.code !== 1000) {
          this.reconnectAttempts++;
          this.setConnectionState('reconnecting');

          const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempts - 1, RECONNECT_DELAYS.length - 1)];
          this.reconnectTimer = setTimeout(() => this.doConnect(), delay);
          return;
        }

        if (this.reconnectAttempts >= MAX_RECONNECT) {
          this.setConnectionState('disconnected');
        }

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
    this.agentId = null;
    this.reconnectAttempts = MAX_RECONNECT;
    this.wsBaseUrl = null;

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
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
