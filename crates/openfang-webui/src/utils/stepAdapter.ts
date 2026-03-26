import type { HandStep as ApiHandStep, StepTypeVariant, StepConfig } from '../api/types';

/**
 * Local HandStep type for UI state
 * This is the canonical type used throughout the React UI components
 */
export interface LocalHandStep {
  id: string;
  order: number;
  title: string;
  description?: string;
  tool?: string;
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  nextSteps?: string[];
}

/**
 * Backend HandStep format (snake_case, nested step_type)
 * This matches the Rust backend's HandStep + StepType structure
 */
export interface BackendHandStep {
  id: string;
  name: string;
  step_type: BackendStepType;
  next_steps: string[];
}

/**
 * Backend StepType format (tagged union with kebab-case type field)
 */
export type BackendStepType =
  | { type: 'execute-tool'; tool_name: string; input?: Record<string, unknown> }
  | { type: 'send-message'; content: string; target_agent?: string }
  | { type: 'wait-for-input'; prompt: string; timeout_secs?: number }
  | { type: 'condition'; expression: string; true_branch: string; false_branch: string }
  | { type: 'loop'; iterator: string; items: string; body: string[] }
  | { type: 'sub-hand'; hand_id: string; input_mapping?: Record<string, unknown> };

/**
 * Convert API HandStep to LocalHandStep for UI consumption
 */
export function toLocalStep(apiStep: ApiHandStep, index: number): LocalHandStep {
  return {
    id: apiStep.id,
    order: index + 1,
    title: apiStep.name,
    description: '',
    tool: apiStep.type,
    input: apiStep.config,
    output: {},
    nextSteps: apiStep.nextSteps || [],
  };
}

/**
 * Convert LocalHandStep to API HandStep for API calls
 */
export function toApiStep(localStep: LocalHandStep): ApiHandStep {
  return {
    id: localStep.id,
    name: localStep.title,
    type: (localStep.tool as StepTypeVariant) || 'execute-tool',
    config: (localStep.input as StepConfig) || {},
    nextSteps: localStep.nextSteps || [],
  };
}

/**
 * Convert camelCase config keys to snake_case for backend
 */
function convertConfigToBackend(
  type: StepTypeVariant,
  config: StepConfig
): BackendStepType {
  switch (type) {
    case 'execute-tool':
      return {
        type: 'execute-tool',
        tool_name: (config as { toolName?: string }).toolName || '',
        input: (config as { input?: Record<string, unknown> }).input,
      };
    case 'send-message':
      return {
        type: 'send-message',
        content: (config as { content?: string }).content || '',
        target_agent: (config as { targetAgent?: string }).targetAgent,
      };
    case 'wait-for-input':
      return {
        type: 'wait-for-input',
        prompt: (config as { prompt?: string }).prompt || '',
        timeout_secs: (config as { timeoutSecs?: number }).timeoutSecs,
      };
    case 'condition':
      return {
        type: 'condition',
        expression: (config as { expression?: string }).expression || '',
        true_branch: (config as { trueBranch?: string }).trueBranch || '',
        false_branch: (config as { falseBranch?: string }).falseBranch || '',
      };
    case 'loop':
      return {
        type: 'loop',
        iterator: (config as { iterator?: string }).iterator || '',
        items: (config as { items?: string }).items || '',
        body: (config as { body?: string[] }).body || [],
      };
    case 'sub-hand':
      return {
        type: 'sub-hand',
        hand_id: (config as { handId?: string }).handId || '',
        input_mapping: (config as { inputMapping?: Record<string, unknown> }).inputMapping,
      };
    default:
      return {
        type: 'execute-tool',
        tool_name: '',
      };
  }
}

/**
 * Convert frontend HandStep to backend format (snake_case, nested step_type)
 * This is used when sending data to the backend API
 */
export function toBackendStep(apiStep: ApiHandStep): BackendHandStep {
  return {
    id: apiStep.id,
    name: apiStep.name,
    step_type: convertConfigToBackend(apiStep.type, apiStep.config),
    next_steps: apiStep.nextSteps || [],
  };
}

/**
 * Convert array of API HandSteps to BackendHandSteps for API calls
 */
export function toBackendSteps(apiSteps: ApiHandStep[]): BackendHandStep[] {
  return apiSteps.map(toBackendStep);
}

/**
 * Convert backend StepType to frontend config format (snake_case → camelCase)
 */
function convertConfigFromBackend(backendStepType: BackendStepType): { type: StepTypeVariant; config: StepConfig } {
  switch (backendStepType.type) {
    case 'execute-tool':
      return {
        type: 'execute-tool',
        config: {
          toolName: backendStepType.tool_name,
          input: backendStepType.input,
        },
      };
    case 'send-message':
      return {
        type: 'send-message',
        config: {
          content: backendStepType.content,
          targetAgent: backendStepType.target_agent,
        },
      };
    case 'wait-for-input':
      return {
        type: 'wait-for-input',
        config: {
          prompt: backendStepType.prompt,
          timeoutSecs: backendStepType.timeout_secs,
        },
      };
    case 'condition':
      return {
        type: 'condition',
        config: {
          expression: backendStepType.expression,
          trueBranch: backendStepType.true_branch,
          falseBranch: backendStepType.false_branch,
        },
      };
    case 'loop':
      return {
        type: 'loop',
        config: {
          iterator: backendStepType.iterator,
          items: backendStepType.items,
          body: backendStepType.body,
        },
      };
    case 'sub-hand':
      return {
        type: 'sub-hand',
        config: {
          handId: backendStepType.hand_id,
          inputMapping: backendStepType.input_mapping,
        },
      };
    default:
      return {
        type: 'execute-tool',
        config: { toolName: '' },
      };
  }
}

/**
 * Convert backend HandStep to frontend format (camelCase, flat type+config)
 * This is used when receiving data from the backend API
 */
export function fromBackendStep(backendStep: BackendHandStep): ApiHandStep {
  const { type, config } = convertConfigFromBackend(backendStep.step_type);
  return {
    id: backendStep.id,
    name: backendStep.name,
    type,
    config,
    nextSteps: backendStep.next_steps,
  };
}

/**
 * Convert array of BackendHandSteps to API HandSteps
 */
export function fromBackendSteps(backendSteps: BackendHandStep[]): ApiHandStep[] {
  return backendSteps.map(fromBackendStep);
}

/**
 * Convert array of API HandSteps to LocalHandSteps
 */
export function toLocalSteps(apiSteps: ApiHandStep[]): LocalHandStep[] {
  return apiSteps.map((step, index) => toLocalStep(step, index));
}

/**
 * Convert array of LocalHandSteps to API HandSteps
 */
export function toApiSteps(localSteps: LocalHandStep[]): ApiHandStep[] {
  return localSteps.map(toApiStep);
}
