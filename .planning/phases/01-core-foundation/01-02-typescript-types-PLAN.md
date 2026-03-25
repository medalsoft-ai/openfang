---
phase: 01
core-foundation: true
name: Add TypeScript Types for Steps
description: Define step types in frontend API types for React Flow integration
wave: 1
task_count: 1
autonomous: true
gap_closure: false
requirements:
  - UI-01
---

# Plan 01-02: Add TypeScript Types for Steps

## Objective
Define TypeScript interfaces for Hand steps to support React Flow visualization and API integration.

## Success Criteria
- TypeScript interfaces for HandStep, StepType, and StepConfig variants
- API function types for getHandSteps and updateHandSteps
- No TypeScript errors (`pnpm type-check` passes)

## Files to Modify
- `crates/openfang-webui/src/api/types.ts` (modify - add ~80 lines)

## Task 1: Add Step Type Definitions

Add to `crates/openfang-webui/src/api/types.ts`:

```typescript
// Step types for Hand workflow
export type StepTypeVariant =
  | 'execute-tool'
  | 'send-message'
  | 'wait-for-input'
  | 'condition'
  | 'loop'
  | 'sub-hand';

// Base step configuration
export interface BaseStepConfig {
  [key: string]: unknown;
}

// Execute tool step
export interface ExecuteToolConfig extends BaseStepConfig {
  toolName: string;
  input?: Record<string, unknown>;
}

// Send message step
export interface SendMessageConfig extends BaseStepConfig {
  content: string;
  targetAgent?: string;
}

// Wait for input step
export interface WaitForInputConfig extends BaseStepConfig {
  prompt: string;
  timeoutSecs?: number;
}

// Condition step
export interface ConditionConfig extends BaseStepConfig {
  expression: string;
  trueBranch: string;
  falseBranch: string;
}

// Loop step
export interface LoopConfig extends BaseStepConfig {
  iterator: string;
  items: string;
  body: string[];
}

// Sub-hand step
export interface SubHandConfig extends BaseStepConfig {
  handId: string;
  inputMapping?: Record<string, unknown>;
}

// Union type for all step configs
export type StepConfig =
  | ExecuteToolConfig
  | SendMessageConfig
  | WaitForInputConfig
  | ConditionConfig
  | LoopConfig
  | SubHandConfig;

// Hand step definition
export interface HandStep {
  id: string;
  name: string;
  type: StepTypeVariant;
  config: StepConfig;
  nextSteps: string[];
}

// React Flow node data
export interface StepNodeData {
  step: HandStep;
  label: string;
}

// React Flow extensions
export interface ReactFlowNode {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: StepNodeData;
}

export interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
  type?: string;
}

// API request/response types
export interface GetHandStepsResponse {
  steps: HandStep[];
  nodes?: ReactFlowNode[];
  edges?: ReactFlowEdge[];
}

export interface UpdateHandStepsRequest {
  steps: HandStep[];
}
```

## Task 2: Add API Function Types

Add to the API types:

```typescript
// In the API functions section, add:
export type GetHandStepsFunction = (handId: string) => Promise<GetHandStepsResponse>;
export type UpdateHandStepsFunction = (handId: string, steps: HandStep[]) => Promise<void>;
```

## Task 3: Update API Client

Modify `crates/openfang-webui/src/api/index.ts` (or client.ts):

```typescript
import type { GetHandStepsResponse, UpdateHandStepsRequest, HandStep } from './types';

export async function getHandSteps(handId: string): Promise<HandStep[]> {
  const response = await fetch(`/api/hands/${handId}/steps`);
  if (!response.ok) {
    throw new Error(`Failed to fetch hand steps: ${response.statusText}`);
  }
  const data: GetHandStepsResponse = await response.json();
  return data.steps;
}

export async function updateHandSteps(handId: string, steps: HandStep[]): Promise<void> {
  const body: UpdateHandStepsRequest = { steps };
  const response = await fetch(`/api/hands/${handId}/steps`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new Error(`Failed to update hand steps: ${response.statusText}`);
  }
}
```

## Verification

```bash
cd crates/openfang-webui
pnpm type-check
```

## Dependencies
None - can parallel with 01-01.

## Notes
- Match the Rust struct field names (camelCase in TS)
- React Flow types are for future use in Task 1.5
- Keep types close to the API types file for maintainability
