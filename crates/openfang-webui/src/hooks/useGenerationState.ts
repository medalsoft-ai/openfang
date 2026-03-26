import { useState, useCallback, useRef, useEffect } from 'react';
import type { ToolCall } from '@/api/types';

// ============================================
// CONSTANTS
// ============================================

/** Time window to consider messages "recent" for matching purposes (ms) */
export const MESSAGE_RECENCY_THRESHOLD_MS = 60000; // 60 seconds

/** Safety timeout for generation to prevent stuck states (ms) */
export const GENERATION_TIMEOUT_MS = 120000; // 2 minutes

/** Minimum content length before attempting streaming message matching */
export const MIN_STREAMING_MATCH_LENGTH = 10;

/** Valid user roles */
export const USER_ROLES = ['user', 'User'] as const;

/** Valid assistant roles */
export const ASSISTANT_ROLES = ['assistant', 'Assistant', 'agent'] as const;

/** Valid system roles */
export const SYSTEM_ROLES = ['system', 'System'] as const;

// ============================================
// TYPE DEFINITIONS
// ============================================

export interface PartialGeneration {
  content: string;
  toolCalls?: ToolCall[];
  tool_calls?: ToolCall[]; // Alpine-compatible alias
  statusMessage?: string;
  toolTextDetected?: boolean;
  canvas?: {
    id: string;
    title: string;
    html: string;
  };
}

export interface PendingMessage {
  id: string;
  content: string;
  timestamp: string;
}

export type GenerationState =
  | { type: 'idle' }
  | { type: 'pending'; message: PendingMessage }
  | { type: 'thinking' }
  | { type: 'streaming'; partial: PartialGeneration; stepStatuses: StepStatus[] }
  | { type: 'error'; error: string };

export interface StepStatus {
  execution_id: string;
  hand_id?: string;
  agent_id?: string;
  step_id: string;
  step_name?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'waiting' | 'skipped';
  timestamp?: string;
  message?: string;
  output?: unknown;
  error?: string;
  retry_count?: number;
  started_at?: string;
  completed_at?: string;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/** Check if a role is a user role */
export function isUserRole(role: string): boolean {
  return USER_ROLES.includes(role as typeof USER_ROLES[number]);
}

/** Check if a role is an assistant role */
export function isAssistantRole(role: string): boolean {
  return ASSISTANT_ROLES.includes(role as typeof ASSISTANT_ROLES[number]);
}

/** Check if a role is a system role */
export function isSystemRole(role: string): boolean {
  return SYSTEM_ROLES.includes(role as typeof SYSTEM_ROLES[number]);
}

/** Check if a timestamp is recent within the given window */
export function isRecentTimestamp(timestamp: string | number | undefined, windowMs: number = MESSAGE_RECENCY_THRESHOLD_MS): boolean {
  if (!timestamp) return false;
  const msgTime = typeof timestamp === 'number' ? timestamp : new Date(timestamp).getTime();
  return (Date.now() - msgTime) < windowMs;
}

/** Format message timestamp for display */
export function formatMessageTime(timestamp: string | number | undefined): string {
  if (!timestamp) return '';

  let date: Date;
  if (typeof timestamp === 'string' && timestamp.includes('T')) {
    date = new Date(timestamp);
  } else if (typeof timestamp === 'number' || /^\d+$/.test(timestamp)) {
    const numTs = typeof timestamp === 'number' ? timestamp : parseInt(timestamp, 10);
    date = new Date(numTs < 946684800000 ? numTs * 1000 : numTs);
  } else {
    date = new Date(timestamp);
  }

  if (isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** Check if content matches for user message comparison */
export function matchesUserContent(msgContent: string, targetContent: string): boolean {
  return msgContent.trim() === targetContent.trim();
}

/** Check if content matches for assistant streaming comparison */
export function matchesStreamingContent(msgContent: string, streamingContent: string): boolean {
  if (streamingContent.length < MIN_STREAMING_MATCH_LENGTH) return false;
  return msgContent.startsWith(streamingContent) || streamingContent.startsWith(msgContent);
}

// ============================================
// HOOK
// ============================================

export function useGenerationState() {
  const [state, setState] = useState<GenerationState>({ type: 'idle' });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Keep track of the last pending message even after state transitions
  const lastPendingMessageRef = useRef<PendingMessage | null>(null);

  // Helper to set partial generation directly (for complex updates in callbacks)
  const setPartialGeneration = useCallback((updater: (prev: PartialGeneration | null) => PartialGeneration | null) => {
    setState((prevState) => {
      if (prevState.type !== 'streaming') return prevState;
      const newPartial = updater(prevState.partial);
      if (newPartial === null) {
        return { type: 'idle' } as GenerationState;
      }
      return { ...prevState, partial: newPartial };
    });
  }, []);

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Auto-manage safety timeout based on state
  useEffect(() => {
    // Only start timeout when in generating states (pending, thinking, streaming)
    if (state.type === 'idle' || state.type === 'error') {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }

    // Clear any existing timeout and start a new one
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setState({ type: 'idle' });
    }, GENERATION_TIMEOUT_MS);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [state.type]);

  const startPending = useCallback((content: string) => {
    const pendingMessage: PendingMessage = {
      id: `pending-${Date.now()}`,
      content: content.trim(),
      timestamp: new Date().toISOString(),
    };
    lastPendingMessageRef.current = pendingMessage;
    setState({ type: 'pending', message: pendingMessage });
  }, []);

  const startThinking = useCallback(() => {
    setState({ type: 'thinking' });
  }, []);

  const startStreaming = useCallback(() => {
    setState({
      type: 'streaming',
      partial: { content: '' },
      stepStatuses: [],
    });
  }, []);

  const updateStreamingContent = useCallback((update: Partial<PartialGeneration>) => {
    setState((prev) => {
      if (prev.type !== 'streaming') return prev;
      return {
        ...prev,
        partial: { ...prev.partial, ...update },
      };
    });
  }, []);

  const appendStreamingContent = useCallback((content: string) => {
    setState((prev) => {
      if (prev.type !== 'streaming') return prev;
      return {
        ...prev,
        partial: {
          ...prev.partial,
          content: prev.partial.content + content,
        },
      };
    });
  }, []);

  const updateStepStatuses = useCallback((stepData: StepStatus) => {
    setState((prev) => {
      if (prev.type !== 'streaming') return prev;

      const existingIndex = prev.stepStatuses.findIndex(
        (s) => s.step_id === stepData.step_id && s.execution_id === stepData.execution_id
      );

      if (existingIndex >= 0) {
        const updated = [...prev.stepStatuses];
        updated[existingIndex] = { ...updated[existingIndex], ...stepData };
        return { ...prev, stepStatuses: updated };
      }

      return { ...prev, stepStatuses: [...prev.stepStatuses, stepData] };
    });
  }, []);

  const clearStepStatuses = useCallback(() => {
    setState((prev) => {
      if (prev.type !== 'streaming') return prev;
      return { ...prev, stepStatuses: [] };
    });
  }, []);

  const complete = useCallback(() => {
    setState({ type: 'idle' });
    lastPendingMessageRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const setError = useCallback((error: string) => {
    setState({ type: 'error', error });
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const reset = useCallback(() => {
    setState({ type: 'idle' });
    lastPendingMessageRef.current = null;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  // Derived state for backwards compatibility
  const isGenerating = state.type !== 'idle' && state.type !== 'error';
  // Use ref as fallback to keep showing pending message during state transitions
  const pendingUserMessage = state.type === 'pending'
    ? state.message
    : (isGenerating && lastPendingMessageRef.current) || null;
  const partialGeneration = state.type === 'streaming' ? state.partial : null;
  const stepStatuses = state.type === 'streaming' ? state.stepStatuses : [];
  const error = state.type === 'error' ? state.error : null;

  return {
    // State
    state,
    isGenerating,
    pendingUserMessage,
    partialGeneration,
    stepStatuses,
    error,

    // Actions
    startPending,
    startThinking,
    startStreaming,
    setPartialGeneration,
    updateStreamingContent,
    appendStreamingContent,
    updateStepStatuses,
    clearStepStatuses,
    complete,
    setError,
    reset,
  };
}
