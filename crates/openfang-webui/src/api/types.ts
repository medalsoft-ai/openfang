// EnterpriseClaw API Types

export interface ApiError {
  error: string;
  code?: number;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime: number;
}

export interface Agent {
  id: string;
  name: string;
  description?: string;
  status: 'idle' | 'running' | 'paused' | 'crashed' | 'stopped';
  state?: string;
  mode?: 'observe' | 'assist' | 'full';
  model?: ModelConfig;
  model_provider?: string;
  model_name?: string;
  capabilities?: Capabilities;
  identity?: {
    emoji?: string;
    color?: string;
    archetype?: string;
    vibe?: string;
  };
  profile?: string;
  system_prompt?: string;
  fallback_models?: Array<{ provider: string; model: string }>;
  created_at: string;
  updated_at: string;
  tags: string[];
}


export interface ModelConfig {
  provider: string;
  model: string;
  api_key_env?: string;
  temperature?: number;
  max_tokens?: number;
}

export interface Capabilities {
  tools: string[];
  memory_read: string[];
  memory_write: string[];
  network: boolean;
  shell: boolean;
}

export interface Session {
  session_id: string;
  agent_id: string;
  title: string;
  message_count: number;
  created_at: string;
  updated_at?: string;
}

export interface Message {
  id: string;
  // Backend returns capitalized roles: 'User', 'Assistant', 'System' (Debug format)
  role: 'user' | 'assistant' | 'system' | 'agent' | 'User' | 'Assistant' | 'System';
  content?: string;
  text?: string;
  timestamp?: string;
  ts?: number;
  thinking?: boolean;
  streaming?: boolean;
  isStreaming?: boolean;
  meta?: string;
  tools?: ToolCall[];
  images?: Array<{ file_id: string; filename?: string }>;
  isHtml?: boolean;
  _copied?: boolean;
}

export interface ToolCall {
  id: string;
  name: string;
  running?: boolean;
  is_error?: boolean;
  input?: unknown;
  result?: string;
  expanded?: boolean;
  _imageUrls?: string[];
  _audioFile?: string;
  _audioDuration?: number;
}

export interface Channel {
  name: string;
  display_name: string;
  icon: string;
  description: string;
  category: string;
  difficulty: string;
  setup_time: string;
  quick_setup: boolean;
  setup_type: string;
  configured: boolean;
  has_token: boolean;
  connected?: boolean;
  fields?: ChannelField[];
  setup_steps?: string[];
  config_template?: string;
}

export interface ChannelField {
  key: string;
  label: string;
  type: string;
  required: boolean;
  advanced?: boolean;
  env_var?: string;
  value?: string;
}

export interface Skill {
  name: string;
  description: string;
  version: string;
  author: string;
  runtime: string;
  tools_count: number;
  tags: string[];
  enabled: boolean;
  source: { type: string; slug?: string; version?: string };
  has_prompt_context: boolean;
}

// Extended Hand types for Alpine alignment
export interface HandRequirement {
  key: string;
  label: string;
  satisfied: boolean;
  type?: 'Binary' | 'EnvVar' | 'ApiKey' | 'PythonPackage' | string;
  description?: string;
  check_value?: string;
  install?: {
    macos?: string;
    windows?: string;
    linux_apt?: string;
    linux_dnf?: string;
    linux_pacman?: string;
    pip?: string;
    steps?: string[];
    env_example?: string;
    docs_url?: string;
    signup_url?: string;
    manual_url?: string;
    estimated_time?: string;
  };
}

export interface HandSetting {
  key: string;
  label: string;
  description?: string;
  setting_type: 'select' | 'toggle' | 'text';
  default?: string;
  options?: Array<{
    value: string;
    label: string;
    provider_env?: string;
    binary?: string;
    available?: boolean;
  }>;
}

export interface HandDashboardMetric {
  memory_key: string;
  label: string;
  format: string;
}

export interface HandAgentConfig {
  provider?: string;
  model?: string;
}

export interface Hand {
  id: string;
  name: string;
  display_name?: string;
  description: string;
  category: string;
  icon: string;
  tools: string[];
  requirements_met: boolean;
  requirements: HandRequirement[];
  dashboard_metrics: number;
  has_settings: boolean;
  settings_count: number;
  settings?: HandSetting[];
  dashboard?: HandDashboardMetric[];
  agent?: HandAgentConfig;
  server_platform?: string;
}

export interface InstallDepResult {
  key: string;
  status: 'installed' | 'already_installed' | 'error' | 'timeout' | 'skipped';
  message?: string;
}

export interface InstallDepsResponse {
  success?: boolean;
  results?: InstallDepResult[];
  requirements?: HandRequirement[];
  requirements_met?: boolean;
}

export interface HandInstance {
  instance_id: string;
  hand_id: string;
  status: string;
  agent_id?: string;
  agent_name?: string;
  activated_at: string;
  updated_at: string;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  created_at: string;
}

export interface Config {
  default_model: ModelConfig;
  network: { listen_addr: string; };
}

export interface UsageStats {
  total_requests: number;
  total_tokens: number;
  total_cost: number;
}

export interface Approval {
  id: string;
  agent_id: string;
  agent_name: string;
  tool_name: string;
  description: string;
  action_summary: string;
  action: string;
  risk_level: string;
  requested_at: string;
  created_at: string;
  timeout_secs: number;
  status: 'pending' | 'approved' | 'denied';
}

// Extended Model type with full fields
export interface Model {
  id: string;
  display_name?: string;
  provider: string;
  available: boolean;
  tier?: 'frontier' | 'smart' | 'balanced' | 'fast' | string;
  context_window?: number;
  supports_vision?: boolean;
  supports_tools?: boolean;
  input_cost_per_m?: number;
  output_cost_per_m?: number;
}

// Security status type
export interface SecurityStatus {
  features: Record<string, boolean>;
  audit_enabled: boolean;
  chain_valid: boolean;
  configurable?: Record<string, boolean>;
  monitoring?: Record<string, unknown>;
}

// Budget types
export interface Budget {
  hourly_spend: number;
  hourly_limit: number;
  daily_spend: number;
  daily_limit: number;
  monthly_spend: number;
  monthly_limit: number;
  alert_threshold?: number;
}

export interface AgentBudget {
  agent_id: string;
  agent_name?: string;
  spend: number;
  calls: number;
  tokens: number;
}

// A2A Agent type
export interface A2AAgent {
  name: string;
  url: string;
  agent_card?: {
    name?: string;
    description?: string;
    version?: string;
    url?: string;
  };
}

// Peer detail type
export interface PeerDetail {
  id: string;
  name?: string;
  address?: string;
  status: string;
  agent_count?: number;
  last_seen?: string;
}

// System version type
export interface SystemVersion {
  version: string;
  build_time?: string;
  git_commit?: string;
  platform?: string;
  arch?: string;
}

// System status type
export interface SystemStatus {
  uptime_seconds: number;
  agent_count: number;
  default_provider?: string;
  default_model?: string;
}

// Extended types for Alpine alignment

export interface AgentDetail extends Agent {
  capabilities?: Capabilities;
  fallback_models?: Array<{ provider: string; model: string }>;
  config?: Record<string, unknown>;
}

export interface AgentFile {
  name: string;
  exists: boolean;
  size?: number;
  modified?: string;
}

export interface ToolFilters {
  tool_allowlist: string[];
  tool_blocklist: string[];
}

// ClawHub types
export interface ClawHubSkill {
  slug: string;
  name: string;
  description: string;
  author?: string;
  version?: string;
  runtime?: string;
  downloads?: number;
  stars?: number;
  tags?: string[];
  installed?: boolean;
  category?: string;
  updated_at?: string;
}

export interface ClawHubSearchResult {
  items: ClawHubSkill[];
  total?: number;
  next_cursor?: string;
}

export interface ClawHubBrowseResult {
  items: ClawHubSkill[];
  next_cursor?: string;
}

export interface SkillDetail extends ClawHubSkill {
  readme?: string;
  tools?: Array<{ name: string; description: string }>;
  source_url?: string;
  license?: string;
}

// MCP types
export interface McpServer {
  name: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  connected?: boolean;
  tools?: string[];
}

export interface McpServersResponse {
  configured: McpServer[];
  connected: McpServer[];
  total_configured: number;
  total_connected: number;
}

// Hands types
export interface HandInstance {
  instance_id: string;
  hand_id: string;
  status: string;
  agent_id?: string;
  agent_name?: string;
  activated_at: string;
  updated_at: string;
  config?: Record<string, unknown>;
}

export interface HandStats {
  requests?: number;
  errors?: number;
  latency_ms?: number;
  last_activity?: string;
  [key: string]: unknown;
}

export interface HandBrowserState {
  url?: string;
  title?: string;
  screenshot?: string;
  content?: string;
  timestamp?: string;
}

// Profile types
export interface Profile {
  name: string;
  label?: string;
  description?: string;
  tools: string[];
}

// Template types
export interface Template {
  name: string;
  description?: string;
  category?: string;
  manifest_toml?: string;
  provider?: string;
  model?: string;
  profile?: string;
  system_prompt?: string;
}

// Provider types
export interface Provider {
  id: string;
  display_name: string;
  auth_status: 'configured' | 'not_configured' | 'error' | 'not_set' | 'missing' | 'no_key';
  health?: 'healthy' | 'degraded' | 'unhealthy';
  is_local?: boolean;
  base_url?: string;
  key_required?: boolean;
  api_key_env?: string;
  model_count?: number;
}

// Slash command types
export interface SlashCommand {
  cmd: string;
  desc: string;
  handler?: (args?: string) => void;
}

// Personality preset types
export interface PersonalityPreset {
  id: string;
  label: string;
  soul: string;
}

// Thinking mode type
export type ThinkingMode = 'off' | 'on' | 'stream';

// Attachment type
export interface Attachment {
  id: string;
  file_id: string;
  filename: string;
  content_type: string;
  size: number;
  transcription?: string;
}

// Memory KV types
export interface KVPair {
  key: string;
  value: unknown;
}

// Cron Job types
export interface CronJob {
  id: string;
  name: string;
  schedule: { kind: 'cron'; expr: string };
  agent_id: string;
  action: { kind: 'agent_turn'; message: string };
  enabled: boolean;
  last_run?: string;
  next_run?: string;
}

// Trigger types
export interface Trigger {
  id: string;
  name: string;
  pattern: string;
  enabled: boolean;
  trigger_count: number;
}

// Audit types
export interface AuditEntry {
  seq: number;
  timestamp: string;
  action: string;
  agent_id?: string;
  agent_name?: string;
  detail?: string;
  hash: string;
  prev_hash: string;
}

// Workflow types
export interface WorkflowStep {
  name: string;
  agent_name?: string;
  mode: 'sequential' | 'parallel' | 'loop';
  prompt?: string;
}

export interface WorkflowRun {
  run_id: string;
  status: string;
  started_at: string;
  completed_at?: string;
  result?: string;
}

// Channel types
export interface ChannelConfig {
  fields: Record<string, string>;
}

// Usage types
export interface UsageByModel {
  model: string;
  provider: string;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost_usd: number;
  call_count: number;
}

export interface DailyCost {
  date: string;
  cost_usd: number;
  tokens: number;
  calls: number;
}

// Network types
export interface Peer {
  id: string;
  name?: string;
  address?: string;
  status: string;
  agent_count?: number;
  last_seen?: string;
}

// Migration types
export interface MigrationScanResult {
  agents: number;
  sessions: number;
  workflows: number;
  skills: number;
  total_size_mb: number;
}

export interface MigrationResult {
  success: boolean;
  migrated: { agents: number; workflows: number; skills: number };
  errors: string[];
}

// Auth types
export interface AuthCheckResponse {
  mode: 'none' | 'apikey' | 'session';
  authenticated?: boolean;
  username?: string;
}

export interface AuthLoginRequest {
  username: string;
  password: string;
}

export interface AuthLoginResponse {
  status: 'ok' | 'error';
  username?: string;
  error?: string;
}

export interface AuthLogoutResponse {
  status: 'ok' | 'error';
}
