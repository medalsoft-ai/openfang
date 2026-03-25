import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Check, X, Eye, AlertCircle, Loader2, GitBranch, Trash2, Edit3, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { HandStep } from '@/api/types';
import type { StepOperation, ParsedResponse } from '@/utils/chatOperations';
import { parseOperations, applyOperations, describeOperations, validateOperations } from '@/utils/chatOperations';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

// ============================================================================
// TYPES
// ============================================================================

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  operations?: StepOperation[];
  mode?: 'incremental' | 'rewrite';
  applied?: boolean;
  error?: string;
}

interface ChatEditorProps {
  handId: string;
  handName: string;
  draftSteps: HandStep[];
  onStepsChange: (steps: HandStep[]) => void;
  onSwitchToFlow: () => void;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function ChatEditor({ handId: _handId, handName, draftSteps, onStepsChange, onSwitchToFlow }: ChatEditorProps) {
  const { t } = useTranslation();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingMessageId, setPendingMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: generateId(),
          role: 'assistant',
          content: t('chatEditor.welcome', { handName }) ||
            `Hello! I can help you edit the "${handName}" SOP.\n\nDescribe the changes you'd like to make:\n• "Add a validation step after initialization"\n• "Change the tool from 'search' to 'fetch' in step 2"\n• "Remove the cleanup step"\n\nOr ask me to redesign the entire flow: "Rewrite this as a 3-step process"`,
        },
      ]);
    }
  }, [handName, messages.length, t]);

  // ============================================================================
  // MESSAGE HANDLING
  // ============================================================================

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Simulate Agent response (in real implementation, this would call the API)
    setTimeout(() => {
      const response = simulateAgentResponse(userMessage.content, draftSteps);
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.message,
        operations: response.operations,
        mode: response.mode,
        applied: false,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  const handleApplyChanges = (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message?.operations?.length) return;

    // Validate operations
    const validationErrors = validateOperations(draftSteps, message.operations);
    if (validationErrors.length > 0) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? { ...m, error: validationErrors.join('\n') }
            : m
        )
      );
      return;
    }

    // Apply operations
    const newSteps = applyOperations(draftSteps, message.operations);
    onStepsChange(newSteps);

    // Mark as applied
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, applied: true, error: undefined } : m
      )
    );
  };

  const handleCancelChanges = (messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? { ...m, operations: undefined, mode: undefined, error: undefined }
          : m
      )
    );
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="flex flex-col h-full bg-[var(--card)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-[var(--primary)]" />
          <span className="font-medium">{t('chatEditor.title') || 'Chat Edit'}</span>
        </div>
        <div className="text-xs text-[var(--muted-foreground)]">
          {draftSteps.length} {t('chatEditor.steps') || 'steps'}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              onApply={() => handleApplyChanges(message.id)}
              onCancel={() => handleCancelChanges(message.id)}
              onViewInFlow={onSwitchToFlow}
            />
          ))}

          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 text-[var(--muted-foreground)]"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t('chatEditor.thinking') || 'Thinking...'}</span>
            </motion.div>
          )}
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t border-[var(--border)]">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={t('chatEditor.placeholder') || 'Describe the changes you want to make...'}
            disabled={isLoading}
            className="flex-1 px-4 py-2 bg-[var(--background)] border border-[var(--border)] rounded-lg
                       focus:outline-none focus:ring-2 focus:ring-[var(--primary)]
                       disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
          {t('chatEditor.hint') || 'Try: "Add a step after init", "Change tool to fetch", "Delete step 3"'}
        </p>
      </div>
    </div>
  );
}

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

function MessageBubble({
  message,
  onApply,
  onCancel,
  onViewInFlow,
}: {
  message: ChatMessage;
  onApply: () => void;
  onCancel: () => void;
  onViewInFlow: () => void;
}) {
  const isUser = message.role === 'user';
  const hasOperations = message.operations && message.operations.length > 0 && !message.applied;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3',
        isUser ? 'flex-row-reverse' : 'flex-row'
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
          isUser
            ? 'bg-violet-500 text-white'
            : 'bg-violet-100 text-violet-600'
        )}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Content */}
      <div
        className={cn(
          'max-w-[80%] space-y-2',
          isUser ? 'items-end' : 'items-start'
        )}
      >
        {/* Message Text */}
        <div
          className={cn(
            'px-4 py-2 rounded-2xl text-sm whitespace-pre-wrap',
            isUser
              ? 'bg-violet-500 text-white rounded-tr-sm'
              : 'bg-violet-50 text-gray-800 rounded-tl-sm'
          )}
        >
          {message.content}
        </div>

        {/* Operations Preview Card */}
        {hasOperations && (
          <OperationPreviewCard
            operations={message.operations!}
            mode={message.mode || 'incremental'}
            onApply={onApply}
            onCancel={onCancel}
            onViewInFlow={onViewInFlow}
            error={message.error}
          />
        )}

        {/* Applied Indicator */}
        {message.applied && (
          <div className="flex items-center gap-1 text-xs text-green-500">
            <Check className="w-3 h-3" />
            <span>Changes applied</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ============================================================================
// OPERATION PREVIEW CARD
// ============================================================================

function OperationPreviewCard({
  operations,
  mode,
  onApply,
  onCancel,
  onViewInFlow,
  error,
}: {
  operations: StepOperation[];
  mode: 'incremental' | 'rewrite';
  onApply: () => void;
  onCancel: () => void;
  onViewInFlow: () => void;
  error?: string;
}) {
  const { t } = useTranslation();
  const descriptions = describeOperations(operations);
  const isRewrite = mode === 'rewrite';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'p-4 rounded-xl border-2 space-y-3',
        isRewrite
          ? 'bg-amber-500/10 border-amber-500/30'
          : 'bg-violet-50 border-violet-200'
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <Bot className={cn('w-4 h-4', isRewrite ? 'text-amber-500' : 'text-violet-500')} />
        <span className={cn('text-sm font-medium', isRewrite ? 'text-amber-600' : 'text-violet-600')}>
          {isRewrite
            ? (t('chatEditor.rewriteMode') || 'Complete Rewrite Suggested')
            : (t('chatEditor.changesSuggested') || 'Changes Suggested')}
        </span>
      </div>

      {/* Operation List */}
      <div className="space-y-1.5">
        {descriptions.map((desc, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            {getOperationIcon(operations[i])}
            <span className="text-[var(--foreground)]">{desc}</span>
          </div>
        ))}
      </div>

      {/* Warning for rewrite */}
      {isRewrite && (
        <div className="flex items-start gap-2 p-2 bg-amber-500/10 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-xs text-amber-600">
            {t('chatEditor.rewriteWarning') ||
              'This will replace all existing steps. Make sure you have a backup or are certain about these changes.'}
          </p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-2 bg-red-500/10 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
          <p className="text-xs text-red-600 whitespace-pre-wrap">{error}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onViewInFlow}
          className="gap-1"
        >
          <Eye className="w-3.5 h-3.5" />
          {t('chatEditor.viewInFlow') || 'View'}
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onCancel}
          className="gap-1"
        >
          <X className="w-3.5 h-3.5" />
          {t('common.cancel') || 'Cancel'}
        </Button>
        <Button
          size="sm"
          onClick={onApply}
          className={cn(
            'gap-1',
            isRewrite && 'bg-amber-500 hover:bg-amber-600'
          )}
        >
          <Check className="w-3.5 h-3.5" />
          {isRewrite
            ? (t('chatEditor.applyRewrite') || 'Apply Rewrite')
            : (t('chatEditor.applyChanges') || 'Apply')}
        </Button>
      </div>
    </motion.div>
  );
}

// ============================================================================
// HELPERS
// ============================================================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getOperationIcon(op: StepOperation) {
  switch (op.type) {
    case 'add':
      return <Plus className="w-3.5 h-3.5 text-green-500" />;
    case 'update':
      return <Edit3 className="w-3.5 h-3.5 text-blue-500" />;
    case 'delete':
      return <Trash2 className="w-3.5 h-3.5 text-red-500" />;
    case 'move':
      return <GitBranch className="w-3.5 h-3.5 text-purple-500" />;
    default:
      return null;
  }
}

// ============================================================================
// MOCK AGENT RESPONSE (for development/demo)
// ============================================================================

function simulateAgentResponse(userInput: string, currentSteps: HandStep[]): ParsedResponse {
  const lower = userInput.toLowerCase();

  // Check for rewrite keywords
  if (lower.includes('rewrite') || lower.includes('redesign') || lower.includes('start over')) {
    return {
      message: `I'll redesign the entire flow with a simpler structure.`,
      mode: 'rewrite',
      operations: [
        { type: 'delete', stepId: 'all' },
        {
          type: 'add',
          step: {
            id: 'initialize',
            name: 'Initialize',
            type: 'execute-tool',
            config: { toolName: 'init', input: {} },
            nextSteps: ['process'],
          },
        },
        {
          type: 'add',
          step: {
            id: 'process',
            name: 'Process Data',
            type: 'execute-tool',
            config: { toolName: 'process', input: {} },
            nextSteps: ['complete'],
          },
          afterStepId: 'initialize',
        },
        {
          type: 'add',
          step: {
            id: 'complete',
            name: 'Complete',
            type: 'send-message',
            config: { content: 'Processing complete!' },
            nextSteps: [],
          },
          afterStepId: 'process',
        },
      ],
    };
  }

  // Check for add operation
  if (lower.includes('add') || lower.includes('insert')) {
    const afterMatch = userInput.match(/after\s+["']?(\w+)["']?/i);
    const afterStepId = afterMatch ? afterMatch[1] : undefined;

    return {
      message: `I'll add a new validation step${afterStepId ? ` after "${afterStepId}"` : ''}.`,
      mode: 'incremental',
      operations: [
        {
          type: 'add',
          step: {
            id: 'validate-input',
            name: 'Validate Input',
            type: 'condition',
            config: { expression: 'input.valid', trueBranch: '', falseBranch: '' },
            nextSteps: [],
          },
          afterStepId,
        },
      ],
    };
  }

  // Check for delete operation
  if (lower.includes('delete') || lower.includes('remove')) {
    const stepMatch = userInput.match(/(?:delete|remove)\s+(?:step\s+)?["']?(\w+)["']?/i);
    const stepId = stepMatch ? stepMatch[1] : currentSteps[0]?.id || 'step-1';

    return {
      message: `I'll remove the "${stepId}" step from the flow.`,
      mode: 'incremental',
      operations: [{ type: 'delete', stepId }],
    };
  }

  // Check for update operation
  if (lower.includes('change') || lower.includes('update') || lower.includes('rename')) {
    const toolMatch = userInput.match(/tool\s+(?:to\s+)?["']?(\w+)["']?/i);
    if (toolMatch) {
      const toolName = toolMatch[1];
      const stepId = currentSteps[0]?.id || 'step-1';

      return {
        message: `I'll update the tool in "${stepId}" to use "${toolName}".`,
        mode: 'incremental',
        operations: [
          {
            type: 'update',
            stepId,
            updates: { config: { toolName } },
          },
        ],
      };
    }
  }

  // Default response
  return {
    message: `I understand you want to modify the SOP. Could you be more specific? For example:\n• "Add a step after initialization"\n• "Change the tool to 'fetch'"\n• "Delete step-3"\n• "Rewrite as a 3-step process"`,
    mode: 'incremental',
    operations: [],
  };
}
