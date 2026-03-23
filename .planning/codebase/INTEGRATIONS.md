# External Integrations

**Analysis Date:** 2026-03-23

## LLM Providers (37 providers)

All LLM providers use environment variables for API keys. Configure in `~/.openfang/config.toml` under `[default_model]` or per-agent overrides.

**Cloud Providers (requires API key):**

| Provider | Env Variable | Base URL | Notes |
|----------|-------------|----------|-------|
| Anthropic | `ANTHROPIC_API_KEY` | `api.anthropic.com` | Claude models (custom protocol) |
| Google Gemini | `GEMINI_API_KEY` or `GOOGLE_API_KEY` | `generativelanguage.googleapis.com` | Gemini models (custom protocol) |
| OpenAI | `OPENAI_API_KEY` | `api.openai.com` | GPT-4o, o1, etc. |
| Groq | `GROQ_API_KEY` | `api.groq.com` | Fast inference |
| OpenRouter | `OPENROUTER_API_KEY` | `openrouter.ai` | Multi-model gateway |
| DeepSeek | `DEEPSEEK_API_KEY` | `api.deepseek.com` | DeepSeek models |
| Together AI | `TOGETHER_API_KEY` | `api.together.ai` | Open-source models |
| Mistral AI | `MISTRAL_API_KEY` | `api.mistral.ai` | Mistral, Mixtral |
| Fireworks AI | `FIREWORKS_API_KEY` | `api.fireworks.ai` | Fast inference |
| Perplexity | `PERPLEXITY_API_KEY` | `api.perplexity.ai` | Search-augmented |
| Cohere | `COHERE_API_KEY` | `api.cohere.com` | Command R models |
| AI21 Labs | `AI21_API_KEY` | `api.ai21.com` | Jamba models |
| Cerebras | `CEREBRAS_API_KEY` | `api.cerebras.ai` | Ultra-fast inference |
| SambaNova | `SAMBANOVA_API_KEY` | `api.sambanova.ai` | Enterprise |
| Hugging Face | `HF_API_KEY` | `api-inference.huggingface.co` | Inference API |
| xAI | `XAI_API_KEY` | `api.x.ai` | Grok models |
| Replicate | `REPLICATE_API_TOKEN` | `api.replicate.com` | Model hosting |
| Chutes.ai | `CHUTES_API_KEY` | ` chute.ai` | Serverless inference |
| Venice | `VENICE_API_KEY` | `api.venice.ai` | Private inference |
| NVIDIA NIM | `NVIDIA_API_KEY` | `api.nvidia.ngc.mil` | Enterprise |
| Moonshot (Kimi) | `MOONSHOT_API_KEY` | `api.moonshot.cn` | Chinese LLM |
| Qwen (DashScope) | `DASHSCOPE_API_KEY` | `dashscope.aliyuncs.com` | Alibaba models |
| Minimax | `MINIMAX_API_KEY` | `api.minimax.chat` | Chinese LLM |
| Zhipu (GLM) | `ZHIPU_API_KEY` | `open.bigmodel.cn` | Chinese LLM |
| Qianfan (Baidu) | `QIANFAN_API_KEY` | `qianfan.baidubce.com` | Chinese LLM |
| Volcengine (Doubao) | `VOLCENGINE_API_KEY` | `open.volcengineapi.com` | ByteDance models |

**Local/Dev Providers (optional API key):**

| Provider | Env Variable | Notes |
|----------|-------------|-------|
| Ollama | `OLLAMA_API_KEY` | Local model inference |
| vLLM | `VLLM_API_KEY` | Self-hosted |
| LM Studio | `LMSTUDIO_API_KEY` | Local inference |
| Lemonade | `LEMONADE_API_KEY` | Cloud dev inference |

**CLI-based Providers (no API key needed):**

| Provider | Auth | Notes |
|----------|------|-------|
| Claude Code CLI | `ANTHROPIC_API_KEY` or OAuth | Subprocess-based |
| Qwen Code CLI | OAuth (free tier) | Subprocess-based |
| GitHub Copilot | `GITHUB_TOKEN` | Token exchange flow |

**Enterprise:**

| Provider | Env Variable | Notes |
|----------|-------------|-------|
| Azure OpenAI | `AZURE_OPENAI_API_KEY` | Requires `base_url` config |
| Kaiyun Code (zai) | `ZHIPU_API_KEY` | Chinese coding assistant |

All OpenAI-compatible providers use the `openai::OpenAIDriver`. Custom providers can be added by setting `provider` and `base_url` in config.

## Messaging Channels

Channel adapters are configured in `~/.openfang/config.toml` under `[telegram]`, `[discord]`, `[slack]`.

| Channel | Env Variable | Protocol | Library |
|---------|-------------|----------|---------|
| Telegram | `TELEGRAM_BOT_TOKEN` | Telegram Bot API | reqwest HTTP |
| Discord | `DISCORD_BOT_TOKEN` | Discord Gateway | tokio-tungstenite WebSocket |
| Slack | `SLACK_BOT_TOKEN` + `SLACK_APP_TOKEN` | Slack WebSocket + HTTP | reqwest + tokio-tungstenite |
| Email (SMTP) | SMTP config in kernel | SMTP with TLS | lettre 0.11 |
| Email (IMAP) | IMAP config | IMAP idle | imap 2 |

## Email Integrations

**SMTP:** lettre 0.11 with tokio runtime and rustls TLS
**IMAP:** imap 2 with idle support for real-time inbox monitoring
**OAuth:** Gmail OAuth2 PKCE via `openfang-extensions` oauth module
**Env vars for email:** SMTP credentials managed through kernel config, OAuth tokens stored in credential vault

## MCP Server Integrations (Model Context Protocol)

All MCP integrations are defined as TOML files in `crates/openfang-extensions/integrations/`. They are stdio-based subprocesses launched via `npx`. The `openfang-extensions` crate manages lifecycle, credential storage (AES-GCM encrypted vault), OAuth2 PKCE flows, and health monitoring.

| Integration | Package | Auth | Category |
|-------------|---------|------|----------|
| GitHub | `@modelcontextprotocol/server-github` | PAT (`GITHUB_PERSONAL_ACCESS_TOKEN`) or OAuth | devtools |
| Slack | `@modelcontextprotocol/server-slack` | Bot token (`SLACK_BOT_TOKEN`) + OAuth | communication |
| AWS | `@aws-mcp/server-aws` | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` | cloud |
| Gmail | `@gongrzhe/server-gmail-autoauth-mcp` | Google OAuth2 | productivity |
| Notion | `@notionhq/notion-mcp-server` | `NOTION_API_KEY` (internal token) | productivity |
| Jira | (MCP) | OAuth or PAT | devtools |
| Linear | (MCP) | API token | devtools |
| GitLab | (MCP) | PAT | devtools |
| Bitbucket | (MCP) | App password | devtools |
| Google Calendar | (MCP) | Google OAuth2 | productivity |
| Google Drive | (MCP) | Google OAuth2 | productivity |
| Sentry | (MCP) | DSN/auth token | observability |
| Elasticsearch | (MCP) | URL + auth | data |
| PostgreSQL | (MCP) | Connection string | data |
| Redis | (MCP) | URL + auth | data |
| MongoDB | (MCP) | Connection string | data |
| SQLite | `sqlite-mcp` | File path | data |
| Brave Search | (MCP) | API key | search |
| Exa Search | (MCP) | API key | search |
| Azure MCP | (MCP) | Azure credentials | cloud |
| GCP MCP | (MCP) | GCP credentials | cloud |
| Todoist | (MCP) | API token | productivity |
| Dropbox | (MCP) | OAuth | storage |
| Microsoft Teams | (MCP) | Teams credentials | communication |
| Discord MCP | (MCP) | Bot token | communication |

All MCP integrations share common infrastructure:
- **Transport:** stdio (npx launched subprocess)
- **Credential vault:** AES-GCM encrypted storage in `openfang-extensions`
- **OAuth2 PKCE:** Supported for GitHub, Slack, Google services
- **Health monitoring:** Configurable interval (default 60s), unhealthy threshold 3

## Data Storage

**SQLite:** rusqlite 0.31 (bundled) for all persistent storage
- Default path: `~/.openfang/data/openfang.db`
- Configurable via `sqlite_path` in `[memory]` section of config
- Tables managed by `openfang-migrate` crate migrations
- Stores: agents, memory (episodic/semantic), budget/usage, sessions

## Desktop Application

**Tauri 2.0** wraps the webui and embeds an HTTP API server:
- `@tauri-apps/api` v2 for IPC (invoke commands, events)
- `@tauri-apps/plugin-shell` for opening URLs in browser
- Plugins: notification, dialog, global-shortcut, autostart, updater, single-instance
- System tray: built-in via Tauri tray-icon feature

## Authentication & API Security

**Daemon API:**
- Optional Bearer token auth: set `api_key` in config
- CORS: configurable allowlist (Vite dev ports included in allowlist)
- Rate limiting: governor 0.8 crate for endpoint throttling

**Credential Vault:**
- AES-GCM encryption for stored secrets (extension credentials)
- Argon2 for key derivation
- Zeroize for secure memory wiping

**OFP P2P Network:**
- Optional shared secret for peer authentication
- HMAC-SHA256 for message authentication

## CI/CD & Deployment

**Build:**
- Docker: multi-stage build in `Dockerfile` (rust:1-slim-bookworm)
- Cross-compilation: `Cross.toml` + cross crate for ARM targets
- Nix: `flake.nix` for reproducible builds

**Hosting:**
- Docker image published to registry
- Manual: compile with `cargo build --release` and run binary

**Development:**
- `tmux-dev.sh` and `tmux-split.sh` for dev workflow orchestration

## Environment Configuration

**Required env vars for basic operation:**
- One LLM API key: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `GROQ_API_KEY`, etc.

**Optional env vars:**
- `OPENFANG_HOME` - defaults to `~/.openfang`
- `OPENFANG_API_PORT` - Vite proxy target (default 4200)
- `OPENFANG_API_HOST` - Vite proxy target (default 127.0.0.1)

**Secret env vars (used by extensions/MCP):**
- `GITHUB_PERSONAL_ACCESS_TOKEN`, `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
- `NOTION_API_KEY`, `GITHUB_TOKEN` (Copilot)
- `DASHSCOPE_API_KEY`, `MOONSHOT_API_KEY`, `ZHIPU_API_KEY`, etc.

**Secrets location:**
- API keys: environment variables (not stored in config file)
- Extension credentials: AES-GCM encrypted vault file (`~/.openfang/credentials.vault`)
- Config file: `~/.openfang/config.toml` (TOML, no secrets stored here)

---

*Integration audit: 2026-03-23*
