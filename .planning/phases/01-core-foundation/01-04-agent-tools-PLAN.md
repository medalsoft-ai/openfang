---
phase: 01
core-foundation: true
name: Create Agent Tools for Hand Management
description: Implement hand_create and hand_update_steps tools for Agent
wave: 3
task_count: 1
autonomous: true
gap_closure: false
requirements:
  - HAND-STEP-03
  - HAND-STEP-04
---

# Plan 01-04: Create Agent Tools for Hand Management

## Objective
Implement agent tools that allow LLM agents to create Hands and modify their steps dynamically.

## Success Criteria
- Agent can call `hand_create` tool to create a new Hand with steps
- Agent can call `hand_update_steps` tool to modify existing Hand steps
- Tools return updated Hand definition for confirmation
- Changes persist and reflect in API/UI

## Files to Modify
- `crates/openfang-runtime/src/tools/hand_tools.rs` (new)
- `crates/openfang-runtime/src/tool_runner.rs` (modify - register tools)

## Task 1: Create hand_tools.rs Module

Create `crates/openfang-runtime/src/tools/hand_tools.rs`:

```rust
use crate::tool_runner::ToolContext;
use anyhow::{anyhow, Result};
use openfang_hands::steps::{HandStep, StepType};
use openfang_hands::{HandCategory, HandDefinition};
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Input for hand_create tool
#[derive(Debug, Deserialize)]
pub struct HandCreateInput {
    pub name: String,
    pub description: String,
    pub category: String,
    #[serde(default)]
    pub icon: Option<String>,
    #[serde(default)]
    pub steps: Vec<StepInput>,
}

/// Input structure for a step (from JSON)
#[derive(Debug, Deserialize)]
pub struct StepInput {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub step_type: String,
    #[serde(default)]
    pub config: Value,
    #[serde(default)]
    pub next_steps: Vec<String>,
}

/// Output for hand_create tool
#[derive(Debug, Serialize)]
pub struct HandCreateOutput {
    pub hand_id: String,
    pub name: String,
    pub step_count: usize,
    pub message: String,
}

/// Input for hand_update_steps tool
#[derive(Debug, Deserialize)]
pub struct HandUpdateStepsInput {
    pub hand_id: String,
    pub operation: String, // "add", "update", "delete", "replace"
    #[serde(default)]
    pub steps: Vec<StepInput>,
    #[serde(default)]
    pub step_ids_to_delete: Vec<String>,
}

/// Output for hand_update_steps tool
#[derive(Debug, Serialize)]
pub struct HandUpdateStepsOutput {
    pub hand_id: String,
    pub operation: String,
    pub step_count: usize,
    pub message: String,
}

/// Create a new Hand with initial steps
pub async fn hand_create(context: &ToolContext, input: Value) -> Result<Value> {
    let input: HandCreateInput = serde_json::from_value(input)
        .map_err(|e| anyhow!("Invalid input: {}", e))?;

    // Validate category
    let category = parse_category(&input.category)?;

    // Convert step inputs to HandSteps
    let steps = convert_steps(input.steps)?;

    // Create Hand definition
    let hand_def = HandDefinition {
        id: uuid::Uuid::new_v4().to_string(),
        name: input.name.clone(),
        description: input.description,
        category,
        icon: input.icon.unwrap_or_else(|| "🤖".to_string()),
        version: "1.0.0".to_string(),
        author: "agent".to_string(),
        created_at: chrono::Utc::now(),
        updated_at: chrono::Utc::now(),
        steps,
        ..Default::default()
    };

    let hand_id = hand_def.id.clone();
    let step_count = hand_def.steps.len();

    // Save to registry
    let mut registry = context.hands_registry.write().await;
    registry.register(hand_def)?;

    let output = HandCreateOutput {
        hand_id,
        name: input.name,
        step_count,
        message: format!("Created Hand '{}' with {} steps", input.name, step_count),
    };

    Ok(serde_json::to_value(output)?)
}

/// Update steps of an existing Hand
pub async fn hand_update_steps(context: &ToolContext, input: Value) -> Result<Value> {
    let input: HandUpdateStepsInput = serde_json::from_value(input)
        .map_err(|e| anyhow!("Invalid input: {}", e))?;

    let mut registry = context.hands_registry.write().await;

    // Get existing hand
    let mut hand = registry
        .get(&input.hand_id)
        .map_err(|_| anyhow!("Hand '{}' not found", input.hand_id))?;

    let original_count = hand.definition.steps.len();

    match input.operation.as_str() {
        "add" => {
            let new_steps = convert_steps(input.steps)?;
            hand.definition.steps.extend(new_steps);
        }
        "update" => {
            let updates = convert_steps(input.steps)?;
            for update in updates {
                if let Some(existing) = hand.definition.steps.iter_mut()
                    .find(|s| s.id == update.id) {
                    *existing = update;
                }
            }
        }
        "delete" => {
            hand.definition.steps.retain(|s| !input.step_ids_to_delete.contains(&s.id));
        }
        "replace" => {
            hand.definition.steps = convert_steps(input.steps)?;
        }
        _ => return Err(anyhow!("Unknown operation: {}", input.operation)),
    }

    hand.definition.updated_at = chrono::Utc::now();
    let new_count = hand.definition.steps.len();

    // Save updated hand
    registry.update(hand)?;

    let output = HandUpdateStepsOutput {
        hand_id: input.hand_id.clone(),
        operation: input.operation,
        step_count: new_count,
        message: format!(
            "Updated Hand '{}': {} steps → {} steps",
            input.hand_id, original_count, new_count
        ),
    };

    Ok(serde_json::to_value(output)?)
}

/// Parse category string to HandCategory
fn parse_category(category: &str) -> Result<HandCategory> {
    match category.to_lowercase().as_str() {
        "content" => Ok(HandCategory::Content),
        "security" => Ok(HandCategory::Security),
        "productivity" => Ok(HandCategory::Productivity),
        "development" => Ok(HandCategory::Development),
        "communication" => Ok(HandCategory::Communication),
        "data" => Ok(HandCategory::Data),
        _ => Err(anyhow!("Invalid category: {}", category)),
    }
}

/// Convert StepInput (from JSON) to HandStep (internal)
fn convert_steps(inputs: Vec<StepInput>) -> Result<Vec<HandStep>> {
    inputs.into_iter().map(|input| {
        let step_type = parse_step_type(&input.step_type, input.config)?;
        Ok(HandStep {
            id: input.id,
            name: input.name,
            step_type,
            next_steps: input.next_steps,
        })
    }).collect()
}

/// Parse step type string and config to StepType enum
fn parse_step_type(step_type: &str, config: Value) -> Result<StepType> {
    match step_type {
        "execute-tool" => {
            let tool_name = config.get("toolName")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("execute-tool requires toolName"))?
                .to_string();
            let input = config.get("input").cloned().unwrap_or_default();
            Ok(StepType::ExecuteTool { tool_name, input })
        }
        "send-message" => {
            let content = config.get("content")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("send-message requires content"))?
                .to_string();
            let target_agent = config.get("targetAgent").and_then(|v| v.as_str()).map(String::from);
            Ok(StepType::SendMessage { content, target_agent })
        }
        "wait-for-input" => {
            let prompt = config.get("prompt")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("wait-for-input requires prompt"))?
                .to_string();
            let timeout_secs = config.get("timeoutSecs").and_then(|v| v.as_u64()).map(|v| v as u32);
            Ok(StepType::WaitForInput { prompt, timeout_secs })
        }
        "condition" => {
            let expression = config.get("expression")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("condition requires expression"))?
                .to_string();
            let true_branch = config.get("trueBranch")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("condition requires trueBranch"))?
                .to_string();
            let false_branch = config.get("falseBranch")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("condition requires falseBranch"))?
                .to_string();
            Ok(StepType::Condition { expression, true_branch, false_branch })
        }
        "loop" => {
            let iterator = config.get("iterator")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("loop requires iterator"))?
                .to_string();
            let items = config.get("items")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("loop requires items"))?
                .to_string();
            let body = config.get("body")
                .and_then(|v| v.as_array())
                .map(|arr| arr.iter()
                    .filter_map(|v| v.as_str().map(String::from))
                    .collect())
                .unwrap_or_default();
            Ok(StepType::Loop { iterator, items, body })
        }
        "sub-hand" => {
            let hand_id = config.get("handId")
                .and_then(|v| v.as_str())
                .ok_or_else(|| anyhow!("sub-hand requires handId"))?
                .to_string();
            let input_mapping = config.get("inputMapping").cloned().unwrap_or_default();
            Ok(StepType::SubHand { hand_id, input_mapping })
        }
        _ => Err(anyhow!("Unknown step type: {}", step_type)),
    }
}
```

## Task 2: Register Tools in tool_runner.rs

Modify `crates/openfang-runtime/src/tool_runner.rs`:

1. Add module declaration:
```rust
pub mod hand_tools;
```

2. Add tool definitions in `builtin_tool_definitions()`:

```rust
ToolDefinition {
    name: "hand_create".to_string(),
    description: "Create a new Hand (SOP) with an initial set of steps. Returns the new Hand ID.".to_string(),
    parameters: ToolParameters {
        properties: {
            let mut m = HashMap::new();
            m.insert("name".to_string(), ToolParameter {
                param_type: "string".to_string(),
                description: "Name of the Hand".to_string(),
                required: true,
                ..Default::default()
            });
            m.insert("description".to_string(), ToolParameter {
                param_type: "string".to_string(),
                description: "Description of what the Hand does".to_string(),
                required: true,
                ..Default::default()
            });
            m.insert("category".to_string(), ToolParameter {
                param_type: "string".to_string(),
                description: "Category: content, security, productivity, development, communication, or data".to_string(),
                required: true,
                ..Default::default()
            });
            m.insert("icon".to_string(), ToolParameter {
                param_type: "string".to_string(),
                description: "Emoji icon for the Hand".to_string(),
                required: false,
                ..Default::default()
            });
            m.insert("steps".to_string(), ToolParameter {
                param_type: "array".to_string(),
                description: "Initial steps for the Hand".to_string(),
                required: false,
                ..Default::default()
            });
            m
        },
        required: vec!["name".to_string(), "description".to_string(), "category".to_string()],
    },
}
```

3. Add `hand_update_steps` tool definition similarly.

4. In `execute_tool()`, add handlers:

```rust
"hand_create" => hand_tools::hand_create(context, input).await,
"hand_update_steps" => hand_tools::hand_update_steps(context, input).await,
```

## Task 3: Add Unit Tests

Add tests in `hand_tools.rs`:

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_category() {
        assert!(parse_category("content").is_ok());
        assert!(parse_category("development").is_ok());
        assert!(parse_category("invalid").is_err());
    }

    #[test]
    fn test_convert_steps_execute_tool() {
        let input = StepInput {
            id: "step1".to_string(),
            name: "Search".to_string(),
            step_type: "execute-tool".to_string(),
            config: serde_json::json!({
                "toolName": "web_search",
                "input": { "query": "test" }
            }),
            next_steps: vec!["step2".to_string()],
        };

        let steps = convert_steps(vec![input]).unwrap();
        assert_eq!(steps.len(), 1);
        assert_eq!(steps[0].id, "step1");
        match &steps[0].step_type {
            StepType::ExecuteTool { tool_name, .. } => {
                assert_eq!(tool_name, "web_search");
            }
            _ => panic!("Wrong step type"),
        }
    }
}
```

## Verification

```bash
cargo test --package openfang-runtime
cargo build --package openfang-runtime
```

Live test with daemon:
```bash
# Start daemon, then send message to agent:
# "Create a Hand named 'Greeting' with steps: 1) Send 'Hello' message"
# Verify agent calls hand_create tool and Hand appears in list
```

## Dependencies
- 01-01 (Step types)
- 01-03 (API endpoints - for consistency)

## Notes
- Tool names use kebab-case in JSON, snake_case in Rust
- Config field names use camelCase to match TypeScript conventions
- Operations: "add" appends, "update" merges, "delete" removes, "replace" overwrites
