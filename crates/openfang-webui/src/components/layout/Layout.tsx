import { Link, useLocation, Outlet, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bot,
  MessageSquare,
  Settings,
  Sun,
  Moon,
  Hand,
  Workflow,
  Puzzle,
  Blocks,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { pageTransition } from '@/lib/animations'
import { useTheme } from '@/hooks'
import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// ============================================
// CLAYMORPHISM DESIGN SYSTEM
// ============================================
// Style: Soft 3D, chunky, playful, rounded
// Primary: Purple (#8B5CF6)
// Background: White with purple gradient
// ============================================

// Navigation items type
interface NavItem {
  id: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  path: string
  badge?: string
  badgeColor?: string
}

// ============================================
// NAV ITEM BUTTON - Minimal Claymorphism Style
// ============================================
function NavItemButton({
  item,
  isActive,
  onClick,
}: {
  item: NavItem
  isActive: boolean
  onClick: () => void
}) {
  const Icon = item.icon

  return (
    <motion.button
      onClick={onClick}
      initial={false}
      animate={isActive ? { scale: 0.96 } : { scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.94 }}
      className={cn(
        'w-full flex flex-col items-center justify-center gap-1 p-2 rounded-xl transition-all duration-200 group relative',
        isActive
          ? 'bg-violet-50 shadow-[inset_0_2px_4px_rgba(139,92,246,0.1)]'
          : 'bg-white/50 hover:bg-white shadow-[0_2px_8px_rgba(139,92,246,0.08)] hover:shadow-[0_4px_12px_rgba(139,92,246,0.12)]'
      )}
    >
      {/* Active indicator - left side */}
      {isActive && (
        <motion.div
          layoutId="navActiveIndicator"
          className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-violet-500"
          initial={false}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      {/* Icon */}
      <div className="relative">
        <Icon
          className={cn(
            'w-5 h-5 transition-colors duration-200',
            isActive ? 'text-violet-600' : 'text-gray-400 group-hover:text-violet-500'
          )}
        />

        {/* Badge dot */}
        {item.badge && (
          <div
            className={cn(
              'absolute -top-1 -right-1 min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center',
              'text-[8px] font-bold text-white',
              item.badgeColor || 'bg-violet-500'
            )}
          >
            {item.badge}
          </div>
        )}
      </div>

      {/* Label */}
      <span
        className={cn(
          'text-[10px] font-medium transition-colors duration-200',
          isActive ? 'text-violet-700' : 'text-gray-400 group-hover:text-violet-500'
        )}
      >
        {item.label}
      </span>
    </motion.button>
  )
}

// ============================================
// THEME TOGGLE - Compact Claymorphism Style
// ============================================
function ThemeToggle() {
  const { t } = useTranslation()
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <motion.button
      onClick={toggleTheme}
      className={cn(
        'flex items-center justify-center w-8 h-8 rounded-lg',
        'bg-white border-2 border-white',
        'shadow-[0_2px_8px_rgba(139,92,246,0.15),inset_0_1px_3px_rgba(255,255,255,0.8)]',
        'text-violet-500 hover:text-violet-600',
        'transition-all duration-200'
      )}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      aria-label={resolvedTheme === 'dark' ? t('layout.theme.light') : t('layout.theme.dark')}
    >
      <AnimatePresence mode="wait" initial={false}>
        {resolvedTheme === 'dark' ? (
          <motion.div
            key="sun"
            initial={{ y: -10, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 10, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="w-4 h-4" />
          </motion.div>
        ) : (
          <motion.div
            key="moon"
            initial={{ y: -10, opacity: 0, rotate: -90 }}
            animate={{ y: 0, opacity: 1, rotate: 0 }}
            exit={{ y: 10, opacity: 0, rotate: 90 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="w-4 h-4" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  )
}

// ============================================
// SETTINGS BUTTON - Compact Claymorphism Style
// ============================================
function SettingsButton() {
  const { t } = useTranslation()
  return (
    <Link to="/settings">
      <motion.button
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg',
          'bg-white border-2 border-white',
          'shadow-[0_2px_8px_rgba(139,92,246,0.15),inset_0_1px_3px_rgba(255,255,255,0.8)]',
          'text-violet-500 hover:text-violet-600',
          'transition-all duration-200'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('layout.settings')}
      >
        <Settings className="w-4 h-4" />
      </motion.button>
    </Link>
  )
}

// ============================================
// LANGUAGE SWITCHER - Claymorphism Style
// ============================================
function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[2]

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center justify-center w-8 h-8 rounded-lg',
          'bg-white border-2 border-white',
          'shadow-[0_2px_8px_rgba(139,92,246,0.15),inset_0_1px_3px_rgba(255,255,255,0.8)]',
          'transition-all duration-200'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('settings.system.language')}
      >
        <img
          src={currentLang.flag}
          alt={currentLang.name}
          className="w-4 h-4 rounded object-contain"
        />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute bottom-full left-0 mb-2 w-40 rounded-2xl overflow-hidden z-50',
              'bg-white border-[3px] border-white',
              'shadow-[0_8px_24px_rgba(139,92,246,0.25)]'
            )}
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
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-gray-600 hover:bg-violet-50 hover:text-violet-600'
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

// ============================================
// MAIN LAYOUT - Claymorphism Style
// ============================================
export function Layout() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()

  // Navigation items - 5 main sections
  const navItems: NavItem[] = [
    {
      id: 'chat',
      icon: MessageSquare,
      label: 'Chat',
      path: '/chat',
    },
    {
      id: 'sop',
      icon: Hand,
      label: 'SOP',
      path: '/hands',
      badge: '3',
      badgeColor: 'bg-amber-500',
    },
    {
      id: 'workflow',
      icon: Workflow,
      label: 'Flow',
      path: '/workflows',
    },
    {
      id: 'skills',
      icon: Puzzle,
      label: 'Skills',
      path: '/skills',
    },
    {
      id: 'channel',
      icon: Blocks,
      label: 'Channel',
      path: '/channels',
    },
  ]

  // Get current active nav based on pathname
  const getActiveNavId = () => {
    const path = location.pathname
    if (path.startsWith('/chat')) return 'chat'
    if (path.startsWith('/hands')) return 'sop'
    if (path.startsWith('/workflows')) return 'workflow'
    if (path.startsWith('/skills')) return 'skills'
    if (path.startsWith('/channels')) return 'channel'
    return 'chat'
  }

  const activeNavId = getActiveNavId()

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-gray-50 via-violet-50/30 to-purple-50/20 gap-3 pr-3">
      {/* Background decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-purple-200/30 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-violet-200/20 rounded-full blur-3xl" />
      </div>

      {/* ============================================
          SIDEBAR - Edge-to-edge, attached to left/top/bottom
          Fixed width: 96px (w-24)
          No border-radius, no shadow (part of background layer)
          ============================================ */}
      <aside className="w-24 flex flex-col bg-white/80 backdrop-blur-xl z-20 h-full">
        {/* Logo - Attached to top */}
        <div className="p-2 border-b border-gray-100/50">
          <Link to="/" className="flex justify-center group">
            <motion.div
              className={cn(
                'w-10 h-10 rounded-xl flex items-center justify-center',
                'bg-gradient-to-br from-violet-500 to-purple-600',
                'border-2 border-white',
                'shadow-[0_4px_12px_rgba(139,92,246,0.35),inset_0_1px_3px_rgba(255,255,255,0.3)]'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Bot className="w-5 h-5 text-white" />
            </motion.div>
          </Link>
        </div>

        {/* Main Navigation - 5 Items */}
        <nav className="flex-1 overflow-y-auto px-2 py-2 no-scrollbar space-y-2">
          {navItems.map((item) => (
            <NavItemButton
              key={item.id}
              item={item}
              isActive={activeNavId === item.id}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>

        {/* Bottom Actions - Attached to bottom */}
        <div className="p-2 border-t border-gray-100/50 space-y-2">
          {/* Quick Actions Grid */}
          <div className="grid grid-cols-2 gap-1.5">
            <ThemeToggle />
            <LanguageSwitcher />
          </div>
          <div className="flex justify-center">
            <SettingsButton />
          </div>

          {/* Version */}
          <div className="text-[8px] text-violet-400 text-center font-medium">
            {t('app.version')}
          </div>
        </div>
      </aside>

      {/* ============================================
          MAIN CONTENT AREA - Bento Card Style
          Floating card with rounded corners and shadow
          ============================================ */}
      <main className="flex-1 flex flex-col overflow-hidden rounded-3xl bg-white shadow-[0_8px_32px_rgba(139,92,246,0.08)] border border-white/50 my-3">
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
