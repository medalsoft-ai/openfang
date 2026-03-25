// Overview Page - Claymorphism Dashboard Style
// Consistent with app design system: purple theme, soft 3D, rounded cards

import { motion, type Variants } from 'framer-motion'
import { useNavigate } from 'react-router'
import Lottie from 'lottie-react'
import welcomeAnimation from '../../public/lottie/welcome-screen-ai.json'
import {
  Bot,
  MessageSquare,
  Zap,
  Shield,
  ArrowRight,
  Sparkles,
  Activity,
  TrendingUp,
  Hand,
  Workflow,
  Blocks,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// ============================================
// CLAYMORPHISM DESIGN TOKENS
// ============================================
const clay = {
  // Primary: Purple (#8B5CF6)
  primary: '#8B5CF6',
  primaryLight: '#A78BFA',
  primaryDark: '#7C3AED',

  // Background
  bgGradient: 'from-gray-50 via-violet-50/30 to-purple-50/20',

  // Cards
  card: 'bg-white border-[3px] border-white',
  cardShadow: 'shadow-[0_4px_16px_rgba(139,92,246,0.15),inset_0_1px_3px_rgba(255,255,255,0.8)]',
  cardHover: 'hover:shadow-[0_8px_24px_rgba(139,92,246,0.25)]',

  // Active/Pressed State
  active: 'bg-violet-50 shadow-[inset_0_2px_4px_rgba(139,92,246,0.15)]',

  // Border Radius
  radius: 'rounded-2xl',
  radiusLg: 'rounded-3xl',

  // Text
  textPrimary: 'text-gray-800',
  textMuted: 'text-gray-500',
  textViolet: 'text-violet-600',
}

// ============================================
// ANIMATION VARIANTS
// ============================================
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' },
  },
}

// ============================================
// HERO CARD COMPONENT
// ============================================
function HeroCard() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <motion.div
      variants={itemVariants}
      className={cn(
        clay.card,
        clay.cardShadow,
        clay.radiusLg,
        'p-8 relative overflow-hidden'
      )}
    >
      {/* Background Gradient Blob */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-violet-200/40 to-purple-200/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

      <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
        {/* Left: Content */}
        <div className="flex-1 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 text-violet-700 text-sm font-medium mb-6"
          >
            <Sparkles className="w-4 h-4" />
            {t('overview.badge')}
          </motion.div>

          <h1 className="text-3xl lg:text-4xl font-bold text-gray-800 mb-4 tracking-tight">
            {t('overview.title')}
            <br />
            <span className="text-violet-600">{t('overview.subtitle')}</span>
          </h1>

          <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto lg:mx-0">
            {t('overview.description')}
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/chat')}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl',
                'bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium',
                'shadow-[0_4px_16px_rgba(139,92,246,0.35)]',
                'hover:shadow-[0_6px_20px_rgba(139,92,246,0.45)]',
                'transition-shadow duration-200'
              )}
            >
              {t('overview.startChat')}
              <ArrowRight className="w-4 h-4" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/agents')}
              className={cn(
                'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl',
                'bg-white text-gray-700 font-medium',
                'border-[3px] border-white',
                'shadow-[0_2px_8px_rgba(139,92,246,0.12)]',
                'hover:shadow-[0_4px_12px_rgba(139,92,246,0.2)]',
                'transition-shadow duration-200'
              )}
            >
              <Bot className="w-4 h-4 text-violet-500" />
              {t('overview.createAgent')}
            </motion.button>
          </div>
        </div>

        {/* Right: Illustration */}
        <div className="flex-1 flex justify-center">
          <HeroIllustration />
        </div>
      </div>
    </motion.div>
  )
}

// ============================================
// HERO ILLUSTRATION - Lottie Animation
// ============================================
function HeroIllustration() {
  return (
    <div className="relative w-64 h-64 lg:w-80 lg:h-80">
      <Lottie
        animationData={welcomeAnimation}
        loop={true}
        className="w-full h-full"
      />
    </div>
  )
}

// ============================================
// STAT CARD COMPONENT
// ============================================
function StatCard({
  icon: Icon,
  label,
  value,
  trend,
  color,
}: {
  icon: React.ElementType
  label: string
  value: string
  trend?: string
  color: 'violet' | 'blue' | 'amber' | 'green'
}) {
  const colorStyles = {
    violet: 'bg-violet-100 text-violet-600',
    blue: 'bg-blue-100 text-blue-600',
    amber: 'bg-amber-100 text-amber-600',
    green: 'bg-green-100 text-green-600',
  }

  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -4 }}
      className={cn(
        clay.card,
        clay.cardShadow,
        clay.cardHover,
        clay.radius,
        'p-5 transition-all duration-200'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', colorStyles[color])}>
          <Icon className="w-6 h-6" />
        </div>
        {trend && (
          <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
            {trend}
          </span>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </motion.div>
  )
}

// ============================================
// QUICK ACTION CARD
// ============================================
function QuickActionCard({
  icon: Icon,
  title,
  description,
  path,
  color,
}: {
  icon: React.ElementType
  title: string
  description: string
  path: string
  color: string
}) {
  const navigate = useNavigate()

  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -4 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(path)}
      className={cn(
        'w-full text-left',
        clay.card,
        clay.cardShadow,
        clay.cardHover,
        clay.radius,
        'p-5 transition-all duration-200 group'
      )}
    >
      <div
        className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center mb-4',
          'transition-transform duration-200 group-hover:scale-110',
          color
        )}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="font-semibold text-gray-800 mb-1">{title}</h3>
      <p className="text-sm text-gray-500">{description}</p>
    </motion.button>
  )
}

// ============================================
// FEATURE ROW COMPONENT
// ============================================
function FeatureRow({
  icon: Icon,
  titleKey,
  descriptionKey,
}: {
  icon: React.ElementType
  titleKey: string
  descriptionKey: string
}) {
  const { t } = useTranslation()

  return (
    <div className="flex gap-4 p-4 rounded-xl hover:bg-violet-50/50 transition-colors">
      <div
        className={cn(
          'w-10 h-10 rounded-xl flex items-center justify-center shrink-0',
          'bg-violet-100 text-violet-600'
        )}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <h3 className="font-medium text-gray-800 mb-1">{t(titleKey)}</h3>
        <p className="text-sm text-gray-500">{t(descriptionKey)}</p>
      </div>
    </div>
  )
}

// ============================================
// MAIN OVERVIEW PAGE
// ============================================
export function Overview() {
  const navigate = useNavigate()
  const { t } = useTranslation()

  return (
    <motion.div
      className="flex-1 overflow-auto p-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Hero Section */}
        <HeroCard />

        {/* Stats Row */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={Bot}
            label={t('overview.stats.agents')}
            value="12"
            trend="+3"
            color="violet"
          />
          <StatCard
            icon={MessageSquare}
            label={t('overview.stats.conversations')}
            value="1,284"
            trend="+12%"
            color="blue"
          />
          <StatCard
            icon={Activity}
            label={t('overview.stats.active')}
            value="5"
            color="amber"
          />
          <StatCard
            icon={TrendingUp}
            label={t('overview.stats.efficiency')}
            value="94%"
            trend="+5%"
            color="green"
          />
        </motion.div>

        {/* Quick Actions + Features Grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Quick Actions */}
          <motion.div
            variants={itemVariants}
            className={cn(
              clay.card,
              clay.cardShadow,
              clay.radiusLg,
              'p-6'
            )}
          >
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              {t('overview.quickActions')}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard
                icon={MessageSquare}
                title={t('overview.actions.chat')}
                description={t('overview.actions.chatDesc')}
                path="/chat"
                color="bg-gradient-to-br from-violet-500 to-purple-600"
              />
              <QuickActionCard
                icon={Hand}
                title={t('overview.actions.sop')}
                description={t('overview.actions.sopDesc')}
                path="/hands"
                color="bg-gradient-to-br from-amber-500 to-orange-600"
              />
              <QuickActionCard
                icon={Workflow}
                title={t('overview.actions.workflow')}
                description={t('overview.actions.workflowDesc')}
                path="/workflows"
                color="bg-gradient-to-br from-blue-500 to-cyan-600"
              />
              <QuickActionCard
                icon={Blocks}
                title={t('overview.actions.channel')}
                description={t('overview.actions.channelDesc')}
                path="/channels"
                color="bg-gradient-to-br from-green-500 to-emerald-600"
              />
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            variants={itemVariants}
            className={cn(
              clay.card,
              clay.cardShadow,
              clay.radiusLg,
              'p-6'
            )}
          >
            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-500" />
              {t('overview.features.title')}
            </h2>
            <div className="space-y-2">
              <FeatureRow
                icon={Bot}
                titleKey="overview.features.aiAgents.title"
                descriptionKey="overview.features.aiAgents.description"
              />
              <FeatureRow
                icon={MessageSquare}
                titleKey="overview.features.conversations.title"
                descriptionKey="overview.features.conversations.description"
              />
              <FeatureRow
                icon={Zap}
                titleKey="overview.features.workflows.title"
                descriptionKey="overview.features.workflows.description"
              />
              <FeatureRow
                icon={Shield}
                titleKey="overview.features.secure.title"
                descriptionKey="overview.features.secure.description"
              />
            </div>
          </motion.div>
        </div>

        {/* CTA Section */}
        <motion.div
          variants={itemVariants}
          className={cn(
            clay.card,
            clay.cardShadow,
            clay.radiusLg,
            'p-8 text-center relative overflow-hidden'
          )}
        >
          {/* Background decoration */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-100/50 via-purple-100/50 to-violet-100/50" />

          <div className="relative z-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-3">
              {t('overview.cta.title')}
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {t('overview.cta.subtitle')}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/chat')}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl',
                  'bg-gradient-to-r from-violet-500 to-purple-600 text-white font-medium',
                  'shadow-[0_4px_16px_rgba(139,92,246,0.35)]',
                  'hover:shadow-[0_6px_20px_rgba(139,92,246,0.45)]',
                  'transition-shadow duration-200'
                )}
              >
                <MessageSquare className="w-5 h-5" />
                {t('overview.cta.startChatting')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/settings')}
                className={cn(
                  'inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl',
                  'bg-white text-gray-700 font-medium',
                  'border-[3px] border-white',
                  'shadow-[0_2px_8px_rgba(139,92,246,0.12)]',
                  'hover:shadow-[0_4px_12px_rgba(139,92,246,0.2)]'
                )}
              >
                {t('overview.cta.configure')}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </motion.div>
  )
}

export default Overview
