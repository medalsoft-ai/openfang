import { useState, useCallback, useMemo } from 'react';

// Local HandStep type for UI state (matches Hands.tsx and FlowCanvas)
interface HandStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  nextSteps?: string[];
}

export interface UseHandDraftReturn {
  /** Current draft steps */
  draftSteps: HandStep[];
  /** Whether draft differs from initial */
  isDirty: boolean;
  /** Update a specific step */
  updateStep: (stepId: string, updates: Partial<HandStep>) => void;
  /** Add a new step (optionally after a specific step) */
  addStep: (step: HandStep, afterStepId?: string) => void;
  /** Delete a step and its connections */
  deleteStep: (stepId: string) => void;
  /** Update connections (nextSteps) for a step */
  updateConnections: (sourceId: string, targetIds: string[]) => void;
  /** Reset draft to initial steps */
  resetDraft: () => void;
  /** Replace all steps (for complete rewrites) */
  setSteps: (steps: HandStep[]) => void;
}

/**
 * Hook for managing Hand step draft state
 * Shared between Flow editor and Chat editor
 */
export function useHandDraft(
  _handId: string,
  initialSteps: HandStep[]
): UseHandDraftReturn {
  const [draftSteps, setDraftSteps] = useState<HandStep[]>(initialSteps);

  // Compare draft with initial to determine dirty state
  const isDirty = useMemo(() => {
    return JSON.stringify(draftSteps) !== JSON.stringify(initialSteps);
  }, [draftSteps, initialSteps]);

  /**
   * Update a specific step's properties
   */
  const updateStep = useCallback((stepId: string, updates: Partial<HandStep>) => {
    setDraftSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, ...updates } : step
      )
    );
  }, []);

  /**
   * Add a new step to the draft
   * If afterStepId is provided, inserts after that step and updates connections
   */
  const addStep = useCallback((step: HandStep, afterStepId?: string) => {
    setDraftSteps((prev) => {
      const newSteps = [...prev];

      if (afterStepId) {
        // Find the step to insert after
        const afterIndex = newSteps.findIndex((s) => s.id === afterStepId);
        if (afterIndex >= 0) {
          const afterStep = newSteps[afterIndex];
          // Insert new step
          newSteps.splice(afterIndex + 1, 0, step);
          // Update connections: new step takes afterStep's nextSteps
          // afterStep now points to new step
          const afterStepNextSteps = [...(afterStep.nextSteps ?? [])];
          afterStep.nextSteps = [step.id];
          step.nextSteps = afterStepNextSteps;
        } else {
          // afterStepId not found, append to end
          newSteps.push(step);
        }
      } else {
        // No afterStepId, just append
        newSteps.push(step);
      }

      return newSteps;
    });
  }, []);

  /**
   * Delete a step and remove all references to it
   */
  const deleteStep = useCallback((stepId: string) => {
    setDraftSteps((prev) => {
      // Remove the step
      const newSteps = prev.filter((s) => s.id !== stepId);

      // Remove references from other steps
      return newSteps.map((step) => ({
        ...step,
        nextSteps: (step.nextSteps ?? []).filter((id) => id !== stepId),
      }));
    });
  }, []);

  /**
   * Update the connections (nextSteps) for a specific step
   */
  const updateConnections = useCallback((sourceId: string, targetIds: string[]) => {
    setDraftSteps((prev) =>
      prev.map((step) =>
        step.id === sourceId ? { ...step, nextSteps: targetIds } : step
      )
    );
  }, []);

  /**
   * Reset draft to initial state
   */
  const resetDraft = useCallback(() => {
    setDraftSteps(initialSteps);
  }, [initialSteps]);

  /**
   * Replace all steps (used for complete rewrites from chat editor)
   */
  const setSteps = useCallback((steps: HandStep[]) => {
    setDraftSteps(steps);
  }, []);

  return {
    draftSteps,
    isDirty,
    updateStep,
    addStep,
    deleteStep,
    updateConnections,
    resetDraft,
    setSteps,
  };
}

export default useHandDraft;
