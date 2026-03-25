---
phase: 03-execution-engine
plan: 02
type: execute
wave: 2
depends_on: [03-01]
files_modified:
  - crates/openfang-runtime/src/step_variable_resolver.rs
  - crates/openfang-runtime/src/hand_executor.rs
  - crates/openfang-runtime/src/lib.rs
autonomous: true
requirements:
  - HAND-STEP-07
  - HAND-STEP-08
must_haves:
  truths:
    - Variable resolver can replace {{step_id.output}} syntax with actual values
    - State machine enforces valid status transitions
    - HandExecutor coordinates execution flow and state tracking
  artifacts:
    - path: "crates/openfang-runtime/src/step_variable_resolver.rs"
      provides: "Variable interpolation for step inputs"
      exports: ["resolve_variables", "VariableResolver"]
    - path: "crates/openfang-runtime/src/hand_executor.rs"
      provides: "Hand execution coordinator"
      exports: ["HandExecutor", "ExecutionState"]
  key_links:
    - from: "hand_executor.rs"
      to: "execution_store.rs"
      via: "ExecutionStore dependency"
    - from: "hand_executor.rs"
      to: "step_variable_resolver.rs"
      via: "pre-execution variable resolution"
---

<objective>
Implement variable resolver and Hand execution state machine.

Purpose: Enable step-to-step data passing via {{step_id.output}} syntax and coordinate Hand execution with proper state tracking.
Output: step_variable_resolver.rs + hand_executor.rs with state machine
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-execution-engine/03-CONTEXT.md
@.planning/phases/03-execution-engine/03-RESEARCH.md
@crates/openfang-runtime/src/execution_store.rs (from Plan 03-01)
@crates/openfang-hands/src/steps.rs (HandStep, StepType definitions)
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create Variable Resolver Module</name>
  <files>crates/openfang-runtime/src/step_variable_resolver.rs</files>
  <read_first>
    - crates/openfang-hands/src/steps.rs (HandStep struct with id field)
    - .planning/phases/03-execution-engine/03-CONTEXT.md (Decision 5: Variable interpolation)
  </read_first>
  <behavior>
    - Test: resolve_variables replaces {{step1.result}} with actual value
    - Test: Multiple variables in same string are all replaced
    - Test: Missing variables keep original syntax (configurable)
    - Test: Nested JSON values are properly resolved
    - Test: Regex handles step IDs with hyphens and underscores
  </behavior>
  <action>
    Create crates/openfang-runtime/src/step_variable_resolver.rs:

    ```rust
    use regex::Regex;
    use serde_json::Value;
    use std::collections::HashMap;

    lazy_static::lazy_static! {
        static ref VARIABLE_REGEX: Regex = Regex::new(r"\{\{(\w+)\.([\w.]+)\}\}").unwrap();
    }

    #[derive(Debug, Clone)]
    pub struct VariableResolver;

    impl VariableResolver {
        /// Resolve variables in a JSON value using step outputs
        pub fn resolve(
            input: &Value,
            step_outputs: &HashMap<String, Value>,
        ) -> Value {
            match input {
                Value::String(s) => {
                    let resolved = Self::resolve_string(s, step_outputs);
                    Value::String(resolved)
                }
                Value::Object(map) => {
                    let mut resolved = serde_json::Map::new();
                    for (k, v) in map {
                        resolved.insert(k.clone(), Self::resolve(v, step_outputs));
                    }
                    Value::Object(resolved)
                }
                Value::Array(arr) => {
                    Value::Array(arr.iter().map(|v| Self::resolve(v, step_outputs)).collect())
                }
                other => other.clone(),
            }
        }

        /// Resolve variables in a string
        fn resolve_string(
            input: &str,
            step_outputs: &HashMap<String, Value>,
        ) -> String {
            VARIABLE_REGEX
                .replace_all(input, |caps: ®ex::Captures| {
                    let step_id = &caps[1];
                    let field_path = &caps[2];

                    step_outputs
                        .get(step_id)
                        .and_then(|output| Self::get_nested_value(output, field_path))
                        .map(|v| v.to_string().trim_matches('"').to_string())
                        .unwrap_or_else(|| caps[0].to_string())
                })
                .to_string()
        }

        /// Get a nested value from JSON using dot notation (e.g., "result.data.name")
        fn get_nested_value<'a>(value: &'a Value, path: &str) -> Option<&'a Value> {
            let mut current = value;
            for segment in path.split('.') {
                match current {
                    Value::Object(map) => {
                        current = map.get(segment)?;
                    }
                    _ => return None,
                }
            }
            Some(current)
        }
    }

    /// Convenience function for direct resolution
    pub fn resolve_variables(
        input: &Value,
        step_outputs: &HashMap<String, Value>,
    ) -> Value {
        VariableResolver::resolve(input, step_outputs)
    }
    ```

    Add tests:
    - test_resolve_simple_variable: {{step1.result}} -> "Hello"
    - test_resolve_nested_field: {{step1.data.name}} -> "John"
    - test_resolve_multiple_variables: "{{step1.a}} and {{step2.b}}"
    - test_resolve_missing_variable: keeps {{step1.missing}}
    - test_resolve_in_json_object: nested structure resolution
    - test_resolve_array: variables in array elements
  </action>
  <verify>
    <automated>cargo test -p openfang-runtime step_variable_resolver</automated>
  </verify>
  <acceptance_criteria>
    - step_variable_resolver.rs exists with VariableResolver struct
    - step_variable_resolver.rs contains VARIABLE_REGEX = r"\{\{(\w+)\.([\w.]+)\}\}"
    - VariableResolver::resolve takes &Value and &HashMap<String, Value>
    - resolve_variables convenience function exists
    - Tests cover: simple variable, nested field, multiple variables, missing variable
    - All tests pass
  </acceptance_criteria>
  <done>Variable resolver module with regex-based interpolation</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Create Hand Executor State Machine</name>
  <files>crates/openfang-runtime/src/hand_executor.rs, crates/openfang-runtime/src/lib.rs</files>
  <read_first>
    - crates/openfang-runtime/src/execution_store.rs (ExecutionStore, ExecutionStatus, StepStatus)
    - crates/openfang-runtime/src/step_variable_resolver.rs (VariableResolver)
    - crates/openfang-hands/src/steps.rs (HandStep, StepType)
    - .planning/phases/03-execution-engine/03-CONTEXT.md (Decisions 1, 4, 6)
  </read_first>
  <behavior>
    - Test: State transitions follow valid paths (pending->running->completed)
    - Test: Invalid transitions are rejected (completed->pending fails)
    - Test: can_transition returns correct boolean for all state pairs
    - Test: HandExecutor initializes with correct initial state
    - Test: start_execution creates records in store
    - Test: complete_step updates status and stores output
    - Test: fail_step sets error and status
    - Test: retry_step resets failed step to pending
  </behavior>
  <action>
    Create crates/openfang-runtime/src/hand_executor.rs with state machine:

    ```rust
    use crate::execution_store::{
        ExecutionStatus, ExecutionStore, HandExecutionRecord, StepExecutionRecord, StepStatus,
    };
    use crate::step_variable_resolver::VariableResolver;
    use openfang_hands::steps::{HandStep, StepType};
    use openfang_types::error::{OpenFangError, OpenFangResult};
    use std::collections::HashMap;
    use std::sync::Arc;
    use tokio::sync::RwLock;

    /// In-memory state for an active execution
    #[derive(Debug, Clone)]
    pub struct ExecutionState {
        pub execution_id: String,
        pub hand_id: String,
        pub agent_id: String,
        pub status: ExecutionStatus,
        pub current_step_id: Option<String>,
        pub step_outputs: HashMap<String, serde_json::Value>,
        pub steps: Vec<HandStep>,
    }

    /// Hand execution coordinator
    pub struct HandExecutor {
        store: ExecutionStore,
        active_executions: RwLock<HashMap<String, ExecutionState>>,
    }

    impl HandExecutor {
        pub fn new(store: ExecutionStore) -> Self {
            Self {
                store,
                active_executions: RwLock::new(HashMap::new()),
            }
        }

        /// Check if a state transition is valid
        pub fn can_transition(from: &StepStatus, to: &StepStatus) -> bool {
            use StepStatus::*;
            match (from, to) {
                (Pending, Running) => true,
                (Running, Completed) => true,
                (Running, Failed) => true,
                (Running, Waiting) => true,
                (Waiting, Pending) => true, // After user input
                (Failed, Pending) => true,  // Retry
                (Failed, Skipped) => true,  // Skip failed step
                _ => false,
            }
        }

        /// Start a new Hand execution
        pub async fn start_execution(
            &self,
            hand_id: String,
            agent_id: String,
            steps: Vec<HandStep>,
        ) -> OpenFangResult<String> {
            let execution_id = uuid::Uuid::new_v4().to_string();
            let now = chrono::Utc::now();

            // Create execution record
            let exec_record = HandExecutionRecord {
                id: execution_id.clone(),
                hand_id: hand_id.clone(),
                agent_id: agent_id.clone(),
                status: ExecutionStatus::Pending,
                current_step_id: None,
                started_at: Some(now),
                completed_at: None,
                created_at: now,
            };
            self.store.create_execution(&exec_record).await?;

            // Create step execution records for all steps
            for step in &steps {
                let step_record = StepExecutionRecord {
                    id: uuid::Uuid::new_v4().to_string(),
                    execution_id: execution_id.clone(),
                    step_id: step.id.clone(),
                    status: StepStatus::Pending,
                    input: None,
                    output: None,
                    error: None,
                    retry_count: 0,
                    started_at: None,
                    completed_at: None,
                };
                self.store.create_step_execution(&step_record).await?;
            }

            // Create in-memory state
            let state = ExecutionState {
                execution_id: execution_id.clone(),
                hand_id,
                agent_id,
                status: ExecutionStatus::Pending,
                current_step_id: steps.first().map(|s| s.id.clone()),
                step_outputs: HashMap::new(),
                steps,
            };
            self.active_executions.write().await.insert(execution_id.clone(), state);

            Ok(execution_id)
        }

        /// Start executing a specific step
        pub async fn start_step(
            &self,
            execution_id: &str,
            step_id: &str,
        ) -> OpenFangResult<Option<HandStep>> {
            // Get step with resolved variables
            let mut executions = self.active_executions.write().await;
            let state = executions.get_mut(execution_id)
                .ok_or_else(|| OpenFangError::Internal(format!("Execution not found: {}", execution_id)))?;

            let step = state.steps.iter().find(|s| s.id == step_id).cloned();

            if let Some(ref s) = step {
                // Update state
                state.current_step_id = Some(step_id.to_string());
                state.status = ExecutionStatus::Running;
                drop(executions);

                // Update store
                self.store.update_execution_status(
                    execution_id,
                    ExecutionStatus::Running,
                    Some(step_id),
                ).await?;

                let step_record = self.store.get_step_execution(execution_id, step_id).await?;
                if let Some(record) = step_record {
                    if Self::can_transition(&record.status, &StepStatus::Running) {
                        self.store.update_step_status(
                            &record.id,
                            StepStatus::Running,
                            None,
                            None,
                        ).await?;
                    }
                }
            }

            Ok(step)
        }

        /// Complete a step with output
        pub async fn complete_step(
            &self,
            execution_id: &str,
            step_id: &str,
            output: serde_json::Value,
        ) -> OpenFangResult<()> {
            // Update in-memory state
            let mut executions = self.active_executions.write().await;
            if let Some(state) = executions.get_mut(execution_id) {
                state.step_outputs.insert(step_id.to_string(), output.clone());
            }
            drop(executions);

            // Update store
            let step_record = self.store.get_step_execution(execution_id, step_id).await?;
            if let Some(record) = step_record {
                self.store.update_step_status(
                    &record.id,
                    StepStatus::Completed,
                    Some(output),
                    None,
                ).await?;
            }

            Ok(())
        }

        /// Mark step as failed
        pub async fn fail_step(
            &self,
            execution_id: &str,
            step_id: &str,
            error: String,
        ) -> OpenFangResult<()> {
            let step_record = self.store.get_step_execution(execution_id, step_id).await?;
            if let Some(record) = step_record {
                self.store.update_step_status(
                    &record.id,
                    StepStatus::Failed,
                    None,
                    Some(error),
                ).await?;
            }
            Ok(())
        }

        /// Retry a failed step
        pub async fn retry_step(
            &self,
            execution_id: &str,
            step_id: &str,
        ) -> OpenFangResult<()> {
            let step_record = self.store.get_step_execution(execution_id, step_id).await?;
            if let Some(record) = step_record {
                if Self::can_transition(&record.status, &StepStatus::Pending) {
                    self.store.update_step_status(
                        &record.id,
                        StepStatus::Pending,
                        None,
                        None,
                    ).await?;
                }
            }
            Ok(())
        }

        /// Get execution state
        pub async fn get_execution_state(&self, execution_id: &str) -> Option<ExecutionState> {
            self.active_executions.read().await.get(execution_id).cloned()
        }

        /// Resolve variables for a step input
        pub fn resolve_step_input(
            &self,
            step: &HandStep,
            step_outputs: &HashMap<String, serde_json::Value>,
        ) -> Option<serde_json::Value> {
            let input = match &step.step_type {
                StepType::ExecuteTool { input, .. } => Some(input.clone()),
                StepType::SendMessage { content, .. } => Some(serde_json::json!({"content": content})),
                StepType::WaitForInput { prompt, .. } => Some(serde_json::json!({"prompt": prompt})),
                StepType::Condition { expression, .. } => Some(serde_json::json!({"expression": expression})),
                _ => None,
            };

            input.map(|i| VariableResolver::resolve(&i, step_outputs))
        }

        /// Get next steps after completing current step
        pub fn get_next_steps(&self, state: &ExecutionState, completed_step_id: &str) -> Vec<String> {
            if let Some(step) = state.steps.iter().find(|s| s.id == completed_step_id) {
                step.next_steps.clone()
            } else {
                vec![]
            }
        }
    }
    ```

    Add `pub mod hand_executor;` and `pub mod step_variable_resolver;` to lib.rs.

    Add comprehensive tests for state transitions and execution flow.
  </action>
  <verify>
    <automated>cargo test -p openfang-runtime hand_executor</automated>
  </verify>
  <acceptance_criteria>
    - hand_executor.rs exists with HandExecutor struct
    - hand_executor.rs contains ExecutionState with fields: execution_id, hand_id, agent_id, status, current_step_id, step_outputs, steps
    - HandExecutor::can_transition enforces valid state transitions
    - HandExecutor has methods: start_execution, start_step, complete_step, fail_step, retry_step, get_execution_state
    - HandExecutor::resolve_step_input uses VariableResolver
    - lib.rs contains "pub mod hand_executor;" and "pub mod step_variable_resolver;"
    - Tests cover: state transitions, start_execution, complete_step, fail_step, retry_step
    - All tests pass
  </acceptance_criteria>
  <done>HandExecutor with state machine and variable resolution</done>
</task>

</tasks>

<verification>
- Variable resolver correctly interpolates {{step_id.field}} syntax
- State machine enforces valid transitions
- HandExecutor coordinates execution with store persistence
- All tests pass: cargo test -p openfang-runtime hand_executor
</verification>

<success_criteria>
1. Variable resolver handles {{step_id.output}} syntax correctly
2. State machine prevents invalid transitions
3. HandExecutor manages execution lifecycle
4. All unit tests pass
5. No clippy warnings
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-engine/03-02-executor-SUMMARY.md`
</output>
