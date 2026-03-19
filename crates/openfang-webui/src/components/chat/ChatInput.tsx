// ChatInput - Isolated input component to prevent message list re-renders
import { useState, useRef, useCallback, memo } from 'react';
import { motion } from 'framer-motion';
import { Send, Loader2, Paperclip } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  agentName: string;
  isStreaming: boolean;
  onSend: (message: string) => void;
  onStop?: () => void;
}

// keyCode 229 is VK_PROCESS_KEY - set by IME during composition
// No physical key produces this value, making it a reliable IME signal
const isImeProcessing = (e: React.KeyboardEvent | KeyboardEvent): boolean => {
  return e.keyCode === 229 || e.charCode === 229;
};

export const ChatInput = memo(function ChatInput({
  agentName,
  isStreaming,
  onSend,
  onStop
}: ChatInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  const handleSend = useCallback(() => {
    const content = input.trim();
    if (!content || isStreaming) return;

    setInput('');
    onSend(content);

    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
  }, [input, isStreaming, onSend]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' || e.shiftKey) return;

    // KEY SIGNAL 1: keyCode 229 (VK_PROCESS_KEY) - most reliable, set during keydown itself
    // This catches the Enter key that confirms IME composition before compositionend fires
    if (isImeProcessing(e.nativeEvent)) {
      return;
    }

    // KEY SIGNAL 2: isComposing flag from compositionstart/end
    if (isComposingRef.current) {
      return;
    }

    // KEY SIGNAL 3: Native isComposing property (fallback)
    if ((e.nativeEvent as KeyboardEvent).isComposing) {
      return;
    }

    // Normal Enter key - send message
    e.preventDefault();
    handleSend();
  }, [handleSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    // Auto-resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }, []);

  // Handle composition start
  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  // Handle composition end - use setTimeout for Firefox compatibility
  // In Firefox, compositionend fires ~20ms before keydown, so we need to
  // delay the flag reset to allow the keydown to see the composition state
  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    // Delay flag reset to next event loop iteration (Firefox fix)
    setTimeout(() => {
      isComposingRef.current = false;
    }, 0);

    // Sync input value and auto-resize
    setInput(e.currentTarget.value);
    e.currentTarget.style.height = 'auto';
    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`;
  }, []);

  return (
    <div className="p-4 border-t border-[var(--soft-divider)] bg-[var(--soft-bg)]">
      <div className="max-w-3xl mx-auto">
        {/* Input Container - Clean floating design */}
        <div className="relative group">
          <div
            className={cn(
              "relative flex flex-col rounded-2xl border bg-[var(--soft-main)] shadow-sm transition-shadow duration-200",
              "focus-within:shadow-md",
              input.trim()
                ? "border-[var(--soft-blue)]/50"
                : "border-[var(--soft-divider)]"
            )}
          >
            {/* Textarea Container */}
            <div className="relative flex-1 min-h-[56px] max-h-[200px]">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onCompositionStart={handleCompositionStart}
                onCompositionEnd={handleCompositionEnd}
                placeholder={t('chat.placeholder').replace('{agentName}', agentName)}
                disabled={isStreaming}
                rows={1}
                className={cn(
                  "w-full min-h-[56px] max-h-[200px] bg-transparent resize-none",
                  "text-[var(--soft-text-primary)] placeholder-[var(--soft-text-muted)]",
                  "focus:outline-none focus:ring-0 focus:border-transparent",
                  "border-none outline-none",
                  "py-4 px-4 pr-14 leading-relaxed text-[15px]"
                )}
                style={{
                  overflow: 'auto',
                  scrollbarWidth: 'thin',
                }}
              />
            </div>

            {/* Bottom Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-[var(--soft-divider)]/50">
              {/* Left: Action buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={isStreaming}
                  className="p-2 rounded-lg text-[var(--soft-text-muted)] hover:text-[var(--soft-text-secondary)] hover:bg-[var(--soft-surface)] transition-colors disabled:opacity-40"
                  title="Attach file"
                >
                  <Paperclip className="w-[18px] h-[18px]" />
                </button>
              </div>

              {/* Right: Send button */}
              <div className="flex items-center gap-2">
                {/* Keyboard hint - subtle */}
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-[var(--soft-text-tertiary)]">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--soft-surface)] font-sans text-[10px]">↵</kbd>
                  <span>{t('chat.send')}</span>
                </span>

                {/* Send Button */}
                <motion.button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  className={cn(
                    'flex items-center justify-center w-9 h-9 rounded-xl transition-all duration-200',
                    input.trim() && !isStreaming
                      ? 'bg-[var(--soft-blue)] text-white hover:bg-[var(--soft-blue-dark)] shadow-sm'
                      : 'bg-[var(--soft-surface)] text-[var(--soft-text-muted)]'
                  )}
                  whileTap={input.trim() && !isStreaming ? { scale: 0.92 } : {}}
                >
                  {isStreaming ? (
                    <Loader2 className="w-[18px] h-[18px] animate-spin" />
                  ) : (
                    <Send className="w-[18px] h-[18px]" />
                  )}
                </motion.button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center mt-2">
          {isStreaming ? (
            <motion.button
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={onStop}
              className="flex items-center gap-1.5 text-xs text-[var(--soft-text-muted)] hover:text-red-500 transition-colors px-3 py-1.5 rounded-full hover:bg-red-500/5"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
              {t('common.cancel')}
            </motion.button>
          ) : (
            <span className="text-[11px] text-[var(--soft-text-tertiary)]">
              {t('chat.disclaimer')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
