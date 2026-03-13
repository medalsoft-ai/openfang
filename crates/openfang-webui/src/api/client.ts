import axios, { AxiosError, AxiosInstance } from 'axios';
import type {
  HealthStatus, Agent, Session, Message,
  Channel, Skill, Workflow, Config, UsageStats,
  AgentDetail, AgentFile, ToolFilters,
  ClawHubSkill, ClawHubSearchResult, ClawHubBrowseResult, SkillDetail,
  McpServersResponse,
  Hand, HandInstance, HandStats, HandBrowserState, InstallDepsResponse,
  Profile, Template, Provider
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

  async pauseAgent(id: string): Promise<void> {
    await this.post(`/api/agents/${id}/pause`);
  }

  async resumeAgent(id: string): Promise<void> {
    await this.post(`/api/agents/${id}/resume`);
  }

  async stopAgent(id: string): Promise<void> {
    await this.del(`/api/agents/${id}`);
  }

  // Messages
  async sendMessage(agentId: string, message: string, sessionId?: string): Promise<Message> {
    const body: { message: string; session_id?: string } = { message };
    if (sessionId) body.session_id = sessionId;
    return this.post(`/api/agents/${agentId}/message`, body);
  }

  async getMessages(agentId: string, _sessionId?: string): Promise<Message[]> {
    // Backend uses /session endpoint, not /messages
    const res = await this.get<{ messages: Message[] }>(`/api/agents/${agentId}/session`);
    return res.messages || [];
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
    return this.post(`/api/agents/${agentId}/sessions`, { title });
  }

  async deleteSession(id: string): Promise<void> {
    await this.del(`/api/sessions/${id}`);
  }

  async switchSession(agentId: string, sessionId: string): Promise<void> {
    await this.post(`/api/agents/${agentId}/sessions/${sessionId}/switch`, {});
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

  async setAgentMode(id: string, mode: string): Promise<void> {
    await this.patch(`/api/agents/${id}/config`, { mode });
  }

  async setAgentModel(id: string, model: string): Promise<void> {
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
        // Replace handler instead of adding to prevent duplicates
        this.messageHandlers = [onMessage];
        this.callbacks = callbacks || {};
        return;
      }
      // If already connecting, wait for it
      if (this.ws?.readyState === WebSocket.CONNECTING && this.connectingPromise) {
        this.messageHandlers = [onMessage];
        this.callbacks = callbacks || {};
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

      this.ws.onclose = (event) => {
        console.log('[WebSocket] Connection closed, code:', event.code);
        this.connectingPromise = null;
        this.wsReadyPromise = null;
        // Don't reconnect if this was a normal closure (code 1000) or if agentId is null
        if (event.code === 1000 || !this.agentId) {
          console.log('[WebSocket] Normal closure or disconnect requested, not reconnecting');
          return;
        }
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
    // Clear all state to prevent memory leaks and duplicate connections
    this.messageHandlers = [];
    this.callbacks = {};
    if (this.ws) {
      // Use code 1000 for normal closure
      this.ws.close(1000, 'Disconnect requested');
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
    input_cost_per_m?: number;
    output_cost_per_m?: number;
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
    alert_threshold?: number;
  }> {
    return this.get('/api/budget');
  }

  async updateBudget(data: {
    hourly_limit?: number;
    daily_limit?: number;
    monthly_limit?: number;
    alert_threshold?: number;
  }): Promise<void> {
    await this.put('/api/budget', data);
  }

  async getBudgetAgents(): Promise<Array<{
    agent_id: string;
    agent_name?: string;
    spend: number;
    calls: number;
    tokens: number;
  }>> {
    return this.get('/api/budget/agents');
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

  async discoverA2A(url: string): Promise<{ success: boolean; agent?: { name: string; url: string }; error?: string }> {
    return this.post('/api/a2a/discover', { url });
  }

  // Commands
  async listCommands(): Promise<{ commands: Array<{ cmd: string; desc: string; source?: string }> }> {
    return this.get('/api/commands');
  }

  // ===== Agent Extended Operations =====

  async getAgentDetail(id: string): Promise<AgentDetail> {
    return this.get(`/api/agents/${id}`);
  }

  async getAgentFiles(id: string): Promise<{ files: AgentFile[] }> {
    return this.get(`/api/agents/${id}/files`);
  }

  async getAgentFile(id: string, filename: string): Promise<{ content: string }> {
    return this.get(`/api/agents/${id}/files/${encodeURIComponent(filename)}`);
  }

  async saveAgentFile(id: string, filename: string, content: string): Promise<void> {
    await this.put(`/api/agents/${id}/files/${encodeURIComponent(filename)}`, { content });
  }

  async patchAgentConfig(id: string, config: Record<string, unknown>): Promise<void> {
    await this.patch(`/api/agents/${id}/config`, config);
  }

  async getAgentTools(id: string): Promise<ToolFilters> {
    return this.get(`/api/agents/${id}/tools`);
  }

  async setAgentTools(id: string, filters: ToolFilters): Promise<void> {
    await this.put(`/api/agents/${id}/tools`, filters);
  }

  async cloneAgent(id: string, newName: string): Promise<{ agent_id: string; name: string }> {
    return this.post(`/api/agents/${id}/clone`, { new_name: newName });
  }

  async clearAgentHistory(id: string): Promise<void> {
    await this.del(`/api/agents/${id}/history`);
  }

  async getProfiles(): Promise<{ profiles: Profile[] }> {
    return this.get('/api/profiles');
  }

  // ===== Skills / ClawHub Operations =====

  async searchClawHub(query: string, limit = 20): Promise<ClawHubSearchResult> {
    return this.get(`/api/clawhub/search?q=${encodeURIComponent(query)}&limit=${limit}`);
  }

  async browseClawHub(sort: string = 'trending', cursor?: string, limit = 20): Promise<ClawHubBrowseResult> {
    let url = `/api/clawhub/browse?sort=${sort}&limit=${limit}`;
    if (cursor) url += `&cursor=${encodeURIComponent(cursor)}`;
    return this.get(url);
  }

  async installFromClawHub(slug: string): Promise<{ name: string; warnings?: string[] }> {
    return this.post('/api/clawhub/install', { slug });
  }

  async getSkillDetail(slug: string): Promise<SkillDetail> {
    return this.get(`/api/clawhub/skill/${encodeURIComponent(slug)}`);
  }

  async getSkillCode(slug: string): Promise<{ code: string; filename: string }> {
    return this.get(`/api/clawhub/skill/${encodeURIComponent(slug)}/code`);
  }

  async getMcpServers(): Promise<McpServersResponse> {
    return this.get('/api/mcp/servers');
  }

  async createSkill(data: {
    name: string;
    description: string;
    runtime: string;
    prompt_context?: string;
  }): Promise<void> {
    await this.post('/api/skills/create', data);
  }

  async uninstallSkill(name: string): Promise<void> {
    await this.post('/api/skills/uninstall', { name });
  }

  // ===== Hands Operations =====

  async getHandDetail(id: string): Promise<Hand> {
    return this.get(`/api/hands/${id}`);
  }

  async getActiveHands(): Promise<{ instances: HandInstance[] }> {
    return this.get('/api/hands/active');
  }

  async installHandDeps(id: string): Promise<InstallDepsResponse> {
    return this.post(`/api/hands/${id}/install-deps`);
  }

  async checkHandDeps(id: string): Promise<{ requirements: Array<{ key: string; satisfied: boolean }> }> {
    return this.post(`/api/hands/${id}/check-deps`);
  }

  async activateHand(id: string, config: Record<string, unknown>): Promise<{ instance_id: string }> {
    return this.post(`/api/hands/${id}/activate`, { config });
  }

  async pauseHandInstance(id: string): Promise<void> {
    await this.post(`/api/hands/instances/${id}/pause`);
  }

  async resumeHandInstance(id: string): Promise<void> {
    await this.post(`/api/hands/instances/${id}/resume`);
  }

  async deactivateHandInstance(id: string): Promise<void> {
    await this.del(`/api/hands/instances/${id}`);
  }

  async getHandInstanceStats(id: string): Promise<HandStats> {
    return this.get(`/api/hands/instances/${id}/stats`);
  }

  async getHandInstanceBrowser(id: string): Promise<HandBrowserState> {
    return this.get(`/api/hands/instances/${id}/browser`);
  }

  // ===== Templates Operations =====

  async getTemplates(): Promise<{ templates: Template[] }> {
    return this.get('/api/templates');
  }

  async getTemplate(name: string): Promise<{ manifest_toml: string }> {
    return this.get(`/api/templates/${encodeURIComponent(name)}`);
  }

  // ===== Agent Memory Operations =====

  async getAgentMemoryKV(agentId: string): Promise<{ kv_pairs: Array<{ key: string; value: unknown }> }> {
    return this.get(`/api/memory/agents/${agentId}/kv`);
  }

  async setAgentMemoryKV(agentId: string, key: string, value: unknown): Promise<void> {
    await this.put(`/api/memory/agents/${agentId}/kv/${encodeURIComponent(key)}`, { value });
  }

  async deleteAgentMemoryKV(agentId: string, key: string): Promise<void> {
    await this.del(`/api/memory/agents/${agentId}/kv/${encodeURIComponent(key)}`);
  }

  // ===== Approvals Operations =====

  async listApprovals(): Promise<Array<{
    id: string;
    agent_id: string;
    tool_name: string;
    risk_level: 'low' | 'medium' | 'high';
    status: 'pending' | 'approved' | 'rejected';
    created_at: string;
    expires_at?: string;
    detail?: string;
  }>> {
    return this.get('/api/approvals');
  }

  async approveAction(id: string): Promise<void> {
    await this.post(`/api/approvals/${id}/approve`);
  }

  async rejectAction(id: string): Promise<void> {
    await this.post(`/api/approvals/${id}/reject`);
  }

  // ===== Workflow Operations =====

  async createWorkflow(data: {
    name: string;
    description?: string;
    steps: Array<{
      name: string;
      agent_name?: string;
      mode: 'sequential' | 'parallel' | 'loop';
      prompt?: string;
    }>;
  }): Promise<{ workflow_id: string }> {
    return this.post('/api/workflows', data);
  }

  async runWorkflow(id: string, input?: string): Promise<{ run_id: string; status: string }> {
    return this.post(`/api/workflows/${id}/run`, { input });
  }

  async getWorkflowRuns(id: string): Promise<Array<{
    run_id: string;
    status: string;
    started_at: string;
    completed_at?: string;
    result?: string;
  }>> {
    return this.get(`/api/workflows/${id}/runs`);
  }

  // ===== Scheduler Operations =====

  async listCronJobs(): Promise<Array<{
    id: string;
    name: string;
    schedule: { kind: 'cron'; expr: string };
    agent_id: string;
    action: { kind: 'agent_turn'; message: string };
    enabled: boolean;
    last_run?: string;
    next_run?: string;
  }>> {
    return this.get('/api/cron/jobs');
  }

  async createCronJob(data: {
    name: string;
    cron: string;
    agent_id: string;
    message: string;
    enabled?: boolean;
  }): Promise<{ job_id: string }> {
    return this.post('/api/cron/jobs', data);
  }

  async toggleCronJob(id: string, enabled: boolean): Promise<void> {
    await this.put(`/api/cron/jobs/${id}/enable`, { enabled });
  }

  async deleteCronJob(id: string): Promise<void> {
    await this.del(`/api/cron/jobs/${id}`);
  }

  async runJobNow(id: string): Promise<void> {
    await this.post(`/api/schedules/${id}/run`);
  }

  async listTriggers(): Promise<Array<{
    id: string;
    name: string;
    pattern: string;
    enabled: boolean;
    trigger_count: number;
  }>> {
    return this.get('/api/triggers');
  }

  async updateTrigger(id: string, data: { enabled?: boolean; pattern?: string }): Promise<void> {
    await this.put(`/api/triggers/${id}`, data);
  }

  async deleteTrigger(id: string): Promise<void> {
    await this.del(`/api/triggers/${id}`);
  }

  // ===== Channel Operations =====

  async configureChannel(name: string, fields: Record<string, string>): Promise<void> {
    await this.post(`/api/channels/${encodeURIComponent(name)}/configure`, { fields });
  }

  async removeChannel(name: string): Promise<void> {
    await this.del(`/api/channels/${encodeURIComponent(name)}/configure`);
  }

  async testChannel(name: string): Promise<{ success: boolean; message?: string }> {
    return this.post(`/api/channels/${encodeURIComponent(name)}/test`);
  }

  async startWhatsAppQR(): Promise<{ session_id: string; qr_code?: string; status: string }> {
    return this.post('/api/channels/whatsapp/qr/start');
  }

  async getWhatsAppQRStatus(sessionId: string): Promise<{ status: string; qr_code?: string; connected?: boolean }> {
    return this.get(`/api/channels/whatsapp/qr/status?session_id=${encodeURIComponent(sessionId)}`);
  }

  // ===== Usage Analytics Operations =====

  async getUsageSummary(): Promise<{
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
    call_count: number;
    total_tool_calls: number;
  }> {
    return this.get('/api/usage/summary');
  }

  async getUsageByModel(): Promise<Array<{
    model: string;
    provider: string;
    total_input_tokens: number;
    total_output_tokens: number;
    total_cost_usd: number;
    call_count: number;
  }>> {
    return this.get('/api/usage/by-model');
  }

  async getDailyCosts(): Promise<{
    daily: Array<{ date: string; cost_usd: number; tokens: number; calls: number }>;
    first_event_date?: string;
  }> {
    return this.get('/api/usage/daily');
  }

  // ===== Logs & Audit Operations =====

  async getRecentAudit(n = 100): Promise<Array<{
    seq: number;
    timestamp: string;
    action: string;
    agent_id?: string;
    detail?: string;
    hash: string;
    prev_hash: string;
  }>> {
    return this.get(`/api/audit/recent?n=${n}`);
  }

  async verifyAuditChain(): Promise<{ valid: boolean; entries_checked: number; message?: string }> {
    return this.get('/api/audit/verify');
  }

  // ===== Model & Provider Operations =====

  async addCustomModel(data: {
    id: string;
    provider: string;
    context_window?: number;
    max_output_tokens?: number;
  }): Promise<void> {
    await this.post('/api/models/custom', data);
  }

  async deleteCustomModel(id: string): Promise<void> {
    await this.del(`/api/models/custom/${encodeURIComponent(id)}`);
  }

  async saveProviderKey(provider: string, key: string): Promise<void> {
    await this.post(`/api/providers/${encodeURIComponent(provider)}/key`, { key });
  }

  async removeProviderKey(provider: string): Promise<void> {
    await this.del(`/api/providers/${encodeURIComponent(provider)}/key`);
  }

  async testProvider(provider: string): Promise<{ success: boolean; latency_ms?: number; error?: string }> {
    return this.post(`/api/providers/${encodeURIComponent(provider)}/test`);
  }

  async saveProviderUrl(provider: string, url: string): Promise<void> {
    await this.put(`/api/providers/${encodeURIComponent(provider)}/url`, { url });
  }

  async startCopilotOAuth(): Promise<{ device_code: string; user_code: string; verification_uri: string; poll_id: string }> {
    return this.post('/api/providers/github-copilot/oauth/start');
  }

  async pollCopilotOAuth(pollId: string): Promise<{ status: string; message?: string; configured?: boolean }> {
    return this.get(`/api/providers/github-copilot/oauth/poll/${encodeURIComponent(pollId)}`);
  }

  // ===== Comms Operations =====

  async getCommsTopology(): Promise<{
    nodes: Array<{ id: string; name: string; type: string; children?: string[]; peers?: string[] }>;
    edges: Array<{ from: string; to: string; type: string }>;
  }> {
    return this.get('/api/comms/topology');
  }

  async getCommsEvents(limit = 200): Promise<Array<{
    id: string;
    timestamp: string;
    type: string;
    from?: string;
    to?: string;
    detail?: string;
  }>> {
    return this.get(`/api/comms/events?limit=${limit}`);
  }

  async sendCommsMessage(from: string, to: string, message: string): Promise<void> {
    await this.post('/api/comms/send', { from, to, message });
  }

  async postTask(title: string, description: string, assignee?: string): Promise<{ task_id: string }> {
    return this.post('/api/comms/task', { title, description, assignee });
  }

  // ===== Migration Operations =====

  async detectMigration(): Promise<{ detected: boolean; source?: string; reason?: string }> {
    return this.get('/api/migrate/detect');
  }

  async scanMigrationPath(path: string): Promise<{
    agents: number;
    sessions: number;
    workflows: number;
    skills: number;
    total_size_mb: number;
  }> {
    return this.post('/api/migrate/scan', { path });
  }

  async runMigration(data: { path: string; dry_run?: boolean; include_sessions?: boolean }): Promise<{
    success: boolean;
    migrated: { agents: number; workflows: number; skills: number };
    errors: string[];
  }> {
    return this.post('/api/migrate', data);
  }

  // ===== System Operations =====

  async getConfigSchema(): Promise<{
    schema: Record<string, { type: string; description: string; default?: unknown; enum?: unknown[] }>;
  }> {
    return this.get('/api/config/schema');
  }

  async getVersion(): Promise<{ version: string; build_time?: string; git_commit?: string; platform?: string; arch?: string }> {
    return this.get('/api/version');
  }

  async getSystemStatus(): Promise<{
    uptime_seconds: number;
    agent_count: number;
    default_provider?: string;
    default_model?: string;
  }> {
    return this.get('/api/status');
  }

  async listTools(): Promise<Array<{
    name: string;
    description?: string;
    category?: string;
    parameters?: Record<string, unknown>;
  }>> {
    return this.get('/api/tools');
  }

  async getSecurityStatus(): Promise<{
    features: Record<string, boolean>;
    audit_enabled: boolean;
    chain_valid: boolean;
    configurable?: Record<string, boolean>;
    monitoring?: Record<string, unknown>;
  }> {
    return this.get('/api/security');
  }

  async listPeers(): Promise<Array<{
    id: string;
    name?: string;
    address?: string;
    status: string;
    agent_count?: number;
    last_seen?: string;
  }>> {
    return this.get('/api/peers');
  }

  // ===== Provider Operations =====

  async listProviders(): Promise<{ providers: Provider[] }> {
    return this.get('/api/providers');
  }
}

export const api = new ExtendedAPIClient();
export default api;
