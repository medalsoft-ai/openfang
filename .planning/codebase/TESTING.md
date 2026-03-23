# Testing Patterns

**Analysis Date:** 2026-03-23

## Test Framework

**Runner:** Built-in Rust test harness (no external framework)
- `#[test]` for synchronous unit tests
- `#[tokio::test]` for async tests (tokio runtime)
- `tokio-test = "0.4"` in workspace dev-dependencies

**Assertion Library:** Standard Rust assertions
- `assert!`, `assert_eq!`, `assert_ne!`, `assert!(x.is_ok())`

**Temp Files:** `tempfile` crate (workspace dev-dependency)
- `tempfile::tempdir()` returns `TempDir`
- Always call `.expect()` or `.unwrap()` on creation failures

**Run Commands:**
```bash
cargo test --workspace                  # All tests in workspace
cargo test -p openfang-kernel           # Tests for specific crate
cargo test --test integration_test      # Run specific test file
cargo test --test integration_test -- --nocapture  # Show println! output
cargo test -- --ignored                # Run ignored tests
cargo test integration                  # Run tests matching "integration"
```

## Test File Organization

**Location Patterns:**

1. **Inline unit tests** (`#[cfg(test)] mod tests` inside source files):
   - Files: `src/lib.rs`, `src/str_utils.rs`, `src/embedding.rs`
   - Location: Bottom of the file
   ```rust
   #[cfg(test)]
   mod tests {
       use super::*;

       #[test]
       fn test_cosine_similarity_identical() {
           let a = vec![1.0, 0.0, 0.0];
           let b = vec![1.0, 0.0, 0.0];
           let sim = cosine_similarity(&a, &b);
           assert!((sim - 1.0).abs() < 1e-6);
       }
   }
   ```

2. **Integration tests** (`tests/` directory within crate):
   - Location: `crates/<crate>/tests/*.rs`
   - Naming: Descriptive (e.g., `integration_test.rs`, `multi_agent_test.rs`)
   - Compile as separate binary; must import crate as dependency
   ```rust
   // crates/openfang-kernel/tests/integration_test.rs
   use openfang_kernel::OpenFangKernel;
   use openfang_types::config::KernelConfig;

   #[tokio::test]
   async fn test_full_pipeline_with_groq() {
       // real kernel boot, no mocking
   }
   ```

**Crate-level test organization:**
```
crates/openfang-api/tests/
  api_integration_test.rs      # HTTP API tests
  daemon_lifecycle_test.rs     # PID file, daemon info, graceful shutdown
  load_test.rs                # Performance and concurrency tests

crates/openfang-kernel/tests/
  integration_test.rs         # Kernel boot, agent spawn, send_message
  multi_agent_test.rs         # Multi-agent workflows
  workflow_integration_test.rs # Workflow CRUD and execution
  wasm_agent_integration_test.rs # WASM module execution

crates/openfang-channels/tests/
  bridge_integration_test.rs  # Channel bridge dispatch pipeline

crates/openfang-migrate/tests/
  provider_json5_agents.rs     # JSON5 migration: agent parsing
  provider_json5_default_model.rs
  provider_json5_provider_catalog.rs
  provider_legacy_yaml.rs      # YAML legacy format migration
```

## Test Structure

**Integration Test Pattern (Real Kernel + HTTP Server):**

```rust
// crates/openfang-api/tests/api_integration_test.rs

// Test server wrapper with automatic cleanup
struct TestServer {
    base_url: String,
    state: Arc<AppState>,
    _tmp: tempfile::TempDir,  // Drop = cleanup
}

impl Drop for TestServer {
    fn drop(&mut self) {
        self.state.kernel.shutdown();
    }
}

// Server factory using ollama (no API key required)
async fn start_test_server() -> TestServer {
    let tmp = tempfile::tempdir().expect("Failed to create temp dir");
    let config = KernelConfig {
        home_dir: tmp.path().to_path_buf(),
        data_dir: tmp.path().join("data"),
        default_model: DefaultModelConfig {
            provider: "ollama".to_string(),
            model: "test-model".to_string(),
            api_key_env: "OLLAMA_API_KEY".to_string(),
            base_url: None,
        },
        ..KernelConfig::default()
    };

    let kernel = OpenFangKernel::boot_with_config(config).expect("Kernel should boot");
    let kernel = Arc::new(kernel);
    kernel.set_self_handle();

    let state = Arc::new(AppState { kernel, /* ... */ });

    let app = Router::new()
        .route("/api/health", axum::routing::get(routes::health))
        // ... more routes
        .layer(axum::middleware::from_fn(middleware::request_logging))
        .layer(TraceLayer::new_for_http())
        .layer(CorsLayer::permissive())  // Only in test helpers!
        .with_state(state.clone());

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap(); });

    TestServer { base_url: format!("http://{}", addr), state, _tmp: tmp }
}

// Inline manifest constants
const TEST_MANIFEST: &str = r#"
name = "test-agent"
version = "0.1.0"
module = "builtin:chat"
[model]
provider = "ollama"
model = "test-model"
"#;
```

**Test Naming Convention:**
- `test_<what_is_being_tested>_<scenario>()` for unit tests
- `test_<feature>()` for integration tests
- Use descriptive names: `test_spawn_list_kill_agent`, `test_auth_rejects_wrong_token`

**Test Helper Pattern:**
- `test_config()` or `spawn_test_agent()` helper functions
- Use `.expect()` with descriptive messages: `kernel.spawn_agent(manifest).expect("Agent should spawn")`

## Mocking

**Philosophy:** Minimal mocking. Prefer real objects with in-memory storage over mocks.

**Real objects used in tests:**
- `OpenFangKernel::boot_with_config()` — real kernel with temp directories
- `reqwest::Client` — real HTTP client against real test server
- `tempfile::TempDir` — real filesystem isolation

**Where mocks ARE used:**

1. **Channel bridge tests** — mock `ChannelAdapter` trait:
   ```rust
   // crates/openfang-channels/tests/bridge_integration_test.rs
   struct MockAdapter {
       name: String,
       channel_type: ChannelType,
       rx: Mutex<Option<mpsc::Receiver<ChannelMessage>>>,
       sent: Arc<Mutex<Vec<(String, String)>>>,
       shutdown_tx: watch::Sender<bool>,
   }

   #[async_trait]
   impl ChannelAdapter for MockAdapter {
       async fn start(&self, rx: mpsc::Receiver<ChannelMessage>) { /* ... */ }
       async fn send(&self, platform_id: &str, text: &str) -> Result<(), String> { /* ... */ }
   }
   ```

2. **In-process dispatch pipeline** — uses real tokio channels, mock adapters, real `BridgeManager`

**No external service mocking:**
- Tests hit real HTTP endpoints (no wiremock, no httpbin)
- Tests use `ollama` provider with `test-model` to avoid API calls
- LLM-dependent tests are gated behind environment variables

## Test Data / Fixtures

**Inline TOML manifests:**
```rust
const TEST_MANIFEST: &str = r#"
name = "test-agent"
version = "0.1.0"
description = "Integration test agent"
author = "test"
module = "builtin:chat"

[model]
provider = "ollama"
model = "test-model"
system_prompt = "You are a test agent. Reply concisely."

[capabilities]
tools = ["file_read"]
memory_read = ["*"]
memory_write = ["self.*"]
"#;
```

**Dynamic manifests with format:**
```rust
let manifest = format!(
    r#"
name = "agent-{i}"
module = "builtin:chat"
[model]
provider = "ollama"
model = "test-model"
system_prompt = "Agent {i}."
"#
);
```

**Kernel config factories:**
```rust
fn test_config(provider: &str, model: &str, api_key_env: &str) -> KernelConfig {
    let tmp = tempfile::tempdir().unwrap();
    KernelConfig {
        home_dir: tmp.path().to_path_buf(),
        data_dir: tmp.path().join("data"),
        default_model: DefaultModelConfig {
            provider: provider.to_string(),
            model: model.to_string(),
            api_key_env: api_key_env.to_string(),
            base_url: None,
        },
        ..KernelConfig::default()
    }
}
```

**File-based fixtures:** JSON5 and YAML files in test directories (for migration tests).

## Coverage

**No enforced coverage target** — none detected in CI config or project docs.

**To view coverage (if desired):**
```bash
# Install tarpaulin
cargo install cargo-tarpaulin
cargo tarpaulin --workspace --all-targets
```

## Test Types

**Unit Tests:**
- Inline `#[cfg(test)] mod tests` blocks
- Test pure functions, utilities, error variants
- Use `#[test]` for sync, `#[tokio::test]` for async
- Example: `crates/openfang-types/src/lib.rs` — `truncate_str` tests with ASCII, Chinese, emoji edge cases

**Integration Tests:**
- Live kernel boot with temp directories
- Real HTTP server with `reqwest` client
- No mocks for core logic (kernel, agent loop, workflows)
- Use `#[tokio::test]` for all integration tests

**Load/Performance Tests:**
- File: `crates/openfang-api/tests/load_test.rs`
- Measure: concurrent spawns, endpoint latency (p50/p95/p99), concurrent reads, session management, workflow operations
- Metrics output to stderr with `eprintln!`
- Assertions: `assert!(success >= n - 2)`, `assert!(p99 < Duration::from_millis(500))`

**WASM Integration Tests:**
- File: `crates/openfang-kernel/tests/wasm_agent_integration_test.rs`
- Use real WASM modules (WAT format inline)
- Test agent spawn with `module = "wasm:..."`

## Common Patterns

**Async Testing:**
```rust
#[tokio::test]
async fn test_spawn_list_kill_agent() {
    let server = start_test_server().await;
    let client = reqwest::Client::new();

    // Spawn
    let resp = client
        .post(format!("{}/api/agents", server.base_url))
        .json(&serde_json::json!({"manifest_toml": TEST_MANIFEST}))
        .send()
        .await
        .unwrap();

    assert_eq!(resp.status(), 201);
    let body: serde_json::Value = resp.json().await.unwrap();
    let agent_id = body["agent_id"].as_str().unwrap().to_string();
}
```

**Error Testing:**
```rust
#[tokio::test]
async fn test_invalid_agent_id_returns_400() {
    let server = start_test_server().await;
    let client = reqwest::Client::new();

    let resp = client
        .post(format!("{}/api/agents/not-a-uuid/message", server.base_url))
        .json(&serde_json::json!({"message": "hello"}))
        .send()
        .await
        .unwrap();

    assert_eq!(resp.status(), 400);
    let body: serde_json::Value = resp.json().await.unwrap();
    assert!(body["error"].as_str().unwrap().contains("Invalid"));
}
```

**Environment-gated Tests:**
```rust
#[tokio::test]
async fn test_full_pipeline_with_groq() {
    if std::env::var("GROQ_API_KEY").is_err() {
        eprintln!("GROQ_API_KEY not set, skipping integration test");
        return;
    }
    // Real LLM test
}
```

**Serde round-trip tests:**
```rust
#[test]
fn test_daemon_info_serde_roundtrip() {
    let info = DaemonInfo { /* ... */ };
    let json = serde_json::to_string_pretty(&info).unwrap();
    let parsed: DaemonInfo = serde_json::from_str(&json).unwrap();
    assert_eq!(parsed.pid, 12345);
}
```

## LLM Integration Tests

**Gated by environment variable:**
- `GROQ_API_KEY` gates real LLM calls
- Tests skip gracefully if not set: `eprintln!("... skipping")`

**Test manifests:**
- Use `provider = "groq"` and `model = "llama-3.3-70b-versatile"`
- `api_key_env = "GROQ_API_KEY"` references env var name

**Run LLM tests:**
```bash
GROQ_API_KEY=gsk_... cargo test -p openfang-kernel --test integration_test -- --nocapture
```

---

*Testing analysis: 2026-03-23*
