---
phase: 03-execution-engine
plan: 05
type: execute
wave: 5
depends_on: [03-04]
files_modified:
  - crates/openfang-runtime/src/hand_execution_prompt.rs
  - crates/openfang-runtime/src/hand_executor.rs
  - crates/openfang-runtime/src/agent_loop.rs
  - crates/openfang-kernel/src/lib.rs
autonomous: false
requirements:
  - HAND-STEP-07
must_haves:
  truths:
    - Hand steps are injected into Agent system prompt during activation
    - Agent can report step completion via hand_report_step tool
    - wait-for-input steps pause execution and wait for user input
    - Full integration test passes end-to-end
  artifacts:
    - path: "crates/openfang-runtime/src/hand_execution_prompt.rs"
      provides: "Hand execution system prompt template"
      exports: ["build_hand_execution_prompt"]
    - path: "crates/openfang-runtime/src/hand_executor.rs"
      provides: "Integration with agent loop"
      contains: "hand_report_step tool integration"
  key_links:
    - from: "hand_execution_prompt.rs"
      to: "agent_loop.rs"
      via: "system prompt injection"
    - from: "hand_executor.rs"
      to: "agent_loop.rs"
      via: "hand_report_step tool"
---

<objective>
Integrate Hand execution with Agent loop via prompt injection and tool reporting.

Purpose: Enable LLM-driven step execution where the Agent follows Hand steps and reports progress through tools.
Output: Hand execution prompt + hand_report_step tool + wait-for-input handling
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/phases/03-execution-engine/03-CONTEXT.md
@.planning/phases/03-execution-engine/03-RESEARCH.md
@crates/openfang-runtime/src/prompt_builder.rs (existing prompt building)
@crates/openfang-runtime/src/agent_loop.rs (agent execution loop)
@crates/openfang-runtime/src/tool_runner.rs (tool registration)
@crates/openfang-runtime/src/hand_executor.rs (HandExecutor from Plan 03-02)
@crates/openfang-hands/src/steps.rs (HandStep, StepType)
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Create Hand Execution Prompt Template</name>
  <files>crates/openfang-runtime/src/hand_execution_prompt.rs, crates/openfang-runtime/src/lib.rs</files>
  <read_first>
    - crates/openfang-runtime/src/prompt_builder.rs (existing prompt patterns)
    - crates/openfang-hands/src/steps.rs (StepType variants)
    - .planning/phases/03-execution-engine/03-CONTEXT.md (Decision 1: Prompt-based execution)
  </read_first>
  <behavior>
    - Test: Prompt includes all steps with their status indicators
    - Test: Each step type has appropriate instructions
    - Test: Variable placeholders are shown in step descriptions
    - Test: Prompt instructs Agent to use hand_report_step tool
  </behavior>
  <action>
    Create crates/openfang-runtime/src/hand_execution_prompt.rs:

    ```rust
    use openfang_hands::steps::{HandStep, StepType};
    use serde_json::Value;
    use std::collections::HashMap;

    /// Build system prompt section for Hand execution
    pub fn build_hand_execution_prompt(
        steps: &[HandStep],
        current_step_id: Option<&str>,
        step_outputs: &HashMap<String, Value>,
    ) -> String {
        let mut prompt = String::new();

        prompt.push_str("## Hand Execution Context\n\n");
        prompt.push_str("You are executing a Hand workflow. Follow the steps below in order.\n\n");
        prompt.push_str("### Steps\n\n");

        for step in steps {
            let status = if Some(step.id.as_str()) == current_step_id {
                "[CURRENT - Execute Now]"
            } else if step_outputs.contains_key(&step.id) {
                "[COMPLETED]"
            } else {
                "[PENDING]"
            };

            prompt.push_str(&format!("#### {}: {} {}\n\n", step.id, step.name, status));

            match &step.step_type {
                StepType::ExecuteTool { tool_name, input } => {
                    prompt.push_str(&format!("**Action**: Execute tool `{}`\n\n", tool_name));
                    if let Some(resolved_input) = resolve_variables_in_value(input, step_outputs) {
                        prompt.push_str(&format!("**Input**: {}\n\n", resolved_input));
                    }
                }
                StepType::SendMessage { content, target_agent } => {
                    let resolved_content = resolve_variables(content, step_outputs);
                    prompt.push_str(&format!("**Action**: Send message\n\n"));
                    prompt.push_str(&format!("**Content**: {}\n\n", resolved_content));
                    if let Some(target) = target_agent {
                        prompt.push_str(&format!("**Target Agent**: {}\n\n", target));
                    }
                }
                StepType::WaitForInput { prompt: p, timeout_secs } => {
                    prompt.push_str(&format!("**Action**: Wait for user input\n\n"));
                    let resolved_prompt = resolve_variables(p, step_outputs);
                    prompt.push_str(&format!("**Prompt**: {}\n\n", resolved_prompt));
                    if let Some(timeout) = timeout_secs {
                        prompt.push_str(&format!("**Timeout**: {} seconds\n\n", timeout));
                    }
                }
                StepType::Condition { expression, true_branch, false_branch } => {
                    let resolved_expr = resolve_variables(expression, step_outputs);
                    prompt.push_str(&format!("**Action**: Evaluate condition\n\n"));
                    prompt.push_str(&format!("**Expression**: {}\n\n", resolved_expr));
                    prompt.push_str(&format!("- If TRUE, continue to: {}\n", true_branch));
                    prompt.push_str(&format!("- If FALSE, continue to: {}\n\n", false_branch));
                }
                StepType::Loop { iterator, items, body } => {
                    prompt.push_str(&format!("**Action**: Loop over items\n\n"));
                    prompt.push_str(&format!("- Iterator: {}\n", iterator));
                    prompt.push_str(&format!("- Items: {}\n", items));
                    prompt.push_str(&format!("- Body steps: {}\n\n", body.join(", ")));
                }
                StepType::SubHand { hand_id, input_mapping } => {
                    prompt.push_str(&format!("**Action**: Execute sub-hand `{}`\n\n", hand_id));
                    if let Some(mapping) = input_mapping.as_object() {
                        prompt.push_str("**Input Mapping**:\n");
                        for (k, v) in mapping {
                            prompt.push_str(&format!("- {}: {}\n", k, v));
                        }
                        prompt.push('\n');
                    }
                }
            }

            if !step.next_steps.is_empty() {
                prompt.push_str(&format!("**Next**: {}\n\n", step.next_steps.join(", ")));
            }

            prompt.push('\n');
        }

        prompt.push_str("### Instructions\n\n");
        prompt.push_str("1. Execute the [CURRENT] step above\n");
        prompt.push_str("2. After completing the step, call the `hand_report_step` tool with:\n");
        prompt.push_str("   - step_id: The ID of the step you just completed\n");
        prompt.push_str("   - status: \"completed\" or \"failed\"\n");
        prompt.push_str("   - output: The result/output of the step (JSON object)\n");
        prompt.push_str("   - error: Error message if status is \"failed\"\n");
        prompt.push_str("3. Wait for the next step to become [CURRENT]\n");
        prompt.push_str("4. For wait-for-input steps, ask the user and wait for their response\n\n");

        prompt
    }

    /// Simple variable resolution for prompt display
    fn resolve_variables(input: &str, step_outputs: &HashMap<String, Value>) -> String {
        use regex::Regex;
        lazy_static::lazy_static! {
            static ref VAR_RE: Regex = Regex::new(r"\{\{(\w+)\.([\w.]+)\}\}").unwrap();
        }

        VAR_RE.replace_all(input, |caps: ®ex::Captures| {
            let step_id = &caps[1];
            let field = &caps[2];
            step_outputs
                .get(step_id)
                .and_then(|o| o.get(field))
                .map(|v| v.to_string().trim_matches('"').to_string())
                .unwrap_or_else(|| format!("[{} not yet available]", &caps[0]))
        }).to_string()
    }

    fn resolve_variables_in_value(value: &Value, step_outputs: &HashMap<String, Value>) -> Option<String> {
        match value {
            Value::String(s) => Some(resolve_variables(s, step_outputs)),
            Value::Object(_) | Value::Array(_) => Some(value.to_string()),
            _ => None,
        }
    }

    #[cfg(test)]
    mod tests {
        use super::*;
        use openfang_hands::steps::{HandStep, StepType};

        #[test]
        fn test_prompt_includes_steps() {
            let steps = vec![
                HandStep::new("step1", "First Step", StepType::WaitForInput {
                    prompt: "Enter your name".to_string(),
                    timeout_secs: Some(60),
                }),
                HandStep::new("step2", "Process", StepType::ExecuteTool {
                    tool_name: "echo".to_string(),
                    input: serde_json::json!({"message": "Hello"}),
                }),
            ];

            let prompt = build_hand_execution_prompt(&steps, Some("step1"), &HashMap::new());

            assert!(prompt.contains("step1: First Step [CURRENT"));
            assert!(prompt.contains("step2: Process [PENDING]"));
            assert!(prompt.contains("hand_report_step"));
        }

        #[test]
        fn test_prompt_shows_completed_steps() {
            let steps = vec![
                HandStep::new("step1", "First Step", StepType::WaitForInput {
                    prompt: "Enter".to_string(),
                    timeout_secs: None,
                }),
            ];

            let mut outputs = HashMap::new();
            outputs.insert("step1".to_string(), serde_json::json!({"result": "done"}));

            let prompt = build_hand_execution_prompt(&steps, None, &outputs);

            assert!(prompt.contains("[COMPLETED]"));
        }
    }
    ```

    Add `pub mod hand_execution_prompt;` to lib.rs.
  </action>
  <verify>
    <automated>cargo test -p openfang-runtime hand_execution_prompt</automated>
  </verify>
  <acceptance_criteria>
    - hand_execution_prompt.rs exists with build_hand_execution_prompt function
    - Function signature: build_hand_execution_prompt(steps: &[HandStep], current_step_id: Option<&str>, step_outputs: &HashMap<String, Value>) -> String
    - Prompt includes [CURRENT], [COMPLETED], [PENDING] status markers
    - Each StepType variant has specific instructions in the prompt
    - Prompt includes hand_report_step tool instructions
    - Tests verify prompt contains expected content
    - lib.rs contains "pub mod hand_execution_prompt;"
    - All tests pass
  </acceptance_criteria>
  <done>Hand execution prompt template with step instructions</done>
</task>

<task type="auto">
  <name>Task 2: Create hand_report_step Tool</name>
  <files>crates/openfang-runtime/src/hand_executor.rs</files>
  <read_first>
    - crates/openfang-runtime/src/tool_runner.rs (existing tool patterns)
    - crates/openfang-runtime/src/hand_executor.rs (HandExecutor methods)
  </read_first>
  <action>
    Add hand_report_step tool to the runtime:

    In crates/openfang-runtime/src/hand_executor.rs, add:
    ```rust
    use async_trait::async_trait;
    use openfang_types::tools::{Tool, ToolDefinition, ToolResult};

    /// Tool for Agent to report step completion
    pub struct HandReportStepTool {
        executor: Arc<HandExecutor>,
    }

    impl HandReportStepTool {
        pub fn new(executor: Arc<HandExecutor>) -> Self {
            Self { executor }
        }
    }

    #[async_trait]
    impl Tool for HandReportStepTool {
        fn definition(&self) -> ToolDefinition {
            ToolDefinition {
                name: "hand_report_step".to_string(),
                description: "Report the completion status of a Hand execution step".to_string(),
                parameters: serde_json::json!({
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

        async fn execute(&self, args: serde_json::Value) -> ToolResult {
            let execution_id = args["execution_id"].as_str()
                .ok_or("execution_id is required")?;
            let step_id = args["step_id"].as_str()
                .ok_or("step_id is required")?;
            let status = args["status"].as_str()
                .ok_or("status is required")?;

            match status {
                "completed" => {
                    let output = args.get("output").cloned()
                        .unwrap_or(serde_json::json!({}));
                    self.executor.complete_step(execution_id, step_id, output).await
                        .map_err(|e| format!("Failed to complete step: {}", e))?;
                    Ok(serde_json::json!({"status": "recorded", "next_step": "Continue to next step"}))
                }
                "failed" => {
                    let error = args["error"].as_str()
                        .unwrap_or("Unknown error");
                    self.executor.fail_step(execution_id, step_id, error.to_string()).await
                        .map_err(|e| format!("Failed to record failure: {}", e))?;
                    Ok(serde_json::json!({"status": "recorded", "action_required": "Step failed - retry or skip"}))
                }
                _ => Err(format!("Invalid status: {}", status)),
            }
        }
    }
    ```

    This tool will be registered with the tool runner when a Hand execution is active.
  </action>
  <verify>
    <automated>cargo build -p openfang-runtime --lib</automated>
  </verify>
  <acceptance_criteria>
    - hand_executor.rs contains HandReportStepTool struct
    - HandReportStepTool implements Tool trait with async_trait
    - Tool name is "hand_report_step"
    - Parameters include: execution_id, step_id, status, output, error
    - Execute method calls executor.complete_step for "completed" status
    - Execute method calls executor.fail_step for "failed" status
    - Build compiles without errors
  </acceptance_criteria>
  <done>hand_report_step tool for Agent to report progress</done>
</task>

<task type="auto">
  <name>Task 3: Integrate with Agent Loop</name>
  <files>crates/openfang-runtime/src/agent_loop.rs, crates/openfang-kernel/src/lib.rs</files>
  <read_first>
    - crates/openfang-runtime/src/agent_loop.rs (agent_loop function)
    - crates/openfang-runtime/src/prompt_builder.rs (system prompt construction)
  </read_first>
  <action>
    Integrate Hand execution into the agent loop:

    Modify prompt_builder.rs to include Hand execution context when active:
    ```rust
    use crate::hand_execution_prompt::build_hand_execution_prompt;

    // In build_system_prompt or similar function:
    if let Some(execution_state) = get_active_hand_execution(agent_id) {
        prompt.push_str(&build_hand_execution_prompt(
            &execution_state.steps,
            execution_state.current_step_id.as_deref(),
            &execution_state.step_outputs,
        ));
    }
    ```

    Register hand_report_step tool when Hand is active:
    ```rust
    // In tool_runner.rs or where tools are registered:
    if let Some(executor) = hand_executor {
        tools.register(HandReportStepTool::new(executor));
    }
    ```

    In kernel activation, start Hand execution:
    ```rust
    // In OpenFangKernel::activate_hand or similar:
    pub async fn activate_hand(&self, hand_id: &str, config: Option<Value>) -> Result<HandInstance, Error> {
        // ... existing activation code ...

        // Start execution tracking if hand has steps
        if !def.steps.is_empty() {
            let execution_id = self.hand_executor.start_execution(
                hand_id.to_string(),
                agent_id.to_string(),
                def.steps.clone(),
            ).await?;

            // Store execution_id on the instance or in a map
        }

        // ... rest of activation ...
    }
    ```
  </action>
  <verify>
    <automated>cargo build --workspace --lib</automated>
  </verify>
  <acceptance_criteria>
    - Prompt builder includes Hand execution context when execution is active
    - hand_report_step tool is registered when Hand execution is active
    - Kernel activate_hand starts execution tracking
    - Build compiles without errors
  </acceptance_criteria>
  <done>Hand execution integrated with agent loop</done>
</task>

<task type="checkpoint:human-verify">
  <name>Task 4: Live Integration Test</name>
  <what-built>
    Complete Hand execution system:
    1. SQLite schema for execution state (Plan 03-01)
    2. ExecutionStore for persistence (Plan 03-01)
    3. Variable resolver for {{step_id.output}} (Plan 03-02)
    4. HandExecutor state machine (Plan 03-02)
    5. API endpoints for execution control (Plan 03-03)
    6. WebSocket real-time updates (Plan 03-04)
    7. Hand execution prompt (Task 1)
    8. hand_report_step tool (Task 2)
    9. Agent loop integration (Task 3)
  </what-built>
  <how-to-verify>
    1. Build and start the daemon:
       ```bash
       cargo build --release -p openfang-cli
       GROQ_API_KEY=<key> target/release/openfang.exe start &
       sleep 6
       curl -s http://127.0.0.1:4200/api/health
       ```

    2. Create a Hand with steps:
       ```bash
       curl -s -X PUT http://127.0.0.1:4200/api/hands/test-hand/steps \
         -H "Content-Type: application/json" \
         -d '{"steps": [
           {"id": "step1", "name": "Greet", "step_type": {"type": "send-message", "content": "Hello!"}, "next_steps": ["step2"]},
           {"id": "step2", "name": "Ask Name", "step_type": {"type": "wait-for-input", "prompt": "What is your name?"}, "next_steps": ["step3"]},
           {"id": "step3", "name": "Respond", "step_type": {"type": "send-message", "content": "Nice to meet you, {{step2.result}}!"}, "next_steps": []}
         ]}'
       ```

    3. Activate the Hand:
       ```bash
       curl -s -X POST http://127.0.0.1:4200/api/hands/test-hand/activate
       ```

    4. Open the Hands page in browser:
       http://127.0.0.1:4200/hands

    5. Verify:
       - Flow diagram shows steps with status indicators
       - First step shows "running" status
       - Agent sends "Hello!" message
       - Second step shows "waiting" status
       - When you respond, third step executes with variable substitution

    6. Check execution status via API:
       ```bash
       curl -s http://127.0.0.1:4200/api/hands/test-hand/executions
       ```
  </how-to-verify>
  <resume-signal>Type "approved" if the Hand executes steps correctly, or describe issues</resume-signal>
</task>

</tasks>

<verification>
- Hand execution prompt is injected into Agent system prompt
- hand_report_step tool is available to Agent
- Agent can complete steps and progress through the workflow
- wait-for-input steps pause execution
- Variable substitution works between steps
- WebSocket updates UI in real-time
</verification>

<success_criteria>
1. Hand steps are injected into Agent prompt during activation
2. Agent follows step sequence using hand_report_step tool
3. Step execution states are tracked and queryable
4. wait-for-input steps pause for user input
5. Variable interpolation works ({{step_id.output}})
6. UI shows real-time execution status
7. Full integration test passes
</success_criteria>

<output>
After completion, create `.planning/phases/03-execution-engine/03-05-integration-SUMMARY.md`
</output>
