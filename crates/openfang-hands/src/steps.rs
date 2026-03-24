use serde::{Deserialize, Serialize};
use serde_json::Value;

/// A single step in a Hand workflow
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct HandStep {
    pub id: String,
    pub name: String,
    pub step_type: StepType,
    #[serde(default)]
    pub next_steps: Vec<String>,
}

/// Step type variants with their specific configurations
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "kebab-case")]
pub enum StepType {
    ExecuteTool {
        tool_name: String,
        #[serde(default)]
        input: Value,
    },
    SendMessage {
        content: String,
        #[serde(default)]
        target_agent: Option<String>,
    },
    WaitForInput {
        prompt: String,
        #[serde(default)]
        timeout_secs: Option<u32>,
    },
    Condition {
        expression: String,
        true_branch: String,
        false_branch: String,
    },
    Loop {
        iterator: String,
        items: String,
        body: Vec<String>,
    },
    SubHand {
        hand_id: String,
        #[serde(default)]
        input_mapping: Value,
    },
}

impl HandStep {
    pub fn new(id: impl Into<String>, name: impl Into<String>, step_type: StepType) -> Self {
        Self {
            id: id.into(),
            name: name.into(),
            step_type,
            next_steps: Vec::new(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn hand_step_new() {
        let step = HandStep::new("step1", "First Step", StepType::WaitForInput {
            prompt: "Enter your name".to_string(),
            timeout_secs: Some(60),
        });
        assert_eq!(step.id, "step1");
        assert_eq!(step.name, "First Step");
        assert!(step.next_steps.is_empty());
    }

    #[test]
    fn step_type_serialize_execute_tool() {
        let step = StepType::ExecuteTool {
            tool_name: "shell_exec".to_string(),
            input: serde_json::json!({"command": "ls -la"}),
        };
        let json = serde_json::to_string(&step).unwrap();
        assert!(json.contains("\"type\":\"execute-tool\""));
        assert!(json.contains("\"tool_name\":\"shell_exec\""));
    }

    #[test]
    fn step_type_serialize_send_message() {
        let step = StepType::SendMessage {
            content: "Hello!".to_string(),
            target_agent: Some("agent-1".to_string()),
        };
        let json = serde_json::to_string(&step).unwrap();
        assert!(json.contains("\"type\":\"send-message\""));
        assert!(json.contains("\"content\":\"Hello!\""));
        assert!(json.contains("\"target_agent\":\"agent-1\""));
    }

    #[test]
    fn step_type_serialize_wait_for_input() {
        let step = StepType::WaitForInput {
            prompt: "Please confirm".to_string(),
            timeout_secs: Some(30),
        };
        let json = serde_json::to_string(&step).unwrap();
        assert!(json.contains("\"type\":\"wait-for-input\""));
        assert!(json.contains("\"prompt\":\"Please confirm\""));
        assert!(json.contains("\"timeout_secs\":30"));
    }

    #[test]
    fn step_type_serialize_condition() {
        let step = StepType::Condition {
            expression: "x > 0".to_string(),
            true_branch: "step-true".to_string(),
            false_branch: "step-false".to_string(),
        };
        let json = serde_json::to_string(&step).unwrap();
        assert!(json.contains("\"type\":\"condition\""));
        assert!(json.contains("\"expression\":\"x > 0\""));
        assert!(json.contains("\"true_branch\":\"step-true\""));
        assert!(json.contains("\"false_branch\":\"step-false\""));
    }

    #[test]
    fn step_type_serialize_loop() {
        let step = StepType::Loop {
            iterator: "item".to_string(),
            items: "items_list".to_string(),
            body: vec!["process".to_string(), "save".to_string()],
        };
        let json = serde_json::to_string(&step).unwrap();
        assert!(json.contains("\"type\":\"loop\""));
        assert!(json.contains("\"iterator\":\"item\""));
        assert!(json.contains("\"items\":\"items_list\""));
        assert!(json.contains("\"body\":[\"process\",\"save\"]"));
    }

    #[test]
    fn step_type_serialize_sub_hand() {
        let step = StepType::SubHand {
            hand_id: "sub-hand-1".to_string(),
            input_mapping: serde_json::json!({"input": "value"}),
        };
        let json = serde_json::to_string(&step).unwrap();
        assert!(json.contains("\"type\":\"sub-hand\""));
        assert!(json.contains("\"hand_id\":\"sub-hand-1\""));
    }

    #[test]
    fn step_type_deserialize_from_json() {
        let json = r#"{"type":"execute-tool","tool_name":"web_search","input":{"query":"test"}}"#;
        let step: StepType = serde_json::from_str(json).unwrap();
        match step {
            StepType::ExecuteTool { tool_name, input } => {
                assert_eq!(tool_name, "web_search");
                assert_eq!(input["query"], "test");
            }
            _ => panic!("Expected ExecuteTool variant"),
        }
    }

    #[test]
    fn hand_step_with_next_steps() {
        let step = HandStep {
            id: "step1".to_string(),
            name: "Start".to_string(),
            step_type: StepType::WaitForInput {
                prompt: "Begin?".to_string(),
                timeout_secs: None,
            },
            next_steps: vec!["step2".to_string(), "step3".to_string()],
        };
        assert_eq!(step.next_steps.len(), 2);
        assert_eq!(step.next_steps[0], "step2");
        assert_eq!(step.next_steps[1], "step3");
    }

    #[test]
    fn hand_step_roundtrip_json() {
        let step = HandStep {
            id: "test-step".to_string(),
            name: "Test Step".to_string(),
            step_type: StepType::SendMessage {
                content: "Hello".to_string(),
                target_agent: None,
            },
            next_steps: vec!["next-1".to_string()],
        };

        let json = serde_json::to_string(&step).unwrap();
        let deserialized: HandStep = serde_json::from_str(&json).unwrap();

        assert_eq!(step.id, deserialized.id);
        assert_eq!(step.name, deserialized.name);
        assert_eq!(step.next_steps, deserialized.next_steps);
    }
}
