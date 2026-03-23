# Codebase Structure

**Analysis Date:** 2026-03-23

## Directory Layout

```
openfang/
├── Cargo.toml                    # Workspace manifest (14 crates)
├── Cargo.lock
├── rust-toolchain.toml           # Rust version pinning
├── rustfmt.toml                 # Code formatting config
├── crates/
│   ├── openfang-types/           # Shared types (no business logic)
│   ├── openfang-memory/          # SQLite-backed memory substrate
│   ├── openfang-runtime/         # Agent execution engine
│   ├── openfang-kernel/          # Central coordinator
│   ├── openfang-api/             # HTTP/WebSocket daemon
│   ├── openfang-cli/             # CLI and TUI
│   ├── openfang-channels/        # Messaging platform adapters
│   ├── openfang-wire/            # OFP network protocol
│   ├── openfang-skills/         # Plugin skill registry
│   ├── openfang-hands/           # SOP/autonomous capability packages
│   ├── openfang-extensions/      # Integrations, credentials, templates
│   ├── openfang-desktop/         # Tauri desktop app
│   ├── openfang-webui/           # React dashboard (embedded in API)
│   └── openfang-migrate/         # Migration tooling
├── xtask/                        # Build scripts
├── deploy/                       # Deployment configs (Docker, etc.)
├── docs/                         # Documentation
├── tutorials/                    # Tutorial code
├── sdk/                          # Client SDKs
├── agents/                      # Agent definition templates
├── packages/                    # Published packages
├── design-system/               # Shared design tokens
├── scripts/                     # Utility scripts
├── public/                      # Static assets served by API
└── .claude/                     # Agent memory and skills
```

## Crate Structure Pattern

Each crate follows the same pattern:

```
crates/openfang-<name>/
├── Cargo.toml                   # Crate manifest
├── src/
│   ├── lib.rs                   # Module declarations + re-exports
│   ├── main.rs                  # Binary entry (if executable)
│   ├── error.rs                 # Error types (most crates)
│   ├── mod1.rs                  # Domain modules
│   ├── mod2.rs                  # ...
│   └── ...
└── tests/                       # Integration tests (if any)
```

## Directory Purposes

**`crates/openfang-types/src/`:**
- Purpose: Zero-dependency shared types
- Contains: `agent.rs`, `message.rs`, `tool.rs`, `config.rs`, `event.rs`, `memory.rs`, `capability.rs`, `model_catalog.rs`, `scheduler.rs`, `approval.rs`, `comms.rs`, `webhook.rs`, `manifest_signing.rs`, `media.rs`, `serde_compat.rs`, `taint.rs`, `tool_compat.rs`

**`crates/openfang-runtime/src/`:**
- Purpose: Agent execution engine
- Contains: `agent_loop.rs`, `llm_driver.rs`, `tool_runner.rs`, `kernel_handle.rs`, `context_budget.rs`, `context_overflow.rs`, `loop_guard.rs`, `auth_cooldown.rs`, `llm_errors.rs`, `model_router.rs`, `sandbox.rs`, `python_runtime.rs`, `mcp.rs`, `a2a.rs`, `web_search.rs`, `browser.rs`, `media_understanding.rs`, `tts.rs`, `embedding.rs`, `process_manager.rs`, `hooks.rs`, `audit.rs`, `provider_health.rs`

**`crates/openfang-kernel/src/`:**
- Purpose: Central coordinator
- Contains: `kernel.rs` (main struct), `registry.rs`, `scheduler.rs`, `workflow.rs`, `triggers.rs`, `background.rs`, `supervisor.rs`, `event_bus.rs`, `metering.rs`, `auth.rs`, `capabilities.rs`, `cron.rs`, `approval.rs`, `auto_reply.rs`, `pairing.rs`, `config_reload.rs`, `whatsapp_gateway.rs`, `wizard.rs`, `api/`

**`crates/openfang-api/src/`:**
- Purpose: HTTP daemon
- Contains: `server.rs`, `routes.rs`, `ws.rs`, `middleware.rs`, `rate_limiter.rs`, `channel_bridge.rs`, `openai_compat.rs`, `types.rs`

**`crates/openfang-cli/src/`:**
- Purpose: CLI entry point
- Contains: `main.rs`, `tui.rs`, `chat.rs`, `agent.rs`, `model.rs`, `channel.rs`, `templates.rs`, `dotenv.rs`, `launcher.rs`, `mcp.rs`, `bundled_agents.rs`, `table.rs`, `ui.rs`, `progress.rs`

**`crates/openfang-memory/src/`:**
- Purpose: Persistent storage
- Contains: `lib.rs`, `substrate.rs`, `session.rs`, `structured.rs`, `semantic.rs`, `knowledge.rs`, `consolidation.rs`, `migration.rs`, `usage.rs`

**`crates/openfang-wire/src/`:**
- Purpose: OFP networking
- Contains: `lib.rs`, `peer.rs`, `registry.rs`, `message.rs`

**`crates/openfang-channels/src/`:**
- Purpose: Messaging integrations
- Contains: Channel adapters for Telegram, WhatsApp, Discord, Slack, Email

**`crates/openfang-webui/src/`:**
- Purpose: React dashboard
- Contains: `App.tsx`, `main.tsx`, `main.rs`, `lib.rs`, `pages/`, `components/`, `contexts/`, `hooks/`, `store/`, `i18n/`, `index.css`

**`crates/openfang-hands/src/`:**
- Purpose: Autonomous capability packages (SOPs)
- Contains: `registry.rs`, `bundled.rs`, bundled hand definitions

**`crates/openfang-skills/src/`:**
- Purpose: Plugin skill registry
- Contains: `registry.rs` and skill implementations

**`crates/openfang-extensions/src/`:**
- Purpose: Integration registry, credential resolver, MCP templates
- Contains: `registry.rs`, `credentials.rs`, templates

## Key File Locations

**Entry Points:**
- `crates/openfang-cli/src/main.rs` -- CLI entry (daemon, tui, chat, agent, model, channel commands)
- `crates/openfang-api/src/server.rs` -- Daemon HTTP server (`run_daemon()`, `build_router()`)
- `crates/openfang-desktop/src/main.rs` -- Tauri desktop app entry

**Configuration:**
- `~/.openfang/config.toml` -- Runtime config (daemon reads on boot + hot-reload every 30s)
- `crates/openfang-types/src/config.rs` -- `KernelConfig` struct definition
- `crates/openfang-kernel/src/config.rs` -- Config loading logic

**Core Kernel:**
- `crates/openfang-kernel/src/kernel.rs` -- `OpenFangKernel` struct (lines 60-168 define all subsystems)
- `crates/openfang-runtime/src/agent_loop.rs` -- Main agent execution loop
- `crates/openfang-runtime/src/llm_driver.rs` -- `LlmDriver` trait and implementations

**API Routes:**
- `crates/openfang-api/src/routes.rs` -- All route handlers (spawn_agent, send_message, etc.)
- `crates/openfang-api/src/server.rs` -- Router assembly and middleware setup

**Memory:**
- `crates/openfang-memory/src/substrate.rs` -- `MemorySubstrate` struct
- `crates/openfang-memory/src/session.rs` -- `Session` struct for conversation history

**WebUI:**
- `crates/openfang-webui/src/pages/Chat.tsx` -- Main chat interface
- `crates/openfang-webui/src/components/layout/Layout.tsx` -- Main layout with sidebar
- `crates/openfang-webui/src/i18n/locales/en.json` -- English translations

## Naming Conventions

**Crates:** `openfang-<name>` (kebab-case)
**Rust Modules:** `snake_case.rs`
**Rust Types/Structs:** `PascalCase`
**Rust Functions/Methods:** `snake_case()`
**Rust Enums/Variants:** `PascalCase`
**Config Fields:** `snake_case` in TOML, serialized with serde
**API Endpoints:** `/api/resource/action` (kebab-case for multi-word: `/api/agents/{id}/message/stream`)
**Files in TypeScript/React:** `PascalCase.tsx` for components, `camelCase.ts` for utilities
**Directories in TypeScript/React:** `kebab-case/`

## Where to Add New Code

**New API Endpoint:**
1. Add route in `crates/openfang-api/src/server.rs` (router chain)
2. Implement handler function in `crates/openfang-api/src/routes.rs`
3. Add request/response types in `crates/openfang-api/src/types.rs`
4. If kernel interaction needed, add method to `KernelHandle` trait and implement in `OpenFangKernel`

**New LLM Provider:**
1. Implement `LlmDriver` trait in `crates/openfang-runtime/src/llm_driver.rs`
2. Register in provider factory/registry
3. Add config parsing in `crates/openfang-types/src/config.rs`

**New Tool:**
1. Define in `crates/openfang-runtime/src/tool_runner.rs` (builtin tools)
2. Or register dynamically via skill system

**New WebUI Page:**
1. Create `crates/openfang-webui/src/pages/NewPage.tsx`
2. Add route in `crates/openfang-webui/src/App.tsx`
3. Add navigation link in `crates/openfang-webui/src/components/layout/Layout.tsx`
4. Add i18n keys in `crates/openfang-webui/src/i18n/locales/*.json`

**New Kernel Subsystem:**
1. Add field to `OpenFangKernel` struct in `crates/openfang-kernel/src/kernel.rs`
2. Initialize in `OpenFangKernel::new()`
3. Implement any required trait methods
4. Expose via `KernelHandle` trait if runtime needs access

## Special Directories

**`crates/openfang-webui/public/`:**
- Purpose: Static assets (images, Lottie animations)
- Served at `/` by Axum server
- Contains: `lottie/` animations, favicon, manifest

**`crates/openfang-hands/bundled/`:**
- Purpose: Bundled SOP/hand definitions
- Generated/compiled: Yes (may be generated from source)
- Committed: Yes

**`~/.openfang/` (runtime directory):**
- Purpose: Runtime config, data, and state
- Contains: `config.toml`, `agents/`, `memory.db`, `daemon.json`
- Created on first run via `openfang init`

**`deploy/`:**
- Purpose: Deployment configs
- Contains: Docker Compose, Kubernetes, etc.

---

*Structure analysis: 2026-03-23*
