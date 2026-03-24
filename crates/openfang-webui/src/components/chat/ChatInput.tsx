// ChatInput - Claymorphism Design System
import { useState, useRef, useCallback, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, Paperclip, Sparkles, Cpu, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface Model {
  id: string;
  name: string;
  provider?: string;
}

interface ChatInputProps {
  agentName: string;
  isStreaming: boolean;
  onSend: (message: string) => void;
  onStop?: () => void;
  // Model switcher props
  models?: Model[];
  selectedModel?: string;
  onModelChange?: (modelId: string) => void;
  isChangingModel?: boolean;
}

// keyCode 229 is VK_PROCESS_KEY - set by IME during composition
const isImeProcessing = (e: React.KeyboardEvent | KeyboardEvent): boolean => {
  return e.keyCode === 229 || e.charCode === 229;
};

export const ChatInput = memo(function ChatInput({
  agentName,
  isStreaming,
  onSend,
  onStop,
  models = [],
  selectedModel,
  onModelChange,
  isChangingModel = false
}: ChatInputProps) {
  const { t } = useTranslation();
  const [input, setInput] = useState('');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isComposingRef = useRef(false);

  // Get current model display name
  const currentModel = models.find(m => m.id === selectedModel);
  const currentModelName = currentModel?.name || currentModel?.id || selectedModel || t('chat.selectModel');

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

    if (isImeProcessing(e.nativeEvent)) {
      return;
    }

    if (isComposingRef.current) {
      return;
    }

    if ((e.nativeEvent as KeyboardEvent).isComposing) {
      return;
    }

    e.preventDefault();
    handleSend();
  }, [handleSend]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
  }, []);

  const handleCompositionStart = useCallback(() => {
    isComposingRef.current = true;
  }, []);

  const handleCompositionEnd = useCallback((e: React.CompositionEvent<HTMLTextAreaElement>) => {
    setTimeout(() => {
      isComposingRef.current = false;
    }, 0);

    setInput(e.currentTarget.value);
    e.currentTarget.style.height = 'auto';
    e.currentTarget.style.height = `${Math.min(e.currentTarget.scrollHeight, 160)}px`;
  }, []);

  const handleModelSelect = useCallback((modelId: string) => {
    if (modelId !== selectedModel && onModelChange) {
      onModelChange(modelId);
    }
    setIsModelDropdownOpen(false);
  }, [selectedModel, onModelChange]);

  const toggleModelDropdown = useCallback(() => {
    setIsModelDropdownOpen(prev => !prev);
  }, []);

  return (
    <div className="p-4">
      <div className="max-w-4xl mx-auto">
        {/* Input Container - Claymorphism Style */}
        <div className="relative group">
          <div
            className={cn(
              'relative flex flex-col rounded-2xl',
              'bg-white/90 backdrop-blur-sm',
              'border-2 border-purple-100',
              'shadow-[0_4px_16px_rgba(139,92,246,0.1)]',
              'focus-within:border-violet-300 focus-within:shadow-[0_4px_20px_rgba(139,92,246,0.2)]',
              'transition-all duration-200'
            )}
          >
            {/* Textarea */}
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
                  'w-full min-h-[56px] max-h-[200px] bg-transparent resize-none',
                  'text-gray-700 placeholder-gray-400',
                  'focus:outline-none focus:ring-0 focus:border-transparent',
                  'border-none outline-none',
                  'py-4 px-4 pr-14 leading-relaxed text-[15px]'
                )}
                style={{
                  overflow: 'auto',
                  scrollbarWidth: 'thin',
                }}
              />
            </div>

            {/* Bottom Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-t border-purple-50">
              {/* Left: Attach + Model Switcher */}
              <div className="flex items-center gap-1">
                <motion.button
                  type="button"
                  disabled={isStreaming}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    'p-2 rounded-xl text-gray-400',
                    'hover:text-violet-500 hover:bg-violet-50',
                    'disabled:opacity-40',
                    'transition-colors duration-200'
                  )}
                  title="Attach file"
                >
                  <Paperclip className="w-[18px] h-[18px]" />
                </motion.button>

                {/* Model Switcher */}
                {models.length > 0 && (
                  <div className="relative">
                    <motion.button
                      type="button"
                      disabled={isStreaming || isChangingModel}
                      onClick={toggleModelDropdown}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        'flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs',
                        'text-gray-500 hover:text-violet-600',
                        'hover:bg-violet-50/80',
                        'border border-transparent hover:border-violet-200',
                        'disabled:opacity-40 disabled:cursor-not-allowed',
                        'transition-all duration-200',
                        isModelDropdownOpen && 'bg-violet-50 border-violet-200 text-violet-600'
                      )}
                      title={t('chat.switchModel')}
                    >
                      {isChangingModel ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Cpu className="w-3.5 h-3.5" />
                      )}
                      <span className="max-w-[120px] sm:max-w-[160px] truncate">
                        {currentModelName}
                      </span>
                      <ChevronUp className={cn(
                        'w-3 h-3 transition-transform duration-200',
                        isModelDropdownOpen && 'rotate-180'
                      )} />
                    </motion.button>

                    {/* Model Dropdown */}
                    <AnimatePresence>
                      {isModelDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          transition={{ duration: 0.15 }}
                          className={cn(
                            'absolute left-0 bottom-full mb-2 z-50',
                            'min-w-[200px] max-w-[280px] max-h-[240px]',
                            'rounded-xl overflow-hidden',
                            'bg-white/95 backdrop-blur-sm',
                            'border border-purple-100',
                            'shadow-[0_8px_24px_rgba(139,92,246,0.15)]'
                          )}
                        >
                          <div className="py-1.5 overflow-y-auto max-h-[240px]">
                            {models.map((model) => (
                              <button
                                key={model.id}
                                type="button"
                                onClick={() => handleModelSelect(model.id)}
                                className={cn(
                                  'w-full flex items-center gap-2 px-3 py-2 text-left',
                                  'text-sm transition-colors duration-150',
                                  selectedModel === model.id
                                    ? 'bg-violet-50 text-violet-700'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                                )}
                              >
                                <Cpu className={cn(
                                  'w-3.5 h-3.5 flex-shrink-0',
                                  selectedModel === model.id ? 'text-violet-500' : 'text-gray-400'
                                )} />
                                <span className="flex-1 truncate">{model.name || model.id}</span>
                                {selectedModel === model.id && (
                                  <motion.div
                                    layoutId="selectedModelIndicator"
                                    className="w-1.5 h-1.5 rounded-full bg-violet-500"
                                  />
                                )}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>

              {/* Right: Send Button */}
              <div className="flex items-center gap-2">
                {/* Keyboard hint */}
                <span className="hidden sm:flex items-center gap-1 text-[11px] text-gray-400">
                  <kbd className="px-1.5 py-0.5 rounded-lg bg-gray-100 font-sans text-[10px]">↵</kbd>
                  <span>{t('chat.send')}</span>
                </span>

                {/* Send Button - Claymorphism */}
                <motion.button
                  onClick={handleSend}
                  disabled={!input.trim() || isStreaming}
                  whileHover={input.trim() && !isStreaming ? { scale: 1.05 } : {}}
                  whileTap={input.trim() && !isStreaming ? { scale: 0.95 } : {}}
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl',
                    'transition-all duration-200',
                    input.trim() && !isStreaming
                      ? 'bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-[0_4px_12px_rgba(139,92,246,0.35)]'
                      : 'bg-gray-100 text-gray-400'
                  )}
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
              className={cn(
                'flex items-center gap-2 text-xs text-gray-500',
                'hover:text-red-500 transition-colors',
                'px-4 py-2 rounded-full',
                'hover:bg-red-50'
              )}
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              {t('common.cancel')}
            </motion.button>
          ) : (
            <span className="text-[11px] text-gray-400 flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              {t('chat.disclaimer')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
});
