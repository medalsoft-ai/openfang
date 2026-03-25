---
phase: 03-execution-engine
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - crates/openfang-memory/src/migration.rs
  - crates/openfang-runtime/src/execution_store.rs
  - crates/openfang-runtime/src/lib.rs
autonomous: true
requirements:
  - HAND-STEP-07
must_haves:
  truths:
    - SQLite tables exist for hand_executions and step_executions
    - ExecutionStore can create, read, update execution records
    - Step execution status can be persisted and retrieved
  artifacts:
    - path: "crates/openfang-memory/src/migration.rs"
      provides: "Migration v9 for execution tables"
      contains: "CREATE TABLE hand_executions"
    - path: "crates/openfang-runtime/src/execution_store.rs"
      provides: "SQLite storage for execution state"
      exports: ["ExecutionStore", "HandExecutionRecord", "StepExecutionRecord"]
  key_links:
    - from: "crates/openfang-memory/src/migration.rs"
      to: "hand_executions table"
      via: "migrate_v9 function"
---

<objective>
Create SQLite schema and storage layer for Hand execution state tracking.

Purpose: Persist execution state so it survives daemon restarts and supports wait-for-input steps that may pause for hours.
Output: Migration v9 + ExecutionStore module with full CRUD operations
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-execution-engine/03-CONTEXT.md
@.planning/phases/03-execution-engine/03-RESEARCH.md
@crates/openfang-memory/src/migration.rs
@crates/openfang-memory/src/structured.rs
@crates/openfang-memory/src/substrate.rs
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add Migration v9 for Execution Tables</name>
  <files>crates/openfang-memory/src/migration.rs</files>
  <read_first>
    - crates/openfang-memory/src/migration.rs (current schema version 8, see migrate_v8)
  </read_first>
  <behavior>
    - Test: Migration creates hand_executions and step_executions tables
    - Test: Schema version is set to 9 after migration
    - Test: Indexes are created for efficient queries
  </behavior>
  <action>
    Update SCHEMA_VERSION from 8 to 9.

    Add migrate_v9 function that creates:

    ```sql
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
    CREATE INDEX idx_step_executions_step_id ON step_executions(step_id);
    ```

    Add migration entry to migrations table with description "Add hand execution tracking tables".

    Add test: test_migration_v9_creates_execution_tables that verifies tables exist.
  </action>
  <verify>
    <automated>cargo test -p openfang-memory test_migration_v9</automated>
  </verify>
  <acceptance_criteria>
    - migration.rs contains SCHEMA_VERSION = 9
    - migration.rs contains fn migrate_v9 with CREATE TABLE hand_executions
    - migration.rs contains CREATE TABLE step_executions with FOREIGN KEY
    - migration.rs contains CREATE INDEX idx_hand_executions_hand_id
    - migration.rs contains CREATE INDEX idx_step_executions_execution_id
    - Test test_migration_v9_creates_execution_tables passes
  </acceptance_criteria>
  <done>Migration v9 creates execution tables with proper indexes</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create ExecutionStore Module</name>
  <files>crates/openfang-runtime/src/execution_store.rs, crates/openfang-runtime/src/lib.rs</files>
  <read_first>
    - crates/openfang-memory/src/structured.rs (SQLite pattern with Arc<Mutex<Connection>>)
    - crates/openfang-runtime/src/lib.rs (module declarations)
  </read_first>
  <behavior>
    - Test: ExecutionStore::new creates store from connection
    - Test: create_execution inserts hand_executions record
    - Test: create_step_execution inserts step_executions record
    - Test: update_step_status changes status and timestamps
    - Test: get_execution retrieves execution with all steps
    - Test: list_executions_for_hand returns executions for a hand_id
  </behavior>
  <action>
    Create crates/openfang-runtime/src/execution_store.rs with:

    ```rust
    use openfang_types::error::{OpenFangError, OpenFangResult};
    use rusqlite::Connection;
    use serde::{Deserialize, Serialize};
    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
    pub enum ExecutionStatus {
        Pending,
        Running,
        Completed,
        Failed,
    }

    #[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
    pub enum StepStatus {
        Pending,
        Running,
        Completed,
        Failed,
        Waiting,
        Skipped,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct HandExecutionRecord {
        pub id: String,
        pub hand_id: String,
        pub agent_id: String,
        pub status: ExecutionStatus,
        pub current_step_id: Option<String>,
        pub started_at: Option<chrono::DateTime<chrono::Utc>>,
        pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
        pub created_at: chrono::DateTime<chrono::Utc>,
    }

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct StepExecutionRecord {
        pub id: String,
        pub execution_id: String,
        pub step_id: String,
        pub status: StepStatus,
        pub input: Option<serde_json::Value>,
        pub output: Option<serde_json::Value>,
        pub error: Option<String>,
        pub retry_count: i32,
        pub started_at: Option<chrono::DateTime<chrono::Utc>>,
        pub completed_at: Option<chrono::DateTime<chrono::Utc>>,
    }

    #[derive(Clone)]
    pub struct ExecutionStore {
        conn: Arc<Mutex<Connection>>,
    }

    impl ExecutionStore {
        pub fn new(conn: Arc<Mutex<Connection>>) -> Self {
            Self { conn }
        }

        pub async fn create_execution(&self, exec: &HandExecutionRecord) -> OpenFangResult<()> {
            // Use spawn_blocking for SQLite operations
        }

        pub async fn get_execution(&self, id: &str) -> OpenFangResult<Option<HandExecutionRecord>> {
            // Return execution with all step records
        }

        pub async fn update_execution_status(
            &self,
            id: &str,
            status: ExecutionStatus,
            current_step_id: Option<&str>,
        ) -> OpenFangResult<()> {
        }

        pub async fn create_step_execution(&self, step: &StepExecutionRecord) -> OpenFangResult<()> {
        }

        pub async fn update_step_status(
            &self,
            id: &str,
            status: StepStatus,
            output: Option<serde_json::Value>,
            error: Option<String>,
        ) -> OpenFangResult<()> {
        }

        pub async fn list_executions_for_hand(&self, hand_id: &str) -> OpenFangResult<Vec<HandExecutionRecord>> {
        }

        pub async fn get_step_execution(
            &self,
            execution_id: &str,
            step_id: &str,
        ) -> OpenFangResult<Option<StepExecutionRecord>> {
        }
    }
    ```

    Add `pub mod execution_store;` to crates/openfang-runtime/src/lib.rs.

    Implement all methods following the pattern in structured.rs:
    - Use tokio::task::spawn_blocking for all SQLite operations
    - Use Arc::clone(&self.conn) to share connection
    - Lock the mutex: conn.lock().map_err(|e| OpenFangError::Internal(e.to_string()))?
    - Use rusqlite::params![] for query parameters
    - Handle QueryReturnedNoRows for optional queries

    Add comprehensive unit tests at the bottom of the file.
  </action>
  <verify>
    <automated>cargo test -p openfang-runtime execution_store</automated>
  </verify>
  <acceptance_criteria>
    - execution_store.rs exists with ExecutionStore struct
    - execution_store.rs contains HandExecutionRecord with fields: id, hand_id, agent_id, status, current_step_id, started_at, completed_at, created_at
    - execution_store.rs contains StepExecutionRecord with fields: id, execution_id, step_id, status, input, output, error, retry_count
    - ExecutionStore has methods: create_execution, get_execution, update_execution_status, create_step_execution, update_step_status, list_executions_for_hand, get_step_execution
    - All methods use tokio::task::spawn_blocking
    - lib.rs contains "pub mod execution_store;"
    - All tests pass
  </acceptance_criteria>
  <done>ExecutionStore module with full CRUD operations</done>
</task>

</tasks>

<verification>
- Migration v9 creates tables with proper schema
- ExecutionStore can persist and retrieve execution records
- All tests pass: cargo test -p openfang-runtime execution_store
- Build passes: cargo build --workspace --lib
</verification>

<success_criteria>
1. SQLite tables hand_executions and step_executions exist after migration
2. ExecutionStore provides async CRUD operations for execution records
3. All unit tests pass
4. No clippy warnings
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-engine/03-01-store-SUMMARY.md`
</output>
