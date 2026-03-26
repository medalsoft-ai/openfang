import type { LocalHandStep } from './stepAdapter';

export interface ValidationError {
  type: 'orphan' | 'cycle' | 'duplicate-id' | 'missing-start' | 'invalid-next';
  stepId: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Find steps that are not reachable from any starting step
 */
export function findOrphanedSteps(steps: LocalHandStep[]): string[] {
  if (steps.length === 0) return [];

  const allStepIds = new Set(steps.map((s) => s.id));
  const reachableIds = new Set<string>();

  // BFS from steps that have no incoming connections (start steps)
  const findIncomingSteps = (stepId: string): LocalHandStep[] => {
    return steps.filter((s) => s.nextSteps?.includes(stepId));
  };

  const startSteps = steps.filter((s) => findIncomingSteps(s.id).length === 0);

  // If no start steps, all are orphaned
  if (startSteps.length === 0) {
    return steps.map((s) => s.id);
  }

  // BFS to find all reachable steps
  const queue = [...startSteps];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const step = queue.shift()!;
    if (visited.has(step.id)) continue;
    visited.add(step.id);
    reachableIds.add(step.id);

    // Add next steps to queue
    for (const nextId of step.nextSteps || []) {
      if (allStepIds.has(nextId) && !visited.has(nextId)) {
        const nextStep = steps.find((s) => s.id === nextId);
        if (nextStep) {
          queue.push(nextStep);
        }
      }
    }
  }

  // Return steps that are not reachable
  return steps.filter((s) => !reachableIds.has(s.id)).map((s) => s.id);
}

/**
 * Detect cycles in the step graph using DFS
 */
export function findCycles(steps: LocalHandStep[]): string[][] {
  const cycles: string[][] = [];
  const allStepIds = new Set(steps.map((s) => s.id));
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  const path: string[] = [];

  const dfs = (stepId: string): boolean => {
    visited.add(stepId);
    recursionStack.add(stepId);
    path.push(stepId);

    const step = steps.find((s) => s.id === stepId);
    if (step) {
      for (const nextId of step.nextSteps || []) {
        // Skip if next step doesn't exist
        if (!allStepIds.has(nextId)) continue;

        if (!visited.has(nextId)) {
          if (dfs(nextId)) return true;
        } else if (recursionStack.has(nextId)) {
          // Found a cycle - extract cycle from path
          const cycleStart = path.indexOf(nextId);
          const cycle = path.slice(cycleStart);
          cycles.push([...cycle, nextId]); // Close the cycle
        }
      }
    }

    path.pop();
    recursionStack.delete(stepId);
    return false;
  };

  for (const step of steps) {
    if (!visited.has(step.id)) {
      dfs(step.id);
    }
  }

  return cycles;
}

/**
 * Find duplicate step IDs
 */
export function findDuplicateIds(steps: LocalHandStep[]): { id: string; count: number }[] {
  const idCounts = new Map<string, number>();

  for (const step of steps) {
    idCounts.set(step.id, (idCounts.get(step.id) || 0) + 1);
  }

  return Array.from(idCounts.entries())
    .filter(([, count]) => count > 1)
    .map(([id, count]) => ({ id, count }));
}

/**
 * Find references to non-existent steps in nextSteps
 */
export function findInvalidNextSteps(steps: LocalHandStep[]): { stepId: string; invalidNext: string[] }[] {
  const allStepIds = new Set(steps.map((s) => s.id));
  const result: { stepId: string; invalidNext: string[] }[] = [];

  for (const step of steps) {
    const invalidNext = (step.nextSteps || []).filter((nextId) => !allStepIds.has(nextId));
    if (invalidNext.length > 0) {
      result.push({ stepId: step.id, invalidNext });
    }
  }

  return result;
}

/**
 * Check if there's at least one start step (no incoming connections)
 */
export function hasStartStep(steps: LocalHandStep[]): boolean {
  if (steps.length === 0) return true; // Empty is valid

  const findIncomingSteps = (stepId: string): LocalHandStep[] => {
    return steps.filter((s) => (s.nextSteps ?? []).includes(stepId));
  };

  return steps.some((s) => findIncomingSteps(s.id).length === 0);
}

/**
 * Run all validation checks
 */
export function validateSteps(steps: LocalHandStep[]): ValidationResult {
  const errors: ValidationError[] = [];

  // Check for duplicate IDs
  const duplicates = findDuplicateIds(steps);
  for (const { id, count } of duplicates) {
    errors.push({
      type: 'duplicate-id',
      stepId: id,
      message: `Step ID "${id}" is used ${count} times`,
    });
  }

  // Check for invalid next step references
  const invalidNext = findInvalidNextSteps(steps);
  for (const { stepId, invalidNext: invalidIds } of invalidNext) {
    errors.push({
      type: 'invalid-next',
      stepId,
      message: `Step references non-existent step(s): ${invalidIds.join(', ')}`,
    });
  }

  // Check for orphaned steps
  const orphaned = findOrphanedSteps(steps);
  for (const stepId of orphaned) {
    errors.push({
      type: 'orphan',
      stepId,
      message: `Step "${stepId}" is not reachable from any start step`,
    });
  }

  // Check for cycles
  const cycles = findCycles(steps);
  for (const cycle of cycles) {
    const cycleStr = cycle.slice(0, -1).join(' → ');
    errors.push({
      type: 'cycle',
      stepId: cycle[0],
      message: `Circular dependency detected: ${cycleStr}`,
    });
  }

  // Check for missing start step
  if (!hasStartStep(steps)) {
    errors.push({
      type: 'missing-start',
      stepId: steps[0]?.id || '',
      message: 'No start step found - all steps have incoming connections',
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get a summary of step graph structure
 */
export function getStepGraphSummary(steps: LocalHandStep[]): {
  totalSteps: number;
  startSteps: number;
  endSteps: number;
  branches: number;
} {
  const allStepIds = new Set(steps.map((s) => s.id));

  // Start steps: no incoming connections
  const startSteps = steps.filter((s) => {
    const incoming = steps.filter((other) => other.nextSteps?.includes(s.id));
    return incoming.length === 0;
  });

  // End steps: no outgoing connections
  const endSteps = steps.filter((s) => !s.nextSteps || s.nextSteps.length === 0);

  // Branches: steps with multiple outgoing connections
  const branches = steps.filter((s) => (s.nextSteps?.length || 0) > 1);

  return {
    totalSteps: steps.length,
    startSteps: startSteps.length,
    endSteps: endSteps.length,
    branches: branches.length,
  };
}
