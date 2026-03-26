//! Request/response types for the OpenFang API.

use serde::{Deserialize, Serialize};

/// Request to spawn an agent from a TOML manifest string or a template name.
#[derive(Debug, Deserialize)]
pub struct SpawnRequest {
    /// Agent manifest as TOML string (optional if `template` is provided).
    #[serde(default)]
    pub manifest_toml: String,
    /// Template name from `~/.openfang/agents/{template}/agent.toml`.
    /// When provided and `manifest_toml` is empty, the template is loaded automatically.
    #[serde(default)]
    pub template: Option<String>,
    /// Optional Ed25519 signed manifest envelope (JSON).
    /// When present, the signature is verified before spawning.
    #[serde(default)]
    pub signed_manifest: Option<String>,
}

/// Response after spawning an agent.
#[derive(Debug, Serialize)]
pub struct SpawnResponse {
    pub agent_id: String,
    pub name: String,
}

/// A file attachment reference (from a prior upload).
#[derive(Debug, Clone, Deserialize)]
pub struct AttachmentRef {
    pub file_id: String,
    #[serde(default)]
    pub filename: String,
    #[serde(default)]
    pub content_type: String,
}

/// Request to send a message to an agent.
#[derive(Debug, Deserialize)]
pub struct MessageRequest {
    pub message: String,
    /// Optional file attachments (uploaded via /upload endpoint).
    #[serde(default)]
    pub attachments: Vec<AttachmentRef>,
    /// Sender identity (e.g. WhatsApp phone number, Telegram user ID).
    #[serde(default)]
    pub sender_id: Option<String>,
    /// Sender display name.
    #[serde(default)]
    pub sender_name: Option<String>,
}

/// Response from sending a message.
#[derive(Debug, Serialize)]
pub struct MessageResponse {
    pub response: String,
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub iterations: u32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub cost_usd: Option<f64>,
}

/// Request to install a skill from the marketplace.
#[derive(Debug, Deserialize)]
pub struct SkillInstallRequest {
    pub name: String,
}

/// Request to uninstall a skill.
#[derive(Debug, Deserialize)]
pub struct SkillUninstallRequest {
    pub name: String,
}

/// Request to update an agent's manifest.
#[derive(Debug, Deserialize)]
pub struct AgentUpdateRequest {
    pub manifest_toml: String,
}

/// Request to change an agent's operational mode.
#[derive(Debug, Deserialize)]
pub struct SetModeRequest {
    pub mode: openfang_types::agent::AgentMode,
}

/// Request to run a migration.
#[derive(Debug, Deserialize)]
pub struct MigrateRequest {
    pub source: String,
    pub source_dir: String,
    pub target_dir: String,
    #[serde(default)]
    pub dry_run: bool,
}

/// Request to scan a directory for migration.
#[derive(Debug, Deserialize)]
pub struct MigrateScanRequest {
    pub path: String,
}

/// Request to install a skill from ClawHub.
#[derive(Debug, Deserialize)]
pub struct ClawHubInstallRequest {
    /// ClawHub skill slug (e.g., "github-helper").
    pub slug: String,
}

// --- Hand Steps API Types ---

use openfang_hands::steps::HandStep;

/// Response for GET /api/hands/{id}/steps
#[derive(Debug, Serialize)]
pub struct GetHandStepsResponse {
    pub steps: Vec<HandStep>,
}

/// Request for PUT /api/hands/{id}/steps
/// Supports both frontend format (flat type+config) and backend format (nested step_type)
#[derive(Debug, Deserialize)]
#[serde(try_from = "UpdateHandStepsInput")]
pub struct UpdateHandStepsRequest {
    pub steps: Vec<HandStep>,
}

/// Intermediate type to handle both frontend and backend formats
#[derive(Debug, Deserialize)]
struct UpdateHandStepsInput {
    pub steps: Vec<serde_json::Value>,
}

impl TryFrom<UpdateHandStepsInput> for UpdateHandStepsRequest {
    type Error = String;

    fn try_from(input: UpdateHandStepsInput) -> Result<Self, Self::Error> {
        let steps: Result<Vec<HandStep>, String> = input
            .steps
            .into_iter()
            .enumerate()
            .map(|(idx, value)| parse_hand_step(value, idx))
            .collect();
        Ok(Self { steps: steps? })
    }
}

/// Parse a HandStep from JSON, handling both frontend and backend formats
fn parse_hand_step(value: serde_json::Value, idx: usize) -> Result<HandStep, String> {
    use serde_json::json;

    // First, try to deserialize as backend format directly
    if let Ok(step) = serde_json::from_value::<HandStep>(value.clone()) {
        return Ok(step);
    }

    // If that fails, try frontend format
    let obj = value
        .as_object()
        .ok_or_else(|| format!("Step {}: not an object", idx))?;

    let id = obj
        .get("id")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("Step {}: missing or invalid 'id'", idx))?
        .to_string();

    let name = obj
        .get("name")
        .and_then(|v| v.as_str())
        .ok_or_else(|| format!("Step {}: missing or invalid 'name'", idx))?
        .to_string();

    let next_steps: Vec<String> = obj
        .get("nextSteps")
        .or_else(|| obj.get("next_steps"))
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(String::from))
                .collect()
        })
        .unwrap_or_default();

    // Check for frontend format: "type" field
    let step_type = if let Some(type_val) = obj.get("type").and_then(|v| v.as_str()) {
        let config = obj.get("config").cloned().unwrap_or_else(|| json!({}));
        parse_step_type_from_frontend(type_val, config, idx)?
    } else if obj.get("step_type").is_some() {
        // Backend nested format failed earlier, try again with better error
        return Err(format!(
            "Step {}: failed to parse 'step_type' field",
            idx
        ));
    } else {
        return Err(format!(
            "Step {}: missing 'type' or 'step_type' field",
            idx
        ));
    };

    Ok(HandStep {
        id,
        name,
        step_type,
        next_steps,
    })
}

/// Parse StepType from frontend format
fn parse_step_type_from_frontend(
    step_type: &str,
    config: serde_json::Value,
    idx: usize,
) -> Result<openfang_hands::steps::StepType, String> {
    use openfang_hands::steps::StepType;
    use serde_json::json;

    let config_obj = config.as_object().cloned().unwrap_or_default();

    match step_type {
        "execute-tool" => {
            let tool_name = config_obj
                .get("toolName")
                .or_else(|| config_obj.get("tool_name"))
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Step {} execute-tool: missing 'toolName'", idx))?
                .to_string();
            let input = config_obj.get("input").cloned().unwrap_or(json!({}));
            Ok(StepType::ExecuteTool { tool_name, input })
        }
        "send-message" => {
            let content = config_obj
                .get("content")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Step {} send-message: missing 'content'", idx))?
                .to_string();
            let target_agent = config_obj
                .get("targetAgent")
                .or_else(|| config_obj.get("target_agent"))
                .and_then(|v| v.as_str())
                .map(String::from);
            Ok(StepType::SendMessage {
                content,
                target_agent,
            })
        }
        "wait-for-input" => {
            let prompt = config_obj
                .get("prompt")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Step {} wait-for-input: missing 'prompt'", idx))?
                .to_string();
            let timeout_secs = config_obj
                .get("timeoutSecs")
                .or_else(|| config_obj.get("timeout_secs"))
                .and_then(|v| v.as_u64())
                .map(|v| v as u32);
            Ok(StepType::WaitForInput {
                prompt,
                timeout_secs,
            })
        }
        "condition" => {
            let expression = config_obj
                .get("expression")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Step {} condition: missing 'expression'", idx))?
                .to_string();
            let true_branch = config_obj
                .get("trueBranch")
                .or_else(|| config_obj.get("true_branch"))
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Step {} condition: missing 'trueBranch'", idx))?
                .to_string();
            let false_branch = config_obj
                .get("falseBranch")
                .or_else(|| config_obj.get("false_branch"))
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Step {} condition: missing 'falseBranch'", idx))?
                .to_string();
            Ok(StepType::Condition {
                expression,
                true_branch,
                false_branch,
            })
        }
        "loop" => {
            let iterator = config_obj
                .get("iterator")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Step {} loop: missing 'iterator'", idx))?
                .to_string();
            let items = config_obj
                .get("items")
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Step {} loop: missing 'items'", idx))?
                .to_string();
            let body: Vec<String> = config_obj
                .get("body")
                .and_then(|v| v.as_array())
                .map(|arr| {
                    arr.iter()
                        .filter_map(|v| v.as_str().map(String::from))
                        .collect()
                })
                .unwrap_or_default();
            Ok(StepType::Loop {
                iterator,
                items,
                body,
            })
        }
        "sub-hand" => {
            let hand_id = config_obj
                .get("handId")
                .or_else(|| config_obj.get("hand_id"))
                .and_then(|v| v.as_str())
                .ok_or_else(|| format!("Step {} sub-hand: missing 'handId'", idx))?
                .to_string();
            let input_mapping = config_obj.get("inputMapping").cloned()
                .or_else(|| config_obj.get("input_mapping").cloned())
                .unwrap_or(json!({}));
            Ok(StepType::SubHand {
                hand_id,
                input_mapping,
            })
        }
        _ => Err(format!("Step {}: unknown step type '{}'", idx, step_type)),
    }
}

/// Error response for step validation failures
#[derive(Debug, Serialize)]
pub struct StepValidationError {
    pub field: String,
    pub message: String,
}

// --- Hand Execution API Types ---

/// Response for GET /api/hands/{id}/steps/{step_id}/status
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

/// Summary of a Hand execution
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

/// Detail of a step execution
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

/// Detailed execution response with steps
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

/// Request to execute a step
#[derive(Debug, Clone, serde::Deserialize)]
pub struct ExecuteStepRequest {
    pub execution_id: String,
    pub input: Option<serde_json::Value>,
}

/// Request to submit user input for wait-for-input step
#[derive(Debug, Clone, serde::Deserialize)]
pub struct SubmitInputRequest {
    pub input: String,
}
