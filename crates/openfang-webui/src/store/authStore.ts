import { create } from 'zustand'
import { api, setAuthErrorCallback, setAuthCheckPromise, resolveAuthCheck, setBypassAuthWait } from '@/api/client'

interface AuthState {
  authReady: boolean
  authMode: 'apikey' | 'session'
  showAuthPrompt: boolean
  setAuthReady: (ready: boolean) => void
  setAuthMode: (mode: 'apikey' | 'session') => void
  setShowAuthPrompt: (show: boolean) => void
  handleAuth: (key: string) => void
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  authReady: false,
  authMode: 'apikey',
  showAuthPrompt: false,

  setAuthReady: (ready) => set({ authReady: ready }),
  setAuthMode: (mode) => set({ authMode: mode }),
  setShowAuthPrompt: (show) => set({ showAuthPrompt: show }),

  handleAuth: (key: string) => {
    const { authMode } = get()
    if (authMode === 'apikey' && key) {
      api.setAuthToken(key)
    }
    set({ showAuthPrompt: false })
  },

  initAuth: async () => {
    // Create a promise that blocks all other API calls until auth check completes
    let resolveFn: () => void = () => {}
    const blockPromise = new Promise<void>((resolve) => {
      resolveFn = resolve
    })
    // Set up the blocking promise (but bypass it for initAuth's own requests)
    setAuthCheckPromise(blockPromise)
    setBypassAuthWait(true)

    try {
      const authInfo = await api.checkAuth()

      if (authInfo.mode === 'session') {
        set({ authMode: 'session' })
        if (!authInfo.authenticated) {
          set({ showAuthPrompt: true })
        }
      } else {
        set({ authMode: 'apikey' })
        const savedKey = localStorage.getItem('openfang-api-key')
        if (savedKey) {
          api.setAuthToken(savedKey)
        }

        // Check if auth is required
        try {
          await api.listTools()
        } catch (err: unknown) {
          const error = err as { response?: { status: number }; message?: string }
          if (error.response?.status === 401 ||
              error.message?.includes('Not authorized') ||
              error.message?.includes('Missing Authorization') ||
              error.message?.includes('Unauthorized')) {
            set({ showAuthPrompt: true })
          }
        }
      }
    } catch (e) {
      const savedKey = localStorage.getItem('openfang-api-key')
      if (savedKey) {
        api.setAuthToken(savedKey)
      }
    } finally {
      set({ authReady: true })
      // Disable bypass and release all blocked API calls
      setBypassAuthWait(false)
      resolveFn()
      resolveAuthCheck()
    }
  }
}))

// Setup auth error callback outside of store to avoid circular deps
export function setupAuthErrorHandler() {
  setAuthErrorCallback(() => {
    useAuthStore.getState().setShowAuthPrompt(true)
  })
}
