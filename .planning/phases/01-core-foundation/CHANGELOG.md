# Phase 1: Core Foundation - Changelog

## Overview
This changelog tracks the implementation progress of Phase 1 "Core Foundation" for the Dynamic Hand with steps milestone.

## [Unreleased]

### Planned

#### Data Model (Task 1.1)
- [ ] Create `crates/openfang-hands/src/steps.rs` with step type definitions
- [ ] Add `HandStep` struct with id, name, type, config, next_steps
- [ ] Define `StepType` enum with 6 variants:
  - `ExecuteTool` - Execute a tool with input parameters
  - `SendMessage` - Send message to user or agent
  - `WaitForInput` - Pause for user input with optional timeout
  - `Condition` - Branch based on expression evaluation
  - `Loop` - Iterate over items and execute body steps
  - `SubHand` - Execute another Hand as sub-procedure
- [ ] Add `steps: Vec<HandStep>` to `HandDefinition`
- [ ] Update TOML serialization for steps
- [ ] Update `HandRegistry` to persist steps

#### API Endpoints (Task 1.2)
- [ ] Add `GET /api/hands/{id}/steps` endpoint
- [ ] Add `PUT /api/hands/{id}/steps` endpoint
- [ ] Implement step graph validation (cycle detection)
- [ ] Add request/response types for steps API
- [ ] Register new routes in server

#### Agent Tools (Task 1.3)
- [ ] Create `hand_tools.rs` module
- [ ] Implement `hand_create` tool
- [ ] Implement `hand_update_steps` tool
- [ ] Add tool definitions to `builtin_tool_definitions()`
- [ ] Add tool execution handlers
- [ ] Integrate with HandRegistry

#### TypeScript Types (Task 1.4)
- [ ] Add `HandStep` interface
- [ ] Add `StepType` union type
- [ ] Add step config type variants
- [ ] Add API function types for steps

#### React Flow UI (Task 1.5)
- [ ] Create `StepNode.tsx` component
- [ ] Create `FlowCanvas.tsx` component
- [ ] Implement auto-layout algorithm
- [ ] Add "Flow" tab to Hands page
- [ ] Fetch and display steps via API
- [ ] Style nodes with type-specific colors

#### Integration Testing (Task 1.6)
- [ ] Test Hand creation via Agent
- [ ] Test step visualization in UI
- [ ] Test step updates via Agent
- [ ] Test API endpoints directly

## Decisions Log

| Date | Decision | Context |
|------|----------|---------|
| 2026-03-25 | TOML extension for steps | Keep Hand self-contained, backward compatible |
| 2026-03-25 | Tagged union for StepType | Clean serialization, extensible |
| 2026-03-25 | Separate hand_create and hand_update_steps tools | Clear separation of concerns |
| 2026-03-25 | Frontend React Flow transform | Backend stays agnostic of visualization |

## Implementation Notes

### Step Storage Format (TOML)
```toml
id = "example"
name = "Example Hand"
description = "An example hand with steps"
category = "productivity"

[[steps]]
id = "step_1"
name = "Greet User"
type = "send_message"
next_steps = ["step_2"]

[steps.config]
content = "Hello! How can I help you today?"

[[steps]]
id = "step_2"
name = "Wait for Input"
type = "wait_for_input"
next_steps = ["step_3"]

[steps.config]
prompt = "Please describe your request"
timeout_secs = 300

[[steps]]
id = "step_3"
name = "Process Request"
type = "execute_tool"
next_steps = []

[steps.config]
tool_name = "web_search"
input = { query = "{{step_2.output}}" }
```

### React Flow Node Colors
| Step Type | Color | Hex |
|-----------|-------|-----|
| execute-tool | Blue | #3b82f6 |
| send-message | Green | #22c55e |
| wait-for-input | Yellow | #eab308 |
| condition | Purple | #a855f7 |
| loop | Orange | #f97316 |
| sub-hand | Pink | #ec4899 |

## References

- Requirements: `.planning/REQUIREMENTS.md` (HAND-STEP-01, 03, 04, 06, API-01, API-02, UI-01)
- Roadmap: `.planning/ROADMAP.md` (Phase 1)
- State: `.planning/STATE.md`
