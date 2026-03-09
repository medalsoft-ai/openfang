import { Link, useLocation, Outlet } from 'react-router'
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
  Logs
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  { path: '/overview', icon: LayoutDashboard, label: 'Overview' },
  { path: '/agents', icon: Bot, label: 'Agents' },
  { path: '/chat', icon: MessageSquare, label: 'Chat' },
  { path: '/sessions', icon: History, label: 'Sessions' },
  { path: '/workflows', icon: Workflow, label: 'Workflows' },
  { path: '/scheduler', icon: Calendar, label: 'Scheduler' },
  { path: '/channels', icon: Radio, label: 'Channels' },
  { path: '/skills', icon: Puzzle, label: 'Skills' },
  { path: '/hands', icon: Hand, label: 'Hands' },
  { path: '/approvals', icon: CheckSquare, label: 'Approvals' },
  { path: '/comms', icon: MessageCircle, label: 'Comms' },
  { path: '/logs', icon: Logs, label: 'Logs' },
  { path: '/runtime', icon: Activity, label: 'Runtime' },
  { path: '/analytics', icon: BarChart3, label: 'Analytics' },
  { path: '/wizard', icon: Wand2, label: 'Wizard' },
  { path: '/settings', icon: Settings, label: 'Settings' },
]

export function Layout() {
  const location = useLocation()

  return (
    <div className="flex h-screen bg-white dark:bg-gray-950">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="p-4 border-b">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">OpenFang</span>
          </Link>
        </div>

        <nav className="flex-1 overflow-y-auto p-2">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                      isActive
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <Outlet />
      </main>
    </div>
  )
}
