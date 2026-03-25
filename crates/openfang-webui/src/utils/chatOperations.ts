import type { HandStep, StepTypeVariant, StepConfig } from '../api/types';

// ============================================================================
// TYPES
// ============================================================================

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

// ============================================================================
// MODE DETECTION
// ============================================================================

const REWRITE_KEYWORDS = [
  'rewrite',
  'redesign',
  'replace entire',
  'start over',
  'complete redesign',
  'new flow',
  'replace all',
];

/**
 * Detect if the response indicates a complete rewrite or incremental change
 */
export function detectMode(content: string): 'incremental' | 'rewrite' {
  const lowerContent = content.toLowerCase();
  return REWRITE_KEYWORDS.some((kw) => lowerContent.includes(kw)) ? 'rewrite' : 'incremental';
}

// ============================================================================
// OPERATION PARSING
// ============================================================================

const STEP_TYPE_MAP: Record<string, StepTypeVariant> = {
  'execute-tool': 'execute-tool',
  'tool': 'execute-tool',
  'send-message': 'send-message',
  'message': 'send-message',
  'wait-for-input': 'wait-for-input',
  'wait': 'wait-for-input',
  'input': 'wait-for-input',
  'condition': 'condition',
  'branch': 'condition',
  'if': 'condition',
  'loop': 'loop',
  'repeat': 'loop',
  'sub-hand': 'sub-hand',
  'subhand': 'sub-hand',
  'hand': 'sub-hand',
};

/**
 * Parse step type from string
 */
function parseStepType(typeStr: string): StepTypeVariant | null {
  const normalized = typeStr.toLowerCase().trim();
  return STEP_TYPE_MAP[normalized] || null;
}

/**
 * Parse an ADD operation from a line
 * Format: ADD step "name" (type: type_name) [after "step_id"]
 *         ADD "name" (type: type_name)
 *         - ADD step "X" (type: Y)
 */
function parseAddOperation(line: string): StepOperation | null {
  // Match patterns like: ADD step "name" (type: type_name) or ADD "name" (type: type_name)
  const addPattern = /ADD\s+(?:step\s+)?["']([^"']+)["']\s*\(\s*type:\s*(\w+)/i;
  const match = line.match(addPattern);

  if (!match) return null;

  const name = match[1].trim();
  const typeStr = match[2].trim();
  const type = parseStepType(typeStr);

  if (!type) return null;

  // Generate a step ID from the name
  const stepId = generateStepId(name);

  // Check for "after" clause
  const afterMatch = line.match(/after\s+["']([^"']+)["']/i);
  const afterStepId = afterMatch ? afterMatch[1].trim() : undefined;

  // Create default config based on type
  const config = createDefaultConfig(type);

  const step: HandStep = {
    id: stepId,
    name,
    type,
    config,
    nextSteps: [],
  };

  return { type: 'add', step, afterStepId };
}

/**
 * Parse an UPDATE operation from a line
 * Format: UPDATE "step_id" set field = value
 *         UPDATE "step_id" to ...
 *         - UPDATE step-X to ...
 */
function parseUpdateOperation(line: string): StepOperation | null {
  // Match step ID in quotes
  const updatePattern = /UPDATE\s+["']([^"']+)["']\s+(?:set\s+)?(.+)/i;
  const match = line.match(updatePattern);

  if (!match) return null;

  const stepId = match[1].trim();
  const updateSpec = match[2].trim();

  const updates: Partial<HandStep> = {};

  // Try to parse field = value pairs
  const fieldPattern = /(\w+(?:\.\w+)*)\s*=\s*["']([^"']*)["']|(\w+(?:\.\w+)*)\s*=\s*(\S+)/gi;
  let fieldMatch;

  while ((fieldMatch = fieldPattern.exec(updateSpec)) !== null) {
    const field = (fieldMatch[1] || fieldMatch[3]).trim();
    const value = fieldMatch[2] !== undefined ? fieldMatch[2] : fieldMatch[4];

    if (field === 'name') {
      updates.name = value;
    } else if (field === 'type') {
      const parsedType = parseStepType(value);
      if (parsedType) updates.type = parsedType;
    } else if (field.startsWith('config.')) {
      const configKey = field.slice(7);
      updates.config = updates.config || ({ toolName: '' } as StepConfig);
      (updates.config as Record<string, unknown>)[configKey] = value;
    } else if (field === 'next_steps' || field === 'nextSteps') {
      // Parse comma-separated step IDs
      updates.nextSteps = value.split(',').map((s) => s.trim());
    }
  }

  // If no specific field parsed, treat the whole spec as a name update
  if (Object.keys(updates).length === 0) {
    // Remove common prefixes and treat as name
    const nameValue = updateSpec.replace(/^(?:to\s+|name\s+to\s+)/i, '').trim();
    if (nameValue) {
      updates.name = nameValue.replace(/["']/g, '');
    }
  }

  return { type: 'update', stepId, updates };
}

/**
 * Parse a DELETE operation from a line
 * Format: DELETE "step_id"
 *         DELETE step "step_id"
 *         - DELETE step-X
 */
function parseDeleteOperation(line: string): StepOperation | null {
  const deletePattern = /DELETE\s+(?:step\s+)?["']([^"']+)["']/i;
  const match = line.match(deletePattern);

  if (!match) {
    // Try alternative format without quotes
    const altPattern = /DELETE\s+(?:step\s+)?(\S+)/i;
    const altMatch = line.match(altPattern);
    if (altMatch) {
      return { type: 'delete', stepId: altMatch[1].trim() };
    }
    return null;
  }

  return { type: 'delete', stepId: match[1].trim() };
}

/**
 * Parse a MOVE operation from a line
 * Format: MOVE "step_id" after "other_step_id"
 *         MOVE step-X after step-Y
 */
function parseMoveOperation(line: string): StepOperation | null {
  const movePattern = /MOVE\s+["']([^"']+)["']\s+after\s+["']([^"']+)["']/i;
  const match = line.match(movePattern);

  if (!match) {
    // Try alternative format without quotes
    const altPattern = /MOVE\s+(\S+)\s+after\s+(\S+)/i;
    const altMatch = line.match(altPattern);
    if (altMatch) {
      return {
        type: 'move',
        stepId: altMatch[1].trim(),
        afterStepId: altMatch[2].trim(),
      };
    }
    return null;
  }

  return {
    type: 'move',
    stepId: match[1].trim(),
    afterStepId: match[2].trim(),
  };
}

// ============================================================================
// MAIN PARSING
// ============================================================================

/**
 * Parse operations from Agent response content
 */
export function parseOperations(content: string): ParsedResponse {
  const mode = detectMode(content);
  const operations: StepOperation[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip empty lines and code block markers
    if (!trimmed || trimmed.startsWith('```')) continue;

    // Remove markdown list markers
    const cleanLine = trimmed.replace(/^[-*]\s*/, '');

    // Try to parse each operation type
    if (/^ADD/i.test(cleanLine)) {
      const op = parseAddOperation(cleanLine);
      if (op) operations.push(op);
    } else if (/^UPDATE/i.test(cleanLine)) {
      const op = parseUpdateOperation(cleanLine);
      if (op) operations.push(op);
    } else if (/^DELETE/i.test(cleanLine)) {
      const op = parseDeleteOperation(cleanLine);
      if (op) operations.push(op);
    } else if (/^MOVE/i.test(cleanLine)) {
      const op = parseMoveOperation(cleanLine);
      if (op) operations.push(op);
    }
  }

  return {
    message: extractMessage(content),
    operations,
    mode,
  };
}

/**
 * Extract display message from content (remove operation lines)
 */
function extractMessage(content: string): string {
  const lines = content.split('\n');
  const messageLines: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Skip code block markers
    if (trimmed.startsWith('```')) continue;

    // Skip operation lines (but keep explanatory text before/after)
    const cleanLine = trimmed.replace(/^[-*]\s*/, '');
    if (/^(ADD|UPDATE|DELETE|MOVE)\s/i.test(cleanLine)) {
      continue;
    }

    // Keep non-empty lines
    if (trimmed) {
      messageLines.push(line);
    }
  }

  return messageLines.join('\n').trim();
}

// ============================================================================
// OPERATION APPLICATION
// ============================================================================

/**
 * Apply operations to a steps array
 * Returns a new array (immutable operation)
 */
export function applyOperations(steps: HandStep[], operations: StepOperation[]): HandStep[] {
  // Deep clone steps to avoid mutation
  let newSteps: HandStep[] = steps.map((s) => ({
    ...s,
    config: { ...s.config },
    nextSteps: [...s.nextSteps],
  }));

  // Handle rewrite mode: if any operation is a delete-all signal, clear first
  const hasDeleteAll = operations.some(
    (op) => op.type === 'delete' && (op.stepId === 'all' || op.stepId === '*')
  );
  if (hasDeleteAll) {
    newSteps = [];
  }

  // Apply each operation in order
  for (const op of operations) {
    switch (op.type) {
      case 'add':
        newSteps = applyAdd(newSteps, op);
        break;
      case 'update':
        newSteps = applyUpdate(newSteps, op);
        break;
      case 'delete':
        newSteps = applyDelete(newSteps, op);
        break;
      case 'move':
        newSteps = applyMove(newSteps, op);
        break;
    }
  }

  return newSteps;
}

function applyAdd(steps: HandStep[], op: Extract<StepOperation, { type: 'add' }>): HandStep[] {
  const { step, afterStepId } = op;

  // Check if step already exists
  if (steps.some((s) => s.id === step.id)) {
    // Generate a unique ID
    let counter = 1;
    let newId = `${step.id}_${counter}`;
    while (steps.some((s) => s.id === newId)) {
      counter++;
      newId = `${step.id}_${counter}`;
    }
    step.id = newId;
  }

  if (afterStepId) {
    // Insert after specified step
    const index = steps.findIndex((s) => s.id === afterStepId);
    if (index >= 0) {
      // Update the after step's nextSteps to include the new step
      const updatedSteps = steps.map((s, i) => {
        if (i === index) {
          return { ...s, nextSteps: [...s.nextSteps, step.id] };
        }
        return s;
      });
      return [...updatedSteps.slice(0, index + 1), step, ...updatedSteps.slice(index + 1)];
    }
  }

  // Append to end
  return [...steps, step];
}

function applyUpdate(
  steps: HandStep[],
  op: Extract<StepOperation, { type: 'update' }>
): HandStep[] {
  return steps.map((s) => {
    if (s.id !== op.stepId) return s;

    return {
      ...s,
      ...op.updates,
      config: { ...s.config, ...(op.updates.config || {}) },
      nextSteps: op.updates.nextSteps || s.nextSteps,
    };
  });
}

function applyDelete(
  steps: HandStep[],
  op: Extract<StepOperation, { type: 'delete' }>
): HandStep[] {
  // Remove the step
  const filtered = steps.filter((s) => s.id !== op.stepId);

  // Remove references from other steps' nextSteps
  return filtered.map((s) => ({
    ...s,
    nextSteps: s.nextSteps.filter((id) => id !== op.stepId),
  }));
}

function applyMove(steps: HandStep[], op: Extract<StepOperation, { type: 'move' }>): HandStep[] {
  // Find the step to move
  const stepToMove = steps.find((s) => s.id === op.stepId);
  if (!stepToMove) return steps;

  // For visual ordering, we don't change the array order (that would break connections)
  // Instead, we update the flow by changing nextSteps
  const newSteps = steps.map((s) => {
    if (s.id === op.afterStepId) {
      // Add to new position's next steps
      if (!s.nextSteps.includes(op.stepId)) {
        return { ...s, nextSteps: [...s.nextSteps, op.stepId] };
      }
    }
    return s;
  });

  return newSteps;
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate operations against current steps
 * Returns array of error messages (empty if valid)
 */
export function validateOperations(steps: HandStep[], operations: StepOperation[]): string[] {
  const errors: string[] = [];
  const stepIds = new Set(steps.map((s) => s.id));

  for (const op of operations) {
    switch (op.type) {
      case 'add':
        if (op.afterStepId && !stepIds.has(op.afterStepId)) {
          errors.push(`ADD: Referenced step "${op.afterStepId}" does not exist`);
        }
        break;

      case 'update':
        if (!stepIds.has(op.stepId)) {
          errors.push(`UPDATE: Step "${op.stepId}" does not exist`);
        }
        // Validate next_steps references
        if (op.updates.nextSteps) {
          for (const nextId of op.updates.nextSteps) {
            if (!stepIds.has(nextId) && !operations.some((o) => o.type === 'add' && o.step.id === nextId)) {
              errors.push(`UPDATE: Referenced next step "${nextId}" does not exist`);
            }
          }
        }
        break;

      case 'delete':
        if (!stepIds.has(op.stepId)) {
          errors.push(`DELETE: Step "${op.stepId}" does not exist`);
        }
        break;

      case 'move':
        if (!stepIds.has(op.stepId)) {
          errors.push(`MOVE: Step "${op.stepId}" does not exist`);
        }
        if (!stepIds.has(op.afterStepId)) {
          errors.push(`MOVE: Target step "${op.afterStepId}" does not exist`);
        }
        break;
    }
  }

  return errors;
}

// ============================================================================
// DESCRIPTION GENERATION
// ============================================================================

/**
 * Generate human-readable descriptions of operations
 */
export function describeOperations(operations: StepOperation[]): string[] {
  return operations.map((op) => {
    switch (op.type) {
      case 'add':
        return op.afterStepId
          ? `Add "${op.step.name}" (${op.step.type}) after "${op.afterStepId}"`
          : `Add "${op.step.name}" (${op.step.type})`;

      case 'update': {
        const fields = Object.keys(op.updates);
        if (fields.length === 1 && fields[0] === 'name') {
          return `Rename step to "${op.updates.name}"`;
        }
        return `Update "${op.stepId}" (${fields.join(', ')})`;
      }

      case 'delete':
        return `Delete "${op.stepId}"`;

      case 'move':
        return `Move "${op.stepId}" after "${op.afterStepId}"`;

      default:
        return 'Unknown operation';
    }
  });
}

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Generate a step ID from a name
 */
function generateStepId(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Create default config for a step type
 */
function createDefaultConfig(type: StepTypeVariant): StepConfig {
  switch (type) {
    case 'execute-tool':
      return { toolName: '', input: {} };
    case 'send-message':
      return { content: '' };
    case 'wait-for-input':
      return { prompt: '' };
    case 'condition':
      return { expression: '', trueBranch: '', falseBranch: '' };
    case 'loop':
      return { iterator: '', items: '', body: [] };
    case 'sub-hand':
      return { handId: '' };
    default:
      return { toolName: '' } as StepConfig;
  }
}
