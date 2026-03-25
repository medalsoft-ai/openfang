//! Hand execution coordinator with state machine.
//!
//! Manages the execution lifecycle of Hand workflows, coordinating
//! step execution, state transitions, and variable resolution.

use crate::execution_store::{
    ExecutionStatus, ExecutionStore, HandExecutionRecord, StepExecutionRecord, StepStatus,
};
use crate::step_variable_resolver::VariableResolver;
use openfang_hands::steps::{HandStep, StepType};
use openfang_types::error::{OpenFangError, OpenFangResult};
use openfang_types::tool::{ToolDefinition, ToolResult};
use std::collections::HashMap;
use std::sync::Arc;
use tokio::sync::broadcast;
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

/// Step status change event for broadcasting
#[derive(Debug, Clone, serde::Serialize)]
pub struct StepStatusChange {
    pub execution_id: String,
    pub hand_id: String,
    pub agent_id: String,
    pub step_id: String,
    pub status: String,
    pub timestamp: String,
    pub output: Option<serde_json::Value>,
}

/// Hand execution coordinator
pub struct HandExecutor {
    store: ExecutionStore,
    active_executions: RwLock<HashMap<String, ExecutionState>>,
    broadcast_tx: broadcast::Sender<StepStatusChange>,
}

impl HandExecutor {
    /// Create a new HandExecutor with the given store
    pub fn new(store: ExecutionStore) -> Self {
        let (broadcast_tx, _) = broadcast::channel(100);
        Self {
            store,
            active_executions: RwLock::new(HashMap::new()),
            broadcast_tx,
        }
    }

    /// Subscribe to step status changes
    pub fn subscribe(&self) -> broadcast::Receiver<StepStatusChange> {
        self.broadcast_tx.subscribe()
    }

    /// Broadcast a step status change
    async fn broadcast_status_change(&self, change: StepStatusChange) {
        let _ = self.broadcast_tx.send(change);
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
        let agent_id = state.agent_id.clone();
        let hand_id = state.hand_id.clone();

        if let Some(ref _s) = step {
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

                    // Broadcast status change
                    self.broadcast_status_change(StepStatusChange {
                        execution_id: execution_id.to_string(),
                        hand_id,
                        agent_id,
                        step_id: step_id.to_string(),
                        status: "running".to_string(),
                        timestamp: chrono::Utc::now().to_rfc3339(),
                        output: None,
                    }).await;
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
        let agent_id = executions.get(execution_id).map(|s| s.agent_id.clone()).unwrap_or_default();
        let hand_id = executions.get(execution_id).map(|s| s.hand_id.clone()).unwrap_or_default();
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
                Some(output.clone()),
                None,
            ).await?;

            // Broadcast status change
            self.broadcast_status_change(StepStatusChange {
                execution_id: execution_id.to_string(),
                hand_id,
                agent_id,
                step_id: step_id.to_string(),
                status: "completed".to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                output: Some(output),
            }).await;
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
        // Get agent_id and hand_id before the async operation
        let executions = self.active_executions.read().await;
        let agent_id = executions.get(execution_id).map(|s| s.agent_id.clone()).unwrap_or_default();
        let hand_id = executions.get(execution_id).map(|s| s.hand_id.clone()).unwrap_or_default();
        drop(executions);

        let step_record = self.store.get_step_execution(execution_id, step_id).await?;
        if let Some(record) = step_record {
            self.store.update_step_status(
                &record.id,
                StepStatus::Failed,
                None,
                Some(error.clone()),
            ).await?;

            // Broadcast status change
            self.broadcast_status_change(StepStatusChange {
                execution_id: execution_id.to_string(),
                hand_id,
                agent_id,
                step_id: step_id.to_string(),
                status: "failed".to_string(),
                timestamp: chrono::Utc::now().to_rfc3339(),
                output: Some(serde_json::json!({"error": error})),
            }).await;
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

/// Tool for Agent to report step completion
pub struct HandReportStepTool {
    executor: Arc<HandExecutor>,
}

impl HandReportStepTool {
    /// Create a new HandReportStepTool with the given executor
    pub fn new(executor: Arc<HandExecutor>) -> Self {
        Self { executor }
    }

    /// Get the tool definition for hand_report_step
    pub fn definition() -> ToolDefinition {
        ToolDefinition {
            name: "hand_report_step".to_string(),
            description: "Report the completion status of a Hand execution step".to_string(),
            input_schema: serde_json::json!({
                "type": "object",
                "properties": {
                    "execution_id": {
                        "type": "string",
                        "description": "The execution ID"
                    },
                    "step_id": {
                        "type": "string",
                        "description": "The ID of the step being reported"
                    },
                    "status": {
                        "type": "string",
                        "enum": ["completed", "failed"],
                        "description": "The completion status"
                    },
                    "output": {
                        "type": "object",
                        "description": "The output/result of the step (JSON)"
                    },
                    "error": {
                        "type": "string",
                        "description": "Error message if status is failed"
                    }
                },
                "required": ["execution_id", "step_id", "status"]
            }),
        }
    }

    /// Execute the hand_report_step tool
    pub async fn execute(&self, args: serde_json::Value) -> ToolResult {
        let execution_id = match args["execution_id"].as_str() {
            Some(id) => id,
            None => return ToolResult {
                tool_use_id: "hand_report_step".to_string(),
                content: "execution_id is required".to_string(),
                is_error: true,
            },
        };
        let step_id = match args["step_id"].as_str() {
            Some(id) => id,
            None => return ToolResult {
                tool_use_id: "hand_report_step".to_string(),
                content: "step_id is required".to_string(),
                is_error: true,
            },
        };
        let status = match args["status"].as_str() {
            Some(s) => s,
            None => return ToolResult {
                tool_use_id: "hand_report_step".to_string(),
                content: "status is required".to_string(),
                is_error: true,
            },
        };

        match status {
            "completed" => {
                let output = args.get("output").cloned()
                    .unwrap_or(serde_json::json!({}));
                match self.executor.complete_step(execution_id, step_id, output).await {
                    Ok(_) => ToolResult {
                        tool_use_id: "hand_report_step".to_string(),
                        content: serde_json::json!({"status": "recorded", "next_step": "Continue to next step"}).to_string(),
                        is_error: false,
                    },
                    Err(e) => ToolResult {
                        tool_use_id: "hand_report_step".to_string(),
                        content: format!("Failed to complete step: {}", e),
                        is_error: true,
                    },
                }
            }
            "failed" => {
                let error = args["error"].as_str()
                    .unwrap_or("Unknown error");
                match self.executor.fail_step(execution_id, step_id, error.to_string()).await {
                    Ok(_) => ToolResult {
                        tool_use_id: "hand_report_step".to_string(),
                        content: serde_json::json!({"status": "recorded", "action_required": "Step failed - retry or skip"}).to_string(),
                        is_error: false,
                    },
                    Err(e) => ToolResult {
                        tool_use_id: "hand_report_step".to_string(),
                        content: format!("Failed to record failure: {}", e),
                        is_error: true,
                    },
                }
            }
            _ => ToolResult {
                tool_use_id: "hand_report_step".to_string(),
                content: format!("Invalid status: {}", status),
                is_error: true,
            },
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use openfang_memory::migration::run_migrations;
    use rusqlite::Connection;
    use std::sync::{Arc, Mutex};

    fn setup() -> (HandExecutor, ExecutionStore) {
        let conn = Connection::open_in_memory().unwrap();
        run_migrations(&conn).unwrap();
        let store = ExecutionStore::new(Arc::new(Mutex::new(conn)));
        let executor = HandExecutor::new(store.clone());
        (executor, store)
    }

    fn create_test_steps() -> Vec<HandStep> {
        vec![
            HandStep::new("step1", "First Step", StepType::WaitForInput {
                prompt: "Enter your name".to_string(),
                timeout_secs: Some(60),
            }),
            HandStep::new("step2", "Second Step", StepType::SendMessage {
                content: "Hello {{step1.result}}".to_string(),
                target_agent: None,
            }),
        ]
    }

    #[tokio::test]
    async fn test_can_transition_valid_paths() {
        use StepStatus::*;

        // Valid transitions
        assert!(HandExecutor::can_transition(&Pending, &Running));
        assert!(HandExecutor::can_transition(&Running, &Completed));
        assert!(HandExecutor::can_transition(&Running, &Failed));
        assert!(HandExecutor::can_transition(&Running, &Waiting));
        assert!(HandExecutor::can_transition(&Waiting, &Pending));
        assert!(HandExecutor::can_transition(&Failed, &Pending));
        assert!(HandExecutor::can_transition(&Failed, &Skipped));
    }

    #[tokio::test]
    async fn test_can_transition_invalid_paths() {
        use StepStatus::*;

        // Invalid transitions
        assert!(!HandExecutor::can_transition(&Completed, &Pending));
        assert!(!HandExecutor::can_transition(&Completed, &Running));
        assert!(!HandExecutor::can_transition(&Skipped, &Running));
        assert!(!HandExecutor::can_transition(&Pending, &Completed));
        assert!(!HandExecutor::can_transition(&Pending, &Failed));
    }

    #[tokio::test]
    async fn test_start_execution_creates_records() {
        let (executor, store) = setup();
        let steps = create_test_steps();

        let execution_id = executor
            .start_execution("hand-1".to_string(), "agent-1".to_string(), steps)
            .await
            .unwrap();

        // Verify execution record was created
        let exec_record = store.get_execution(&execution_id).await.unwrap();
        assert!(exec_record.is_some());
        let exec_record = exec_record.unwrap();
        assert_eq!(exec_record.hand_id, "hand-1");
        assert_eq!(exec_record.agent_id, "agent-1");
        assert_eq!(exec_record.status, ExecutionStatus::Pending);

        // Verify step records were created
        let step_records = store.get_steps_for_execution(&execution_id).await.unwrap();
        assert_eq!(step_records.len(), 2);
    }

    #[tokio::test]
    async fn test_start_step_updates_status() {
        let (executor, store) = setup();
        let steps = create_test_steps();

        let execution_id = executor
            .start_execution("hand-1".to_string(), "agent-1".to_string(), steps)
            .await
            .unwrap();

        let _step: Option<HandStep> = executor.start_step(&execution_id, "step1").await.unwrap();
        assert!(_step.is_some());

        // Verify execution status was updated
        let exec_record = store.get_execution(&execution_id).await.unwrap().unwrap();
        assert_eq!(exec_record.status, ExecutionStatus::Running);
        assert_eq!(exec_record.current_step_id, Some("step1".to_string()));

        // Verify step status was updated
        let step_record = store.get_step_execution(&execution_id, "step1").await.unwrap().unwrap();
        assert_eq!(step_record.status, StepStatus::Running);
    }

    #[tokio::test]
    async fn test_complete_step_stores_output() {
        let (executor, store) = setup();
        let steps = create_test_steps();

        let execution_id = executor
            .start_execution("hand-1".to_string(), "agent-1".to_string(), steps)
            .await
            .unwrap();

        let _: Option<HandStep> = executor.start_step(&execution_id, "step1").await.unwrap();

        let output = serde_json::json!({"result": "John"});
        executor.complete_step(&execution_id, "step1", output.clone()).await.unwrap();

        // Verify step output was stored
        let step_record = store.get_step_execution(&execution_id, "step1").await.unwrap().unwrap();
        assert_eq!(step_record.status, StepStatus::Completed);
        assert_eq!(step_record.output, Some(output));
    }

    #[tokio::test]
    async fn test_fail_step_stores_error() {
        let (executor, store) = setup();
        let steps = create_test_steps();

        let execution_id = executor
            .start_execution("hand-1".to_string(), "agent-1".to_string(), steps)
            .await
            .unwrap();

        let _: Option<HandStep> = executor.start_step(&execution_id, "step1").await.unwrap();
        executor.fail_step(&execution_id, "step1", "Connection failed".to_string()).await.unwrap();

        // Verify step error was stored
        let step_record = store.get_step_execution(&execution_id, "step1").await.unwrap().unwrap();
        assert_eq!(step_record.status, StepStatus::Failed);
        assert_eq!(step_record.error, Some("Connection failed".to_string()));
    }

    #[tokio::test]
    async fn test_retry_step_resets_to_pending() {
        let (executor, store) = setup();
        let steps = create_test_steps();

        let execution_id = executor
            .start_execution("hand-1".to_string(), "agent-1".to_string(), steps)
            .await
            .unwrap();

        let _: Option<HandStep> = executor.start_step(&execution_id, "step1").await.unwrap();
        executor.fail_step(&execution_id, "step1", "Connection failed".to_string()).await.unwrap();
        executor.retry_step(&execution_id, "step1").await.unwrap();

        // Verify step was reset to pending
        let step_record = store.get_step_execution(&execution_id, "step1").await.unwrap().unwrap();
        assert_eq!(step_record.status, StepStatus::Pending);
    }

    #[tokio::test]
    async fn test_get_execution_state() {
        let (executor, _store) = setup();
        let steps = create_test_steps();

        let execution_id = executor
            .start_execution("hand-1".to_string(), "agent-1".to_string(), steps)
            .await
            .unwrap();

        let state = executor.get_execution_state(&execution_id).await;
        assert!(state.is_some());
        let state = state.unwrap();
        assert_eq!(state.execution_id, execution_id);
        assert_eq!(state.hand_id, "hand-1");
        assert_eq!(state.agent_id, "agent-1");
        assert_eq!(state.steps.len(), 2);
    }

    #[tokio::test]
    async fn test_resolve_step_input() {
        let (executor, _store) = setup();

        let step = HandStep::new("step1", "Test Step", StepType::SendMessage {
            content: "Hello {{step1.result}}".to_string(),
            target_agent: None,
        });

        let mut outputs = HashMap::new();
        outputs.insert("step1".to_string(), serde_json::json!({"result": "World"}));

        let resolved = executor.resolve_step_input(&step, &outputs);
        assert!(resolved.is_some());
        let resolved = resolved.unwrap();
        assert_eq!(resolved["content"], "Hello World");
    }

    #[tokio::test]
    async fn test_get_next_steps() {
        let (executor, _store) = setup();
        let steps = create_test_steps();

        let execution_id = executor
            .start_execution("hand-1".to_string(), "agent-1".to_string(), steps)
            .await
            .unwrap();

        let state = executor.get_execution_state(&execution_id).await.unwrap();

        // By default, no next steps
        let next_steps = executor.get_next_steps(&state, "step1");
        assert!(next_steps.is_empty());
    }
}
