import { Link, useLocation, Outlet } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard,
  Bot,
  MessageSquare,
  Settings,
  Workflow,
  Calendar,
  History,
  Radio,
  Puzzle,
  Hand,
  CheckSquare,
  MessageCircle,
  Activity,
  BarChart3,
  Wand2,
  Logs,
  Command,
  Sun,
  Moon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { pageTransition } from '@/lib/animations'
import { useTheme } from '@/hooks'

const navItems = [
  { path: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { path: '/agents', icon: Bot, label: 'Agents' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/sessions', icon: History, label: 'Sessions' },
  { path: '/workflows', icon: Workflow, label: 'Workflows' },
  { path: '/scheduler', icon: Calendar, label: 'Scheduler' },
  { path: '/channels', icon: Radio, label: 'Channels' },
  { path: '/skills', icon: Puzzle, label: 'Skills' },
  { path: '/hands', icon: Hand, label: 'SOP' },
  { path: '/approvals', icon: CheckSquare, label: 'Approvals' },
  { path: '/comms', icon: MessageCircle, label: 'Comms' },
  { path: '/logs', icon: Logs, label: 'Logs' },
  { path: '/runtime', icon: Activity, label: 'Runtime' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/wizard', icon: Wand2, label: 'Wizard' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

// Cyber grid background component with theme support
function CyberGrid() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base void - uses CSS variable */}
      <div className="absolute inset-0 bg-[var(--void)]" />

      {/* Cyber grid lines - uses CSS variable for theme-aware color */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(var(--grid-color) 1px, transparent 1px),
            linear-gradient(90deg, var(--grid-color) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px',
        }}
      />

      {/* Radial gradient overlay - uses CSS variable */}
      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, var(--grid-glow) 0%, transparent 50%)',
        }}
      />

      {/* Bottom glow - uses CSS variable */}
      <div
        className="absolute bottom-0 left-0 right-0 h-1/3 opacity-30"
        style={{
          background: 'linear-gradient(to top, var(--grid-glow), transparent)',
        }}
      />
    </div>
  )
}

// Nav item component with animations
function NavItem({
  item,
  isActive
}: {
  item: typeof navItems[0]
  isActive: boolean
}) {
  const Icon = item.icon

  return (
    <motion.li
      initial={false}
      animate={isActive ? { scale: 1.02 } : { scale: 1 }}
    >
      <Link
        to={item.path}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 group relative overflow-hidden',
          isActive
            ? 'text-[var(--neon-cyan)]'
            : 'text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--border-subtle)]'
        )}
      >
        {/* Active background glow */}
        {isActive && (
          <motion.div
            layoutId="navGlow"
            className="absolute inset-0 bg-gradient-to-r from-[var(--neon-cyan)]/10 to-transparent rounded-xl"
            initial={false}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        )}

        {/* Icon */}
        <span className={cn(
          'relative z-10 transition-all duration-200',
          isActive && 'text-[var(--neon-cyan)]'
        )}>
          <Icon className={cn(
            'w-4 h-4 transition-all duration-200',
            isActive && 'drop-shadow-[var(--glow-cyan-sm)]'
          )} />
        </span>

        {/* Label */}
        <span className="relative z-10">{item.label}</span>

        {/* Active indicator dot */}
        {isActive && (
          <motion.div
            layoutId="navDot"
            className="absolute right-3 w-1.5 h-1.5 rounded-full bg-[var(--neon-cyan)]"
            initial={false}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              boxShadow: 'var(--glow-cyan-sm)',
            }}
          />
        )}
      </Link>
    </motion.li>
  )
}

// Theme toggle button component
function ThemeToggle() {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
      className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--surface-tertiary)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--neon-cyan)] hover:border-[var(--border-hover)] transition-all duration-200"
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

export function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--void)]">
      <CyberGrid />

      {/* Sidebar */}
      <aside className="w-64 flex flex-col border-r border-[var(--border-subtle)] bg-[var(--surface-primary)]/80 backdrop-blur-xl m-3 mr-0 rounded-2xl">
        {/* Logo section */}
        <div className="p-4 border-b border-[var(--border-subtle)]">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              className="w-10 h-10 rounded-xl flex items-center justify-center relative overflow-hidden"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {/* Glow background */}
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)] to-[var(--neon-cyan-dim)] opacity-20" />
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--neon-cyan)]/50 to-transparent" />

              <Bot className="w-6 h-6 text-[var(--neon-cyan)] relative z-10 drop-shadow-[var(--glow-cyan-sm)]" />
            </motion.div>

            <span className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
              Enterprise
              <span className="text-[var(--neon-cyan)] drop-shadow-[var(--glow-cyan-sm)]">
                Claw
              </span>
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3 no-scrollbar">
          <ul className="space-y-0.5">
            {navItems.map((item) => (
              <NavItem
                key={item.path}
                item={item}
                isActive={location.pathname === item.path}
              />
            ))}
          </ul>
        </nav>

        {/* Command palette hint */}
        <div className="p-3 border-t border-[var(--border-subtle)]">
          <button className="w-full flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--border-subtle)] border border-[var(--border-default)] text-[var(--text-muted)] text-xs hover:bg-[var(--border-default)] hover:text-[var(--text-secondary)] transition-all duration-200 group">
            <Command className="w-3.5 h-3.5" />
            <span>Command Palette</span>
            <kbd className="ml-auto px-1.5 py-0.5 rounded bg-[var(--surface-secondary)] text-[10px] font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Theme toggle & Version */}
        <div className="px-3 pb-3 flex items-center justify-between gap-2">
          <ThemeToggle />
          <div className="text-[10px] text-[var(--text-muted)] text-center font-mono flex-1">
            EnterpriseClaw v0.1.0
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden p-3 pl-0">
        <div className="flex-1 bg-[var(--surface-primary)]/60 backdrop-blur-sm border border-[var(--border-subtle)] rounded-2xl overflow-hidden relative">
          {/* Corner accents */}
          <div className="absolute top-0 left-0 w-20 h-px bg-gradient-to-r from-[var(--neon-cyan)]/50 to-transparent" />
          <div className="absolute top-0 left-0 w-px h-20 bg-gradient-to-b from-[var(--neon-cyan)]/50 to-transparent" />
          <div className="absolute top-0 right-0 w-20 h-px bg-gradient-to-l from-[var(--neon-cyan)]/20 to-transparent" />
          <div className="absolute bottom-0 left-0 w-px h-20 bg-gradient-to-t from-[var(--neon-cyan)]/20 to-transparent" />

          {/* Content with page transition */}
          <AnimatePresence mode="wait">
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
