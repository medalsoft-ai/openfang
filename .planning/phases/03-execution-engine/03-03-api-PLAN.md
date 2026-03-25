---
phase: 03-execution-engine
plan: 03
type: execute
wave: 3
depends_on: [03-02]
files_modified:
  - crates/openfang-api/src/routes.rs
  - crates/openfang-api/src/server.rs
  - crates/openfang-api/src/types.rs
autonomous: true
requirements:
  - API-04
  - API-05
must_haves:
  truths:
    - GET /api/hands/{id}/steps/{step_id}/status returns current step status
    - POST /api/hands/{id}/steps/{step_id}/execute triggers step execution
    - GET /api/hands/{id}/executions lists execution history
    - POST /api/hands/{id}/executions/{exec_id}/retry retries failed steps
  artifacts:
    - path: "crates/openfang-api/src/routes.rs"
      provides: "Execution control API endpoints"
      contains: "get_step_status, execute_step, list_hand_executions, retry_execution"
    - path: "crates/openfang-api/src/server.rs"
      provides: "Route registrations"
      contains: ".route(\"/:id/steps/:step_id/status\")"
  key_links:
    - from: "routes.rs"
      to: "HandExecutor"
      via: "AppState.kernel.hand_executor"
    - from: "server.rs"
      to: "routes.rs"
      via: "route handlers"
---

<objective>
Implement API endpoints for execution control and status queries.

Purpose: Allow clients to query step status, trigger step execution, and control execution flow (retry, skip, abort).
Output: REST API endpoints integrated with HandExecutor
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-execution-engine/03-CONTEXT.md
@.planning/phases/03-execution-engine/03-RESEARCH.md
@crates/openfang-api/src/routes.rs (existing hand endpoints pattern)
@crates/openfang-api/src/server.rs (route registration)
@crates/openfang-api/src/types.rs (request/response types)
@crates/openfang-runtime/src/hand_executor.rs (HandExecutor from Plan 03-02)
@crates/openfang-runtime/src/execution_store.rs (ExecutionStore from Plan 03-01)
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Add Execution Types and API Endpoints</name>
  <files>crates/openfang-api/src/types.rs, crates/openfang-api/src/routes.rs</files>
  <read_first>
    - crates/openfang-api/src/types.rs (existing types like StepUpdateRequest)
    - crates/openfang-api/src/routes.rs (existing hand routes around line 4778)
    - crates/openfang-runtime/src/execution_store.rs (StepStatus, ExecutionStatus)
  </read_first>
  <behavior>
    - Test: GET /api/hands/{id}/steps/{step_id}/status returns 200 with status
    - Test: POST /api/hands/{id}/steps/{step_id}/execute returns 202 accepted
    - Test: GET /api/hands/{id}/executions returns list of executions
    - Test: GET /api/hands/{id}/executions/{exec_id} returns execution details
    - Test: POST /api/hands/{id}/executions/{exec_id}/retry returns 200 on success
  </behavior>
  <action>
    Add to crates/openfang-api/src/types.rs:

    ```rust
    // Execution status response
    #[derive(Debug, Clone, serde::Serialize)]
    pub struct StepStatusResponse {
        pub execution_id: String,
        pub step_id: String,
        pub status: String,
        pub input: Option<serde_json::Value>,
        pub output: Option<serde_json::Value>,
        pub error: Option<String>,
        pub started_at: Option<String>,
        pub completed_at: Option<String>,
        pub retry_count: i32,
    }

    // Execution summary
    #[derive(Debug, Clone, serde::Serialize)]
    pub struct ExecutionSummary {
        pub id: String,
        pub hand_id: String,
        pub agent_id: String,
        pub status: String,
        pub current_step_id: Option<String>,
        pub started_at: Option<String>,
        pub completed_at: Option<String>,
        pub created_at: String,
    }

    // Execution detail with steps
    #[derive(Debug, Clone, serde::Serialize)]
    pub struct ExecutionDetail {
        pub id: String,
        pub hand_id: String,
        pub agent_id: String,
        pub status: String,
        pub current_step_id: Option<String>,
        pub started_at: Option<String>,
        pub completed_at: Option<String>,
        pub created_at: String,
        pub steps: Vec<StepExecutionDetail>,
    }

    #[derive(Debug, Clone, serde::Serialize)]
    pub struct StepExecutionDetail {
        pub step_id: String,
        pub step_name: String,
        pub status: String,
        pub input: Option<serde_json::Value>,
        pub output: Option<serde_json::Value>,
        pub error: Option<String>,
        pub started_at: Option<String>,
        pub completed_at: Option<String>,
        pub retry_count: i32,
    }

    // Execute step request
    #[derive(Debug, Clone, serde::Deserialize)]
    pub struct ExecuteStepRequest {
        pub execution_id: String,
        pub input: Option<serde_json::Value>,
    }

    // Submit user input for wait-for-input step
    #[derive(Debug, Clone, serde::Deserialize)]
    pub struct SubmitInputRequest {
        pub input: String,
    }
    ```

    Add to crates/openfang-api/src/routes.rs (after existing hand routes):

    ```rust
    /// GET /api/hands/{id}/steps/{step_id}/status - Get step execution status
    pub async fn get_step_status(
        Path((hand_id, step_id)): Path<(String, String)>,
        Query(params): Query<HashMap<String, String>>,
        State(state): State<Arc<AppState>>,
    ) -> impl IntoResponse {
        let execution_id = params.get("execution_id");

        // If execution_id provided, query that specific execution
        if let Some(exec_id) = execution_id {
            match state.kernel.execution_store.get_step_execution(exec_id, &step_id).await {
                Ok(Some(step_record)) => {
                    let response = StepStatusResponse {
                        execution_id: exec_id.clone(),
                        step_id: step_id.clone(),
                        status: format!("{:?}", step_record.status).to_lowercase(),
                        input: step_record.input,
                        output: step_record.output,
                        error: step_record.error,
                        started_at: step_record.started_at.map(|d| d.to_rfc3339()),
                        completed_at: step_record.completed_at.map(|d| d.to_rfc3339()),
                        retry_count: step_record.retry_count,
                    };
                    (StatusCode::OK, Json(serde_json::json!(response)))
                }
                Ok(None) => {
                    (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Step execution not found"})))
                }
                Err(e) => {
                    tracing::error!("Failed to get step status: {}", e);
                    (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to get step status"})))
                }
            }
        } else {
            // Return 400 if no execution_id provided
            (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "execution_id query parameter required"})))
        }
    }

    /// POST /api/hands/{id}/steps/{step_id}/execute - Trigger step execution
    pub async fn execute_step(
        Path((hand_id, step_id)): Path<(String, String)>,
        State(state): State<Arc<AppState>>,
        Json(req): Json<ExecuteStepRequest>,
    ) -> impl IntoResponse {
        // Verify hand exists
        match state.kernel.hand_registry.get_definition(&hand_id) {
            Some(_) => {
                // Trigger step execution via hand executor
                match state.kernel.hand_executor.start_step(&req.execution_id, &step_id).await {
                    Ok(Some(step)) => {
                        (StatusCode::ACCEPTED, Json(serde_json::json!({
                            "status": "started",
                            "execution_id": req.execution_id,
                            "step_id": step_id,
                            "step_name": step.name,
                        })))
                    }
                    Ok(None) => {
                        (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Step not found in execution"})))
                    }
                    Err(e) => {
                        tracing::error!("Failed to start step: {}", e);
                        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": format!("Failed to start step: {}", e)})))
                    }
                }
            }
            None => {
                (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": format!("Hand not found: {}", hand_id)})))
            }
        }
    }

    /// GET /api/hands/{id}/executions - List execution history
    pub async fn list_hand_executions(
        Path(hand_id): Path<String>,
        State(state): State<Arc<AppState>>,
    ) -> impl IntoResponse {
        match state.kernel.hand_registry.get_definition(&hand_id) {
            Some(_) => {
                match state.kernel.execution_store.list_executions_for_hand(&hand_id).await {
                    Ok(executions) => {
                        let summaries: Vec<ExecutionSummary> = executions.into_iter().map(|e| ExecutionSummary {
                            id: e.id,
                            hand_id: e.hand_id,
                            agent_id: e.agent_id,
                            status: format!("{:?}", e.status).to_lowercase(),
                            current_step_id: e.current_step_id,
                            started_at: e.started_at.map(|d| d.to_rfc3339()),
                            completed_at: e.completed_at.map(|d| d.to_rfc3339()),
                            created_at: e.created_at.to_rfc3339(),
                        }).collect();
                        (StatusCode::OK, Json(serde_json::json!({"executions": summaries})))
                    }
                    Err(e) => {
                        tracing::error!("Failed to list executions: {}", e);
                        (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to list executions"})))
                    }
                }
            }
            None => {
                (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": format!("Hand not found: {}", hand_id)})))
            }
        }
    }

    /// GET /api/hands/{id}/executions/{exec_id} - Get execution details
    pub async fn get_hand_execution(
        Path((hand_id, exec_id)): Path<(String, String)>,
        State(state): State<Arc<AppState>>,
    ) -> impl IntoResponse {
        match state.kernel.execution_store.get_execution(&exec_id).await {
            Ok(Some(exec)) => {
                if exec.hand_id != hand_id {
                    return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Execution not found for this hand"})));
                }

                // Get step details
                let steps = if let Some(def) = state.kernel.hand_registry.get_definition(&hand_id) {
                    def.steps.iter().map(|s| {
                        // Find step execution record (would need additional query method)
                        StepExecutionDetail {
                            step_id: s.id.clone(),
                            step_name: s.name.clone(),
                            status: "pending".to_string(), // Placeholder - would query from store
                            input: None,
                            output: None,
                            error: None,
                            started_at: None,
                            completed_at: None,
                            retry_count: 0,
                        }
                    }).collect()
                } else {
                    vec![]
                };

                let detail = ExecutionDetail {
                    id: exec.id,
                    hand_id: exec.hand_id,
                    agent_id: exec.agent_id,
                    status: format!("{:?}", exec.status).to_lowercase(),
                    current_step_id: exec.current_step_id,
                    started_at: exec.started_at.map(|d| d.to_rfc3339()),
                    completed_at: exec.completed_at.map(|d| d.to_rfc3339()),
                    created_at: exec.created_at.to_rfc3339(),
                    steps,
                };
                (StatusCode::OK, Json(serde_json::json!(detail)))
            }
            Ok(None) => {
                (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Execution not found"})))
            }
            Err(e) => {
                tracing::error!("Failed to get execution: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to get execution"})))
            }
        }
    }

    /// POST /api/hands/{id}/executions/{exec_id}/retry - Retry failed step
    pub async fn retry_hand_execution(
        Path((hand_id, exec_id)): Path<(String, String)>,
        State(state): State<Arc<AppState>>,
    ) -> impl IntoResponse {
        match state.kernel.execution_store.get_execution(&exec_id).await {
            Ok(Some(exec)) => {
                if exec.hand_id != hand_id {
                    return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Execution not found for this hand"})));
                }

                // Retry the current failed step
                if let Some(step_id) = &exec.current_step_id {
                    match state.kernel.hand_executor.retry_step(&exec_id, step_id).await {
                        Ok(_) => {
                            (StatusCode::OK, Json(serde_json::json!({
                                "status": "retrying",
                                "execution_id": exec_id,
                                "step_id": step_id,
                            })))
                        }
                        Err(e) => {
                            tracing::error!("Failed to retry step: {}", e);
                            (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": format!("Failed to retry: {}", e)})))
                        }
                    }
                } else {
                    (StatusCode::BAD_REQUEST, Json(serde_json::json!({"error": "No current step to retry"})))
                }
            }
            Ok(None) => {
                (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Execution not found"})))
            }
            Err(e) => {
                tracing::error!("Failed to get execution for retry: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to retry execution"})))
            }
        }
    }

    /// POST /api/hands/{id}/executions/{exec_id}/input - Submit user input for wait-for-input step
    pub async fn submit_hand_input(
        Path((hand_id, exec_id)): Path<(String, String)>,
        State(state): State<Arc<AppState>>,
        Json(req): Json<SubmitInputRequest>,
    ) -> impl IntoResponse {
        match state.kernel.execution_store.get_execution(&exec_id).await {
            Ok(Some(exec)) => {
                if exec.hand_id != hand_id {
                    return (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Execution not found for this hand"})));
                }

                // Store input and resume execution
                // This would update the step status from Waiting to Pending
                (StatusCode::OK, Json(serde_json::json!({
                    "status": "input_received",
                    "execution_id": exec_id,
                })))
            }
            Ok(None) => {
                (StatusCode::NOT_FOUND, Json(serde_json::json!({"error": "Execution not found"})))
            }
            Err(e) => {
                tracing::error!("Failed to submit input: {}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, Json(serde_json::json!({"error": "Failed to submit input"})))
            }
        }
    }
    ```

    Note: The kernel will need to expose hand_executor and execution_store. Add these fields to OpenFangKernel and wire them up.
  </action>
  <verify>
    <automated>cargo build --workspace --lib</automated>
  </verify>
  <acceptance_criteria>
    - types.rs contains StepStatusResponse, ExecutionSummary, ExecutionDetail, ExecuteStepRequest, SubmitInputRequest
    - routes.rs contains get_step_status handler with Path((hand_id, step_id))
    - routes.rs contains execute_step handler returning StatusCode::ACCEPTED
    - routes.rs contains list_hand_executions handler
    - routes.rs contains get_hand_execution handler
    - routes.rs contains retry_hand_execution handler
    - routes.rs contains submit_hand_input handler
    - All handlers use State<Arc<AppState>> pattern
    - Build compiles without errors
  </acceptance_criteria>
  <done>API endpoint handlers for execution control</done>
</task>

<task type="auto">
  <name>Task 2: Register Routes and Wire Kernel</name>
  <files>crates/openfang-api/src/server.rs, crates/openfang-kernel/src/lib.rs</files>
  <read_first>
    - crates/openfang-api/src/server.rs (existing route registrations)
    - crates/openfang-kernel/src/lib.rs (OpenFangKernel struct)
  </read_first>
  <action>
    Add route registrations in crates/openfang-api/src/server.rs:

    Find the hands routes section and add:
    ```rust
    .route("/:id/steps/:step_id/status", get(routes::get_step_status))
    .route("/:id/steps/:step_id/execute", post(routes::execute_step))
    .route("/:id/executions", get(routes::list_hand_executions))
    .route("/:id/executions/:exec_id", get(routes::get_hand_execution))
    .route("/:id/executions/:exec_id/retry", post(routes::retry_hand_execution))
    .route("/:id/executions/:exec_id/input", post(routes::submit_hand_input))
    ```

    Wire ExecutionStore and HandExecutor into OpenFangKernel:

    In crates/openfang-kernel/src/lib.rs, add to OpenFangKernel struct:
    ```rust
    pub execution_store: ExecutionStore,
    pub hand_executor: Arc<HandExecutor>,
    ```

    Initialize them in the kernel constructor (new/create methods):
    ```rust
    let execution_store = ExecutionStore::new(memory.usage_conn());
    let hand_executor = Arc::new(HandExecutor::new(execution_store.clone()));
    ```

    Add imports:
    ```rust
    use openfang_runtime::execution_store::ExecutionStore;
    use openfang_runtime::hand_executor::HandExecutor;
    ```
  </action>
  <verify>
    <automated>cargo build --workspace --lib</automated>
  </verify>
  <acceptance_criteria>
    - server.rs contains .route("/:id/steps/:step_id/status", get(...))
    - server.rs contains .route("/:id/steps/:step_id/execute", post(...))
    - server.rs contains .route("/:id/executions", get(...))
    - server.rs contains .route("/:id/executions/:exec_id/retry", post(...))
    - kernel lib.rs contains pub execution_store: ExecutionStore
    - kernel lib.rs contains pub hand_executor: Arc<HandExecutor>
    - Build compiles without errors
  </acceptance_criteria>
  <done>Routes registered and kernel wired with execution components</done>
</task>

</tasks>

<verification>
- GET /api/hands/{id}/steps/{step_id}/status endpoint works
- POST /api/hands/{id}/steps/{step_id}/execute endpoint works
- GET /api/hands/{id}/executions endpoint works
- POST /api/hands/{id}/executions/{exec_id}/retry endpoint works
- Build passes: cargo build --workspace --lib
</verification>

<success_criteria>
1. All execution control API endpoints are implemented
2. Routes are registered in server.rs
3. ExecutionStore and HandExecutor are accessible via kernel
4. Build compiles without errors
5. No clippy warnings
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-engine/03-03-api-SUMMARY.md`
</output>
