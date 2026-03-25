---
phase: 01
core-foundation: true
name: Define Step Types in openfang-hands
description: Create step type definitions and extend HandDefinition data model
wave: 1
task_count: 1
autonomous: true
gap_closure: false
requirements:
  - HAND-STEP-06
---

# Plan 01-01: Define Step Types in openfang-hands

## Objective
Create step type definitions and extend HandDefinition with a complete steps field system.

## Success Criteria
- HandDefinition data model contains complete steps fields (id, name, type, config, next_steps)
- 6 step types defined: execute-tool, send-message, wait-for-input, condition, loop, sub-hand
- TOML serialization/deserialization works correctly

## Files to Modify
- `crates/openfang-hands/src/steps.rs` (new - ~200 lines)
- `crates/openfang-hands/src/lib.rs` (modify - add steps field)
- `crates/openfang-hands/src/registry.rs` (modify - persist steps)

## Task 1: Create steps.rs with Step Types

Create `crates/openfang-hands/src/steps.rs`:

```rust
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
```

## Task 2: Update lib.rs to Add Steps Field

Modify `crates/openfang-hands/src/lib.rs`:
- Add `pub mod steps;`
- Add `use steps::{HandStep};`
- Add `#[serde(default)] pub steps: Vec<HandStep>` to `HandDefinition`

## Task 3: Update Registry to Persist Steps

Modify `crates/openfang-hands/src/registry.rs`:
- Ensure steps are saved when `save_to_file()` is called
- Ensure steps are loaded when `load_from_file()` is called
- TOML should use `[[steps]]` syntax for the array

## Task 4: Add Unit Tests

Add tests to verify:
- TOML roundtrip for Hand with steps
- Each step type serializes correctly
- Steps are preserved through save/load

## Verification

```bash
cargo test --package openfang-hands
cargo build --package openfang-hands
```

## Dependencies
None - this is Wave 1 foundation work.

## Notes
- Use serde's `#[serde(default)]` for optional fields
- TOML format should use `[[steps]]` array of tables syntax
- Keep backward compatibility: Hands without steps should still work
