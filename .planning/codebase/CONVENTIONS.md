# Coding Conventions

**Analysis Date:** 2026-03-23

## Language

**Primary:**
- Rust (Edition 2021, MSRV 1.75)

## Formatting

**Tool:** rustfmt
- Config file: `rustfmt.toml` at project root
- Single setting: `max_width = 100`

**Key rules:**
- 100 character line width
- Default rustfmt formatting (4-space indent, fn_return_bool, chain_bin_style, etc.)
- Run with: `cargo fmt`

## Linting

**Tool:** clippy
- Enforced as error in CI: `cargo clippy --workspace --all-targets -- -D warnings`
- No clippy.toml or .clippy.toml — using defaults
- Run before commits: `cargo clippy --workspace -- -D warnings`

## Naming Patterns

**Files:**
- `snake_case.rs` for all source files (e.g., `agent_loop.rs`, `llm_driver.rs`)
- `module_name.rs` for the main module file (matches directory)
- `*_test.rs` for integration test files (lives in crate/tests/)
- `*_tests.rs` for migration test files (lives in crate/tests/)

**Modules:**
- `snake_case` (e.g., `openfang_runtime::agent_loop`)

**Functions/Methods:**
- `snake_case` (e.g., `spawn_agent`, `send_message`, `boot_with_config`)
- Tests: `snake_case` with descriptive names (e.g., `test_full_pipeline_with_groq`, `test_cosine_similarity_identical`)

**Types/Structs/Enums:**
- `PascalCase` (e.g., `OpenFangKernel`, `KernelConfig`, `LlmError`)
- Type aliases: `PascalCase` (e.g., `OpenFangResult<T>` = `Result<T, OpenFangError>`)
- Error enums: `PascalCase` with `#[error("...")]` messages (e.g., `KernelError::BootFailed(String)`)

**Constants:**
- `SCREAMING_SNAKE_CASE` for module-level constants (e.g., `MAX_ITERATIONS`, `TOOL_TIMEOUT_SECS`, `TOOL_ERROR_GUIDANCE`)
- `PascalCase` for trait associated constants

**Variables:**
- `snake_case` (e.g., `kernel_config`, `agent_id`, `response_text`)
- Thread-safe wrappers: suffix with `_arc` for `Arc<...>` (e.g., `kernel_arc: Arc<Kernel>`)

## Code Organization

**Crate Structure (14 crates):**
```
crates/
├── openfang-types/    # Shared types (errors, messages, config, agents)
├── openfang-memory/   # Memory substrate, sessions, KV store
├── openfang-runtime/  # Agent execution, LLM drivers, tools, sandboxes
├── openfang-kernel/   # Core kernel: agents, scheduling, events, workflows
├── openfang-api/      # HTTP/WebSocket API server (axum)
├── openfang-cli/      # Terminal UI (ratatui)
├── openfang-webui/    # Frontend SPA (React)
├── openfang-desktop/  # Tauri desktop app
├── openfang-channels/ # Channel adapters (Telegram, Discord, Slack, etc.)
├── openfang-skills/   # Skill registry and bundled skills
├── openfang-hands/    # "SOP" (Standard Operating Procedures) registry
├── openfang-extensions/ # Extension system
├── openfang-wire/     # P2P wire protocol
└── openfang-migrate/  # Migration tooling
```

**Module Declaration:**
- Use `pub mod module_name;` in `lib.rs`
- Always add doc comment on module: `//! Module description.`
- Public re-exports in lib.rs: `pub use module::ItemName;`

**File Size:**
- Prefer many small files over few large ones
- No explicit line limit enforced, but large files (>500 lines) should be considered for splitting

## Import Organization

**Order (rustfmt groups):**
1. Standard library / prelude
2. External crates (workspace dependencies)
3. Local crates (other openfang crates, via `openfang_crate_name::`)
4. `crate::` (intracrate imports)

**Workspace dependencies:**
- All shared dependencies declared in `[workspace.dependencies]` in `Cargo.toml`
- Crates reference via `package = { workspace = true }`
- Workspace version: `0.4.5`

**Common external imports:**
```rust
use tokio::sync::{Mutex, RwLock, Notify, mpsc};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use tracing::{info, warn, debug, error};
use async_trait::async_trait;
```

## Error Handling

**Primary Pattern: thiserror for typed errors**

Error types use `#[derive(Error, Debug)]` with `#[error("...")]` messages:

```rust
// In crates/openfang-types/src/error.rs
#[derive(Error, Debug)]
pub enum OpenFangError {
    #[error("Agent not found: {0}")]
    AgentNotFound(String),

    #[error("Tool execution failed: {tool_id} — {reason}")]
    ToolExecution { tool_id: String, reason: String },

    #[error(transparent)]
    Io(#[from] std::io::Error),
}

// Alias for results
pub type OpenFangResult<T> = Result<T, OpenFangError>;
```

**Per-crate error aliases:**
- `crates/openfang-kernel/src/error.rs`: `pub type KernelResult<T> = Result<T, KernelError>;`
- LLM driver: `crates/openfang-runtime/src/llm_driver.rs`: `LlmError` enum with variants for HTTP, API, rate limiting, auth, etc.

**Error propagation:**
- Use `#[error(transparent)]` for wrapped errors
- Use `?` operator for propagation
- Never silently swallow errors with `unwrap()` in production paths (only in tests or known-ok scenarios)

**Result type alias convention:**
Every crate with significant error types defines its own `Result<T>` alias (e.g., `KernelResult`, `OpenFangResult`).

## Logging

**Framework:** tracing

**Key imports:**
```rust
use tracing::{info, warn, debug, error};
```

**Structured logging with fields:**
```rust
info!(
    request_id = %request_id,
    method = %method,
    path = %uri,
    status = status,
    latency_ms = elapsed.as_millis() as u64,
    "API request"
);
```

**When to log:**
- `info!`: Startup, shutdown, significant state changes
- `warn!`: Recoverable issues (config reload failures, rate limiting, malformed input)
- `debug!`: Detailed flow tracing (hot-reload decisions)
- `error!`: Unrecoverable failures (panic-level, though use proper error types first)

**Log to stderr:** Tracing defaults to stderr; structured JSON output available via `tracing-subscriber` with `env-filter` and `json` features.

## Async Patterns

**Runtime:** tokio with `features = ["full"]`

**Key patterns:**
- Use `async fn` for all async functions
- Use `#[tokio::test]` for async tests
- Use `async-trait` for async trait methods
- Prefer `tokio::sync::Mutex<T>` over `std::sync::Mutex<T>` in async contexts
- Prefer channels (`mpsc`, `oneshot`) over shared mutability where possible

**Shared state:**
- `Arc<...>` for shared ownership across tasks
- `Arc<tokio::sync::RwLock<T>>` or `Arc<Mutex<T>>` for interior mutability
- `DashMap` for concurrent hash maps (workspace dependency)

## Documentation

**Doc comments:** Use `//!` at module level, `///` at item level
**Pattern:**
```rust
//! Core agent execution loop.
//!
//! Handles receiving a user message, recalling relevant memories,
//! calling the LLM, executing tool calls, and saving the conversation.

/// Maximum iterations in the agent loop before giving up.
const MAX_ITERATIONS: u32 = 50;
```

**Required doc contexts:**
- All public items (especially in lib.rs exports)
- Complex functions (parameters, return values, behavior)
- Error variants (what triggers them)
- Test files (what they test, how to run)

## Security Patterns

**Secrets:** Never hardcode. Always use environment variables or config fields (`api_key_env: "GROQ_API_KEY"`).

**File permissions:** On Unix, restrict daemon info files to owner-only (0600):
```rust
#[cfg(unix)]
fn restrict_permissions(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    let _ = std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o600));
}
```

**Input validation:**
- Validate all user input at API boundaries (axum extractors)
- Return 400 for invalid UUIDs, 404 for not-found resources
- Sanitize template names to prevent path traversal

**CORS:** Restrict origins explicitly. Never use `CorsLayer::permissive()` in production (only in test helpers).

## Test Utilities

**tempfile:** Used for creating temporary directories and files in tests. Always use `tempfile::TempDir` or `tempfile::tempdir()`.

**Assertions:**
- Standard `assert!`, `assert_eq!`, `assert_ne!`
- `assert!(value.is_ok())` over `value.unwrap()` in assertions
- Use `matches!` macro for enum variant matching in assertions

---

*Convention analysis: 2026-03-23*
