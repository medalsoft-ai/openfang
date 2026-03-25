# Phase 3: Execution Engine — Research

**Researched:** 2026-03-25
**Domain:** Rust Async Execution, SQLite Persistence, WebSocket Broadcasting
**Confidence:** HIGH

---

## Research Summary

Phase 3 implements the core Hand execution engine that enables LLM-driven step execution with state persistence, real-time updates, and variable resolution. The architecture leverages OpenFang's existing patterns: SQLite via `rusqlite` for persistence, WebSocket for real-time updates, and prompt injection for LLM coordination.

### Key Findings

1. **SQLite Storage Pattern**: The codebase uses `Arc<Mutex<Connection>>` with `spawn_blocking` for async SQLite operations. Migration system exists in `openfang-memory/src/migration.rs` (version 8 currently).

2. **WebSocket Broadcasting**: Existing WS implementation in `ws.rs` uses per-agent channels. For Hand execution, we'll need to add a broadcast mechanism for step status changes.

3. **Agent Loop Integration**: The `agent_loop.rs` already supports hooks and phase callbacks — ideal integration point for step execution tracking.

4. **Variable Resolution**: Simple regex-based `{{step_id.output}}` substitution is sufficient; no complex expression engine needed for Phase 3.

### Primary Recommendation

Implement execution engine as a new `openfang-runtime` module (`hand_executor.rs`) that:
- Wraps the existing agent loop with step-tracking middleware
- Uses SQLite tables (`hand_executions`, `step_executions`) for state persistence
- Broadcasts updates via WebSocket messages of type `"step_status_change"`
- Resolves variables pre-execution using collected step outputs

---

## Technical Patterns

### 1. SQLite Storage Pattern

**Existing Pattern** (from `openfang-memory/src/structured.rs`):

```rust
use rusqlite::Connection;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
pub struct ExecutionStore {
    conn: Arc<Mutex<Connection>>,
}

impl ExecutionStore {
    pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
        Self { conn }
    }

    pub async fn create_execution(&self, exec: &HandExecution) -> OpenFangResult<()> {
        let conn = self.conn.clone();
        let exec = exec.clone();
        tokio::task::spawn_blocking(move || {
            let conn = conn.lock().map_err(|e| ...)?;
            conn.execute(
                "INSERT INTO hand_executions (...) VALUES (...)",
                params![...],
            )?;
            Ok(())
        }).await.map_err(|e| ...)?
    }
}
```

**Key Rules:**
- Always use `spawn_blocking` for SQLite operations (avoids blocking tokio runtime)
- Use `Arc<Mutex<Connection>>` for shared access
- Handle `rusqlite::Error::QueryReturnedNoRows` explicitly for optional queries

### 2. State Machine Implementation

**States:**
```rust
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
pub enum StepStatus {
    Pending,    // Waiting to execute
    Running,    // Currently executing
    Completed,  // Successfully finished
    Failed,     // Error occurred
    Waiting,    // wait-for-input: waiting for user
    Skipped,    // User chose to skip after failure
}
```

**Transitions:**
```
pending → running → completed
   ↑         ↓
   └──── failed ────┘ (retry allowed)

pending → running → waiting ──user input──→ pending
```

**Validation:** Use a `can_transition(from, to)` function to enforce valid state changes.

### 3. Variable Resolution Pattern

**Pre-execution resolution** (simpler than runtime interpolation):

```rust
pub fn resolve_variables(
    input: &serde_json::Value,
    step_outputs: &HashMap<String, serde_json::Value>,
) -> serde_json::Value {
    let input_str = input.to_string();
    let resolved = VARIABLE_REGEX.replace_all(&input_str, |caps: &regex::Captures| {
        let step_id = &caps[1];
        let field = &caps[2];
        step_outputs
            .get(step_id)
            .and_then(|o| o.get(field))
            .map(|v| v.to_string())
            .unwrap_or_else(|| caps[0].to_string()) // Keep original if not found
    });
    serde_json::from_str(&resolved).unwrap_or(input.clone())
}

// Regex: \{\{(\w+)\.(\w+)\}\}
// Matches: {{step-1.result}}, {{step_2.output}}, etc.
```

### 4. WebSocket Broadcast Pattern

**Add to existing ws.rs** — new message type:

```rust
// In handle_agent_ws, subscribe to a broadcast channel for this agent
let (broadcast_tx, mut broadcast_rx) = tokio::sync::mpsc::unbounded_channel();
state.kernel.hand_executor.subscribe_to_execution(agent_id, broadcast_tx);

// Spawn task to forward broadcast messages to WebSocket
tokio::spawn(async move {
    while let Some(msg) = broadcast_rx.recv().await {
        let _ = send_json(&sender, &msg).await;
    }
});
```

**Message format:**
```json
{
  "type": "step_status_change",
  "data": {
    "execution_id": "exec-xxx",
    "step_id": "step-1",
    "status": "running",
    "timestamp": "2026-03-25T10:30:00Z",
    "output": null  // Only present on completed
  }
}
```

### 5. Prompt Injection Pattern

**Hand Execution System Prompt** (append to agent's system prompt):

```rust
pub fn build_hand_execution_prompt(
    steps: &[HandStep],
    current_step_id: Option<&str>,
    step_outputs: &HashMap<String, serde_json::Value>,
) -> String {
    let mut prompt = String::from("## Hand Execution Context\n\n");
    prompt.push_str("You are executing a Hand workflow. Follow these steps:\n\n");

    for step in steps {
        let status = if Some(step.id.as_str()) == current_step_id {
            "[CURRENT]"
        } else if step_outputs.contains_key(&step.id) {
            "[COMPLETED]"
        } else {
            "[PENDING]"
        };

        prompt.push_str(&format!("- {}: {} {}\n", step.id, step.name, status));

        // Add step-specific instructions
        match &step.step_type {
            StepType::ExecuteTool { tool_name, input } => {
                prompt.push_str(&format!("  → Execute tool '{}' with input: {}\n",
                    tool_name, input));
            }
            StepType::WaitForInput { prompt: p, .. } => {
                prompt.push_str(&format!("  → Ask user: {}\n", p));
            }
            // ... other variants
        }
    }

    prompt.push_str("\nWhen you complete a step, call the 'hand_report_step' tool.\n");
    prompt
}
```

### 6. Integration with Agent Loop

**Hook into existing loop** via a new tool:

```rust
// New tool: hand_report_step
pub struct HandReportStepTool {
    execution_store: Arc<ExecutionStore>,
    broadcaster: Arc<tokio::sync::broadcast::Sender<StepStatusChange>>,
}

#[async_trait]
impl Tool for HandReportStepTool {
    async fn execute(&self, args: Args) -> ToolResult {
        // Update step status in SQLite
        self.execution_store.update_step_status(...).await?;

        // Broadcast to WebSocket clients
        let _ = self.broadcaster.send(StepStatusChange { ... });

        // Return success
        Ok(json!({"status": "recorded"}))
    }
}
```

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Built-in `cargo test` |
| Config file | None (inline tests) |
| Quick run | `cargo test -p openfang-runtime hand_executor` |
| Full suite | `cargo test --workspace` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Test Location |
|--------|----------|-----------|---------------|
| EXEC-01 | Step status transitions correctly | Unit | `hand_executor::tests::test_status_transitions` |
| EXEC-02 | Variable resolution works | Unit | `step_variable_resolver::tests::test_resolve` |
| EXEC-03 | SQLite persistence roundtrip | Integration | `execution_store::tests::test_persist_execution` |
| EXEC-04 | WebSocket broadcasts status changes | Integration | `ws::tests::test_step_broadcast` |
| EXEC-05 | Retry logic (failed → pending → running) | Unit | `hand_executor::tests::test_retry_flow` |
| EXEC-06 | Wait-for-input timeout handling | Unit | `hand_executor::tests::test_wait_timeout` |
| EXEC-07 | Fail-stop on step error | Integration | `hand_executor::tests::test_fail_stop` |

### Wave 0 Gaps
- [ ] `crates/openfang-runtime/src/hand_executor.rs` — main executor module
- [ ] `crates/openfang-runtime/src/step_variable_resolver.rs` — variable resolution
- [ ] `crates/openfang-runtime/src/execution_store.rs` — SQLite storage
- [ ] `crates/openfang-memory/src/migration.rs` v9 — add hand_executions, step_executions tables
- [ ] `crates/openfang-api/src/routes.rs` — add execution control endpoints

---

## Risks and Mitigations

### Risk 1: WebSocket Broadcast Scalability
**What:** Broadcasting to many connected clients could block the executor.

**Mitigation:** Use `tokio::sync::broadcast` channel with bounded capacity (100). If buffer full, oldest messages are dropped — clients can poll for full state on reconnect.

### Risk 2: SQLite Write Contention
**What:** Multiple Hand executions writing step updates concurrently.

**Mitigation:** SQLite WAL mode is already enabled (`PRAGMA journal_mode=WAL`). Each write is brief (single row update). Use `spawn_blocking` to avoid blocking async runtime.

### Risk 3: LLM Doesn't Follow Step Sequence
**What:** LLM might skip steps or execute out of order.

**Mitigation:**
1. Clear prompt instructions on step order
2. Tool `hand_report_step` validates step is actually pending before allowing status change
3. UI shows actual execution order vs. planned order for debugging

### Risk 4: Variable Resolution Edge Cases
**What:** Circular references, missing fields, nested JSON.

**Mitigation:**
- Only resolve one level deep (no nested `{{step-a.{{step-b.field}}}}`)
- Missing variables: configurable behavior (preserve literal vs. error)
- Test with `serde_json::Value` roundtrip to ensure valid JSON after resolution

### Risk 5: Long-Running wait-for-input
**What:** User might not respond for hours/days.

**Mitigation:**
- SQLite persistence means state survives restarts
- Timeout (default 300s) moves step to `Failed` state
- On daemon restart, resume all `Waiting` executions from SQLite

---

## References

### Existing Codebase Patterns

| File | Purpose | Relevant For |
|------|---------|--------------|
| `crates/openfang-runtime/src/agent_loop.rs` | Core agent execution | Integration point for step tracking |
| `crates/openfang-runtime/src/prompt_builder.rs` | System prompt construction | Hand execution prompt template |
| `crates/openfang-api/src/ws.rs` | WebSocket handling | Broadcasting step status changes |
| `crates/openfang-memory/src/structured.rs` | SQLite KV store | Execution store implementation pattern |
| `crates/openfang-memory/src/migration.rs` | Schema migrations | Adding hand_executions tables |
| `crates/openfang-memory/src/substrate.rs` | MemorySubstrate composition | Adding ExecutionStore to substrate |
| `crates/openfang-hands/src/steps.rs` | Step type definitions | Variable resolution target |
| `crates/openfang-hands/src/lib.rs` | HandDefinition with steps | Execution input |

### SQLite Schema (from CONTEXT.md)

```sql
-- Migration v9: Hand execution tables
CREATE TABLE hand_executions (
    id TEXT PRIMARY KEY,
    hand_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    status TEXT NOT NULL, -- pending, running, completed, failed
    current_step_id TEXT,
    started_at DATETIME,
    completed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE step_executions (
    id TEXT PRIMARY KEY,
    execution_id TEXT NOT NULL,
    step_id TEXT NOT NULL,
    status TEXT NOT NULL, -- pending, running, completed, failed, waiting
    input TEXT, -- JSON
    output TEXT, -- JSON
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    started_at DATETIME,
    completed_at DATETIME,
    FOREIGN KEY (execution_id) REFERENCES hand_executions(id)
);

CREATE INDEX idx_hand_executions_hand_id ON hand_executions(hand_id);
CREATE INDEX idx_hand_executions_agent_id ON hand_executions(agent_id);
CREATE INDEX idx_step_executions_execution_id ON step_executions(execution_id);
```

### API Endpoints (from CONTEXT.md)

| Endpoint | Method | Handler Location |
|----------|--------|------------------|
| `/api/hands/{id}/activate` | POST | `routes::activate_hand` (extend existing) |
| `/api/hands/{id}/executions` | GET | New: `routes::list_hand_executions` |
| `/api/hands/{id}/executions/{exec_id}` | GET | New: `routes::get_hand_execution` |
| `/api/hands/{id}/executions/{exec_id}/retry` | POST | New: `routes::retry_hand_execution` |
| `/api/hands/{id}/executions/{exec_id}/skip` | POST | New: `routes::skip_hand_step` |
| `/api/hands/{id}/executions/{exec_id}/input` | POST | New: `routes::submit_hand_input` |

---

## State of the Art

| Approach | Status | Notes |
|----------|--------|-------|
| Prompt-based execution | **Selected** | Simpler, leverages existing agent_loop |
| Engine-based execution | Deferred | Would require custom interpreter |
| SQLite persistence | **Selected** | Matches existing patterns |
| In-memory only | Rejected | Doesn't support wait-for-input resumption |
| Pre-parse variables | **Selected** | Simpler than runtime resolution |
| Runtime variable interpolation | Rejected | More complex, error-prone |
| Fail-stop error handling | **Selected** | User-controlled retry/skip |
| Auto-retry with backoff | Rejected | Less predictable for users |

---

## Open Questions

1. **Sub-Hand Variable Isolation**
   - What we know: Sub-Hand steps should isolate variables
   - What's unclear: How to pass input_mapping into sub-hand execution context
   - Recommendation: Pass as initial step_outputs HashMap

2. **Condition Step Evaluation**
   - What we know: Condition steps have `expression` field
   - What's unclear: Expression language (JavaScript? Python? Custom?)
   - Recommendation: Simple boolean key lookup in step_outputs for Phase 3

3. **Loop Step Iteration**
   - What we know: Loop has `iterator`, `items`, `body`
   - What's unclear: How to track loop state across agent loop iterations
   - Recommendation: Expand loop into sequential steps before execution

---

## Sources

### Primary (HIGH confidence)
- `crates/openfang-runtime/src/agent_loop.rs` — Agent execution loop patterns
- `crates/openfang-api/src/ws.rs` — WebSocket message handling
- `crates/openfang-memory/src/structured.rs` — SQLite store patterns
- `crates/openfang-memory/src/migration.rs` — Schema migration patterns
- `crates/openfang-hands/src/steps.rs` — Step type definitions
- `crates/openfang-hands/src/lib.rs` — HandDefinition structure

### Secondary (MEDIUM confidence)
- `crates/openfang-runtime/src/prompt_builder.rs` — Prompt construction patterns
- `crates/openfang-api/src/routes.rs` — API endpoint patterns
- `crates/openfang-memory/src/substrate.rs` — MemorySubstrate composition

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — Uses existing OpenFang patterns (SQLite, WebSocket, agent_loop)
- Architecture: HIGH — Clear integration points with existing code
- Pitfalls: MEDIUM — LLM behavior unpredictable, need runtime validation

**Research date:** 2026-03-25
**Valid until:** 2026-04-25 (stable patterns, low churn expected)

---

## RESEARCH COMPLETE

**Phase:** 3 - Execution Engine
**Confidence:** HIGH

### Key Findings Summary
1. SQLite storage follows established `Arc<Mutex<Connection>>` + `spawn_blocking` pattern
2. WebSocket broadcasting uses per-agent channels; add broadcast sender for step updates
3. Variable resolution: simple regex `{{step_id.field}}` replacement pre-execution
4. Agent loop integration via new `hand_report_step` tool
5. State machine: pending → running → completed/failed/waiting, with retry support

### File Created
`.planning/phases/03-execution-engine/03-RESEARCH.md`

### Ready for Planning
Research complete. Planner can now create PLAN.md with:
- Migration v9 for hand_executions/step_executions tables
- ExecutionStore implementation following StructuredStore pattern
- HandExecutor module with state machine and variable resolution
- WebSocket broadcast integration in ws.rs
- API endpoints for execution control
