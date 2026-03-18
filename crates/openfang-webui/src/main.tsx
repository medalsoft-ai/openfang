import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router'
import App from './App'
import './index.css'
import './i18n'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
      staleTime: 5000
    }
  }
})

// Prevent Delete key from triggering back navigation in macOS WebView
function PreventDeleteNavigation() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Block Delete key (keyCode 8 or key 'Delete') when not in input/textarea
      if (e.key === 'Delete' || e.keyCode === 8) {
        const target = e.target as HTMLElement
        const isInput = target.tagName === 'INPUT' ||
                       target.tagName === 'TEXTAREA' ||
                       target.isContentEditable

        if (!isInput) {
          e.preventDefault()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [])

  return null
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <PreventDeleteNavigation />
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>
)
