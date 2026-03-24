---
phase: 01-core-foundation
plan: 01-01
type: autonomous
wave: 1
subsystem: openfang-hands
status: completed
requirements:
  - HAND-STEP-06
commit: 4659c06
tech-stack:
  added:
    - Rust serde with tagged enums
    - TOML array of tables for steps
  patterns:
    - Tagged union serialization with #[serde(tag = "type")]
    - Backward-compatible default fields
key-files:
  created:
    - crates/openfang-hands/src/steps.rs
  modified:
    - crates/openfang-hands/src/lib.rs
decisions:
  - StepType uses kebab-case serialization for TOML compatibility
  - Steps field uses #[serde(default)] for backward compatibility
  - Step configs use serde_json::Value for flexible input data
metrics:
  duration: 20m
  tasks: 4
  tests: 15 new tests
  lines-added: 328
---

# Phase 01 Plan 01: Define Step Types in openfang-hands — Summary

**One-liner:** Created complete Rust data model for Hand steps with 6 step types and TOML persistence.

## What Was Built

### Step Types (crates/openfang-hands/src/steps.rs)

| Type | Purpose | Key Fields |
|------|---------|------------|
| `ExecuteTool` | Execute a tool with input | `tool_name`, `input` |
| `SendMessage` | Send message to agent/user | `content`, `target_agent` |
| `WaitForInput` | Pause for user input | `prompt`, `timeout_secs` |
| `Condition` | Branch based on expression | `expression`, `true_branch`, `false_branch` |
| `Loop` | Iterate over items | `iterator`, `items`, `body` |
| `SubHand` | Delegate to another Hand | `hand_id`, `input_mapping` |

### HandDefinition Extension

Added `steps: Vec<HandStep>` field to `HandDefinition` with:
- `#[serde(default)]` for backward compatibility
- TOML serialization via `[[steps]]` array of tables
- Full roundtrip support (parse → serialize → parse)

## Test Coverage

- **Unit tests:** 15 new tests covering all step types
- **TOML roundtrip:** Verified steps survive save/load cycle
- **Backward compatibility:** Hands without steps still parse correctly
- **JSON serialization:** Step types serialize correctly for API responses

## Verification

```bash
cargo test --package openfang-hands  # 57 tests passed
cargo build --package openfang-hands  # Compiles without warnings
```

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None - all step types are fully defined with complete configurations.

## Next Steps

- Plan 01-03: Create API endpoints for steps (`/api/hands/{id}/steps`)
- Plan 01-04: Add Agent tools for step manipulation
