// React hook for session-aware WebSocket connections
// Each (agentId, sessionId) pair maintains independent connection state

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  sessionConnectionManager,
  type ConnectionState,
  type WebSocketMessage,
  type BufferedMessage,
} from '@/api/sessionConnection';

export interface UseSessionWebSocketOptions {
  agentId: string | null;
  sessionId: string | null;
  /** Auto-connect on mount if true (default) */
  autoConnect?: boolean;
  /** Callback when connection state changes */
  onConnectionChange?: (state: ConnectionState) => void;
  /** Callback when new message arrives */
  onMessage?: (message: WebSocketMessage) => void;
  /** Callback on error */
  onError?: (error: Event) => void;
}

export interface UseSessionWebSocketReturn {
  /** Current connection state */
  connectionState: ConnectionState;
  /** Whether currently connected */
  isConnected: boolean;
  /** Send data through the WebSocket */
  sendMessage: (data: unknown) => boolean;
  /** Manually connect (if not auto-connecting) */
  connect: () => Promise<void>;
  /** Manually disconnect */
  disconnect: () => void;
  /** Reconnect the session */
  reconnect: () => Promise<void>;
  /** Get all buffered messages */
  getBufferedMessages: () => BufferedMessage[];
  /** Clear message buffer */
  clearBuffer: () => void;
}

/**
 * React hook for session-aware WebSocket connections.
 *
 * Features:
 * - Independent connections per (agentId, sessionId) pair
 * - Message buffering while disconnected or on other pages
 * - Automatic reconnection with exponential backoff
 * - Page visibility handling (restore connection when tab becomes visible)
 * - Cleanup on unmount (connection stays alive for session restoration)
 *
 * @example
 * ```tsx
 * const { connectionState, sendMessage, isConnected } = useSessionWebSocket({
 *   agentId: 'agent-123',
 *   sessionId: 'session-456',
 *   onMessage: (msg) => console.log('Received:', msg),
 * });
 * ```
 */
export function useSessionWebSocket(options: UseSessionWebSocketOptions): UseSessionWebSocketReturn {
  const {
    agentId,
    sessionId,
    autoConnect = true,
    onConnectionChange,
    onMessage,
    onError,
  } = options;

  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');

  // Use refs to avoid re-subscribing when callbacks change
  const callbacksRef = useRef({
    onConnectionChange,
    onMessage,
    onError,
  });

  // Keep callbacks ref up to date
  useEffect(() => {
    callbacksRef.current = {
      onConnectionChange,
      onMessage,
      onError,
    };
  }, [onConnectionChange, onMessage, onError]);

  // Track current agent/session to detect changes
  const sessionRef = useRef({ agentId, sessionId });

  // Main subscription effect
  useEffect(() => {
    sessionRef.current = { agentId, sessionId };

    if (!agentId || !sessionId) {
      setConnectionState('disconnected');
      return;
    }

    // Subscribe to this session
    const unsubscribe = sessionConnectionManager.subscribeToSession(
      agentId,
      sessionId,
      {
        onStateChange: (state) => {
          setConnectionState(state);
          callbacksRef.current.onConnectionChange?.(state);
        },
        onMessage: (message) => {
          callbacksRef.current.onMessage?.(message);
        },
        onError: (error) => {
          callbacksRef.current.onError?.(error);
        },
      }
    );

    // If not auto-connecting, don't force connection
    if (!autoConnect) {
      const conn = sessionConnectionManager.getExistingConnection(agentId, sessionId);
      if (conn) {
        setConnectionState(conn.getConnectionState());
      }
    }

    return () => {
      unsubscribe();
    };
  }, [agentId, sessionId, autoConnect]);

  // Page visibility handling - restore connection when tab becomes visible
  useEffect(() => {
    if (!agentId || !sessionId) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const connection = sessionConnectionManager.getExistingConnection(agentId, sessionId);
        const currentState = connection?.getConnectionState();

        // Reconnect if disconnected or in error state
        if (!connection || currentState === 'disconnected') {
          console.log('[useSessionWebSocket] Page visible, reconnecting...');
          sessionConnectionManager.reconnectSession(agentId, sessionId).catch((err) => {
            console.error('[useSessionWebSocket] Failed to reconnect on visibility change:', err);
          });
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [agentId, sessionId]);

  // Send message callback
  const sendMessage = useCallback((data: unknown): boolean => {
    if (!agentId || !sessionId) return false;
    return sessionConnectionManager.sendToSession(agentId, sessionId, data);
  }, [agentId, sessionId]);

  // Manual connect
  const connect = useCallback(async (): Promise<void> => {
    if (!agentId || !sessionId) {
      throw new Error('agentId and sessionId are required');
    }
    const connection = sessionConnectionManager.getConnection(agentId, sessionId);
    return connection.connect();
  }, [agentId, sessionId]);

  // Manual disconnect
  const disconnect = useCallback((): void => {
    if (!agentId || !sessionId) return;
    sessionConnectionManager.releaseConnection(agentId, sessionId);
  }, [agentId, sessionId]);

  // Reconnect
  const reconnect = useCallback(async (): Promise<void> => {
    if (!agentId || !sessionId) {
      throw new Error('agentId and sessionId are required');
    }
    return sessionConnectionManager.reconnectSession(agentId, sessionId);
  }, [agentId, sessionId]);

  // Get buffered messages
  const getBufferedMessages = useCallback((): BufferedMessage[] => {
    if (!agentId || !sessionId) return [];
    return sessionConnectionManager.getBufferedMessages(agentId, sessionId);
  }, [agentId, sessionId]);

  // Clear buffer
  const clearBuffer = useCallback((): void => {
    if (!agentId || !sessionId) return;
    sessionConnectionManager.clearBuffer(agentId, sessionId);
  }, [agentId, sessionId]);

  return {
    connectionState,
    isConnected: connectionState === 'connected',
    sendMessage,
    connect,
    disconnect,
    reconnect,
    getBufferedMessages,
    clearBuffer,
  };
}

export default useSessionWebSocket;
