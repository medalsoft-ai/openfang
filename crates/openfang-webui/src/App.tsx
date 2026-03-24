import { useEffect } from 'react'
import { Routes, Route } from 'react-router'
import { useTheme } from '@/hooks'
import { Layout } from '@/components/layout/Layout'
import { Overview } from '@/pages/Overview'
import { Agents } from '@/pages/Agents'
import { Sessions } from '@/pages/Sessions'
import Chat from '@/pages/Chat'
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
import { useAuthStore, setupAuthErrorHandler } from '@/store/authStore'

function App() {
  const { authReady, showAuthPrompt, setShowAuthPrompt, handleAuth, initAuth } = useAuthStore()

  // Initialize theme on mount
  useTheme()

  // Initialize auth on mount
  useEffect(() => {
    setupAuthErrorHandler()
    initAuth()
  }, [initAuth])

  return (
    <>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Overview />} />
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
        onClose={() => setShowAuthPrompt(false)}
        onAuth={handleAuth}
      />
    </>
  )
}

export default App
