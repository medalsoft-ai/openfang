import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  HealthStatus, Agent, Session, Message,
  Channel, Skill, Workflow, Config, UsageStats
} from './types';
import { getApiBaseUrl, getWsBaseUrl } from '@/lib/tauri';

// Global auth error event
let authErrorCallback: (() => void) | null = null;

export function setAuthErrorCallback(callback: (() => void) | null) {
  authErrorCallback = callback;
}

class APIClient {
  private client: AxiosInstance | null = null;
  private authToken: string = '';
  private baseUrl: string = '';
  private initialized: boolean = false;

  constructor() {
    // Defer initialization until first use to allow async port detection
  }

  private async init() {
    if (this.initialized) return;

    // Get base URL (empty for Vite proxy, full URL for Tauri)
    this.baseUrl = await getApiBaseUrl();

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.client.interceptors.request.use((config) => {
      if (this.authToken) {
        config.headers.Authorization = `Bearer ${this.authToken}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          const status = error.response.status;
          // Trigger auth prompt on 401
          if (status === 401 && authErrorCallback) {
            authErrorCallback();
          }
          const data = error.response.data as { error?: string };
          const message = data?.error || this.friendlyError(status);
          throw new Error(message);
        }
        if (error.request) {
          throw new Error('Cannot reach daemon — is openfang running?');
        }
        throw error;
      }
    );

    this.initialized = true;
  }

  setAuthToken(token: string) {
    this.authToken = token;
    wsManager.setToken(token);
  }

  // Generic request methods
  private async ensureClient(): Promise<AxiosInstance> {
    if (!this.initialized) {
      await this.init();
    }
    if (!this.client) {
      throw new Error('API client not initialized');
    }
    return this.client;
  }

  async get<T = unknown>(path: string): Promise<T> {
    const client = await this.ensureClient();
    const { data } = await client.get<T>(path);
    return data;
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const client = await this.ensureClient();
    const { data } = await client.post<T>(path, body);
    return data;
  }

  async put<T = unknown>(path: string, body?: unknown): Promise<T> {
    const client = await this.ensureClient();
    const { data } = await client.put<T>(path, body);
    return data;
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const client = await this.ensureClient();
    const { data } = await client.patch<T>(path, body);
    return data;
  }

  async del<T = unknown>(path: string): Promise<T> {
    const client = await this.ensureClient();
    const { data } = await client.delete<T>(path);
    return data;
  }

  private friendlyError(status: number): string {
    switch (status) {
      case 401: return 'Not authorized — check your API key';
      case 403: return 'Permission denied';
      case 404: return 'Resource not found';
      case 429: return 'Rate limited — slow down and try again';
      case 413: return 'Request too large';
      case 500: return 'Server error — check daemon logs';
      case 502:
      case 503: return 'Daemon unavailable — is it running?';
      default: return `Unexpected error (${status})`;
    }
  }

  // Health & Status
  async health(): Promise<HealthStatus> {
    return this.get('/api/health');
  }

  async status(): Promise<unknown> {
    return this.get('/api/status');
  }

  // Agents
  async listAgents(): Promise<Agent[]> {
    return this.get('/api/agents');
  }

  async getAgent(id: string): Promise<Agent> {
    return this.get(`/api/agents/${id}`);
  }

  async createAgent(agent: Partial<Agent>): Promise<Agent> {
    return this.post('/api/agents', agent);
  }

  async updateAgent(id: string, agent: Partial<Agent>): Promise<Agent> {
    return this.patch(`/api/agents/${id}`, agent);
  }

  async deleteAgent(id: string): Promise<void> {
    await this.del(`/api/agents/${id}`);
  }

  async spawnAgent(id: string): Promise<void> {
    await this.post(`/api/agents/${id}/spawn`);
  }

  async pauseAgent(id: string): Promise<void> {
    await this.post(`/api/agents/${id}/pause`);
  }

  async resumeAgent(id: string): Promise<void> {
    await this.post(`/api/agents/${id}/resume`);
  }

  async stopAgent(id: string): Promise<void> {
    await this.post(`/api/agents/${id}/stop`);
  }

  // Messages
  async sendMessage(agentId: string, message: string): Promise<Message> {
    return this.post(`/api/agents/${agentId}/message`, { message });
  }

  async getMessages(agentId: string, sessionId?: string): Promise<Message[]> {
    const params = sessionId ? `?session_id=${sessionId}` : '';
    return this.get(`/api/agents/${agentId}/messages${params}`);
  }

  // Sessions
  async listSessions(): Promise<Session[]> {
    const res = await this.get<{sessions: Session[]}>('/api/sessions');
    return res.sessions || [];
  }

  async listAgentSessions(agentId: string): Promise<Session[]> {
    const res = await this.get<{sessions: Session[]}>('/api/agents/' + agentId + '/sessions');
    return res.sessions || [];
  }

  async getAgentSession(agentId: string): Promise<{ messages: unknown[] }> {
    return this.get('/api/agents/' + agentId + '/session');
  }

  async createSession(agentId: string, title?: string): Promise<Session> {
    return this.post('/api/sessions', { agent_id: agentId, title });
  }

  async deleteSession(id: string): Promise<void> {
    await this.del(`/api/sessions/${id}`);
  }

  // Channels
  async listChannels(): Promise<Channel[]> {
    const res = await this.get<{channels: Channel[]}>('/api/channels');
    return res.channels || [];
  }

  // Skills
  async listSkills(): Promise<Skill[]> {
    const res = await this.get<{skills: Skill[]}>('/api/skills');
    return res.skills || [];
  }

  // Workflows
  async listWorkflows(): Promise<Workflow[]> {
    return this.get('/api/workflows');
  }

  // Config
  async getConfig(): Promise<Config> {
    return this.get('/api/config');
  }

  async updateConfig(config: Partial<Config>): Promise<Config> {
    return this.post('/api/config/set', config);
  }

  // Usage
  async getUsage(): Promise<UsageStats> {
    return this.get('/api/usage');
  }

  // Upload
  async upload(agentId: string, file: File): Promise<{ file_id: string; filename: string; content_type: string; size: number; transcription?: string }> {
    const formData = new FormData();
    formData.append('file', file);

    const client = await this.ensureClient();
    const { data } = await client.post(`/api/agents/${agentId}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'X-Filename': file.name,
      },
    });
    return data;
  }

  // Agent extended operations (from Alpine agents.js)
  async createAgentFromTOML(manifest_toml: string): Promise<{ agent_id: string; name?: string }> {
    return this.post('/api/agents', { manifest_toml });
  }

  async updateAgentConfig(id: string, config: Record<string, unknown>): Promise<void> {
    await this.patch(`/api/agents/${id}/config`, config);
  }

  async listAgentFiles(id: string): Promise<{ files: Array<{ name: string; exists: boolean }> }> {
    return this.get(`/api/agents/${id}/files`);
  }

  async getAgentFile(id: string, filename: string): Promise<{ content: string }> {
    return this.get(`/api/agents/${id}/files/${encodeURIComponent(filename)}`);
  }

  async saveAgentFile(id: string, filename: string, content: string): Promise<void> {
    await this.put(`/api/agents/${id}/files/${encodeURIComponent(filename)}`, { content });
  }

  async getAgentTools(id: string): Promise<{ tool_allowlist: string[]; tool_blocklist: string[] }> {
    return this.get(`/api/agents/${id}/tools`);
  }

  async updateAgentTools(id: string, filters: { tool_allowlist: string[]; tool_blocklist: string[] }): Promise<void> {
    await this.put(`/api/agents/${id}/tools`, filters);
  }

  async changeAgentModel(id: string, model: string): Promise<void> {
    await this.put(`/api/agents/${id}/model`, { model });
  }

  async cloneAgent(id: string, newName: string): Promise<{ agent_id: string; name: string }> {
    return this.post(`/api/agents/${id}/clone`, { new_name: newName });
  }

  async clearAgentHistory(id: string): Promise<void> {
    await this.del(`/api/agents/${id}/history`);
  }

  // Templates
  async listTemplates(): Promise<{ templates: Array<{ name: string; description?: string; category?: string; manifest_toml?: string }> }> {
    return this.get('/api/templates');
  }

  async getTemplate(name: string): Promise<{ manifest_toml: string }> {
    return this.get(`/api/templates/${encodeURIComponent(name)}`);
  }

  // Profiles
  async listProfiles(): Promise<{ profiles: Array<{ name: string; tools: string[] }> }> {
    return this.get('/api/profiles');
  }

  // Providers
  async listProviders(): Promise<{ providers: Array<{ id: string; display_name: string; auth_status: string; health?: string }> }> {
    return this.get('/api/providers');
  }

  /**
   * Get the current base URL (for debugging)
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}

type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

interface ConnectionCallbacks {
  onStateChange?: (state: ConnectionState) => void;
  onError?: (error: Event) => void;
}

// WebSocket Manager for real-time streaming
class WebSocketManager {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageHandlers: ((data: unknown) => void)[] = [];
  private agentId: string | null = null;
  private token: string = '';
  private connectionState: ConnectionState = 'disconnected';
  private callbacks: ConnectionCallbacks = {};
  private wasConnected = false;

  setToken(token: string) {
    this.token = token;
  }

  getConnectionState(): ConnectionState {
    return this.connectionState;
  }

  private setConnectionState(state: ConnectionState) {
    console.log('[WebSocket] Connection state changed to:', state);
    this.connectionState = state;
    this.callbacks.onStateChange?.(state);
  }

  private wsReadyPromise: Promise<void> | null = null;

  private connectingPromise: Promise<void> | null = null;

  async connect(
    agentId: string,
    onMessage: (data: unknown) => void,
    callbacks?: ConnectionCallbacks
  ) {
    // Prevent duplicate connections to the same agent
    if (this.agentId === agentId) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.messageHandlers.push(onMessage);
        return;
      }
      // If already connecting, wait for it
      if (this.ws?.readyState === WebSocket.CONNECTING && this.connectingPromise) {
        this.messageHandlers.push(onMessage);
        if (callbacks?.onStateChange) {
          this.callbacks.onStateChange = callbacks.onStateChange;
        }
        return;
      }
    }

    // Disconnect existing connection before creating new one
    if (this.ws) {
      this.disconnect();
    }

    this.agentId = agentId;
    this.messageHandlers = [onMessage];
    this.callbacks = callbacks || {};
    this.reconnectAttempts = 0;
    this.setConnectionState('connecting');

    const wsBaseUrl = await getWsBaseUrl();
    let wsUrl = `${wsBaseUrl}/api/agents/${agentId}/ws`;
    if (this.token) {
      wsUrl += '?token=' + encodeURIComponent(this.token);
    }

    console.log('[WebSocket] Connecting to:', wsUrl);

    try {
      this.ws = new WebSocket(wsUrl);
      console.log('[WebSocket] WebSocket created, readyState:', this.ws.readyState);

      // Create a promise that resolves when connection is open
      this.wsReadyPromise = new Promise((resolve) => {
        this.ws!.onopen = () => {
          console.log('[WebSocket] Connection opened');
          this.reconnectAttempts = 0;
          this.wasConnected = true;
          this.setConnectionState('connected');
          resolve();
        };
      });
      this.connectingPromise = this.wsReadyPromise;

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.messageHandlers.forEach(handler => handler(data));
        } catch (e) {
          console.error('Failed to parse WebSocket message:', e);
        }
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        this.callbacks.onError?.(error);
      };

      this.ws.onclose = () => {
        console.log('[WebSocket] Connection closed');
        this.connectingPromise = null;
        this.wsReadyPromise = null;
        this.attemptReconnect();
      };
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.setConnectionState('disconnected');
    }
  }

  private async attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.agentId) {
      this.reconnectAttempts++;
      this.setConnectionState('reconnecting');
      setTimeout(async () => {
        console.log(`Attempting reconnect ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        const handler = this.messageHandlers[0];
        if (handler) {
          await this.connect(this.agentId!, handler, this.callbacks);
        }
      }, this.reconnectDelay * this.reconnectAttempts);
    } else if (this.wasConnected) {
      this.setConnectionState('disconnected');
    }
  }

  async waitForConnection(timeout = 5000): Promise<boolean> {
    console.log('[WebSocket] waitForConnection called, ws state:', this.ws?.readyState);
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('[WebSocket] Already connected');
      return true;
    }

    // If WebSocket is in CONNECTING state, wait for it
    const promiseToWait = this.ws?.readyState === WebSocket.CONNECTING
      ? this.connectingPromise
      : this.wsReadyPromise;

    if (promiseToWait) {
      console.log('[WebSocket] Waiting for connection to establish...');
      const timeoutPromise = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('WebSocket connection timeout')), timeout)
      );

      try {
        await Promise.race([promiseToWait, timeoutPromise]);
        console.log('[WebSocket] Connection established after waiting');
        return true;
      } catch {
        console.log('[WebSocket] Connection timeout');
        return false;
      }
    }

    console.log('[WebSocket] No active WebSocket connection');
    return false;
  }

  send(data: unknown): boolean {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }

  disconnect() {
    this.messageHandlers = [];
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.wsReadyPromise = null;
    this.connectingPromise = null;
    this.agentId = null;
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}

export const wsManager = new WebSocketManager();

// Extended API methods
class ExtendedAPIClient extends APIClient {
  // Models
  async listModels(): Promise<{ models: Array<{
    id: string;
    display_name?: string;
    provider: string;
    available: boolean;
    tier?: string;
    context_window?: number;
    supports_vision?: boolean;
    supports_tools?: boolean;
  }> }> {
    return this.get('/api/models');
  }

  // Agent commands
  async sendCommand(agentId: string, command: string, args?: string): Promise<unknown> {
    return this.post(`/api/agents/${agentId}/command`, { command, args });
  }

  async stopAgentRun(agentId: string): Promise<void> {
    await this.post(`/api/agents/${agentId}/stop`);
  }

  async resetSession(agentId: string): Promise<void> {
    await this.post(`/api/agents/${agentId}/session/reset`);
  }

  async compactSession(agentId: string): Promise<{ message: string }> {
    return this.post(`/api/agents/${agentId}/session/compact`);
  }

  // Budget
  async getBudget(): Promise<{
    hourly_spend: number;
    hourly_limit: number;
    daily_spend: number;
    daily_limit: number;
    monthly_spend: number;
    monthly_limit: number;
  }> {
    return this.get('/api/budget');
  }

  // Network
  async getNetworkStatus(): Promise<{
    enabled: boolean;
    connected_peers: number;
    total_peers: number;
  }> {
    return this.get('/api/network/status');
  }

  // A2A Agents
  async listA2AAgents(): Promise<{ agents: Array<{ name: string; url: string }> }> {
    return this.get('/api/a2a/agents');
  }

  // Commands
  async listCommands(): Promise<{ commands: Array<{ cmd: string; desc: string; source?: string }> }> {
    return this.get('/api/commands');
  }
}

export const api = new ExtendedAPIClient();
export default api;
