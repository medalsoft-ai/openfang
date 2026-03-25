import { Link, useLocation, Outlet, useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Settings,
  Hand,
  Workflow,
  Puzzle,
  Blocks,
  Check,
  LayoutGrid,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { pageTransition } from '@/lib/animations'
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
// NAV ITEM BUTTON - Square Style (No Label)
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
      animate={isActive ? { scale: 0.95 } : { scale: 1 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      className={cn(
        'w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 group relative',
        isActive
          ? 'bg-violet-100 shadow-[inset_0_2px_4px_rgba(139,92,246,0.15)]'
          : 'bg-white/60 hover:bg-white shadow-[0_2px_8px_rgba(139,92,246,0.08)] hover:shadow-[0_4px_12px_rgba(139,92,246,0.15)]'
      )}
      aria-label={item.label}
    >
      {/* Active indicator - left side */}
      {isActive && (
        <motion.div
          layoutId="navActiveIndicator"
          className="absolute -left-0.5 top-1/2 -translate-y-1/2 w-1 h-4 rounded-r-full bg-violet-500"
          initial={false}
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      {/* Icon */}
      <div className="relative">
        <Icon
          className={cn(
            'w-5 h-5 transition-colors duration-200',
            isActive ? 'text-violet-600' : 'text-gray-500 group-hover:text-violet-500'
          )}
        />

        {/* Badge dot */}
        {item.badge && (
          <div
            className={cn(
              'absolute -top-1.5 -right-1.5 min-w-[14px] h-[14px] px-0.5 rounded-full flex items-center justify-center',
              'text-[8px] font-bold text-white',
              item.badgeColor || 'bg-violet-500'
            )}
          >
            {item.badge}
          </div>
        )}
      </div>
    </motion.button>
  )
}

// ============================================
// LANGUAGE SWITCHER - Text Only (No Flags)
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
    { code: 'zh-CN', label: '简', name: t('languages.zh-CN') },
    { code: 'zh-TW', label: '繁', name: t('languages.zh-TW') },
    { code: 'en', label: 'EN', name: t('languages.en') },
    { code: 'ja', label: '日', name: t('languages.ja') },
  ]

  const currentLang = languages.find((l) => l.code === i18n.language) || languages[2]

  return (
    <div ref={containerRef} className="relative">
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold',
          'bg-white/60 hover:bg-white',
          'text-gray-600 hover:text-violet-600',
          'transition-all duration-200'
        )}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label={t('settings.system.language')}
      >
        {currentLang.label}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'absolute bottom-full left-0 mb-2 w-32 rounded-xl overflow-hidden z-50',
              'bg-white border border-gray-100',
              'shadow-[0_8px_24px_rgba(139,92,246,0.2)]'
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
                  'w-full flex items-center justify-between px-3 py-2 text-sm transition-colors',
                  i18n.language === lang.code
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-gray-600 hover:bg-violet-50 hover:text-violet-600'
                )}
              >
                <span className="flex items-center gap-2">
                  <span className="text-xs font-bold w-5 text-center">{lang.label}</span>
                  <span className="text-xs">{lang.name}</span>
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

  // Navigation items - main sections + settings
  const navItems: NavItem[] = [
    {
      id: 'overview',
      icon: LayoutGrid,
      label: 'Overview',
      path: '/overview',
    },
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
    {
      id: 'settings',
      icon: Settings,
      label: 'Settings',
      path: '/settings',
    },
  ]

  // Get current active nav based on pathname
  const getActiveNavId = () => {
    const path = location.pathname
    if (path === '/' || path.startsWith('/overview')) return 'overview'
    if (path.startsWith('/chat')) return 'chat'
    if (path.startsWith('/hands')) return 'sop'
    if (path.startsWith('/workflows')) return 'workflow'
    if (path.startsWith('/skills')) return 'skills'
    if (path.startsWith('/channels')) return 'channel'
    if (path.startsWith('/settings')) return 'settings'
    return 'overview'
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
          SIDEBAR - Narrow width: 64px (w-16)
          Square menu items, no labels
          ============================================ */}
      <aside className="w-16 flex flex-col bg-white/80 backdrop-blur-xl z-20 h-full">
        {/* Logo - Attached to top */}
        <div className="h-16 flex items-center justify-center border-b border-gray-100/50">
          <Link to="/" className="group">
            <motion.div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center',
                'bg-gradient-to-br from-violet-500 to-purple-600',
                'border-2 border-white',
                'shadow-[0_4px_12px_rgba(139,92,246,0.35),inset_0_1px_3px_rgba(255,255,255,0.3)]',
                'overflow-hidden'
              )}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <img
                src="/logo.png"
                alt="OpenFang"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </Link>
        </div>

        {/* Main Navigation - Square Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-3 no-scrollbar space-y-2">
          {navItems.map((item) => (
            <NavItemButton
              key={item.id}
              item={item}
              isActive={activeNavId === item.id}
              onClick={() => navigate(item.path)}
            />
          ))}
        </nav>

        {/* Bottom - Language Switcher Only */}
        <div className="p-3 border-t border-gray-100/50">
          <LanguageSwitcher />
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
