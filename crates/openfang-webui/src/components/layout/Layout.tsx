import { Link, useLocation, Outlet, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  MessageSquare,
  Settings,
  Plus,
  Sun,
  Moon,
  Cpu,
  Sparkles,
  Zap,
  Brain,
  Shield,
  Code,
  Terminal,
  Wand2,
  Activity,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { pageTransition } from '@/lib/animations'
import { useTheme } from '@/hooks'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/client'
import type { Agent } from '@/api/types'
import { useCallback, useState } from 'react'

// Agent icon mapping based on profile/archetype
function getAgentIcon(agent: Agent) {
  const archetype = agent.identity?.archetype?.toLowerCase() || ''
  const profile = agent.profile?.toLowerCase() || ''
  const name = agent.name?.toLowerCase() || ''

  if (archetype.includes('code') || profile.includes('code') || name.includes('code')) return Code
  if (archetype.includes('security') || profile.includes('security') || name.includes('sec')) return Shield
  if (archetype.includes('brain') || profile.includes('brain') || name.includes('brain')) return Brain
  if (archetype.includes('terminal') || profile.includes('terminal') || name.includes('term')) return Terminal
  if (archetype.includes('wizard') || profile.includes('wizard') || name.includes('wizard')) return Wand2
  if (archetype.includes('spark') || profile.includes('spark')) return Sparkles
  if (archetype.includes('zap') || profile.includes('zap') || name.includes('fast')) return Zap
  if (archetype.includes('activity') || profile.includes('monitor')) return Activity
  if (agent.capabilities?.tools?.length && agent.capabilities.tools.length > 5) return Cpu

  return Bot
}

// Agent gradient colors based on identity
function getAgentGradient(agent: Agent): string {
  const color = agent.identity?.color?.toLowerCase() || ''

  const gradients: Record<string, string> = {
    cyan: 'from-cyan-500 to-blue-600',
    blue: 'from-blue-500 to-indigo-600',
    purple: 'from-purple-500 to-pink-600',
    pink: 'from-pink-500 to-rose-600',
    rose: 'from-rose-500 to-red-600',
    red: 'from-red-500 to-orange-600',
    orange: 'from-orange-500 to-amber-600',
    amber: 'from-amber-500 to-yellow-600',
    yellow: 'from-yellow-500 to-lime-600',
    lime: 'from-lime-500 to-green-600',
    green: 'from-green-500 to-emerald-600',
    emerald: 'from-emerald-500 to-teal-600',
    teal: 'from-teal-500 to-cyan-600',
    indigo: 'from-indigo-500 to-violet-600',
    violet: 'from-violet-500 to-purple-600',
    fuchsia: 'from-fuchsia-500 to-pink-600',
  }

  return gradients[color] || 'from-[var(--neon-cyan)] to-blue-600'
}

// Agent status color
function getStatusColor(status?: string): string {
  switch (status?.toLowerCase()) {
    case 'running':
      return 'bg-[var(--neon-cyan)]'
    case 'idle':
      return 'bg-[var(--neon-green)]'
    case 'paused':
      return 'bg-[var(--neon-amber)]'
    case 'crashed':
      return 'bg-[var(--neon-magenta)]'
    default:
      return 'bg-[var(--text-muted)]'
  }
}

// Agent item component - Soft UI compact style
function AgentItem({
  agent,
  isActive,
  onClick,
}: {
  agent: Agent
  isActive: boolean
  onClick: () => void
}) {
  const Icon = getAgentIcon(agent)
  const gradient = getAgentGradient(agent)
  const statusColor = getStatusColor(agent.status || agent.state)

  return (
    <motion.button
      onClick={onClick}
      initial={false}
      animate={isActive ? { x: 2 } : { x: 0 }}
      whileHover={{ x: 2 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 group relative',
        isActive
          ? 'bg-[var(--soft-surface)] shadow-[var(--soft-shadow-sm)]'
          : 'hover:bg-[var(--soft-surface-hover)]'
      )}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId="agentActiveIndicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-r-full bg-[var(--soft-blue)]"
          initial={false}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      {/* Agent Avatar - smaller, softer */}
      <div
        className={cn(
          'relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          'bg-gradient-to-br',
          gradient
        )}
      >
        <Icon className="w-4 h-4 text-white" />

        {/* Status indicator dot */}
        <div
          className={cn(
            'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--soft-sidebar)]',
            statusColor
          )}
        />
      </div>

      {/* Agent Info */}
      <div className="flex-1 text-left min-w-0">
        <div className={cn(
          'font-medium truncate transition-colors text-sm',
          isActive ? 'text-[var(--soft-text-primary)]' : 'text-[var(--soft-text-secondary)]'
        )}>
          {agent.name}
        </div>
        <div className="text-[11px] text-[var(--soft-text-muted)] truncate">
          {agent.description || agent.profile || 'Agent'}
        </div>
      </div>

      {/* Chat icon on active */}
      <motion.div
        initial={false}
        animate={{ opacity: isActive ? 1 : 0, x: isActive ? 0 : -5 }}
        className="text-[var(--soft-blue)]"
      >
        <MessageSquare className="w-3.5 h-3.5" />
      </motion.div>
    </motion.button>
  )
}

// Theme toggle button component - Soft UI compact
function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--soft-surface)] shadow-[var(--soft-shadow-sm)] text-[var(--soft-text-secondary)] hover:text-[var(--soft-blue)] hover:shadow-[var(--soft-shadow-md)] transition-all duration-200"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={resolvedTheme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait" initial={false}>
        {resolvedTheme === 'dark' ? (
          <motion.div
            key="sun"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 10, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// Settings button component - Soft UI compact
function SettingsButton() {
  return (
    <Link to="/settings">
      <motion.button
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--soft-surface)] shadow-[var(--soft-shadow-sm)] text-[var(--soft-text-secondary)] hover:text-[var(--soft-blue)] hover:shadow-[var(--soft-shadow-md)] transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Settings"
      >
        <Settings className="w-4 h-4" />
      </motion.button>
    </Link>
  )
}

// Create agent button - Soft UI compact style
function CreateAgentButton({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--soft-blue)] text-white text-sm font-medium shadow-[var(--soft-shadow-sm)] hover:shadow-[var(--soft-shadow-md)] hover:brightness-105 transition-all duration-200"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center">
        <Plus className="w-4 h-4 text-white" />
      </div>
      <span>New Agent</span>
    </motion.button>
  )
}

export function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  // Fetch agents list
  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: api.listAgents,
    refetchInterval: 5000, // Refresh every 5 seconds
  })


  // Handle agent click - navigate to chat-v2 with agent
  const handleAgentClick = useCallback((agent: Agent) => {
    setSelectedAgentId(agent.id)
    navigate(`/chat-v2?agent=${agent.id}`)
  }, [navigate])

  // Handle create agent - navigate to agents page
  const handleCreateAgent = useCallback(() => {
    navigate('/agents')
  }, [navigate])

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--soft-bg)]">
      {/* Soft gradient background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-[var(--soft-gradient-from)] via-[var(--soft-bg)] to-[var(--soft-gradient-to)]" />

      {/* Sidebar - Soft UI Evolution: compact, no margin, distinct background */}
      <aside className="w-64 flex flex-col bg-[var(--soft-sidebar)] shadow-[var(--soft-shadow-sidebar)]">
        {/* Logo section - compact */}
        <div className="p-3 border-b border-[var(--soft-divider)]">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              className="w-8 h-8 rounded-lg flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-[var(--soft-blue)] to-[var(--soft-blue-dark)]"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bot className="w-5 h-5 text-white relative z-10" />
            </motion.div>

            <span className="text-base font-semibold text-[var(--soft-text-primary)] tracking-tight">
              Open
              <span className="text-[var(--soft-blue-dark)]">Fang</span>
            </span>
          </Link>
        </div>

        {/* Create Agent Button - compact */}
        <div className="p-2">
          <CreateAgentButton onClick={handleCreateAgent} />
        </div>

        {/* Agents List - compact */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 no-scrollbar">
          {/* Section Title */}
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <LayoutGrid className="w-3.5 h-3.5 text-[var(--soft-text-muted)]" />
            <span className="text-[11px] font-semibold text-[var(--soft-text-muted)] uppercase tracking-wider">
              Agents
            </span>
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-[var(--soft-surface)] text-[var(--soft-text-muted)]">
              {agents.length}
            </span>
          </div>

          {/* Agents */}
          {isLoading ? (
            <div className="space-y-1.5 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-2 animate-pulse">
                  <div className="w-8 h-8 rounded-lg bg-[var(--soft-surface)]" />
                  <div className="flex-1 space-y-1">
                    <div className="h-3 w-20 rounded bg-[var(--soft-surface)]" />
                    <div className="h-2 w-12 rounded bg-[var(--soft-surface)]" />
                  </div>
                </div>
              ))}
            </div>
          ) : agents.length === 0 ? (
            <div className="p-3 text-center">
              <Bot className="w-7 h-7 mx-auto mb-1.5 text-[var(--soft-text-muted)]" />
              <p className="text-xs text-[var(--soft-text-muted)]">No agents yet</p>
              <p className="text-[10px] text-[var(--soft-text-tertiary)] mt-0.5">
                Create your first agent to start
              </p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {agents.map((agent) => (
                <AgentItem
                  key={agent.id}
                  agent={agent}
                  isActive={selectedAgentId === agent.id}
                  onClick={() => handleAgentClick(agent)}
                />
              ))}
            </div>
          )}
        </nav>

        {/* Bottom Actions - compact */}
        <div className="p-2 border-t border-[var(--soft-divider)] space-y-2">
          {/* Quick Actions Row */}
          <div className="flex items-center justify-between gap-2">
            <ThemeToggle />
            <SettingsButton />
          </div>

          {/* Version */}
          <div className="text-[9px] text-[var(--soft-text-muted)] text-center font-medium">
            OpenFang v0.1.0
          </div>
        </div>
      </aside>

      {/* Main content - Soft UI: distinct background, no padding/gap */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[var(--soft-main)]">
        <div className="flex-1 overflow-hidden relative">

          {/* Content with page transition */}
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.div
              key={location.pathname}
              initial="initial"
              animate="animate"
              exit="exit"
              variants={pageTransition}
              className="h-full overflow-auto"
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
