---
phase: 01
core-foundation: true
plan: 01-04
name: Create Agent Tools for Hand Management
description: Implement hand_create and hand_update_steps tools for Agent
wave: 3
completed: 2026-03-25
requirements:
  - HAND-STEP-03
  - HAND-STEP-04
---

# Phase 01 Plan 01-04: Create Agent Tools for Hand Management - Summary

## One-Liner

Implemented `hand_create` and `hand_update_steps` agent tools allowing LLM agents to dynamically create Hands (SOPs) and modify their step workflows.

## What Was Built

### Agent Tools

Two new tools were added to the OpenFang tool system:

1. **`hand_create`** - Creates a new Hand with initial steps
   - Parameters: name, description, category, icon (optional), steps (optional)
   - Returns: hand_id, name, step_count, confirmation message
   - Categories: content, security, productivity, development, communication, data

2. **`hand_update_steps`** - Modifies steps of an existing Hand
   - Parameters: hand_id, operation, steps (optional), step_ids_to_delete (optional)
   - Operations: add, update, delete, replace
   - Returns: hand_id, operation, step_count, confirmation message

### Step Type Support

All 6 step types from Wave 1 are supported:
- `execute-tool` - Execute a named tool with input
- `send-message` - Send a message to user or target agent
- `wait-for-input` - Pause for user input with optional timeout
- `condition` - Branch based on expression evaluation
- `loop` - Iterate over items with body steps
- `sub-hand` - Delegate to another Hand

### Architecture

- **KernelHandle trait** extended with two new async methods
- **Kernel implementation** handles step parsing from JSON and Hand registry updates
- **Tool runner** provides tool definitions and execution handlers
- **Registry integration** uses `upsert_from_content` for persistence

## Files Modified

| File | Changes |
|------|---------|
| `crates/openfang-runtime/src/kernel_handle.rs` | Added `hand_create` and `hand_update_steps` trait methods |
| `crates/openfang-runtime/src/tool_runner.rs` | Added tool handlers, definitions, and test assertions |
| `crates/openfang-kernel/src/kernel.rs` | Implemented kernel methods with step parsing from JSON |

## Key Implementation Details

### Step Parsing

Steps are parsed from JSON config with camelCase field names matching TypeScript conventions:

```rust
// Example step JSON
{
  "id": "step1",
  "name": "Search Web",
  "type": "execute-tool",
  "config": {
    "toolName": "web_search",
    "input": { "query": "example" }
  },
  "nextSteps": ["step2"]
}
```

### Hand Creation

When creating a Hand:
1. Generate UUID for hand_id
2. Parse category string to HandCategory enum
3. Convert JSON steps to HandStep structs
4. Create HandDefinition with default agent config
5. Serialize to TOML and upsert to registry

### Step Operations

- **add**: Appends new steps to existing list
- **update**: Merges step updates by matching step IDs
- **delete**: Removes steps by ID list
- **replace**: Overwrites entire step list

## Verification

### Build Status

```bash
cargo build --package openfang-runtime --lib        # OK
cargo build --package openfang-kernel --lib         # OK
cargo test --package openfang-runtime               # 825 passed
cargo clippy --package openfang-runtime --package openfang-kernel  # No warnings
```

### Tool Definitions

Both tools are registered in `builtin_tool_definitions()` with JSON schemas for LLM consumption.

### Test Coverage

- Tool count updated to 41 (was 39)
- Assertions added for `hand_create` and `hand_update_steps`

## Deviations from Plan

None - plan executed as written.

## Dependencies Satisfied

- Wave 1 (01-01): Step types available ✓
- Wave 2 (01-03): API endpoints working ✓
- HandRegistry has register/update via `upsert_from_content` ✓

## Next Steps

Wave 4 (01-05): React Flow visualization for steps

---

*Completed: 2026-03-25*
