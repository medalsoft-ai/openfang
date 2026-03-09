// OpenFang API Types

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
  role: 'user' | 'assistant' | 'system' | 'agent';
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

export interface Hand {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  tools: string[];
  requirements_met: boolean;
  requirements: { key: string; label: string; satisfied: boolean }[];
  dashboard_metrics: number;
  has_settings: boolean;
  settings_count: number;
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
