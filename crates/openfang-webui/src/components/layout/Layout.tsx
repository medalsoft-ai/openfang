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
  Globe,
  Check,
  Hand,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { pageTransition } from '@/lib/animations'
import { useTheme } from '@/hooks'
import { api } from '@/api/client'
import type { Agent } from '@/api/types'
import { useCallback, useState, useRef, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

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
  isHand,
}: {
  agent: Agent
  isActive: boolean
  onClick: () => void
  isHand?: boolean
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
        <div className="flex items-center gap-1.5">
          <div className={cn(
            'font-medium truncate transition-colors text-sm',
            isActive ? 'text-[var(--soft-text-primary)]' : 'text-[var(--soft-text-secondary)]'
          )}>
            {agent.name}
          </div>
          {/* Hand Agent Badge */}
          {isHand && (
            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
              <Hand className="w-2.5 h-2.5" />
              SOP
            </span>
          )}
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
  const { t } = useTranslation()
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--soft-surface)] shadow-[var(--soft-shadow-sm)] text-[var(--soft-text-secondary)] hover:text-[var(--soft-blue)] hover:shadow-[var(--soft-shadow-md)] transition-all duration-200"
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={resolvedTheme === 'dark' ? t('layout.theme.light') : t('layout.theme.dark')}
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
  const { t } = useTranslation()
  return (
    <Link to="/settings">
      <motion.button
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--soft-surface)] shadow-[var(--soft-shadow-sm)] text-[var(--soft-text-secondary)] hover:text-[var(--soft-blue)] hover:shadow-[var(--soft-shadow-md)] transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('layout.settings')}
      >
        <Settings className="w-4 h-4" />
      </motion.button>
    </Link>
  )
}

// Language switcher component - Soft UI compact with flag images
function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const languages = [
    { code: 'zh-CN', flag: '/flags/zh-CN.png', name: t('languages.zh-CN') },
    { code: 'zh-TW', flag: '/flags/zh-TW.png', name: t('languages.zh-TW') },
    { code: 'en', flag: '/flags/en.png', name: t('languages.en') },
    { code: 'ja', flag: '/flags/ja.png', name: t('languages.ja') },
  ]

  const currentLang = languages.find(l => l.code === i18n.language) || languages[2]

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--soft-surface)] shadow-[var(--soft-shadow-sm)] hover:shadow-[var(--soft-shadow-md)] transition-all duration-200"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('settings.system.language')}
      >
        <img
          src={currentLang.flag}
          alt={currentLang.name}
          className="w-5 h-5 rounded object-contain"
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 mb-2 w-40 rounded-xl bg-[var(--soft-surface)] shadow-[var(--soft-shadow-lg)] border border-[var(--soft-divider)] overflow-hidden z-50"
          >
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => {
                  i18n.changeLanguage(lang.code)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full flex items-center justify-between px-3 py-2.5 text-sm transition-colors',
                  i18n.language === lang.code
                    ? 'bg-[var(--soft-blue)]/10 text-[var(--soft-blue)]'
                    : 'text-[var(--soft-text-secondary)] hover:bg-[var(--soft-surface-hover)] hover:text-[var(--soft-text-primary)]'
                )}
              >
                <span className="flex items-center gap-3">
                  <img
                    src={lang.flag}
                    alt={lang.name}
                    className="w-5 h-5 rounded object-contain"
                  />
                  <span className="text-sm">{lang.name}</span>
                </span>
                {i18n.language === lang.code && <Check className="w-3.5 h-3.5" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// Create agent button - Soft UI compact style
function CreateAgentButton({ onClick }: { onClick: () => void }) {
  const { t } = useTranslation()
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
      <span>{t('layout.newAgent')}</span>
    </motion.button>
  )
}

export function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  // Get current agent from URL (single source of truth)
  const searchParams = new URLSearchParams(location.search)
  const selectedAgentId = searchParams.get('agent')

  // Fetch agents list
  const { data: agentsData, isLoading } = useQuery({
    queryKey: ['agents'],
    queryFn: () => api.listAgents(),
    refetchInterval: 5000,
  })
  const agents = agentsData ?? []

  // Fetch active hands to identify Hand agents
  const { data: handsData } = useQuery({
    queryKey: ['hands', 'active'],
    queryFn: () => api.getActiveHands(),
    refetchInterval: 5000,
  })

  // Build a Set of Hand agent IDs for quick lookup
  const handAgentIds = new Set<string>(
    handsData?.instances?.map((instance) => instance.agent_id).filter(Boolean) ?? []
  )

  // Handle agent click - navigate to chat-v2 with agent
  const handleAgentClick = useCallback((agent: Agent) => {
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
              Enterprise
              <span className="text-[var(--soft-blue-dark)]">Claw</span>
            </span>
          </Link>
        </div>

        {/* Create Agent Button - compact */}
        <div className="p-2">
          <CreateAgentButton onClick={handleCreateAgent} />
        </div>

        {/* Agents List - compact */}
        <nav className="flex-1 overflow-y-auto px-2 pb-2 no-scrollbar">
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
              <p className="text-xs text-[var(--soft-text-muted)]">{t('layout.noAgents')}</p>
              <p className="text-[10px] text-[var(--soft-text-tertiary)] mt-0.5">
                {t('layout.noAgentsHint')}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Hand Agents Group */}
              {agents.filter(a => handAgentIds.has(a.id)).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <Hand className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-[10px] font-semibold text-[var(--soft-text-muted)] uppercase tracking-wider">
                      SOP
                    </span>
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      {agents.filter(a => handAgentIds.has(a.id)).length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {agents.filter(a => handAgentIds.has(a.id)).map((agent) => (
                      <AgentItem
                        key={agent.id}
                        agent={agent}
                        isActive={selectedAgentId === agent.id}
                        onClick={() => handleAgentClick(agent)}
                        isHand={true}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Regular Agents Group */}
              {agents.filter(a => !handAgentIds.has(a.id)).length > 0 && (
                <div>
                  <div className="flex items-center gap-2 px-2 py-1 mb-1">
                    <Bot className="w-3.5 h-3.5 text-[var(--soft-text-muted)]" />
                    <span className="text-[10px] font-semibold text-[var(--soft-text-muted)] uppercase tracking-wider">
                      Agents
                    </span>
                    <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--soft-surface)] text-[var(--soft-text-muted)]">
                      {agents.filter(a => !handAgentIds.has(a.id)).length}
                    </span>
                  </div>
                  <div className="space-y-0.5">
                    {agents.filter(a => !handAgentIds.has(a.id)).map((agent) => (
                      <AgentItem
                        key={agent.id}
                        agent={agent}
                        isActive={selectedAgentId === agent.id}
                        onClick={() => handleAgentClick(agent)}
                        isHand={false}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Bottom Actions - compact */}
        <div className="p-2 border-t border-[var(--soft-divider)] space-y-2">
          {/* Quick Actions Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
            <SettingsButton />
          </div>

          {/* Version */}
          <div className="text-[9px] text-[var(--soft-text-muted)] text-center font-medium">
            {t('app.version')}
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
