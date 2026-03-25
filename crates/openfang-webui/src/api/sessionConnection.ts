// Session-aware WebSocket connection manager
// Each (agentId, sessionId) pair maintains its own connection and message buffer

import { getWsBaseUrl } from '@/lib/tauri';

export type ConnectionState = 'connected' | 'disconnected' | 'reconnecting' | 'connecting';

export interface WebSocketMessage {
  type: 'message' | 'thinking' | 'tool_call' | 'tool_result' | 'error' | 'done' | 'stream' | 'step_status_change';
  payload: unknown;
  timestamp: string;
  id?: string;
  data?: unknown;
}

export interface BufferedMessage extends WebSocketMessage {
  _bufferId: string;
  _bufferTime: number;
}

interface SessionConnectionConfig {
  agentId: string;
  sessionId: string;
  maxBufferSize?: number;
  inactiveTimeoutMs?: number;
}

interface ConnectionCallbacks {
  onStateChange?: (state: ConnectionState) => void;
  onMessage?: (message: WebSocketMessage) => void;
  onError?: (error: Event) => void;
}

const DEFAULT_MAX_BUFFER_SIZE = 1000;
const DEFAULT_INACTIVE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const MAX_RECONNECT_ATTEMPTS = 5;
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 10000];

// Heartbeat configuration - keep connection alive to prevent 30min timeout
const HEARTBEAT_INTERVAL_MS = 60 * 1000; // 1 minute
const HEARTBEAT_TIMEOUT_MS = 30 * 1000; // 30 seconds

// Generate unique IDs
const generateId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;

// Session key format: "agentId:sessionId"
const makeSessionKey = (agentId: string, sessionId: string) => `${agentId}:${sessionId}`;

/**
 * Manages a single WebSocket connection for a specific (agentId, sessionId) pair.
 * Includes message buffering to prevent message loss during navigation.
 */
export class SessionConnection {
  private ws: WebSocket | null = null;
  private agentId: string;
  private sessionId: string;
  private connectionState: ConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private messageBuffer: BufferedMessage[] = [];
  private maxBufferSize: number;
  private inactiveTimeoutMs: number;
  private inactiveTimer: ReturnType<typeof setTimeout> | null = null;
  private callbacks: Set<ConnectionCallbacks> = new Set();
  private authToken: string = '';
  private wsBaseUrl: string | null = null;
  private intentionalDisconnect = false;
  private connectionId: string = '';
  private connectingPromise: Promise<void> | null = null;

  // Heartbeat
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private heartbeatTimeoutTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPongReceived = 0;

  constructor(config: SessionConnectionConfig) {
    this.agentId = config.agentId;
    this.sessionId = config.sessionId;
    this.maxBufferSize = config.maxBufferSize ?? DEFAULT_MAX_BUFFER_SIZE;
    this.inactiveTimeoutMs = config.inactiveTimeoutMs ?? DEFAULT_INACTIVE_TIMEOUT_MS;
  }

  getAgentId(): string {
    return this.agentId;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  getSessionKey(): string {
    return makeSessionKey(this.agentId, this.sessionId);
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  setAuthToken(token: string) {
    this.authToken = token;
  }

  /**
   * Subscribe to connection events
   * Returns unsubscribe function
   */
  subscribe(callbacks: ConnectionCallbacks): () => void {
    this.callbacks.add(callbacks);

    // Immediately notify of current state
    callbacks.onStateChange?.(this.connectionState);

    // Send buffered messages to new subscriber
    if (this.messageBuffer.length > 0 && callbacks.onMessage) {
      this.messageBuffer.forEach(msg => callbacks.onMessage!(msg));
    }

    return () => {
      this.callbacks.delete(callbacks);
    };
  }

  /**
   * Get all buffered messages
   */
  getBufferedMessages(): BufferedMessage[] {
    return [...this.messageBuffer];
  }

  /**
   * Clear message buffer
   */
  clearBuffer() {
    this.messageBuffer = [];
  }

  /**
   * Connect to WebSocket
   */
  async connect(): Promise<void> {
    // If already connecting, return existing promise
    if (this.connectingPromise) {
      return this.connectingPromise;
    }

    // If already connected, do nothing
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    // Cancel any inactive timeout
    if (this.inactiveTimer) {
      clearTimeout(this.inactiveTimer);
      this.inactiveTimer = null;
    }

    this.connectionId = generateId();
    this.intentionalDisconnect = false;

    this.connectingPromise = this.doConnect();
    return this.connectingPromise;
  }

  private async doConnect(): Promise<void> {
    try {
      // Get WebSocket base URL
      if (!this.wsBaseUrl) {
        this.wsBaseUrl = await getWsBaseUrl();
      }

      // Build WebSocket URL with session_id parameter
      let url = `${this.wsBaseUrl}/api/agents/${this.agentId}/ws`;
      const params = new URLSearchParams();
      if (this.authToken) {
        params.set('token', this.authToken);
      }
      // Always include session_id if available
      if (this.sessionId) {
        params.set('session_id', this.sessionId);
      }
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      console.log(`[SessionConnection:${this.getSessionKey()}] Connecting to:`, url);
      this.setConnectionState('connecting');

      this.ws = new WebSocket(url);
      const myConnectionId = this.connectionId;

      return new Promise((resolve, reject) => {
        this.ws!.onopen = () => {
          if (myConnectionId !== this.connectionId) {
            // Stale connection, ignore
            return;
          }
          console.log(`[SessionConnection:${this.getSessionKey()}] Connected`);
          this.reconnectAttempts = 0;
          this.setConnectionState('connected');
          this.startHeartbeat();
          resolve();
        };

        this.ws!.onmessage = (event) => {
          if (myConnectionId !== this.connectionId) {
            return;
          }
          // Handle pong messages for heartbeat
          if (event.data === 'pong' || (typeof event.data === 'string' && event.data.includes('"type":"pong"'))) {
            this.lastPongReceived = Date.now();
            this.clearHeartbeatTimeout();
            return;
          }
          this.handleMessage(event.data);
        };

        this.ws!.onerror = (error) => {
          if (myConnectionId !== this.connectionId) {
            return;
          }
          console.error(`[SessionConnection:${this.getSessionKey()}] Error:`, error);
          this.callbacks.forEach(cb => cb.onError?.(error));
        };

        this.ws!.onclose = (event) => {
          if (myConnectionId !== this.connectionId) {
            return;
          }
          this.stopHeartbeat();
          this.handleClose(event);
        };

        // Timeout for connection
        setTimeout(() => {
          if (this.ws?.readyState !== WebSocket.OPEN) {
            reject(new Error('Connection timeout'));
          }
        }, 10000);
      });
    } catch (error) {
      console.error(`[SessionConnection:${this.getSessionKey()}] Failed to connect:`, error);
      this.setConnectionState('disconnected');
      throw error;
    } finally {
      this.connectingPromise = null;
    }
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data) as WebSocketMessage;

      // Check for backend inactivity timeout error
      if (message.type === 'error' && typeof message.payload === 'string' &&
          message.payload.includes('Connection closed due to inactivity')) {
        console.warn(`[SessionConnection:${this.getSessionKey()}] Backend timeout detected, will reconnect`);
        // Close current connection and trigger reconnect
        this.ws?.close();
        return;
      }

      // Add to buffer with metadata
      const bufferedMessage: BufferedMessage = {
        ...message,
        _bufferId: generateId(),
        _bufferTime: Date.now(),
      };

      // Add to buffer, maintaining max size
      this.messageBuffer.push(bufferedMessage);
      if (this.messageBuffer.length > this.maxBufferSize) {
        this.messageBuffer.shift();
      }

      // Notify all subscribers
      this.callbacks.forEach(cb => cb.onMessage?.(bufferedMessage));
    } catch (e) {
      console.error(`[SessionConnection:${this.getSessionKey()}] Failed to parse message:`, e);
    }
  }

  private handleClose(event: CloseEvent) {
    console.log(`[SessionConnection:${this.getSessionKey()}] Closed, code:`, event.code, 'reason:', event.reason);
    this.ws = null;

    // Don't reconnect if intentional disconnect
    if (this.intentionalDisconnect) {
      this.setConnectionState('disconnected');
      return;
    }

    // Always attempt reconnection for unexpected closes (including backend timeout)
    // event.code 1000 = Normal closure (intentional)
    // event.code 1001 = Going away (backend timeout, server restart)
    // event.code 1006 = Abnormal closure (network issue)
    if (event.code === 1000) {
      this.setConnectionState('disconnected');
      return;
    }

    // Attempt reconnection with backoff
    this.scheduleReconnect();
  }

  /**
   * Schedule a reconnection attempt with exponential backoff
   */
  private scheduleReconnect() {
    if (this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error(`[SessionConnection:${this.getSessionKey()}] Max reconnect attempts reached`);
      this.setConnectionState('disconnected');
      return;
    }

    this.reconnectAttempts++;
    this.setConnectionState('reconnecting');

    const delay = RECONNECT_DELAYS[Math.min(this.reconnectAttempts - 1, RECONNECT_DELAYS.length - 1)];
    console.log(`[SessionConnection:${this.getSessionKey()}] Reconnecting ${this.reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      // Only reconnect if we still have subscribers (someone cares about this connection)
      if (this.callbacks.size > 0) {
        this.connect().catch((err) => {
          console.error(`[SessionConnection:${this.getSessionKey()}] Reconnect failed:`, err);
          // Will retry on next schedule if attempts remain
        });
      } else {
        console.log(`[SessionConnection:${this.getSessionKey()}] Skipping reconnect - no subscribers`);
        this.setConnectionState('disconnected');
      }
    }, delay);
  }

  private setConnectionState(state: ConnectionState) {
    if (this.connectionState === state) return;
    this.connectionState = state;
    this.callbacks.forEach(cb => cb.onStateChange?.(state));
  }

  /**
   * Send data through WebSocket
   */
  send(data: unknown): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  /**
   * Disconnect WebSocket
   */
  disconnect(immediate = false) {
    this.intentionalDisconnect = true;
    this.connectionId = ''; // Invalidate current connection

    this.stopHeartbeat();

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      try {
        this.ws.close(1000, 'Disconnect requested');
      } catch {
        // Ignore errors
      }
      this.ws = null;
    }

    this.setConnectionState('disconnected');

    // Start inactive timer for cleanup
    if (!immediate) {
      this.inactiveTimer = setTimeout(() => {
        // This will be checked by SessionConnectionManager for cleanup
      }, this.inactiveTimeoutMs);
    }
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat() {
    this.stopHeartbeat();
    this.lastPongReceived = Date.now();

    // Send ping every HEARTBEAT_INTERVAL_MS
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // Send a lightweight ping message
        this.ws.send(JSON.stringify({ type: 'ping' }));

        // Set timeout to detect if pong is not received
        this.heartbeatTimeoutTimer = setTimeout(() => {
          const timeSinceLastPong = Date.now() - this.lastPongReceived;
          if (timeSinceLastPong > HEARTBEAT_TIMEOUT_MS + 5000) {
            console.warn(`[SessionConnection:${this.getSessionKey()}] Heartbeat timeout, closing connection`);
            this.ws?.close();
          }
        }, HEARTBEAT_TIMEOUT_MS);
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop heartbeat
   */
  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    this.clearHeartbeatTimeout();
  }

  /**
   * Clear heartbeat timeout
   */
  private clearHeartbeatTimeout() {
    if (this.heartbeatTimeoutTimer) {
      clearTimeout(this.heartbeatTimeoutTimer);
      this.heartbeatTimeoutTimer = null;
    }
  }

  /**
   * Check if connection is active (has subscribers or recently used)
   */
  isActive(): boolean {
    return this.callbacks.size > 0 || this.connectionState === 'connected';
  }

  /**
   * Force reconnection
   */
  async reconnect(): Promise<void> {
    this.disconnect(true);
    this.intentionalDisconnect = false;
    this.reconnectAttempts = 0;
    return this.connect();
  }
}

/**
 * Singleton manager for all session connections.
 * Maintains a pool of SessionConnections keyed by (agentId, sessionId).
 */
class SessionConnectionManager {
  private connections: Map<string, SessionConnection> = new Map();
  private authToken: string = '';
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;
  private onlineHandler: (() => void) | null = null;

  constructor() {
    // Start periodic cleanup of inactive connections
    this.cleanupInterval = setInterval(() => {
      this.cleanupInactiveConnections();
    }, 60000); // Every minute

    // Setup network status monitoring for automatic reconnect
    this.setupNetworkMonitoring();
  }

  /**
   * Setup network status monitoring to reconnect when coming back online
   */
  private setupNetworkMonitoring() {
    if (typeof window === 'undefined') return;

    this.onlineHandler = () => {
      console.log('[SessionConnectionManager] Network is back online, checking connections...');
      this.connections.forEach((connection, key) => {
        // Only reconnect if there are subscribers and currently disconnected
        if (connection.getConnectionState() === 'disconnected') {
          console.log(`[SessionConnectionManager] Auto-reconnecting ${key}`);
          connection.connect().catch((err) => {
            console.error(`[SessionConnectionManager] Auto-reconnect failed for ${key}:`, err);
          });
        }
      });
    };

    window.addEventListener('online', this.onlineHandler);
  }

  setAuthToken(token: string) {
    this.authToken = token;
    // Update all existing connections
    this.connections.forEach(conn => conn.setAuthToken(token));
  }

  /**
   * Get or create a session connection
   */
  getConnection(agentId: string, sessionId: string): SessionConnection {
    const key = makeSessionKey(agentId, sessionId);

    let connection = this.connections.get(key);
    if (!connection) {
      connection = new SessionConnection({
        agentId,
        sessionId,
      });
      connection.setAuthToken(this.authToken);
      this.connections.set(key, connection);
      console.log(`[SessionConnectionManager] Created connection for ${key}`);
    }

    return connection;
  }

  /**
   * Get existing connection without creating
   */
  getExistingConnection(agentId: string, sessionId: string): SessionConnection | undefined {
    return this.connections.get(makeSessionKey(agentId, sessionId));
  }

  /**
   * Release a connection (mark for potential cleanup)
   */
  releaseConnection(agentId: string, sessionId: string) {
    const key = makeSessionKey(agentId, sessionId);
    const connection = this.connections.get(key);
    if (connection) {
      connection.disconnect();
    }
  }

  /**
   * Remove a connection completely
   */
  removeConnection(agentId: string, sessionId: string) {
    const key = makeSessionKey(agentId, sessionId);
    const connection = this.connections.get(key);
    if (connection) {
      connection.disconnect(true);
      this.connections.delete(key);
      console.log(`[SessionConnectionManager] Removed connection for ${key}`);
    }
  }

  /**
   * Subscribe to a session's messages
   * Returns unsubscribe function
   */
  subscribeToSession(
    agentId: string,
    sessionId: string,
    callbacks: ConnectionCallbacks
  ): () => void {
    const connection = this.getConnection(agentId, sessionId);

    // Ensure connection is established
    if (connection.getConnectionState() === 'disconnected') {
      connection.connect().catch(err => {
        console.error(`[SessionConnectionManager] Failed to connect ${agentId}:${sessionId}:`, err);
      });
    }

    return connection.subscribe(callbacks);
  }

  /**
   * Send message to a session
   */
  sendToSession(agentId: string, sessionId: string, data: unknown): boolean {
    const connection = this.getExistingConnection(agentId, sessionId);
    if (connection) {
      return connection.send(data);
    }
    return false;
  }

  /**
   * Get buffered messages for a session
   */
  getBufferedMessages(agentId: string, sessionId: string): BufferedMessage[] {
    const connection = this.getExistingConnection(agentId, sessionId);
    return connection?.getBufferedMessages() ?? [];
  }

  /**
   * Clear buffered messages for a session
   */
  clearBuffer(agentId: string, sessionId: string) {
    const connection = this.getExistingConnection(agentId, sessionId);
    connection?.clearBuffer();
  }

  /**
   * Reconnect a specific session
   */
  async reconnectSession(agentId: string, sessionId: string): Promise<void> {
    const connection = this.getConnection(agentId, sessionId);
    return connection.reconnect();
  }

  /**
   * Disconnect all connections for an agent
   */
  disconnectAgent(agentId: string) {
    this.connections.forEach((connection, key) => {
      if (key.startsWith(`${agentId}:`)) {
        connection.disconnect();
      }
    });
  }

  /**
   * Cleanup inactive connections (no subscribers and disconnected)
   */
  private cleanupInactiveConnections() {
    const now = Date.now();
    const toRemove: string[] = [];

    this.connections.forEach((connection, key) => {
      if (!connection.isActive() && connection.getConnectionState() === 'disconnected') {
        toRemove.push(key);
      }
    });

    toRemove.forEach(key => {
      this.connections.delete(key);
      console.log(`[SessionConnectionManager] Cleaned up inactive connection ${key}`);
    });
  }

  /**
   * Get stats for debugging
   */
  getStats(): { total: number; active: number; connected: number } {
    let active = 0;
    let connected = 0;

    this.connections.forEach(conn => {
      if (conn.isActive()) active++;
      if (conn.getConnectionState() === 'connected') connected++;
    });

    return {
      total: this.connections.size,
      active,
      connected,
    };
  }

  /**
   * Destroy manager and cleanup all connections
   */
  destroy() {
    // Remove network listener
    if (this.onlineHandler && typeof window !== 'undefined') {
      window.removeEventListener('online', this.onlineHandler);
      this.onlineHandler = null;
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.connections.forEach(connection => {
      connection.disconnect(true);
    });
    this.connections.clear();
  }
}

// Singleton instance
export const sessionConnectionManager = new SessionConnectionManager();

export default sessionConnectionManager;
