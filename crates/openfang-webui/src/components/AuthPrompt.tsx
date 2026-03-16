import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Eye, EyeOff, Shield, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cn } from '@/lib/utils';

interface AuthPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (key: string) => void;
}

export function AuthPrompt({ isOpen, onClose, onAuth }: AuthPromptProps) {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load saved key on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openfang-api-key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Test the key with an authenticated endpoint
      api.setAuthToken(apiKey.trim());
      await api.listTools();

      // Save to localStorage
      localStorage.setItem('openfang-api-key', apiKey.trim());

      onAuth(apiKey.trim());
      onClose();
    } catch (err) {
      setError('Invalid API key or server unreachable');
      api.setAuthToken(''); // Clear invalid token
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--void)]/80 backdrop-blur-md"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <SpotlightCard
              glowColor="rgba(0, 240, 255, 0.15)"
              className="w-full max-w-md mx-4"
            >
              <div className="p-8">
                {/* Header */}
                <div className="text-center mb-8">
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-[var(--neon-cyan)]/10 border border-[var(--neon-cyan)]/20 flex items-center justify-center mx-auto mb-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Shield className="w-8 h-8 text-[var(--neon-cyan)]" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">
                    <NeonText color="cyan">Authentication Required</NeonText>
                  </h2>
                  <p className="text-sm text-[var(--text-muted)]">
                    Enter your EnterpriseClaw API key to access protected endpoints
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Input */}
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                      <Key className="w-5 h-5" />
                    </div>
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder="Enter API key..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className={cn(
                        'w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-xl',
                        'pl-12 pr-12 py-4 text-[var(--text-primary)] placeholder-[var(--text-muted)]',
                        'focus:outline-none focus:border-[var(--neon-cyan)]/50 focus:ring-1 focus:ring-[var(--neon-cyan)]/30',
                        'transition-all font-mono text-sm'
                      )}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                    >
                      {showKey ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>

                  {/* Error */}
                  <AnimatePresence>
                    {error && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex items-center gap-2 p-3 rounded-lg bg-[var(--neon-magenta)]/10 border border-[var(--neon-magenta)]/20 text-[var(--neon-magenta)] text-sm"
                      >
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {error}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hint */}
                  <div className="text-xs text-[var(--text-muted)] text-center">
                    Or set{' '}
                    <span className="font-mono text-[var(--neon-amber)]">OPENFANG_API_KEY</span>
                    {' '}in your environment
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-3">
                    <motion.button
                      type="button"
                      onClick={handleSkip}
                      className="flex-1 py-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)] transition-all font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Skip (Read-only)
                    </motion.button>
                    <motion.button
                      type="submit"
                      disabled={isLoading || !apiKey.trim()}
                      className={cn(
                        'flex-1 py-3.5 rounded-xl font-medium transition-all',
                        'bg-[var(--neon-cyan)] text-[var(--void)] hover:bg-[var(--neon-cyan)]/90',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        'flex items-center justify-center gap-2'
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {isLoading ? (
                        <>
                          <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                          Verifying...
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          Authenticate
                        </>
                      )}
                    </motion.button>
                  </div>
                </form>
              </div>
            </SpotlightCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
