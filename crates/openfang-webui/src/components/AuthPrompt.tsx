import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Key, Eye, EyeOff, Shield, AlertCircle, Sparkles, User, Lock, LogOut } from 'lucide-react';
import { api } from '@/api/client';
import { NeonText } from '@/components/motion/NeonText';
import { SpotlightCard } from '@/components/motion/SpotlightCard';
import { cn } from '@/lib/utils';

type AuthMode = 'apikey' | 'session';
type AuthTab = 'apikey' | 'login';

interface AuthPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onAuth: (key: string) => void;
}

export function AuthPrompt({ isOpen, onClose, onAuth }: AuthPromptProps) {
  // Auth mode detection
  const [serverAuthMode, setServerAuthMode] = useState<AuthMode>('apikey');
  const [activeTab, setActiveTab] = useState<AuthTab>('apikey');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // API Key state
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);

  // Session login state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Session user (when already logged in)
  const [sessionUser, setSessionUser] = useState<string | null>(null);

  // Load saved key and check auth mode on mount
  useEffect(() => {
    const savedKey = localStorage.getItem('openfang-api-key');
    if (savedKey) {
      setApiKey(savedKey);
    }

    // Check server auth mode
    const detectAuthMode = async () => {
      try {
        const authInfo = await api.checkAuth();
        if (authInfo.mode === 'session') {
          setServerAuthMode('session');
          setActiveTab('login');
          if (authInfo.authenticated && authInfo.username) {
            setSessionUser(authInfo.username);
          }
        } else {
          setServerAuthMode('apikey');
          setActiveTab('apikey');
        }
      } catch (e) {
        // Default to apikey mode if check fails
        setServerAuthMode('apikey');
      }
    };

    if (isOpen) {
      detectAuthMode();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle API key submit
  const handleApiKeySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setError('Please enter an API key');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      api.setAuthToken(apiKey.trim());
      await api.listTools();
      localStorage.setItem('openfang-api-key', apiKey.trim());
      onAuth(apiKey.trim());
      onClose();
    } catch (err) {
      setError('Invalid API key or server unreachable');
      api.setAuthToken('');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session login
  const handleSessionLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await api.login({
        username: username.trim(),
        password: password.trim(),
      });

      if (result.status === 'ok') {
        setSessionUser(result.username || username.trim());
        onAuth(''); // Session auth doesn't use API key
        onClose();
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle session logout
  const handleSessionLogout = async () => {
    try {
      await api.logout();
    } catch (e) {
      // Ignore errors
    }
    setSessionUser(null);
    setUsername('');
    setPassword('');
  };

  const handleSkip = () => {
    onClose();
  };

  // Show session user view if already logged in
  if (sessionUser) {
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
                <div className="p-8 text-center">
                  <motion.div
                    className="w-16 h-16 rounded-2xl bg-[var(--neon-green)]/10 border border-[var(--neon-green)]/20 flex items-center justify-center mx-auto mb-4"
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <User className="w-8 h-8 text-[var(--neon-green)]" />
                  </motion.div>
                  <h2 className="text-2xl font-bold mb-2">
                    <NeonText color="green">Welcome Back</NeonText>
                  </h2>
                  <p className="text-lg text-[var(--text-primary)] mb-1">{sessionUser}</p>
                  <p className="text-sm text-[var(--text-muted)] mb-6">
                    You are currently logged in
                  </p>
                  <div className="flex gap-3">
                    <motion.button
                      onClick={handleSessionLogout}
                      className="flex-1 py-3.5 rounded-xl bg-[var(--neon-magenta)]/10 text-[var(--neon-magenta)] border border-[var(--neon-magenta)]/20 font-medium flex items-center justify-center gap-2"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </motion.button>
                    <motion.button
                      onClick={onClose}
                      className="flex-1 py-3.5 rounded-xl bg-[var(--neon-cyan)] text-[var(--void)] font-medium"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Continue
                    </motion.button>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    );
  }

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
                <div className="text-center mb-6">
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
                    Sign in to access protected endpoints
                  </p>
                </div>

                {/* Tab Switcher - only show if server supports both or defaults */}
                {serverAuthMode === 'apikey' && (
                  <div className="flex gap-1 mb-6 bg-[var(--surface-secondary)] rounded-xl p-1">
                    <button
                      onClick={() => setActiveTab('apikey')}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2',
                        activeTab === 'apikey'
                          ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      )}
                    >
                      <Key className="w-4 h-4" />
                      API Key
                    </button>
                    <button
                      onClick={() => setActiveTab('login')}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2',
                        activeTab === 'login'
                          ? 'bg-[var(--neon-cyan)]/20 text-[var(--neon-cyan)]'
                          : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                      )}
                    >
                      <User className="w-4 h-4" />
                      Login
                    </button>
                  </div>
                )}

                {/* Error */}
                <AnimatePresence>
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center gap-2 p-3 rounded-lg bg-[var(--neon-magenta)]/10 border border-[var(--neon-magenta)]/20 text-[var(--neon-magenta)] text-sm mb-4"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      {error}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* API Key Form */}
                {activeTab === 'apikey' && (
                  <form onSubmit={handleApiKeySubmit} className="space-y-6">
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

                    <div className="text-xs text-[var(--text-muted)] text-center">
                      Or set{' '}
                      <span className="font-mono text-[var(--neon-amber)]">OPENFANG_API_KEY</span>
                      {' '}in your environment
                    </div>

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
                )}

                {/* Session Login Form */}
                {activeTab === 'login' && (
                  <form onSubmit={handleSessionLogin} className="space-y-4">
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        placeholder="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className={cn(
                          'w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-xl',
                          'pl-12 pr-4 py-4 text-[var(--text-primary)] placeholder-[var(--text-muted)]',
                          'focus:outline-none focus:border-[var(--neon-cyan)]/50 focus:ring-1 focus:ring-[var(--neon-cyan)]/30',
                          'transition-all'
                        )}
                        autoFocus
                      />
                    </div>

                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className={cn(
                          'w-full bg-[var(--surface-secondary)] border border-[var(--border-default)] rounded-xl',
                          'pl-12 pr-12 py-4 text-[var(--text-primary)] placeholder-[var(--text-muted)]',
                          'focus:outline-none focus:border-[var(--neon-cyan)]/50 focus:ring-1 focus:ring-[var(--neon-cyan)]/30',
                          'transition-all'
                        )}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>

                    <div className="flex gap-3 pt-2">
                      <motion.button
                        type="button"
                        onClick={handleSkip}
                        className="flex-1 py-3.5 rounded-xl bg-[var(--surface-secondary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--surface-tertiary)] hover:text-[var(--text-primary)] transition-all font-medium"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        Skip
                      </motion.button>
                      <motion.button
                        type="submit"
                        disabled={isLoading || !username.trim() || !password.trim()}
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
                            Logging in...
                          </>
                        ) : (
                          <>
                            <User className="w-4 h-4" />
                            Login
                          </>
                        )}
                      </motion.button>
                    </div>
                  </form>
                )}
              </div>
            </SpotlightCard>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
