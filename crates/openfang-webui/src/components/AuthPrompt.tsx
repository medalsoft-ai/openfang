import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Key, Eye, EyeOff } from 'lucide-react';
import { api } from '@/api/client';

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
      // Test the key with a health check
      api.setAuthToken(apiKey.trim());
      await api.health();

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}
    >
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <CardTitle>Authentication Required</CardTitle>
          </div>
          <CardDescription>
            Enter your OpenFang API key to access protected endpoints.
            <br />
            <span className="text-xs text-muted-foreground">
              Or set OPENFANG_API_KEY in your environment and restart.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Input
                type={showKey ? 'text' : 'password'}
                placeholder="Enter API key..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="pr-10"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleSkip}
                className="flex-1"
              >
                Skip (Read-only)
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !apiKey.trim()}
                className="flex-1"
              >
                {isLoading ? 'Verifying...' : 'Authenticate'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
