# Phase 2 Context — Dual Editor

## Phase Information

| Field | Value |
|-------|-------|
| Phase | 2 |
| Name | Dual Editor |
| Goal | 用户可以通过两种方式编辑 Hand 步骤：流程图可视化 或 聊天对话 |

## Decisions

### Visual Flowchart Editor

#### Edit Mode Entry
- **Decision:** Edit button + Save/Cancel pattern
- **Details:**
  - Flow tab shows read-only view by default
  - "Edit" button enters edit mode (enables drag, connect, add, delete)
  - "Save" persists changes to server via PUT /api/hands/{id}/steps
  - "Cancel" discards changes, returns to read-only view
- **Rationale:** Clean separation prevents accidental edits, clear commit/discard actions

#### Step Creation
- **Decision:** Left sidebar palette with drag-to-canvas
- **Details:**
  - Palette shows all 6 step types with icons/colors (from Phase 1)
  - Drag step type to canvas to create new node
  - New node gets auto-generated ID (step-{timestamp})
  - Default name: "New {type}" (e.g., "New Tool", "New Message")
- **Step Types in Palette:**
  - execute-tool (blue, 🔧)
  - send-message (green, 💬)
  - wait-for-input (yellow, ⏸️)
  - condition (purple, 🔀)
  - loop (orange, 🔄)
  - sub-hand (pink, 🔌)

#### Property Panel
- **Decision:** Right sidebar (Figma-style)
- **Details:**
  - Always visible when node selected
  - Shows: Step name (text input), Step type (read-only badge), Config fields (type-specific)
  - Empty state: "Select a step to edit properties"
  - Changes apply immediately to draft state (not persisted until Save)

#### Connection Editing
- **Decision:** Drag handles to create, Select+Delete to remove
- **Details:**
  - Create: Drag from source node bottom handle to target node top handle
  - Visual feedback during drag (highlight valid drop targets)
  - Delete: Click edge to select (shows red highlight), press Delete key
  - Condition branches: First connection = default, subsequent = branch 1, 2, etc.

### Chat/Agent Editor

#### Chat Entry Point
- **Decision:** Third tab "Chat Edit" alongside Details and Flow
- **Details:**
  - Tab order: Details | Flow | Chat Edit
  - Chat interface similar to main Chat page but focused on Hand editing
  - System prompt specialized for Hand step modifications

#### Change Preview
- **Decision:** Summary list with optional visual diff
- **Details:**
  - Agent presents planned changes as bullet list:
    - "Add step 'Check Status' (condition) after step-1"
    - "Update step-2 config: change tool from 'x' to 'y'"
    - "Delete step-3 and its connections"
  - "View in Flow" button opens Flow tab showing preview state
  - "Apply Changes" commits to draft, "Cancel" discards Agent suggestion

#### Cross-Mode State Sync
- **Decision:** Shared draft state
- **Details:**
  - Both editors operate on same draft state object
  - Changes in Chat Edit immediately visible in Flow (and vice versa)
  - No mode switch warning needed since state is shared
  - Single Save/Cancel applies to both modes

### Validation & UX

#### Validation Feedback
- **Decision:** Visual indicators + error list + block save
- **Details:**
  - Invalid nodes: Red border/glow highlight
  - Error panel: Bottom section listing all validation errors
  - Save button disabled while errors exist
  - Validation rules:
    - No orphaned steps (must be reachable from start)
    - No circular dependencies
    - All steps must have unique IDs
    - Condition steps must have at least 2 branches

#### Save Behavior
- **Decision:** Explicit save only
- **Details:**
  - No auto-save to server
  - Changes kept in local draft state only
  - Save: PUT /api/hands/{id}/steps with current draft
  - Cancel: Discard draft, reload original from server
  - Browser refresh warning if unsaved changes exist

## Technical Context

### Existing Components (from Phase 1)
- `FlowCanvas.tsx` — React Flow wrapper with `readOnly` prop
- `StepNode.tsx` — Node rendering with type colors/icons
- Hands.tsx — Flow tab integration

### API Endpoints
- GET /api/hands/{id}/steps — Load steps
- PUT /api/hands/{id}/steps — Save steps (with validation)

### State Management Pattern
```
Draft State (local React state)
├── nodes: Node[]
├── edges: Edge[]
└── steps: HandStep[]

View Mode: readOnly=true, draft = server data
Edit Mode: readOnly=false, draft = editable copy
Save: PUT draft.steps → server
Cancel: Reset draft to server data
```

## Canonical Refs

- `.planning/phases/01-core-foundation/01-05-react-flow-viz-SUMMARY.md` — Phase 1 UI implementation
- `crates/openfang-webui/src/components/flow/FlowCanvas.tsx` — Base component
- `crates/openfang-webui/src/components/flow/StepNode.tsx` — Node component
- `crates/openfang-webui/src/api/types.ts` — HandStep, StepTypeVariant types
- `crates/openfang-hands/src/steps.rs` — Rust step definitions

## Deferred Ideas

*No deferred ideas — all Phase 2 scope items discussed and decided.*

---
*Created: 2026-03-25*
*Next: Run `/gsd:plan-phase 2` to create implementation plans*
