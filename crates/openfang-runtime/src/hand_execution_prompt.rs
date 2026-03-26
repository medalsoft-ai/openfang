use openfang_hands::steps::{HandStep, StepType};
use regex_lite::Regex;
use serde_json::Value;
use std::collections::HashMap;

/// Build system prompt section for Hand execution
///
/// This generates a dynamic prompt that shows the Agent:
/// - All steps in the Hand with their current status
/// - Which step is currently being executed
/// - Variable references for step outputs
/// - Instructions to report step completion using the hand_report_step tool
pub fn build_hand_execution_prompt(
    steps: &[HandStep],
    current_step_id: Option<&str>,
    step_outputs: &HashMap<String, Value>,
) -> String {
    let mut prompt = String::new();

    // Header
    prompt.push_str("## Hand Execution Context\n\n");
    prompt.push_str("You are executing a Hand (Standard Operating Procedure). Follow the steps below in order.\n\n");

    // Legend
    prompt.push_str("### Step Status Legend\n");
    prompt.push_str("- `[COMPLETED]` - Step finished successfully\n");
    prompt.push_str("- `[CURRENT]` - Execute this step now\n");
    prompt.push_str("- `[PENDING]` - Step waiting to be executed\n");
    prompt.push_str("- `[FAILED]` - Step failed and needs retry or handling\n\n");

    // Variable reference section
    if !step_outputs.is_empty() {
        prompt.push_str("### Available Variables\n");
        prompt.push_str("Reference previous step outputs using `{{step_id.output}}` syntax:\n\n");
        for (step_id, output) in step_outputs {
            prompt.push_str(&format!("- `{{{{{}_output}}}}`: {}\n", step_id, format_output_preview(output)));
        }
        prompt.push('\n');
    }

    // Steps section
    prompt.push_str("### Steps to Execute\n\n");

    // Build a map for quick lookup
    let step_map: HashMap<&str, &HandStep> = steps.iter().map(|s| (s.id.as_str(), s)).collect();

    // Track which steps are reachable from current
    let reachable = calculate_reachable_steps(steps, current_step_id);

    for step in steps {
        let status = determine_step_status(step, current_step_id, step_outputs, &reachable);
        let status_marker = match status {
            StepStatus::Completed => "[COMPLETED]",
            StepStatus::Current => "[CURRENT]",
            StepStatus::Pending => "[PENDING]",
            StepStatus::Failed => "[FAILED]",
        };

        prompt.push_str(&format!("{} **{}** (ID: `{}`)\n", status_marker, step.name, step.id));

        // Add step-specific details
        match &step.step_type {
            StepType::ExecuteTool { tool_name, input } => {
                prompt.push_str(&format!("  - Type: Execute Tool (`{}`)\n", tool_name));
                prompt.push_str(&format!("  - Input: {}\n", format_json_compact(input)));
                prompt.push_str("  - Action: Execute the tool and report the result\n");
            }
            StepType::SendMessage { content, target_agent } => {
                prompt.push_str("  - Type: Send Message\n");
                prompt.push_str(&format!("  - Content: {}\n", content));
                if let Some(target) = target_agent {
                    prompt.push_str(&format!("  - Target Agent: {}\n", target));
                }
                prompt.push_str("  - Action: Send the message and report completion\n");
            }
            StepType::WaitForInput { prompt: input_prompt, timeout_secs } => {
                prompt.push_str("  - Type: Wait for Input\n");
                prompt.push_str(&format!("  - Prompt: {}\n", input_prompt));
                if let Some(timeout) = timeout_secs {
                    prompt.push_str(&format!("  - Timeout: {} seconds\n", timeout));
                }
                prompt.push_str("  - Action: Present this prompt to the user and wait for their response\n");
            }
            StepType::Condition { expression, true_branch, false_branch } => {
                prompt.push_str("  - Type: Condition/Decision\n");
                prompt.push_str(&format!("  - Expression: `{}`\n", expression));
                prompt.push_str(&format!("  - If TRUE: proceed to step `{}`\n", true_branch));
                prompt.push_str(&format!("  - If FALSE: proceed to step `{}`\n", false_branch));

                // Try to resolve expression value if variables are available
                let resolved = resolve_variables_in_expression(expression, step_outputs);
                prompt.push_str(&format!("  - Current Evaluation: {}\n", resolved));
                prompt.push_str("  - Action: Evaluate the condition and report TRUE or FALSE\n");
            }
            StepType::Loop { iterator, items, body } => {
                prompt.push_str("  - Type: Loop\n");
                prompt.push_str(&format!("  - Iterator Variable: `{}`\n", iterator));
                prompt.push_str(&format!("  - Items: {}\n", items));
                prompt.push_str(&format!("  - Body Steps: {:?}\n", body));
                prompt.push_str("  - Action: Iterate through items, executing body steps for each\n");
            }
            StepType::SubHand { hand_id, input_mapping } => {
                prompt.push_str("  - Type: Sub-Hand\n");
                prompt.push_str(&format!("  - Hand ID: {}\n", hand_id));
                prompt.push_str(&format!("  - Input Mapping: {}\n", format_json_compact(input_mapping)));
                prompt.push_str("  - Action: Execute the referenced Hand with provided inputs\n");
            }
        }

        // Show next steps
        if !step.next_steps.is_empty() {
            prompt.push_str(&format!("  - On Completion: proceed to `{}`\n", step.next_steps.join(", ")));
        }

        prompt.push('\n');
    }

    // Instructions for current step
    if let Some(current_id) = current_step_id {
        if let Some(current_step) = step_map.get(current_id) {
            prompt.push_str("### Your Current Task\n\n");
            prompt.push_str(&format!("You are executing step `{}` ({}).\n\n", current_id, current_step.name));
            prompt.push_str("**Instructions:**\n");
            prompt.push_str(&format!("1. Execute the step `{}` according to its type\n", current_step.name));
            prompt.push_str("2. Use the appropriate tool or action for this step type\n");
            prompt.push_str("3. **When finished, you MUST call the `hand_report_step` tool** with:\n");
            prompt.push_str("   - `step_id`: the ID of the step you just completed\n");
            prompt.push_str("   - `status`: \"completed\" if successful, \"failed\" if there was an error\n");
            prompt.push_str("   - `output`: the result/output of the step (JSON object)\n");
            prompt.push_str("   - `error`: error message if status is \"failed\"\n\n");

            prompt.push_str("**Example tool call:**\n");
            prompt.push_str("```\n");
            prompt.push_str(&format!("hand_report_step(step_id=\"{}\", status=\"completed\", output={{\"result\": \"...\"}})\n", current_id));
            prompt.push_str("```\n\n");
        }
    }

    // Execution rules
    prompt.push_str("### Execution Rules\n");
    prompt.push_str("1. Execute ONLY the step marked [CURRENT]\n");
    prompt.push_str("2. Do NOT skip ahead to pending steps\n");
    prompt.push_str("3. Do NOT re-execute completed steps unless retrying a failure\n");
    prompt.push_str("4. ALWAYS report step completion using `hand_report_step` tool\n");
    prompt.push_str("5. Use variable references (`{{step_id.output}}`) to access previous step outputs\n");
    prompt.push_str("6. If a step fails, report it with status=\"failed\" and provide error details\n");

    prompt
}

#[derive(Debug, Clone, Copy, PartialEq)]
enum StepStatus {
    Completed,
    Current,
    Pending,
    Failed,
}

fn determine_step_status(
    step: &HandStep,
    current_step_id: Option<&str>,
    step_outputs: &HashMap<String, Value>,
    reachable: &HashMap<&str, bool>,
) -> StepStatus {
    // Check if this step has output (completed)
    if step_outputs.contains_key(&step.id) {
        // If it also has an error indicator, mark as failed
        if let Some(output) = step_outputs.get(&step.id) {
            if let Some(obj) = output.as_object() {
                if obj.contains_key("error") {
                    return StepStatus::Failed;
                }
            }
        }
        return StepStatus::Completed;
    }

    // Check if this is the current step
    if current_step_id == Some(step.id.as_str()) {
        return StepStatus::Current;
    }

    // Check if step is reachable from current
    if let Some(is_reachable) = reachable.get(step.id.as_str()) {
        if *is_reachable {
            return StepStatus::Pending;
        }
    }

    // Default to pending for now (orphaned steps will be filtered elsewhere)
    StepStatus::Pending
}

fn calculate_reachable_steps<'a>(
    steps: &'a [HandStep],
    current_step_id: Option<&'a str>,
) -> HashMap<&'a str, bool> {
    let mut reachable = HashMap::new();
    let step_map: HashMap<&str, &HandStep> = steps.iter().map(|s| (s.id.as_str(), s)).collect();

    if let Some(start_id) = current_step_id {
        let mut to_visit = vec![start_id];
        let mut visited = std::collections::HashSet::new();

        while let Some(step_id) = to_visit.pop() {
            if visited.contains(step_id) {
                continue;
            }
            visited.insert(step_id);
            reachable.insert(step_id, true);

            if let Some(step) = step_map.get(step_id) {
                for next_id in &step.next_steps {
                    to_visit.push(next_id.as_str());
                }
            }
        }
    }

    reachable
}

fn format_output_preview(output: &Value) -> String {
    match output {
        Value::String(s) => {
            if s.len() > 50 {
                format!("\"{}...\"", &s[..50])
            } else {
                format!("\"{}\"", s)
            }
        }
        Value::Number(n) => n.to_string(),
        Value::Bool(b) => b.to_string(),
        Value::Null => "null".to_string(),
        Value::Object(obj) => {
            if obj.len() == 1 {
                let (k, v) = obj.iter().next().unwrap();
                format!("{{\"{}\": {}}}", k, format_output_preview(v))
            } else {
                format!("{{... {} fields ...}}", obj.len())
            }
        }
        Value::Array(arr) => format!("[... {} items ...]", arr.len()),
    }
}

fn format_json_compact(value: &Value) -> String {
    match value {
        Value::Object(obj) if obj.is_empty() => "{}".to_string(),
        Value::Array(arr) if arr.is_empty() => "[]".to_string(),
        _ => value.to_string(),
    }
}

fn resolve_variables_in_expression(expression: &str, step_outputs: &HashMap<String, Value>) -> String {
    let re = match Regex::new(r"\{\{(\w+)\.output\}\}") {
        Ok(re) => re,
        Err(_) => return expression.to_string(),
    };

    let mut result = expression.to_string();
    for cap in re.captures_iter(expression) {
        let full_match = cap.get(0).map(|m| m.as_str()).unwrap_or("");
        let step_id = cap.get(1).map(|m| m.as_str()).unwrap_or("");

        if let Some(output) = step_outputs.get(step_id) {
            let replacement = match output {
                Value::String(s) => s.clone(),
                Value::Number(n) => n.to_string(),
                Value::Bool(b) => b.to_string(),
                _ => output.to_string(),
            };
            result = result.replace(full_match, &replacement);
        }
    }

    if result == expression {
        "(awaiting variables)".to_string()
    } else {
        format!("`{}` (resolved)", result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    fn create_test_step(id: &str, name: &str, step_type: StepType) -> HandStep {
        HandStep {
            id: id.to_string(),
            name: name.to_string(),
            step_type,
            next_steps: vec![],
        }
    }

    #[test]
    fn test_build_hand_execution_prompt_basic() {
        let steps = vec![
            create_test_step(
                "step1",
                "First Step",
                StepType::ExecuteTool {
                    tool_name: "test_tool".to_string(),
                    input: json!({"key": "value"}),
                },
            ),
        ];

        let outputs = HashMap::new();
        let prompt = build_hand_execution_prompt(&steps, Some("step1"), &outputs);

        assert!(prompt.contains("Hand Execution Context"));
        assert!(prompt.contains("[CURRENT]"));
        assert!(prompt.contains("step1"));
        assert!(prompt.contains("hand_report_step"));
    }

    #[test]
    fn test_step_status_markers() {
        let steps = vec![
            create_test_step(
                "step1",
                "Completed Step",
                StepType::SendMessage {
                    content: "Hello".to_string(),
                    target_agent: None,
                },
            ),
            create_test_step(
                "step2",
                "Current Step",
                StepType::WaitForInput {
                    prompt: "Enter value".to_string(),
                    timeout_secs: None,
                },
            ),
            create_test_step(
                "step3",
                "Pending Step",
                StepType::ExecuteTool {
                    tool_name: "another_tool".to_string(),
                    input: json!({}),
                },
            ),
        ];

        let mut outputs = HashMap::new();
        outputs.insert("step1".to_string(), json!({"result": "done"}));

        let prompt = build_hand_execution_prompt(&steps, Some("step2"), &outputs);

        assert!(prompt.contains("[COMPLETED]"));
        assert!(prompt.contains("[CURRENT]"));
        assert!(prompt.contains("[PENDING]"));
    }

    #[test]
    fn test_variable_resolution() {
        let steps = vec![
            create_test_step(
                "step2",
                "Condition Step",
                StepType::Condition {
                    expression: "{{step1.output}} > 5".to_string(),
                    true_branch: "step3".to_string(),
                    false_branch: "step4".to_string(),
                },
            ),
        ];

        let mut outputs = HashMap::new();
        outputs.insert("step1".to_string(), json!(10));

        let prompt = build_hand_execution_prompt(&steps, Some("step2"), &outputs);

        assert!(prompt.contains("Available Variables"));
        assert!(prompt.contains("{{step1_output}}"));
    }

    #[test]
    fn test_step_type_formatting() {
        let steps = vec![
            create_test_step(
                "loop1",
                "Loop Step",
                StepType::Loop {
                    iterator: "item".to_string(),
                    items: "[1, 2, 3]".to_string(),
                    body: vec!["body1".to_string()],
                },
            ),
            create_test_step(
                "sub1",
                "Sub-Hand Step",
                StepType::SubHand {
                    hand_id: "other_hand".to_string(),
                    input_mapping: json!({"input": "value"}),
                },
            ),
        ];

        let prompt = build_hand_execution_prompt(&steps, Some("loop1"), &HashMap::new());

        assert!(prompt.contains("Type: Loop"));
        assert!(prompt.contains("Type: Sub-Hand"));
        assert!(prompt.contains("other_hand"));
    }
}
