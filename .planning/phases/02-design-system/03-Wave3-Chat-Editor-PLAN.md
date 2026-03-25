# Wave 3 Plan: Chat Editor

**Phase:** 02 — Dual Editor
**Wave:** 3 of 4
**Goal:** Enable chat-based editing with incremental and complete rewrite modes
**Depends on:** Wave 2 (Connections & Validation)

---

## Overview

The Chat Editor provides a conversational interface for editing Hand steps. Users describe changes in natural language, and the Agent suggests modifications in a structured format.

**Two Edit Modes:**
- **Incremental** (default): Agent modifies specific steps, preserves overall structure
- **Complete Rewrite**: Agent replaces the entire flow with a new design

---

## Files to Create/Modify

### 1. `crates/openfang-webui/src/utils/chatOperations.ts` (NEW)

**Purpose:** Parse Agent responses into structured operations and apply them to draft steps.

**Types:**
```typescript
export type StepOperation =
  | { type: 'add'; step: HandStep; afterStepId?: string }
  | { type: 'update'; stepId: string; updates: Partial<HandStep> }
  | { type: 'delete'; stepId: string }
  | { type: 'move'; stepId: string; afterStepId: string };

export interface ParsedResponse {
  message: string;
  operations: StepOperation[];
  mode: 'incremental' | 'rewrite';
}
```

**Functions:**
```typescript
export function parseOperations(content: string): ParsedResponse;
export function applyOperations(steps: HandStep[], operations: StepOperation[]): HandStep[];
export function describeOperations(operations: StepOperation[]): string[];
export function validateOperations(steps: HandStep[], operations: StepOperation[]): string[];
```

**Parsing Rules:**
1. Detect mode from keywords:
   - "rewrite", "redesign", "replace entire" → `rewrite` mode
   - Default → `incremental` mode

2. Extract operations from markdown lists or code blocks:
   - "ADD step 'X' (type: Y)" → add operation
   - "UPDATE step-X to..." → update operation
   - "DELETE step-X" → delete operation
   - "MOVE step-X after step-Y" → move operation

3. Return message text without operation lines for display

**Implementation:**
```typescript
export function parseOperations(content: string): ParsedResponse {
  const mode = detectMode(content);
  const operations: StepOperation[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.match(/^[-*]\s*ADD/i)) {
      operations.push(parseAddOperation(trimmed));
    } else if (trimmed.match(/^[-*]\s*UPDATE/i)) {
      operations.push(parseUpdateOperation(trimmed));
    } else if (trimmed.match(/^[-*]\s*DELETE/i)) {
      operations.push(parseDeleteOperation(trimmed));
    } else if (trimmed.match(/^[-*]\s*MOVE/i)) {
      operations.push(parseMoveOperation(trimmed));
    }
  }

  return { message: extractMessage(content), operations, mode };
}
```

**Tests:** `chatOperations.test.ts`
- Parses ADD operations with step details
- Parses UPDATE operations with partial updates
- Parses DELETE operations
- Parses MOVE operations
- Detects rewrite vs incremental mode
- Applies operations correctly to step array
- Validates operation references (step IDs exist)
- Generates human-readable descriptions

---

### 2. `crates/openfang-webui/src/components/flow/ChatEditor.tsx` (NEW)

**Purpose:** Chat interface for Hand editing with change preview.

**Props:**
```typescript
interface ChatEditorProps {
  handId: string;
  handName: string;
  draftSteps: HandStep[];
  onStepsChange: (steps: HandStep[]) => void;
  onSwitchToFlow: () => void;
}
```

**State:**
```typescript
interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  operations?: StepOperation[];
  mode?: 'incremental' | 'rewrite';
  applied?: boolean;
}

const [messages, setMessages] = useState<ChatMessage[]>([]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
const [pendingOps, setPendingOps] = useState<StepOperation[] | null>(null);
```

**Features:**

#### Chat Interface
- Message list with user (right) and assistant (left) bubbles
- Text input with send button (disabled while loading)
- Loading indicator during Agent response
- Scroll-to-bottom on new messages

#### Change Preview Cards
When Agent response contains operations, show preview card:

**Incremental Mode Preview:**
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Agent suggests changes (Incremental):                │
│                                                         │
│ Operations:                                             │
│ • ADD "Check Status" (condition) after "Initialize"     │
│ • UPDATE "Process" tool configuration                   │
│ • DELETE "Cleanup" step                                 │
│                                                         │
│ [View in Flow]  [Apply Changes]  [Cancel]               │
└─────────────────────────────────────────────────────────┘
```

**Rewrite Mode Preview:**
```
┌─────────────────────────────────────────────────────────┐
│ 🤖 Agent suggests complete rewrite:                     │
│                                                         │
│ Current: 5 steps → New: 3 steps                         │
│                                                         │
│ New flow overview:                                      │
│ 1. Initialize → 2. Check → 3. Process                   │
│                                                         │
│ ⚠️ This will replace all existing steps                 │
│                                                         │
│ [Preview Full Flow]  [Apply Rewrite]  [Cancel]          │
└─────────────────────────────────────────────────────────┘
```

**Apply Flow:**
1. User clicks "Apply Changes"
2. `applyOperations(draftSteps, pendingOps)` → newSteps
3. `onStepsChange(newSteps)`
4. Mark message as `applied: true`
5. Show success toast: "Changes applied to draft"

**Cancel Flow:**
1. User clicks "Cancel"
2. Clear `pendingOps`
3. Keep message in chat but remove preview buttons

**View in Flow:**
1. Calls `onSwitchToFlow()`
2. Flow tab opens with current draft (including pending changes)

**Tests:** `ChatEditor.test.tsx`
- Renders empty chat state with welcome message
- Sends message and displays user message
- Shows loading state during Agent response
- Parses and displays operation preview
- Applies changes to draft on confirm
- Cancels operation on cancel
- Switches to Flow tab on "View in Flow"
- Shows error for invalid operations

---

### 3. `crates/openfang-runtime/src/hand_editor_prompt.rs` (NEW)

**Purpose:** System prompt for the Hand editing Agent.

**Prompt Structure:**
```rust
pub const HAND_EDITOR_SYSTEM_PROMPT: &str = r#"
You are a Hand (Standard Operating Procedure) editing assistant.
Your role is to help users modify Hand step flows through natural language conversation.

## Hand Structure

A Hand consists of steps that form a directed graph:
- Each step has: id, name, step_type, config, next_steps
- step_type is one of: execute-tool, send-message, wait-for-input, condition, loop, sub-hand
- next_steps is an array of step IDs to execute next
- Steps form a flowchart: start → step A → step B → end

## Step Types

1. **execute-tool**: Calls a tool
   Config: { tool_name: string, arguments: object }

2. **send-message**: Sends a message to the user
   Config: { message_template: string }

3. **wait-for-input**: Pauses for user input
   Config: { prompt: string }

4. **condition**: Branches based on condition
   Config: { expression: string }
   Must have at least 2 next_steps (branches)

5. **loop**: Repeats steps
   Config: { max_iterations: number, condition: string }

6. **sub-hand**: Delegates to another Hand
   Config: { hand_id: string }

## Variable Interpolation

Steps can reference outputs from previous steps:
- Syntax: {{step_id.output_field}}
- Example: {{step_1.result}}, {{check_status.value}}

## Edit Operations

When the user requests changes, respond with:
1. A brief explanation of what you'll do
2. A markdown list of planned operations
3. Wait for confirmation

### Operation Format

Use these exact formats:

- ADD step "name" (type: type_name) after "step_id"
- UPDATE "step_id" set field = value
- DELETE "step_id"
- MOVE "step_id" after "other_step_id"

### Examples

User: "Add a status check after the first step"
Assistant:
I'll add a condition step after step-1 to check the status.

Planned operations:
- ADD step "check-status" (type: condition) after "step-1"
- UPDATE "step-1" set next_steps = ["check-status"]

Please confirm to apply these changes.

---

User: "Change the tool from 'search' to 'fetch' in step 2"
Assistant:
I'll update step-2 to use the 'fetch' tool instead of 'search'.

Planned operations:
- UPDATE "step-2" set config.tool_name = "fetch"

Please confirm to apply these changes.

---

User: "Redesign this as a simple 3-step process"
Assistant:
I'll redesign the entire flow with 3 steps: initialize, process, and finalize.

Planned operations (Complete Rewrite):
- DELETE all existing steps
- ADD step "init" (type: execute-tool)
- ADD step "process" (type: execute-tool) after "init"
- ADD step "finalize" (type: send-message) after "process"

⚠️ This will replace all existing steps. Please confirm to apply.

## Important Rules

1. ALWAYS show planned operations before applying
2. Use precise step IDs from the current flow
3. For complete rewrites, explicitly state this
4. Ensure condition steps have at least 2 next_steps
5. Don't create circular flows
6. Reference the correct output fields for variable interpolation
"#;
```

**Integration:**
- Export for use in tool_runner.rs
- Load when Agent needs hand_update_steps capability

**Tests:** Hand editor prompt is tested via integration:
- Parse examples produce correct operations
- Agent follows confirmation-before-apply rule

---

### 4. `crates/openfang-webui/src/pages/Hands.tsx` — Chat Tab Integration

**Changes:**

#### Add Tab Navigation
```typescript
const [activeTab, setActiveTab] = useState<'details' | 'flow' | 'chat'>('details');
```

Tab buttons:
```tsx
<div className="flex gap-2">
  <button
    onClick={() => setActiveTab('details')}
    className={activeTab === 'details' ? 'active' : ''}
  >
    Details
  </button>
  <button
    onClick={() => setActiveTab('flow')}
    className={activeTab === 'flow' ? 'active' : ''}
  >
    Flow
  </button>
  <button
    onClick={() => setActiveTab('chat')}
    className={activeTab === 'chat' ? 'active' : ''}
  >
    Chat Edit
  </button>
</div>
```

#### Render ChatEditor
```tsx
{activeTab === 'chat' && (
  <ChatEditor
    handId={hand.id}
    handName={hand.name}
    draftSteps={draftSteps}
    onStepsChange={setDraftSteps}
    onSwitchToFlow={() => setActiveTab('flow')}
  />
)}
```

#### State Sync Notes
- `draftSteps` is shared between Flow and Chat tabs
- Changes in ChatEditor immediately reflect in Flow tab
- No separate save needed—both use the same draft state
- Save/Cancel buttons in edit mode apply to both tabs

**Tests:** `Hands.chat-tab.test.tsx`
- Shows Chat Edit tab alongside Details and Flow
- Clicking Chat Edit tab renders ChatEditor
- ChatEditor receives correct props
- State changes in chat reflect in flow tab
- Switching tabs preserves draft state

---

## Implementation Order

1. **Create `chatOperations.ts`**
   - Define types and parsing functions
   - Write comprehensive tests first
   - Implement parsing logic

2. **Create `ChatEditor.tsx`**
   - Build chat UI components
   - Integrate chatOperations parser
   - Add preview cards with Apply/Cancel
   - Write component tests

3. **Create `hand_editor_prompt.rs`**
   - Write system prompt content
   - Export constant
   - Document integration point

4. **Update `Hands.tsx`**
   - Add Chat Edit tab
   - Integrate ChatEditor component
   - Verify state sync between tabs

---

## Verification Checklist

### Chat Editor Functionality
- [ ] Chat Edit tab visible in Hands page
- [ ] Chat interface renders with message history
- [ ] User can type and send messages
- [ ] Agent responses display correctly
- [ ] Change preview cards show for operations
- [ ] Apply button updates draft state
- [ ] Cancel button dismisses preview
- [ ] View in Flow switches to Flow tab

### Operation Parsing
- [ ] ADD operations parsed correctly
- [ ] UPDATE operations parsed correctly
- [ ] DELETE operations parsed correctly
- [ ] MOVE operations parsed correctly
- [ ] Incremental mode detected properly
- [ ] Rewrite mode detected properly
- [ ] Invalid operations flagged with errors

### State Synchronization
- [ ] Draft changes from chat visible in Flow tab
- [ ] Draft changes from Flow visible in chat context
- [ ] Single Save/Cancel applies to both modes
- [ ] Tab switching preserves unsaved draft

### Agent Integration
- [ ] System prompt includes Hand structure
- [ ] System prompt explains all step types
- [ ] System prompt provides operation examples
- [ ] Agent shows preview before applying
- [ ] Agent handles incremental edits
- [ ] Agent handles complete rewrites

---

## Dependencies

- Wave 2 complete (useHandDraft, validation)
- Phase 1 APIs (GET/PUT steps)
- Agent tool infrastructure (hand_update_steps)

---

## Risk Areas

1. **Operation Parsing Ambiguity**
   - Mitigation: Strict parsing rules, comprehensive tests
   - Fallback: Show raw response if parsing fails

2. **State Sync Complexity**
   - Mitigation: Single source of truth (draftSteps in Hands.tsx)
   - Both tabs receive same props

3. **Agent Response Variability**
   - Mitigation: Clear prompt with examples
   - Structured output format
   - Validation before applying

---

## Test Commands

```bash
# Unit tests
cd crates/openfang-webui && pnpm test chatOperations
cd crates/openfang-webui && pnpm test ChatEditor

# Integration tests
cd crates/openfang-webui && pnpm test Hands.chat-tab

# Rust tests
cargo test -p openfang-runtime hand_editor
```
