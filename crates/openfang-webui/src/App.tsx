import { useState, useEffect, useCallback } from 'react'
import { Routes, Route, Navigate } from 'react-router'
import { useTheme } from '@/hooks'
import { Layout } from '@/components/layout/Layout'
import { Overview } from '@/pages/Overview'
import { Agents } from '@/pages/Agents'
import { Sessions } from '@/pages/Sessions'
import { Chat } from '@/pages/Chat'
import { Workflows } from '@/pages/Workflows'
import { WorkflowBuilder } from '@/pages/WorkflowBuilder'
import { Scheduler } from '@/pages/Scheduler'
import { Approvals } from '@/pages/Approvals'
import { Channels } from '@/pages/Channels'
import { Skills } from '@/pages/Skills'
import { Hands } from '@/pages/Hands'
import { Logs } from '@/pages/Logs'
import { Usage } from '@/pages/Usage'
import { Runtime } from '@/pages/Runtime'
import { Comms } from '@/pages/Comms'
import { Wizard } from '@/pages/Wizard'
import { Analytics } from '@/pages/Analytics'
import { Settings } from '@/pages/Settings'
import { AuthPrompt } from '@/components/AuthPrompt'
import { api, setAuthErrorCallback } from '@/api/client'

function App() {
  const [showAuthPrompt, setShowAuthPrompt] = useState(false)
  const [authMode, setAuthMode] = useState<'apikey' | 'session'>('apikey')

  // Initialize theme on mount
  useTheme()

  // Load saved API key and check auth on mount
  useEffect(() => {
    const handleAuthError = () => {
      setShowAuthPrompt(true)
    }

    // Set up auth error callback
    setAuthErrorCallback(handleAuthError)

    // Check auth mode and status
    const initAuth = async () => {
      try {
        // First check server auth mode
        const authInfo = await api.checkAuth()

        if (authInfo.mode === 'session') {
          setAuthMode('session')
          // Session mode - check if already authenticated
          if (!authInfo.authenticated) {
            setShowAuthPrompt(true)
          }
          return
        }

        // API key mode
        setAuthMode('apikey')
        const savedKey = localStorage.getItem('openfang-api-key')
        if (savedKey) {
          api.setAuthToken(savedKey)
        }

        // Check if we need auth (use non-public endpoint)
        try {
          await api.listTools()
        } catch (err: unknown) {
          const error = err as { response?: { status: number }; message?: string }
          if (error.response?.status === 401 ||
              error.message?.includes('Not authorized') ||
              error.message?.includes('Missing Authorization') ||
              error.message?.includes('Unauthorized')) {
            setShowAuthPrompt(true)
          }
        }
      } catch (e) {
        // Fall back to API key mode if check fails
        const savedKey = localStorage.getItem('openfang-api-key')
        if (savedKey) {
          api.setAuthToken(savedKey)
        }
      }
    }
    initAuth()

    return () => setAuthErrorCallback(null)
  }, [])

  const handleAuth = useCallback((key: string) => {
    if (authMode === 'apikey' && key) {
      api.setAuthToken(key)
    }
    setShowAuthPrompt(false)
  }, [authMode])

  const handleClose = useCallback(() => {
    setShowAuthPrompt(false)
  }, [])

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          <Route path="agents" element={<Agents />} />
          <Route path="sessions" element={<Sessions />} />
          <Route path="chat" element={<Chat />} />
          <Route path="workflows" element={<Workflows />} />
          <Route path="workflows/builder" element={<WorkflowBuilder />} />
          <Route path="scheduler" element={<Scheduler />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="channels" element={<Channels />} />
          <Route path="skills" element={<Skills />} />
          <Route path="hands" element={<Hands />} />
          <Route path="logs" element={<Logs />} />
          <Route path="usage" element={<Usage />} />
          <Route path="runtime" element={<Runtime />} />
          <Route path="comms" element={<Comms />} />
          <Route path="wizard" element={<Wizard />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>

      <AuthPrompt
        isOpen={showAuthPrompt}
        onClose={handleClose}
        onAuth={handleAuth}
      />
    </>
  )
}

export default App
