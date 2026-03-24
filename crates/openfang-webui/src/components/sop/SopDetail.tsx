// SopDetail - SOP detail view (Claymorphism style matching Chat page)
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Hand, HandInstance } from '@/api/types'
import { Bot, Play, Square, Settings, Loader2, Check, AlertCircle } from 'lucide-react'

interface SopDetailProps {
  className?: string
  hand: Hand | null
  instance: HandInstance | null
  isLoading: boolean
  onActivate: (handId: string) => void
  onDeactivate: (handId: string) => void
  onConfigure: () => void
}

export function SopDetail({
  className,
  hand,
  instance,
  isLoading,
  onActivate,
  onDeactivate,
  onConfigure,
}: SopDetailProps) {
  if (isLoading) {
    return (
      <div className={cn(
        'flex-1 h-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50/30 to-purple-50/20 border border-white/30',
        className
      )}>
        <div className="flex items-center gap-3 text-violet-500">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span className="text-sm">Loading...</span>
        </div>
      </div>
    )
  }

  if (!hand) {
    return (
      <div className={cn(
        'flex-1 h-full flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-50/30 to-purple-50/20 border border-white/30',
        className
      )}>
        <div className="text-center">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-violet-100 to-purple-100 dark:from-violet-900/30 dark:to-purple-900/30 flex items-center justify-center">
            <Bot className="w-10 h-10 text-violet-500" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">Select a SOP to view details</p>
        </div>
      </div>
    )
  }

  const isActive = !!instance

  return (
    <div className={cn(
      'flex-1 h-full overflow-auto',
      className
    )}>
      {/* Main Detail Card */}
      <div className="p-6">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50 p-6"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/25">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                    {hand.name}
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {hand.description}
                  </p>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100/50">
              {isActive ? (
                <>
                  <motion.button
                    onClick={() => onDeactivate(hand.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
                      'bg-gradient-to-r from-red-500 to-rose-600 text-white',
                      'shadow-lg shadow-red-500/25 hover:shadow-red-500/40',
                      'transition-all duration-200 font-medium'
                    )}
                  >
                    <Square className="w-4 h-4" />
                    Deactivate
                  </motion.button>
                  <button
                    onClick={onConfigure}
                    className={cn(
                      'p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800',
                      'text-gray-700 dark:text-gray-300',
                      'hover:bg-gray-200 dark:hover:bg-gray-700',
                      'transition-colors'
                    )}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <motion.button
                    onClick={() => onActivate(hand.id)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={!hand.requirements_met}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
                      'bg-gradient-to-r from-violet-500 to-purple-600 text-white',
                      'shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40',
                      'transition-all duration-200 font-medium',
                      !hand.requirements_met && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <Play className="w-4 h-4" />
                    Activate
                  </motion.button>
                  <button
                    onClick={onConfigure}
                    className={cn(
                      'p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800',
                      'text-gray-700 dark:text-gray-300',
                      'hover:bg-gray-200 dark:hover:bg-gray-700',
                      'transition-colors'
                    )}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          </motion.div>

          {/* Active Status Card */}
          {isActive && instance && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-emerald-700 dark:text-emerald-300">Active</span>
              </div>
              <div className="mt-2 text-sm text-emerald-600 dark:text-emerald-400 space-y-1">
                <p>Instance ID: {instance.instance_id}</p>
                {instance.agent_name && (
                  <p>Agent: {instance.agent_name}</p>
                )}
                <p>Status: {instance.status}</p>
              </div>
            </motion.div>
          )}

          {/* Requirements Card */}
          {hand.requirements && hand.requirements.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50 p-4"
            >
              <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-500" />
                Requirements
              </h3>
              <ul className="space-y-2">
                {hand.requirements.map((req) => (
                  <li
                    key={req.key}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className={cn(
                      'w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0',
                      req.satisfied
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : 'bg-amber-100 dark:bg-amber-900/30'
                    )}>
                      {req.satisfied ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-amber-600" />
                      )}
                    </span>
                    <span className={req.satisfied
                      ? 'text-gray-600 dark:text-gray-400'
                      : 'text-amber-600 dark:text-amber-400'
                    }>
                      {req.label}
                    </span>
                  </li>
                ))}
              </ul>
            </motion.div>
          )}

          {/* Category & Tools Card */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white shadow-[0_4px_20px_rgba(139,92,246,0.06)] border border-white/50 p-4"
          >
            <div className="space-y-4">
              {/* Category */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                  Category
                </h3>
                <span className="inline-flex px-3 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium">
                  {hand.category}
                </span>
              </div>

              {/* Tools */}
              {hand.tools && hand.tools.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    Tools
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {hand.tools.map((tool) => (
                      <span
                        key={tool}
                        className="inline-flex px-2.5 py-1 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-medium"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Agent Config */}
              {hand.agent && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                    AI Model
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Bot className="w-4 h-4" />
                    {hand.agent.provider && <span>{hand.agent.provider}</span>}
                    {hand.agent.model && <span className="text-gray-400">/</span>}
                    {hand.agent.model && <span>{hand.agent.model}</span>}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
