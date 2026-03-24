// SopSidebar - SOP list sidebar with grouped categories (Claymorphism style)
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Hand, HandInstance } from '@/api/types'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, ChevronDown, Hand as HandIcon, Folder, FlaskConical, Code, BarChart3, MessageSquare, Zap, Palette, Shield, Globe, Cog } from 'lucide-react'
import { useState } from 'react'

interface SopSidebarProps {
  className?: string
  hands: Hand[]
  activeInstances: HandInstance[]
  selectedHandId: string | null
  onSelectHand: (handId: string) => void
  isLoading?: boolean
}

// Group hands by category
function groupHandsByCategory(hands: Hand[]): Record<string, Hand[]> {
  return hands.reduce((acc, hand) => {
    const category = hand.category || 'Other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(hand)
    return acc
  }, {} as Record<string, Hand[]>)
}

// Category icon mapping (using Lucide icons)
const categoryIcons: Record<string, React.ReactNode> = {
  'Research': <FlaskConical className="w-3.5 h-3.5" />,
  'Development': <Code className="w-3.5 h-3.5" />,
  'Data': <BarChart3 className="w-3.5 h-3.5" />,
  'Communication': <MessageSquare className="w-3.5 h-3.5" />,
  'Automation': <Zap className="w-3.5 h-3.5" />,
  'Creative': <Palette className="w-3.5 h-3.5" />,
  'Security': <Shield className="w-3.5 h-3.5" />,
  'Network': <Globe className="w-3.5 h-3.5" />,
  'System': <Cog className="w-3.5 h-3.5" />,
}

const DefaultCategoryIcon = Folder

// Hand item component
function HandItem({
  hand,
  isActive,
  isSelected,
  onClick,
}: {
  hand: Hand
  isActive: boolean
  isSelected: boolean
  onClick: () => void
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200',
        isSelected
          ? 'bg-violet-100 dark:bg-violet-900/40 border border-violet-200 dark:border-violet-800 shadow-sm'
          : 'bg-white/50 dark:bg-white/5 border border-transparent hover:bg-white hover:shadow-sm'
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
        isSelected
          ? 'bg-gradient-to-br from-violet-500 to-purple-600'
          : 'bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'
      )}>
        <HandIcon className={cn(
          'w-4 h-4',
          isSelected ? 'text-white' : 'text-gray-500 dark:text-gray-400'
        )} />
      </div>
      <div className="flex-1 min-w-0">
        <p className={cn(
          'text-sm font-medium truncate',
          isSelected ? 'text-violet-900 dark:text-violet-100' : 'text-gray-700 dark:text-gray-200'
        )}>
          {hand.name}
        </p>
        <p className="text-xs text-gray-400 truncate">
          {hand.description || hand.category}
        </p>
      </div>
      {isActive && (
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse flex-shrink-0" />
      )}
    </motion.button>
  )
}

// Category group component
function CategoryGroup({
  category,
  hands,
  activeInstances,
  selectedHandId,
  onSelectHand,
  defaultExpanded = true,
}: {
  category: string
  hands: Hand[]
  activeInstances: HandInstance[]
  selectedHandId: string | null
  onSelectHand: (handId: string) => void
  defaultExpanded?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const activeCount = hands.filter(h => activeInstances.some(i => i.hand_id === h.id)).length

  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
      >
        <span className="flex items-center gap-2 min-w-0">
          <span className="text-gray-400 flex-shrink-0">
            {categoryIcons[category] || <DefaultCategoryIcon className="w-3.5 h-3.5" />}
          </span>
          <span className="truncate">{category}</span>
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 text-[10px] font-medium">
              {activeCount}
            </span>
          )}
          <ChevronDown className={cn(
            'w-4 h-4 transition-transform duration-200',
            isExpanded && 'rotate-180'
          )} />
        </div>
      </button>

      <motion.div
        initial={false}
        animate={{ height: isExpanded ? 'auto' : 0 }}
        className="overflow-hidden"
      >
        <div className="space-y-1 pt-1">
          {hands.map((hand) => {
            const isActive = activeInstances.some(i => i.hand_id === hand.id)
            const isSelected = selectedHandId === hand.id
            return (
              <HandItem
                key={hand.id}
                hand={hand}
                isActive={isActive}
                isSelected={isSelected}
                onClick={() => onSelectHand(hand.id)}
              />
            )
          })}
        </div>
      </motion.div>
    </div>
  )
}

export function SopSidebar({
  className,
  hands,
  activeInstances,
  selectedHandId,
  onSelectHand,
  isLoading = false,
}: SopSidebarProps) {
  const groupedHands = groupHandsByCategory(hands)
  const categories = Object.keys(groupedHands).sort()

  return (
    <div className={cn(
      'w-72 h-full flex flex-col rounded-2xl bg-white shadow-[0_8px_32px_rgba(139,92,246,0.08)] border border-white/50 overflow-hidden',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100/50">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">
          SOPs
        </h2>
        <span className="text-xs text-violet-500 font-medium bg-violet-50 dark:bg-violet-900/30 px-2 py-0.5 rounded-full">
          {hands.length}
        </span>
      </div>

      {/* Category Groups */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full w-full">
          <div className="p-3 space-y-4 w-full">
            {isLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-violet-500" />
              </div>
            ) : hands.length === 0 ? (
              <div className="text-center py-8">
                <HandIcon className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                <p className="text-sm text-gray-400">No SOPs available</p>
              </div>
            ) : (
              categories.map((category, index) => (
                <CategoryGroup
                  key={category}
                  category={category}
                  hands={groupedHands[category]}
                  activeInstances={activeInstances}
                  selectedHandId={selectedHandId}
                  onSelectHand={onSelectHand}
                  defaultExpanded={index === 0}
                />
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
