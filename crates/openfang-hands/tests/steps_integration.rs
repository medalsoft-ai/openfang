//! Integration tests for Hand steps system
//!
//! These tests verify the complete roundtrip of Hand steps:
//! - Serialization to TOML
//! - Deserialization from TOML
//! - Step graph structure preservation
//! - All step types

use openfang_hands::steps::{HandStep, StepType};
use openfang_hands::{HandCategory, HandDefinition, HandDashboard, HandAgentConfig};

/// Test complete roundtrip of HandDefinition with steps through TOML serialization
#[test]
fn test_steps_roundtrip() {
    let hand = HandDefinition {
        id: "test-123".to_string(),
        name: "Test Hand".to_string(),
        description: "Test".to_string(),
        category: HandCategory::Productivity,
        icon: "T".to_string(),
        tools: vec![],
        skills: vec![],
        mcp_servers: vec![],
        requires: vec![],
        settings: vec![],
        agent: HandAgentConfig {
            name: "test-hand".to_string(),
            description: "Test agent".to_string(),
            module: "builtin:chat".to_string(),
            provider: "anthropic".to_string(),
            model: "claude-sonnet-4-20250514".to_string(),
            api_key_env: None,
            base_url: None,
            max_tokens: 4096,
            temperature: 0.7,
            system_prompt: "You are a test agent.".to_string(),
            max_iterations: None,
        },
        dashboard: HandDashboard::default(),
        steps: vec![
            HandStep {
                id: "step1".to_string(),
                name: "First Step".to_string(),
                step_type: StepType::SendMessage {
                    content: "Hello".to_string(),
                    target_agent: None,
                },
                next_steps: vec!["step2".to_string()],
            },
            HandStep {
                id: "step2".to_string(),
                name: "Second Step".to_string(),
                step_type: StepType::ExecuteTool {
                    tool_name: "test_tool".to_string(),
                    input: serde_json::json!({"key": "value"}),
                },
                next_steps: vec![],
            },
        ],
        skill_content: None,
    };

    // Test TOML serialization
    let toml_str = toml::to_string(&hand).expect("Failed to serialize");

    // Verify TOML contains expected content
    assert!(toml_str.contains("[[steps]]"), "TOML should contain steps array");
    assert!(toml_str.contains("step1"), "TOML should contain step1 id");
    assert!(toml_str.contains("step2"), "TOML should contain step2 id");
    assert!(toml_str.contains("First Step"), "TOML should contain step1 name");
    assert!(toml_str.contains("Second Step"), "TOML should contain step2 name");

    // Test TOML deserialization
    let hand2: HandDefinition = toml::from_str(&toml_str).expect("Failed to deserialize");

    assert_eq!(hand2.steps.len(), 2, "Should have 2 steps");
    assert_eq!(hand2.steps[0].id, "step1", "First step id should match");
    assert_eq!(hand2.steps[1].id, "step2", "Second step id should match");
    assert_eq!(hand2.steps[0].next_steps.len(), 1, "First step should have 1 next step");
    assert_eq!(hand2.steps[0].next_steps[0], "step2", "First step should point to step2");
    assert_eq!(hand2.steps[1].next_steps.len(), 0, "Second step should have no next steps");
}

/// Test all step types serialize and deserialize correctly
#[test]
fn test_all_step_types_roundtrip() {
    let steps = vec![
        HandStep {
            id: "send".to_string(),
            name: "Send Message".to_string(),
            step_type: StepType::SendMessage {
                content: "Hello!".to_string(),
                target_agent: Some("agent-1".to_string()),
            },
            next_steps: vec!["wait".to_string()],
        },
        HandStep {
            id: "wait".to_string(),
            name: "Wait for Input".to_string(),
            step_type: StepType::WaitForInput {
                prompt: "Please respond".to_string(),
                timeout_secs: Some(60),
            },
            next_steps: vec!["tool".to_string()],
        },
        HandStep {
            id: "tool".to_string(),
            name: "Execute Tool".to_string(),
            step_type: StepType::ExecuteTool {
                tool_name: "web_search".to_string(),
                input: serde_json::json!({"query": "test"}),
            },
            next_steps: vec!["condition".to_string()],
        },
        HandStep {
            id: "condition".to_string(),
            name: "Check Condition".to_string(),
            step_type: StepType::Condition {
                expression: "x > 0".to_string(),
                true_branch: "loop".to_string(),
                false_branch: "end".to_string(),
            },
            next_steps: vec![],
        },
        HandStep {
            id: "loop".to_string(),
            name: "Loop Through Items".to_string(),
            step_type: StepType::Loop {
                iterator: "item".to_string(),
                items: "items_list".to_string(),
                body: vec!["process".to_string()],
            },
            next_steps: vec!["sub".to_string()],
        },
        HandStep {
            id: "sub".to_string(),
            name: "Run Sub-Hand".to_string(),
            step_type: StepType::SubHand {
                hand_id: "sub-hand-1".to_string(),
                input_mapping: serde_json::json!({"input": "value"}),
            },
            next_steps: vec!["end".to_string()],
        },
        HandStep {
            id: "end".to_string(),
            name: "End".to_string(),
            step_type: StepType::SendMessage {
                content: "Done!".to_string(),
                target_agent: None,
            },
            next_steps: vec![],
        },
    ];

    let hand = create_test_hand_with_steps(steps);

    // Serialize to TOML
    let toml_str = toml::to_string(&hand).expect("Failed to serialize");

    // Deserialize from TOML
    let hand2: HandDefinition = toml::from_str(&toml_str).expect("Failed to deserialize");

    // Verify all 7 steps
    assert_eq!(hand2.steps.len(), 7, "Should have 7 steps");

    // Verify each step type
    match &hand2.steps[0].step_type {
        StepType::SendMessage { content, target_agent } => {
            assert_eq!(content, "Hello!");
            assert_eq!(target_agent.as_deref(), Some("agent-1"));
        }
        _ => panic!("Expected SendMessage"),
    }

    match &hand2.steps[1].step_type {
        StepType::WaitForInput { prompt, timeout_secs } => {
            assert_eq!(prompt, "Please respond");
            assert_eq!(*timeout_secs, Some(60));
        }
        _ => panic!("Expected WaitForInput"),
    }

    match &hand2.steps[2].step_type {
        StepType::ExecuteTool { tool_name, input } => {
            assert_eq!(tool_name, "web_search");
            assert_eq!(input["query"], "test");
        }
        _ => panic!("Expected ExecuteTool"),
    }

    match &hand2.steps[3].step_type {
        StepType::Condition { expression, true_branch, false_branch } => {
            assert_eq!(expression, "x > 0");
            assert_eq!(true_branch, "loop");
            assert_eq!(false_branch, "end");
        }
        _ => panic!("Expected Condition"),
    }

    match &hand2.steps[4].step_type {
        StepType::Loop { iterator, items, body } => {
            assert_eq!(iterator, "item");
            assert_eq!(items, "items_list");
            assert_eq!(body.len(), 1);
            assert_eq!(body[0], "process");
        }
        _ => panic!("Expected Loop"),
    }

    match &hand2.steps[5].step_type {
        StepType::SubHand { hand_id, input_mapping } => {
            assert_eq!(hand_id, "sub-hand-1");
            assert_eq!(input_mapping["input"], "value");
        }
        _ => panic!("Expected SubHand"),
    }
}

/// Test step graph with multiple branches
#[test]
fn test_branching_step_graph() {
    let steps = vec![
        HandStep {
            id: "start".to_string(),
            name: "Start".to_string(),
            step_type: StepType::SendMessage {
                content: "Starting".to_string(),
                target_agent: None,
            },
            next_steps: vec!["branch-a".to_string(), "branch-b".to_string()],
        },
        HandStep {
            id: "branch-a".to_string(),
            name: "Branch A".to_string(),
            step_type: StepType::ExecuteTool {
                tool_name: "tool-a".to_string(),
                input: serde_json::json!({}),
            },
            next_steps: vec!["merge".to_string()],
        },
        HandStep {
            id: "branch-b".to_string(),
            name: "Branch B".to_string(),
            step_type: StepType::ExecuteTool {
                tool_name: "tool-b".to_string(),
                input: serde_json::json!({}),
            },
            next_steps: vec!["merge".to_string()],
        },
        HandStep {
            id: "merge".to_string(),
            name: "Merge".to_string(),
            step_type: StepType::SendMessage {
                content: "Done".to_string(),
                target_agent: None,
            },
            next_steps: vec![],
        },
    ];

    let hand = create_test_hand_with_steps(steps);

    // Serialize and deserialize
    let toml_str = toml::to_string(&hand).expect("Failed to serialize");
    let hand2: HandDefinition = toml::from_str(&toml_str).expect("Failed to deserialize");

    // Verify branching structure
    assert_eq!(hand2.steps[0].next_steps.len(), 2, "Start should branch to 2 steps");
    assert!(hand2.steps[0].next_steps.contains(&"branch-a".to_string()));
    assert!(hand2.steps[0].next_steps.contains(&"branch-b".to_string()));

    // Verify both branches converge
    assert_eq!(hand2.steps[1].next_steps, vec!["merge".to_string()]);
    assert_eq!(hand2.steps[2].next_steps, vec!["merge".to_string()]);
}

/// Test empty steps (backward compatibility)
#[test]
fn test_empty_steps_backward_compat() {
    let hand = create_test_hand_with_steps(vec![]);

    let toml_str = toml::to_string(&hand).expect("Failed to serialize");
    let hand2: HandDefinition = toml::from_str(&toml_str).expect("Failed to deserialize");

    assert!(hand2.steps.is_empty(), "Steps should be empty");
}

/// Test step with complex nested input
#[test]
fn test_step_with_complex_input() {
    let complex_input = serde_json::json!({
        "query": "search term",
        "filters": {
            "date_range": {
                "start": "2024-01-01",
                "end": "2024-12-31"
            },
            "categories": ["tech", "science"]
        },
        "options": {
            "limit": 10,
            "sort": "relevance"
        }
    });

    let steps = vec![
        HandStep {
            id: "complex".to_string(),
            name: "Complex Tool Call".to_string(),
            step_type: StepType::ExecuteTool {
                tool_name: "advanced_search".to_string(),
                input: complex_input.clone(),
            },
            next_steps: vec![],
        },
    ];

    let hand = create_test_hand_with_steps(steps);

    let toml_str = toml::to_string(&hand).expect("Failed to serialize");
    let hand2: HandDefinition = toml::from_str(&toml_str).expect("Failed to deserialize");

    match &hand2.steps[0].step_type {
        StepType::ExecuteTool { input, .. } => {
            assert_eq!(input["query"], "search term");
            assert_eq!(input["filters"]["date_range"]["start"], "2024-01-01");
            assert_eq!(input["filters"]["categories"][0], "tech");
            assert_eq!(input["options"]["limit"], 10);
        }
        _ => panic!("Expected ExecuteTool"),
    }
}

/// Test that step IDs are preserved correctly
#[test]
fn test_step_id_preservation() {
    let steps = vec![
        HandStep {
            id: "step-with-dashes-123".to_string(),
            name: "Step 1".to_string(),
            step_type: StepType::SendMessage {
                content: "Test".to_string(),
                target_agent: None,
            },
            next_steps: vec!["step_underscore_456".to_string()],
        },
        HandStep {
            id: "step_underscore_456".to_string(),
            name: "Step 2".to_string(),
            step_type: StepType::WaitForInput {
                prompt: "Test".to_string(),
                timeout_secs: None,
            },
            next_steps: vec![],
        },
    ];

    let hand = create_test_hand_with_steps(steps);

    let toml_str = toml::to_string(&hand).expect("Failed to serialize");
    let hand2: HandDefinition = toml::from_str(&toml_str).expect("Failed to deserialize");

    assert_eq!(hand2.steps[0].id, "step-with-dashes-123");
    assert_eq!(hand2.steps[1].id, "step_underscore_456");
    assert_eq!(hand2.steps[0].next_steps[0], "step_underscore_456");
}

/// Test HandStep::new constructor
#[test]
fn test_hand_step_new() {
    let step = HandStep::new(
        "my-step",
        "My Step",
        StepType::SendMessage {
            content: "Hello".to_string(),
            target_agent: None,
        },
    );

    assert_eq!(step.id, "my-step");
    assert_eq!(step.name, "My Step");
    assert!(step.next_steps.is_empty());

    match step.step_type {
        StepType::SendMessage { content, .. } => {
            assert_eq!(content, "Hello");
        }
        _ => panic!("Expected SendMessage"),
    }
}

/// Test TOML format matches expected Hand file format
#[test]
fn test_toml_format_matches_hand_file() {
    // This is the format we expect in .hand.toml files
    let toml_content = r#"
id = "test-hand"
name = "Test Hand"
description = "A test hand for integration testing"
category = "productivity"
icon = "T"
tools = ["shell_exec"]

[[steps]]
id = "greet"
name = "Greet User"
next_steps = ["ask"]

[steps.step_type]
type = "send-message"
content = "Hello! Welcome to the test hand."

[[steps]]
id = "ask"
name = "Ask for Input"
next_steps = ["process"]

[steps.step_type]
type = "wait-for-input"
prompt = "What would you like to do?"
timeout_secs = 300

[[steps]]
id = "process"
name = "Process Request"
next_steps = []

[steps.step_type]
type = "execute-tool"
tool_name = "echo"

[steps.step_type.input]
message = "Processing complete"

[agent]
name = "test-hand"
description = "Test hand agent"
system_prompt = "You are a test hand."

[dashboard]
metrics = []
"#;

    let hand: HandDefinition = toml::from_str(toml_content).expect("Failed to parse TOML");

    assert_eq!(hand.id, "test-hand");
    assert_eq!(hand.steps.len(), 3);

    // Verify step chain: greet -> ask -> process
    assert_eq!(hand.steps[0].id, "greet");
    assert_eq!(hand.steps[0].next_steps, vec!["ask"]);

    assert_eq!(hand.steps[1].id, "ask");
    assert_eq!(hand.steps[1].next_steps, vec!["process"]);

    assert_eq!(hand.steps[2].id, "process");
    assert!(hand.steps[2].next_steps.is_empty());
}

// Helper function to create a test HandDefinition with given steps
fn create_test_hand_with_steps(steps: Vec<HandStep>) -> HandDefinition {
    HandDefinition {
        id: "test".to_string(),
        name: "Test Hand".to_string(),
        description: "A test hand".to_string(),
        category: HandCategory::Development,
        icon: "T".to_string(),
        tools: vec![],
        skills: vec![],
        mcp_servers: vec![],
        requires: vec![],
        settings: vec![],
        agent: HandAgentConfig {
            name: "test-agent".to_string(),
            description: "Test".to_string(),
            module: "builtin:chat".to_string(),
            provider: "anthropic".to_string(),
            model: "claude-sonnet-4-20250514".to_string(),
            api_key_env: None,
            base_url: None,
            max_tokens: 4096,
            temperature: 0.7,
            system_prompt: "Test agent.".to_string(),
            max_iterations: None,
        },
        dashboard: HandDashboard::default(),
        steps,
        skill_content: None,
    }
}
