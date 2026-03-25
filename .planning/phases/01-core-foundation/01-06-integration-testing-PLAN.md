---
phase: 01
core-foundation: true
name: Integration Testing
description: End-to-end testing of complete Hand steps flow
wave: 5
task_count: 1
autonomous: true
gap_closure: false
requirements:
  - HAND-STEP-01
  - HAND-STEP-03
  - HAND-STEP-04
  - API-01
  - API-02
  - UI-01
---

# Plan 01-06: Integration Testing

## Objective
Verify all Phase 1 components work together through end-to-end testing.

## Success Criteria
- Agent can create Hand with steps via tool call
- New Hand appears in UI immediately
- Steps display correctly in React Flow
- Agent can update Hand steps
- Changes persist across restart

## Test Scenarios

### Test 1: Create Hand via Agent

**Steps:**
1. Start OpenFang daemon
2. Send message to agent: "Create a Hand named 'Test Greeting' with steps: 1) Send 'Hello!' message 2) Wait for user response"

**Expected:**
- Agent calls `hand_create` tool
- Tool returns new Hand ID
- New Hand appears in `/api/hands` list
- TOML file created in `~/.openfang/hands/`

**Verification:**
```bash
# After agent creates Hand
curl -s http://127.0.0.1:4200/api/hands | jq '.[] | select(.name == "Test Greeting")'
# Should show the new Hand

# Verify TOML file
ls ~/.openfang/hands/ | grep test-greeting
# Should show the .hand.toml file
```

### Test 2: View Steps in UI

**Steps:**
1. Open Hands page in browser
2. Select "Test Greeting" Hand
3. Click "Flow" tab

**Expected:**
- Flow tab renders React Flow diagram
- Two nodes visible: "Send 'Hello!' message" and "Wait for user response"
- First node is green (send-message type)
- Second node is yellow (wait-for-input type)
- Edge connects step 1 → step 2

### Test 3: API Direct Test

**Steps:**
1. Get Hand ID from API
2. GET steps endpoint
3. PUT updated steps
4. Verify persistence

**Verification:**
```bash
# Get Hand ID
HAND_ID=$(curl -s http://127.0.0.1:4200/api/hands | jq -r '.[] | select(.name == "Test Greeting") | .id')

# Get steps
curl -s "http://127.0.0.1:4200/api/hands/$HAND_ID/steps" | jq

# Update steps (add a tool execution step)
curl -s -X PUT "http://127.0.0.1:4200/api/hands/$HAND_ID/steps" \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      {
        "id": "step1",
        "name": "Send greeting",
        "type": "send-message",
        "config": { "content": "Hello!" },
        "nextSteps": ["step2"]
      },
      {
        "id": "step2",
        "name": "Wait for response",
        "type": "wait-for-input",
        "config": { "prompt": "Please respond" },
        "nextSteps": ["step3"]
      },
      {
        "id": "step3",
        "name": "Search web",
        "type": "execute-tool",
        "config": { "toolName": "web_search", "input": { "query": "test" } },
        "nextSteps": []
      }
    ]
  }'

# Verify update
curl -s "http://127.0.0.1:4200/api/hands/$HAND_ID/steps" | jq '.steps | length'
# Should return 3
```

### Test 4: Validation Test

**Steps:**
1. Try to PUT invalid steps (cycle)
2. Try to PUT steps with missing references

**Expected:**
- API returns 400 Bad Request
- Error message explains the issue

**Verification:**
```bash
# Try to create a cycle
curl -s -X PUT "http://127.0.0.1:4200/api/hands/$HAND_ID/steps" \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      { "id": "a", "name": "A", "type": "send-message", "config": {}, "nextSteps": ["b"] },
      { "id": "b", "name": "B", "type": "send-message", "config": {}, "nextSteps": ["a"] }
    ]
  }'
# Should return error about cycle

# Try missing reference
curl -s -X PUT "http://127.0.0.1:4200/api/hands/$HAND_ID/steps" \
  -H "Content-Type: application/json" \
  -d '{
    "steps": [
      { "id": "a", "name": "A", "type": "send-message", "config": {}, "nextSteps": ["nonexistent"] }
    ]
  }'
# Should return error about missing reference
```

### Test 5: Update Steps via Agent

**Steps:**
1. Send message to agent: "Add a new step after step 2 that executes tool 'web_search' with query 'hello world'"

**Expected:**
- Agent calls `hand_update_steps` with operation "add"
- Steps updated in backend
- UI refreshes to show 3 steps
- TOML file updated on disk

**Verification:**
```bash
# Check steps count after agent update
curl -s "http://127.0.0.1:4200/api/hands/$HAND_ID/steps" | jq '.steps | length'
# Should be 3

# Check TOML file
cat ~/.openfang/hands/test-greeting.hand.toml | grep "\[\[steps\]\]" | wc -l
# Should be 3
```

### Test 6: Persistence Test

**Steps:**
1. Stop daemon
2. Start daemon again
3. Check Hands list and steps

**Expected:**
- All Hands persist
- All steps load correctly
- No data loss

## Automated Test Files

Create test file `crates/openfang-hands/tests/steps_integration.rs`:

```rust
use openfang_hands::steps::{HandStep, StepType};
use openfang_hands::{HandCategory, HandDefinition, HandRegistry};
use std::collections::HashMap;

#[test]
fn test_steps_roundtrip() {
    let mut hand = HandDefinition {
        id: "test-123".to_string(),
        name: "Test Hand".to_string(),
        description: "Test".to_string(),
        category: HandCategory::Productivity,
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
        ..Default::default()
    };

    // Test TOML serialization
    let toml_str = toml::to_string(&hand).expect("Failed to serialize");

    // Test TOML deserialization
    let hand2: HandDefinition = toml::from_str(&toml_str).expect("Failed to deserialize");

    assert_eq!(hand2.steps.len(), 2);
    assert_eq!(hand2.steps[0].id, "step1");
    assert_eq!(hand2.steps[1].next_steps.len(), 0);
}
```

## Regression Tests

Run existing test suites:

```bash
cargo test --workspace  # All 1744+ tests should still pass
cargo clippy --workspace --all-targets -- -D warnings  # Zero warnings
```

## Verification Commands

```bash
# Build all packages
cargo build --workspace --lib

# Run all tests
cargo test --workspace

# Type check frontend
cd crates/openfang-webui && pnpm type-check

# Build frontend
cd crates/openfang-webui && pnpm build
```

## Dependencies
- All previous plans (01-01 through 01-05)

## Notes
- Test with real LLM calls to verify agent tool integration
- Verify TOML files are human-readable
- Check that error messages are helpful for debugging
- Document any issues found for Phase 2 planning
