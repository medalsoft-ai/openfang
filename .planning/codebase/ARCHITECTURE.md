# Architecture

**Analysis Date:** 2026-03-23

## Pattern Overview

**Overall:** Monolithic Rust Application with Layered Subsystems

**Key Characteristics:**
- 14-crate workspace organized around domain boundaries (kernel, runtime, API, memory, wire)
- Kernel is the central coordinator -- all other crates depend on types, not on each other
- Async-first using Tokio runtime with tokio::sync primitives for concurrency
- Trait-based abstractions for extensibility (LlmDriver, EmbeddingDriver, KernelHandle)
- Shared workspace dependencies via [workspace.dependencies] in `Cargo.toml`

## Layers

**Types Layer (`openfang-types`):**
- Purpose: Shared data structures and traits with zero business logic
- Location: `crates/openfang-types/src/`
- Contains: Agent definitions, message types, tool definitions, config schemas, event types
- Depends on: Nothing else in workspace
- Used by: Every other crate

**Runtime Layer (`openfang-runtime`):**
- Purpose: Agent execution engine -- the core "brain" that runs LLM calls and tool execution
- Location: `crates/openfang-runtime/src/`
- Key modules:
  - `agent_loop.rs` -- Main message handling loop (MAX_ITERATIONS=50, TOOL_TIMEOUT_SECS=120)
  - `llm_driver.rs` -- Trait `LlmDriver` for pluggable LLM providers (Groq, OpenAI, Ollama, etc.)
  - `tool_runner.rs` -- Tool execution engine with WASM sandbox support
  - `kernel_handle.rs` -- Trait `KernelHandle` to avoid circular deps between runtime and kernel
  - `model_router.rs` -- Routing to different LLM providers
  - `mcp.rs` -- MCP (Model Context Protocol) server connections
  - `a2a.rs` -- Agent-to-agent communication protocol
  - `web_search.rs` -- Multi-provider web search with SSRF protection
  - `browser.rs` -- Playwright-based browser automation
  - `media_understanding.rs` -- Image description, audio transcription
  - `tts.rs` -- Text-to-speech engine
- Depends on: openfang-types, openfang-memory
- Used by: openfang-kernel, openfang-api

**Kernel Layer (`openfang-kernel`):**
- Purpose: Central coordinator assembling all subsystems into a running system
- Location: `crates/openfang-kernel/src/`
- Key modules:
  - `kernel.rs` -- `OpenFangKernel` struct holding all subsystems + `KernelHandle` impl
  - `registry.rs` -- `AgentRegistry` (in-memory agent manifest storage)
  - `scheduler.rs` -- `AgentScheduler` for cron-based agent triggering
  - `workflow.rs` -- `WorkflowEngine` for multi-step workflow orchestration
  - `triggers.rs` -- `TriggerEngine` for event-driven automation
  - `background.rs` -- `BackgroundExecutor` for background agent tasks
  - `supervisor.rs` -- `Supervisor` for process monitoring
  - `event_bus.rs` -- `EventBus` for publish/subscribe event distribution
  - `metering.rs` -- `MeteringEngine` for cost tracking
  - `auth.rs` -- `AuthManager` for RBAC authentication
  - `capabilities.rs` -- `CapabilityManager` for agent capability discovery
  - `cron.rs` -- `CronScheduler` for cron job management
  - `approval.rs` -- `ApprovalManager` for execution approval workflows
  - `auto_reply.rs` -- `AutoReplyEngine` for auto-responding to messages
  - `pairing.rs` -- `PairingManager` for device pairing
  - `config_reload.rs` -- Hot-reload of config file changes
- Depends on: openfang-types, openfang-runtime (runtime's KernelHandle trait), openfang-memory, openfang-skills, openfang-hands, openfang-extensions, openfang-wire, openfang-channels
- Used by: openfang-api, openfang-cli

**API Layer (`openfang-api`):**
- Purpose: HTTP/WebSocket daemon exposing REST API and WebSocket streams
- Location: `crates/openfang-api/src/`
- Key modules:
  - `server.rs` -- `build_router()` assembles the Axum router; `run_daemon()` is the entry point
  - `routes.rs` -- All route handlers (spawn_agent, send_message, list_agents, etc.)
  - `ws.rs` -- WebSocket endpoint at `/api/agents/{id}/ws`
  - `middleware.rs` -- Auth middleware, security headers, request logging
  - `rate_limiter.rs` -- GCRA rate limiting
  - `channel_bridge.rs` -- Telegram/WhatsApp/etc. channel adapters
  - `openai_compat.rs` -- OpenAI-compatible `/v1/chat/completions` endpoint
- Depends on: openfang-kernel, openfang-runtime, openfang-types, openfang-memory, openfang-channels, openfang-wire, openfang-skills, openfang-hands, openfang-extensions, openfang-migrate
- Framework: Axum 0.8 with tower-http (CORS, compression, tracing)
- Default port: 4200 (configured via `listen_addr` in config.toml)

**Memory Layer (`openfang-memory`):**
- Purpose: Unified memory API over three storage backends
- Location: `crates/openfang-memory/src/`
- Key modules:
  - `substrate.rs` -- `MemorySubstrate` main struct
  - `session.rs` -- Conversation session storage (SQLite-backed)
  - `structured.rs` -- Key-value pairs, agent state
  - `semantic.rs` -- Text-based semantic search (Phase 1: LIKE matching, Phase 2: Qdrant vectors)
  - `knowledge.rs` -- Knowledge graph (entities and relations)
  - `consolidation.rs` -- Memory consolidation logic
  - `usage.rs` -- Token usage tracking
- Depends on: openfang-types
- Storage: SQLite (rusqlite with bundled feature)

**Channels Layer (`openfang-channels`):**
- Purpose: Integration with messaging platforms (Telegram, WhatsApp, Discord, Slack, Email)
- Location: `crates/openfang-channels/src/`
- Provides: `ChannelAdapter` trait and implementations
- Depends on: openfang-types

**Wire Layer (`openfang-wire`):**
- Purpose: OpenFang Wire Protocol (OFP) -- agent-to-agent networking over TCP
- Location: `crates/openfang-wire/src/`
- Key modules:
  - `peer.rs` -- `PeerNode` (local network endpoint), `PeerConfig`
  - `registry.rs` -- `PeerRegistry` (tracks known peers), `RemoteAgent`
  - `message.rs` -- JSON-RPC framed protocol messages
- Protocol: JSON-framed over TCP with authentication

**CLI Layer (`openfang-cli`):**
- Purpose: Command-line interface and interactive TUI
- Location: `crates/openfang-cli/src/`
- Modes: Daemon mode (connects to running daemon over HTTP) vs single-shot mode (boots in-process kernel)
- Key modules: `tui.rs`, `chat.rs`, `agent.rs`, `model.rs`, `channel.rs`
- Entry: `crates/openfang-cli/src/main.rs`

**WebUI Layer (`openfang-webui`):**
- Purpose: React-based dashboard served by the daemon
- Location: `crates/openfang-webui/src/`
- Served at `/` by the Axum server (static files)
- Pages: Chat, Agents, Channels, Skills, Hands, Workflows, WorkflowBuilder, Analytics, Usage, Settings, Scheduler, Sessions, Approvals, Comms, Logs, Runtime, Overview, Wizard
- Framework: React + TypeScript + Vite + Alpine.js (SPA patterns)
- i18n: English, Chinese (Simplified/Traditional), Japanese

**Skills Layer (`openfang-skills`):**
- Purpose: Plugin skill registry and management
- Location: `crates/openfang-skills/src/`

**Hands Layer (`openfang-hands`):**
- Purpose: Curated autonomous capability packages (SOPs)
- Location: `crates/openfang-hands/src/`

**Extensions Layer (`openfang-extensions`):**
- Purpose: Integration registry, bundled MCP templates, credential resolver
- Location: `crates/openfang-extensions/src/`

**Desktop Layer (`openfang-desktop`):**
- Purpose: Tauri-based desktop application embedding the webui
- Location: `crates/openfang-desktop/src/`

**Migrate Layer (`openfang-migrate`):**
- Purpose: Migration tooling for config and data from other systems
- Location: `crates/openfang-migrate/src/`

## Data Flow

**Agent Message Flow:**

1. HTTP/WebSocket request arrives at `openfang-api` routes (`routes.rs`, `ws.rs`)
2. `AppState` holds `Arc<OpenFangKernel>` -- no Arc<Arc<...>> nesting
3. Route handler calls `KernelHandle` trait methods on the kernel
4. Kernel looks up agent in `AgentRegistry` and gets `AgentManifest`
5. Kernel calls `run_agent_loop()` from `openfang-runtime`
6. `agent_loop.rs` builds completion request with system prompt + memories + history
7. `LlmDriver::complete()` sends to provider (Groq/OpenAI/Ollama/etc.)
8. Response parsed -- if tool calls detected, `tool_runner.rs` executes each tool
9. Tool results fed back to LLM (up to MAX_ITERATIONS=50 iterations)
10. Final text response returned to kernel
11. Kernel saves session to `MemorySubstrate` (SQLite)
12. Response flows back through route handler to HTTP/WebSocket client

**Config Hot-Reload Flow:**

1. `server.rs` spawns a background task polling `~/.openfang/config.toml` every 30 seconds
2. On change, `kernel.reload_config()` is called
3. Config changes applied via `config_reload.rs`

**Webhook/Trigger Flow:**

1. External event arrives at `/hooks/wake` or `/hooks/agent`
2. `TriggerEngine` matches event pattern to registered triggers
3. Matching trigger spawns `AgentScheduler` task
4. Agent runs via `run_agent_loop()`

## Key Abstractions

**KernelHandle Trait:**
- Purpose: Decouple `openfang-runtime` from `openfang-kernel` to avoid circular dependencies
- Location: `crates/openfang-runtime/src/kernel_handle.rs`
- Provides: `get_memory()`, `list_agents()`, `send_message()`, `recall_memories()`, etc.
- Implemented by: `OpenFangKernel`

**LlmDriver Trait:**
- Purpose: Pluggable LLM provider interface
- Location: `crates/openfang-runtime/src/llm_driver.rs`
- Methods: `complete()`, `complete_streaming()`
- Implementations: GroqDriver, OpenAIDriver, OllamaDriver, AnthropicDriver, etc.
- `StubDriver` used when no providers configured (returns helpful error)

**EmbeddingDriver Trait:**
- Purpose: Pluggable embedding provider for semantic search
- Location: `crates/openfang-runtime/src/embedding.rs`
- Optional on kernel -- falls back to text matching if None

**ChannelAdapter Trait:**
- Purpose: Unified interface for messaging channels
- Location: `crates/openfang-channels/src/types.rs`
- Implementations: Telegram, WhatsApp, Discord, Slack, Email (SMTP/IMAP)

**Memory Trait (via MemorySubstrate):**
- Purpose: Unified memory API over SQLite + semantic store + knowledge graph
- Location: `crates/openfang-memory/src/substrate.rs`

## Entry Points

**Daemon Entry:**
- Location: `crates/openfang-cli/src/main.rs` -- `openfang start` command
- Boots `OpenFangKernel::new()` then calls `openfang_api::server::run_daemon()`
- `run_daemon()` calls `kernel.set_self_handle()`, `kernel.start_background_agents()`
- HTTP server listens on configurable address (default 127.0.0.1:4200)

**CLI Interactive Entry:**
- Location: `crates/openfang-cli/src/tui.rs` -- `openfang tui` command
- Builds TUI using `ratatui` crate

**Single-shot Entry:**
- Location: `crates/openfang-cli/src/main.rs` -- `openfang chat` command
- Boots in-process kernel without daemon

**Desktop Entry:**
- Location: `crates/openfang-desktop/src/main.rs`
- Embeds webui via Tauri

## Error Handling

**Strategy:** Custom error types with `thiserror` and `anyhow` for different contexts

**Patterns:**
- `KernelError` / `KernelResult<T>` in `openfang-kernel/src/error.rs`
- `OpenFangError` in `openfang-types/src/error.rs`
- `LlmError` in `openfang-runtime/src/llm_driver.rs`
- Route handlers return `impl IntoResponse` with `StatusCode` + JSON error body
- Unhandled errors caught by Axum's default error handler with 500 response

## Cross-Cutting Concerns

**Logging:** `tracing` crate with `tracing-subscriber` (env-filter, JSON format)
**Metrics:** Prometheus endpoint at `/api/metrics`
**Health Checks:** `/api/health` (basic), `/api/health/detail` (detailed)
**Authentication:** API key + RBAC in `middleware.rs`; `AuthManager` on kernel
**Rate Limiting:** GCRA (General Cell Rate Algorithm) via `governor` crate in `rate_limiter.rs`
**Compression:** `tower-http` CompressionLayer (gzip, br)
**Security Headers:** Custom middleware in `middleware.rs` (CORS, CSP, etc.)
**Audit Trail:** `AuditLog` (Merkle hash chain) in `openfang-runtime/src/audit.rs`

---

*Architecture analysis: 2026-03-23*
