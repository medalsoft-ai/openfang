# Phase 2 Plan: Dual Editor

## Overview

**Phase:** 2 — Dual Editor
**Goal:** 用户可以通过两种方式编辑 Hand 步骤：流程图可视化 或 聊天对话
**Context:** `.planning/phases/02-design-system/02-CONTEXT.md`

## Wave Breakdown

| Wave | Focus | Files | Key Deliverables |
|------|-------|-------|------------------|
| Wave 1a | Edit Mode Foundation | 3 | isEditing prop, draft state, 3-panel layout |
| Wave 1b | Editor Components | 4 | StepPalette, PropertyPanel with variable hints |
| Wave 2 | Connections & Validation | 3 | Drag connections, ValidationPanel, error handling |
| Wave 3 | Chat Editor | 3 | Chat tab, ChatEditor, Agent prompt |

---

## Wave 1a: Edit Mode Foundation

### Goal
Establish edit mode infrastructure and draft state management.

### Files

#### 1. `crates/openfang-webui/src/components/flow/FlowCanvas.tsx`
**Changes:**
- Add `isEditing` prop to complement `readOnly`
- Add `onStepsChange` callback for draft updates
- Add `onNodeSelect` callback for selection
- Enable `nodesDraggable`, `nodesConnectable`, `elementsSelectable` when editing

**Interface:**
```typescript
interface FlowCanvasProps {
  steps: HandStep[];
  readOnly?: boolean;
  isEditing?: boolean;
  selectedNodeId?: string | null;
  onStepsChange?: (steps: HandStep[]) => void;
  onNodeSelect?: (nodeId: string | null) => void;
}
```

**Tests:** `FlowCanvas.edit.test.tsx`
- Renders in edit mode with draggable nodes
- Calls onNodeSelect when node clicked
- Calls onStepsChange when node position changes

#### 2. `crates/openfang-webui/src/pages/Hands.tsx` — Layout & State
**Changes:**
- Add `isEditing` state
- Add `draftSteps` state (shared with Chat tab)
- Add `selectedNodeId` state
- Add 3-column layout container for edit mode
- Show Edit button (read-only), Save/Cancel buttons (edit mode)

**Layout States:**

Read-only mode:
```
┌──────────────────────────────────────┐
│  [Details] [Flow] [Chat Edit]        │
├──────────────────────────────────────┤
│                                      │
│         FlowCanvas                   │
│         (readOnly=true)              │
│                                      │
│                    [Edit]            │
└──────────────────────────────────────┘
```

Edit mode:
```
┌──────────┬──────────────┬──────────┐
│ PALETTE  │   CANVAS     │ PROPERTY │
│ (240px)  │   (flex-1)   │ (280px)  │
├──────────┼──────────────┼──────────┤
│ [🔧]     │   ┌─────┐    │ Name:    │
│ [💬]     │   │Step1│    │ [____]   │
│ [⏸️]     │   └──┬──┘    │ Type: 🔧 │
│ [🔀]     │      │       │ Config:  │
│ [🔄]     │   ┌──┴──┐    │ [...]    │
│ [🔌]     │   │Step2│    │          │
└──────────┴───────┴──────┴──────────┘
   [Cancel]                [Save]
```

**Tests:** `Hands.edit-mode.test.tsx`
- Edit button enters edit mode
- Save calls updateHandSteps API
- Cancel discards draft
- Draft state persists when switching tabs

#### 3. `crates/openfang-webui/src/hooks/useHandDraft.ts` (NEW)
**Purpose:** Shared draft state hook for Flow and Chat tabs

**Interface:**
```typescript
function useHandDraft(handId: string, initialSteps: HandStep[]) {
  const [draftSteps, setDraftSteps] = useState<HandStep[]>(initialSteps);
  const [isDirty, setIsDirty] = useState(false);

  const updateStep = (stepId: string, updates: Partial<HandStep>);
  const addStep = (step: HandStep, afterStepId?: string);
  const deleteStep = (stepId: string);
  const updateConnections = (sourceId: string, targetIds: string[]);
  const resetDraft = () => setDraftSteps(initialSteps);

  return { draftSteps, isDirty, updateStep, addStep, deleteStep, updateConnections, resetDraft };
}
```

**Tests:** `useHandDraft.test.ts`
- Updates step correctly
- Tracks dirty state
- Reset restores initial

---

## Wave 1b: Editor Components

### Goal
Create palette and property panel with variable interpolation support.

### Files

#### 1. `crates/openfang-webui/src/components/flow/StepPalette.tsx` (NEW)
**Purpose:** Left sidebar with draggable step types

**Features:**
- 6 step type cards with icons/colors
- HTML5 drag-and-drop (`draggable`, `onDragStart`)
- DataTransfer with `application/json` mime type
- Visual hover/active states

**Step Types:**
| Type | Color | Icon | Label |
|------|-------|------|-------|
| `execute-tool` | #3b82f6 | 🔧 | Tool |
| `send-message` | #22c55e | 💬 | Message |
| `wait-for-input` | #eab308 | ⏸️ | Wait |
| `condition` | #a855f7 | 🔀 | Branch |
| `loop` | #f97316 | 🔄 | Loop |
| `sub-hand` | #ec4899 | 🔌 | Sub-Hand |

**Tests:** `StepPalette.test.tsx`
- Renders all 6 step types
- Initiates drag with correct data

#### 2. `crates/openfang-webui/src/components/flow/StepPaletteItem.tsx` (NEW)
**Purpose:** Individual draggable step type item

**Props:**
```typescript
interface StepPaletteItemProps {
  type: StepTypeVariant;
  icon: string;
  label: string;
  color: string;
  onDragStart: (type: StepTypeVariant) => void;
}
```

#### 3. `crates/openfang-webui/src/components/flow/PropertyPanel.tsx` (NEW)
**Purpose:** Right sidebar for editing selected step

**Features:**
- Empty state: "Select a step to edit properties"
- Step name input (text)
- Step type badge (read-only, colored)
- Config fields (type-specific)
- **Variable interpolation hints** (HAND-STEP-08)

**Variable Interpolation (HAND-STEP-08):**
- Syntax: `{{step_id.output}}`
- Input fields show autocomplete dropdown when typing `{{`
- Dropdown shows available steps and their output fields
- Validates that referenced step IDs exist

**Config Fields by Type:**
```typescript
// execute-tool
{ tool_name: string; arguments: Record<string, unknown> }

// send-message
{ message_template: string } // supports {{variable}} interpolation

// wait-for-input
{ prompt: string }

// condition
{ expression: string } // supports {{variable}} interpolation

// loop
{ max_iterations: number; condition: string }

// sub-hand
{ hand_id: string }
```

**VariableAutocomplete component:**
- Triggers on `{{` in any text input
- Lists all steps with their IDs
- Shows output fields per step type
- Inserts `{{step_id.field}}` on selection

**Tests:** `PropertyPanel.test.tsx`
- Shows empty state when no selection
- Renders correct fields for each step type
- Variable autocomplete triggers on {{
- Validates step ID references

#### 4. `crates/openfang-webui/src/components/flow/VariableAutocomplete.tsx` (NEW)
**Purpose:** Autocomplete dropdown for `{{step_id.output}}` syntax

**Props:**
```typescript
interface VariableAutocompleteProps {
  steps: HandStep[];
  currentStepId: string; // exclude self
  onSelect: (variable: string) => void;
  onClose: () => void;
}
```

**Tests:** `VariableAutocomplete.test.tsx`
- Lists available steps
- Excludes current step
- Groups by output field type

---

## Wave 2: Connections & Validation

### Goal
Enable drag-to-connect, deletion, and validation with error display.

### Files

#### 1. `crates/openfang-webui/src/components/flow/FlowCanvas.tsx`
**Changes:**
- Add `onConnect` handler for creating edges
- Add `onEdgesDelete` handler for removing edges
- Prevent duplicate connections
- Update `nextSteps` in draft when connections change
- Handle drop from palette (create new node at drop position)

**Implementation:**
```typescript
const onConnect = useCallback((connection: Connection) => {
  if (!isEditing) return;

  // Prevent duplicate
  const exists = edges.some(e =>
    e.source === connection.source && e.target === connection.target
  );
  if (exists) return;

  // Update draft
  onStepsChange?.(steps.map(step => {
    if (step.id === connection.source) {
      return { ...step, nextSteps: [...step.nextSteps, connection.target!] };
    }
    return step;
  }));
}, [isEditing, edges, steps, onStepsChange]);

const onDrop = useCallback((event: React.DragEvent) => {
  const type = JSON.parse(event.dataTransfer.getData('application/json'));
  const position = reactFlowInstance.screenToFlowPosition({
    x: event.clientX,
    y: event.clientY
  });
  // Create new step
}, [isEditing]);
```

**Tests:** `FlowCanvas.connections.test.tsx`
- Creates connection on drag
- Prevents duplicate connections
- Deletes connection on selection + delete key
- Creates node on palette drop

#### 2. `crates/openfang-webui/src/components/flow/StepNode.tsx`
**Changes:**
- Add delete button (visible on hover in edit mode)
- Highlight when selected
- Show connection handles only in edit mode

**Tests:** `StepNode.edit.test.tsx`
- Shows delete button on hover in edit mode
- Calls onDelete when clicked

#### 3. `crates/openfang-webui/src/components/flow/ValidationPanel.tsx` (NEW)
**Purpose:** Bottom panel showing validation errors

**Validation Rules:**
1. **No orphaned steps** — Every step must be reachable from a root (no incoming edges from other steps)
2. **No circular dependencies** — No cycles in the graph
3. **Unique IDs** — All step IDs must be unique
4. **Condition branches** — Condition steps must have at least 2 next_steps
5. **Valid references** — All `{{step_id}}` references must point to existing steps

**Interface:**
```typescript
interface ValidationError {
  type: 'orphan' | 'cycle' | 'duplicate_id' | 'condition_branches' | 'invalid_ref';
  stepId: string;
  message: string;
}

function validateSteps(steps: HandStep[]): ValidationError[];
```

**Display:**
- Collapsible panel (default: collapsed if no errors)
- Error count badge
- List with error type, step reference, message
- Click error → select problematic node

**Tests:** `ValidationPanel.test.tsx`
- Shows error count
- Lists all validation errors
- Highlights on error click

#### 4. `crates/openfang-webui/src/utils/stepValidation.ts` (NEW)
**Purpose:** Pure validation functions

**Functions:**
```typescript
export function findOrphanedSteps(steps: HandStep[]): string[];
export function findCycles(steps: HandStep[]): string[][];
export function findDuplicateIds(steps: HandStep[]): string[];
export function findInvalidConditions(steps: HandStep[]): ValidationError[];
export function findInvalidReferences(steps: HandStep[], text: string): string[];
```

**Tests:** `stepValidation.test.ts`
- Detects orphans
- Detects cycles
- Detects duplicate IDs
- Validates condition branches
- Validates variable references

#### 5. `crates/openfang-webui/src/pages/Hands.tsx` — Integration
**Changes:**
- Integrate ValidationPanel at bottom of edit mode
- Disable Save button when validation errors exist
- Show error count on Save button
- Confirm dialog on Cancel if dirty

**Tests:** `Hands.validation.test.tsx`
- Shows validation errors
- Disables save with errors
- Confirms cancel when dirty

---

## Wave 3: Chat Editor

### Goal
Enable chat-based editing with incremental and complete rewrite modes.

### Files

#### 1. `crates/openfang-webui/src/pages/Hands.tsx` — Chat Tab
**Changes:**
- Add "Chat Edit" tab alongside Details/Flow
- Render ChatEditor component when active
- Pass shared `draftSteps` and `setDraftSteps`

**Tests:** `Hands.chat-tab.test.tsx`
- Shows Chat Edit tab
- Renders ChatEditor when selected
- Shares draft state with Flow tab

#### 2. `crates/openfang-webui/src/components/flow/ChatEditor.tsx` (NEW)
**Purpose:** Chat interface for Hand editing

**Features:**
- Chat history (user messages + Agent responses)
- Message input with send button
- Change preview cards with operations list
- Apply/Cancel buttons for suggestions
- Mode indicator: "Incremental" vs "Complete Rewrite"

**Modes:**
- **Incremental** (default): Agent modifies existing steps, preserves structure
- **Complete Rewrite**: Agent replaces entire flow with new design

**Change Preview Card:**
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Agent suggests (Incremental mode):                   │
│                                                         │
│ Operations:                                             │
│ • ADD "Check Status" (condition) after "Initialize"     │
│ • UPDATE "Process" tool from "X" to "Y"                 │
│ • DELETE "Cleanup" step and its connections             │
│ • MOVE "Finalize" to after "Check Status"               │
│                                                         │
│ [View in Flow]  [Apply Changes]  [Cancel]               │
└─────────────────────────────────────────────────────────┘
```

**Complete Rewrite Preview:**
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Agent suggests (Complete Rewrite):                   │
│                                                         │
│ Current: 5 steps → New: 3 steps                         │
│                                                         │
│ New flow:                                               │
│ 1. Initialize → 2. Check → 3. Process                   │
│                                                         │
│ ⚠️ This will replace all existing steps                 │
│                                                         │
│ [Preview Full Flow]  [Apply Rewrite]  [Cancel]          │
└─────────────────────────────────────────────────────────┘
```

**State:**
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  operations?: StepOperation[]; // parsed from assistant
}

type StepOperation =
  | { type: 'add'; step: HandStep; afterStepId?: string }
  | { type: 'update'; stepId: string; updates: Partial<HandStep> }
  | { type: 'delete'; stepId: string }
  | { type: 'move'; stepId: string; afterStepId: string };
```

**Tests:** `ChatEditor.test.tsx`
- Renders chat history
- Sends message on submit
- Shows change preview with operations
- Applies changes to draft
- Switches between incremental/rewrite modes

#### 3. `crates/openfang-runtime/src/hand_editor_prompt.rs` (NEW)
**Purpose:** System prompt for Hand editing Agent

**Prompt Sections:**
1. **Role**: You are a Hand (SOP) editing assistant
2. **Hand Structure**: Explain steps, next_steps, types
3. **Operations**: ADD, UPDATE, DELETE, MOVE with examples
4. **Modes**:
   - Incremental: "Add after X", "Update Y", "Delete Z"
   - Complete rewrite: "Redesign entire flow as..."
5. **Output Format**: Markdown list of operations before applying
6. **Variable Syntax**: Reference outputs with `{{step_id.output}}`
7. **Constraints**: Always show preview, wait for confirmation

**Example in prompt:**
```
When user says "Add a check after step 1", respond with:

I'll add a condition step after "step-1".

Planned operations:
1. ADD step "check-status" (type: condition) after "step-1"
2. CONNECT "check-status" to current "step-1" next step

[Wait for user confirmation before applying]
```

#### 4. `crates/openfang-webui/src/utils/chatOperations.ts` (NEW)
**Purpose:** Parse Agent responses into operations

**Functions:**
```typescript
export function parseOperations(content: string): StepOperation[];
export function applyOperations(
  steps: HandStep[],
  operations: StepOperation[]
): HandStep[];
export function describeOperations(operations: StepOperation[]): string[];
```

**Tests:** `chatOperations.test.ts`
- Parses ADD operations
- Parses UPDATE operations
- Parses DELETE operations
- Applies operations correctly
- Generates descriptions

---

## Implementation Order

### Wave 1a: Edit Mode Foundation
1. Create `useHandDraft` hook with tests
2. Update `FlowCanvas` with isEditing props
3. Update `Hands.tsx` with edit mode UI and layout
4. Test: Toggle edit mode, save/cancel flow

### Wave 1b: Editor Components
1. Create `StepPalette` and `StepPaletteItem`
2. Create `VariableAutocomplete` component
3. Create `PropertyPanel` with variable hints
4. Integrate into Hands.tsx
5. Test: Drag from palette, edit properties, variable autocomplete

### Wave 2: Connections & Validation
1. Add connection handlers to `FlowCanvas`
2. Update `StepNode` with delete button
3. Create `stepValidation.ts` utilities
4. Create `ValidationPanel` component
5. Integrate validation into Hands.tsx
6. Test: Connect nodes, validate, error display

### Wave 3: Chat Editor
1. Create `chatOperations.ts` parser
2. Create `ChatEditor` component
3. Create `hand_editor_prompt.rs`
4. Add Chat Edit tab to Hands.tsx
5. Test: Chat → preview → apply flow

---

## Verification Criteria

From ROADMAP.md Phase 2 Success Criteria:

### Visual Editor
- [x] Hand 详情页可切换"编辑模式" — Edit/Cancel/Save buttons
- [x] 左侧面板显示步骤类型 palette，可拖拽到画布 — StepPalette
- [x] 画布上可拖拽节点调整位置 — ReactFlow nodesDraggable
- [x] 点击节点打开右侧属性面板编辑详情 — PropertyPanel
- [x] 可拖拽连接节点（设置 next_steps） — onConnect handler
- [x] 可删除节点和连接 — Delete buttons + onEdgesDelete
- [x] 支持变量插值语法 `{{step_id.output}}` 的输入提示 — VariableAutocomplete
- [x] 保存时验证步骤图 — ValidationPanel + validateSteps

### Chat Editor
- [x] Hand 详情页有"Chat Edit"入口 — Third tab
- [x] 用户可以用自然语言描述想要的流程变更 — Chat input
- [x] Agent 理解意图并调用 `hand_update_steps` tool 修改步骤 — Agent integration
- [x] 修改前 Agent 展示变更预览（增删改的步骤清单） — Change preview cards
- [x] 用户确认后应用变更 — Apply button
- [x] 变更后流程图实时刷新 — Shared draft state
- [x] 支持增量编辑（"在步骤2后添加一个条件分支"） — Incremental mode
- [x] 支持完整重写（"重新设计整个流程为..."） — Complete rewrite mode

---

## Dependencies

- Phase 1 complete (React Flow components, API endpoints)
- `@xyflow/react` installed
- Existing: `hand_create`, `hand_update_steps` tools

## Risk Areas

1. **State sync:** `useHandDraft` hook ensures consistency
2. **Validation:** Graph algorithms in `stepValidation.ts`
3. **Agent parsing:** Structured output format in prompt

## Test Commands

```bash
# Unit tests
cd crates/openfang-webui && pnpm test FlowCanvas.edit
cd crates/openfang-webui && pnpm test StepPalette
cd crates/openfang-webui && pnpm test PropertyPanel
cd crates/openfang-webui && pnpm test ValidationPanel
cd crates/openfang-webui && pnpm test ChatEditor

# Integration tests
cd crates/openfang-webui && pnpm test Hands.edit-mode
cd crates/openfang-webui && pnpm test Hands.validation

# E2E tests
cargo test -p openfang-hands -- --test-threads=1
```

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Variable syntax | `{{step_id.output}}` | Common template pattern, easy to parse |
| Chat streaming | Use existing Agent tools | No new backend needed |
| Draft persistence | React state only | Explicit save/cancel per CONTEXT.md |
| Validation | Real-time + on-save | User feedback without blocking |
| Wave structure | 4 waves (1a, 1b, 2, 3) | Each wave < 5 files, manageable scope |
