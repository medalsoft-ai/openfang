// Welcome Landing Page - Simple Product Showcase
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import Lottie from 'lottie-react';
import {
  Bot, MessageSquare, Zap, Shield, ArrowRight, Sparkles, Cpu, Globe
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Local Lottie animation path - Download your own from LottieFiles
// Recommended animations: AI Bot, Robot Assistant, Chat Animation
const LOTTIE_PATH = '/lottie/ai-bot.json';

// Embedded fallback animation (simple AI pulse)
const fallbackAnimation = {
  v: "5.7.4",
  fr: 60,
  ip: 0,
  op: 60,
  w: 400,
  h: 400,
  nm: "AI Pulse",
  ddd: 0,
  assets: [],
  layers: [
    {
      ddd: 0,
      ind: 1,
      ty: 4,
      nm: "Circle",
      sr: 1,
      ks: {
        o: { a: 1, k: [
          { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 0, s: [100] },
          { i: { x: [0.833], y: [0.833] }, o: { x: [0.167], y: [0.167] }, t: 30, s: [50] },
          { t: 60, s: [100] }
        ]},
        r: { a: 0, k: 0 },
        p: { a: 0, k: [200, 200, 0] },
        a: { a: 0, k: [0, 0, 0] },
        s: { a: 1, k: [
          { i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] }, o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] }, t: 0, s: [100, 100, 100] },
          { i: { x: [0.667, 0.667, 0.667], y: [1, 1, 1] }, o: { x: [0.333, 0.333, 0.333], y: [0, 0, 0] }, t: 30, s: [120, 120, 100] },
          { t: 60, s: [100, 100, 100] }
        ]}
      },
      ao: 0,
      shapes: [
        {
          ty: "gr",
          it: [
            {
              d: 1,
              ty: "el",
              s: { a: 0, k: [120, 120] },
              p: { a: 0, k: [0, 0] },
              nm: "Ellipse Path 1"
            },
            {
              ty: "fl",
              c: { a: 0, k: [0.231, 0.51, 0.965, 1] },
              o: { a: 0, k: 100 },
              r: 1,
              bm: 0,
              nm: "Fill 1"
            }
          ],
          nm: "Ellipse 1"
        }
      ],
      ip: 0,
      op: 60,
      st: 0,
      bm: 0
    }
  ]
};

// Hero Lottie Animation Component
function HeroLottie() {
  const [animationData, setAnimationData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetch(LOTTIE_PATH)
      .then(res => res.json())
      .then(data => {
        setAnimationData(data);
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="w-full h-80 max-w-md mx-auto flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-[var(--neon-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!animationData) {
    return <HeroIllustration />;
  }

  return (
    <Lottie
      animationData={animationData}
      loop={true}
      autoplay={true}
      className="w-full h-auto max-w-md mx-auto"
    />
  );
}

// Fallback Hero Illustration - AI Core with orbiting agents
function HeroIllustration() {
  return (
    <svg viewBox="0 0 400 320" className="w-full h-auto max-w-md mx-auto" fill="none">
      {/* Background Glow */}
      <ellipse cx="200" cy="280" rx="120" ry="25" fill="url(#glow)" opacity="0.3" />

      {/* AI Core Orb */}
      <circle cx="200" cy="140" r="55" fill="url(#orbGradient)" />
      <circle cx="200" cy="140" r="65" stroke="url(#orbGradient)" strokeWidth="2" fill="none" opacity="0.4" />
      <circle cx="200" cy="140" r="80" stroke="url(#orbGradient)" strokeWidth="1" fill="none" opacity="0.2" />

      {/* Orbiting Agents */}
      {[0, 1, 2, 3].map((i) => {
        const angle = (i * Math.PI) / 2;
        const cx = 200 + 100 * Math.cos(angle);
        const cy = 140 + 100 * Math.sin(angle);
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="16" fill="var(--surface-primary)" stroke="var(--border-default)" strokeWidth="1.5" />
            <circle cx={cx} cy={cy} r="5" fill={i % 2 === 0 ? '#3B82F6' : '#10B981'} />
          </g>
        );
      })}

      {/* Floating Cards */}
      <g opacity="0.8">
        <rect x="50" y="180" width="70" height="45" rx="8" fill="var(--surface-secondary)" stroke="var(--border-default)" />
        <circle cx="72" cy="202" r="6" fill="#10B981" />
        <rect x="85" y="196" width="25" height="3" rx="1.5" fill="var(--text-muted)" />
        <rect x="85" y="203" width="18" height="3" rx="1.5" fill="var(--text-subtle)" />
      </g>

      <g opacity="0.8">
        <rect x="280" y="100" width="70" height="45" rx="8" fill="var(--surface-secondary)" stroke="var(--border-default)" />
        <circle cx="302" cy="122" r="6" fill="#F59E0B" />
        <rect x="315" y="116" width="25" height="3" rx="1.5" fill="var(--text-muted)" />
        <rect x="315" y="123" width="18" height="3" rx="1.5" fill="var(--text-subtle)" />
      </g>

      {/* Gradients */}
      <defs>
        <radialGradient id="orbGradient" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#60A5FA" />
          <stop offset="50%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor="#2563EB" />
        </radialGradient>
        <radialGradient id="glow" cx="50%" cy="50%">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  );
}

// Feature Item
function Feature({ icon: Icon, titleKey, descriptionKey }: { icon: React.ElementType; titleKey: string; descriptionKey: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex gap-4 p-4">
      <div className="w-10 h-10 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[var(--neon-cyan)]" />
      </div>
      <div>
        <h3 className="font-medium text-[var(--text-primary)] mb-1">{t(titleKey)}</h3>
        <p className="text-sm text-[var(--text-muted)]">{t(descriptionKey)}</p>
      </div>
    </div>
  );
}

export function Overview() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="flex-1 overflow-auto">
      {/* Hero Section */}
      <section className="px-6 py-16 lg:py-24">
        <div className="max-w-5xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Content */}
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--neon-cyan)]/10 text-[var(--neon-cyan)] text-sm font-medium mb-6">
                  <Sparkles className="w-4 h-4" />
                  {t('overview.badge')}
                </span>
              </motion.div>

              <motion.h1
                className="text-4xl lg:text-5xl font-bold text-[var(--text-primary)] mb-4 tracking-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.5 }}
              >
                {t('overview.title')}
                <br />
                <span className="text-[var(--neon-cyan)]">{t('overview.subtitle')}</span>
              </motion.h1>

              <motion.p
                className="text-lg text-[var(--text-muted)] mb-8 max-w-md mx-auto lg:mx-0"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {t('overview.description')}
              </motion.p>

              <motion.div
                className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                <button
                  onClick={() => navigate('/chat')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--neon-cyan)] text-[var(--void)] font-medium hover:bg-[var(--neon-cyan-dim)] transition-colors"
                >
                  {t('overview.startChat')}
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button
                  onClick={() => navigate('/agents')}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-primary)] font-medium border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors"
                >
                  <Bot className="w-4 h-4" />
                  {t('overview.createAgent')}
                </button>
              </motion.div>
            </div>

            {/* Right: Illustration */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <HeroLottie />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 border-t border-[var(--border-subtle)]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
              {t('overview.features.title')}
            </h2>
            <p className="text-[var(--text-muted)]">
              {t('overview.features.subtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Feature
              icon={Bot}
              titleKey="overview.features.aiAgents.title"
              descriptionKey="overview.features.aiAgents.description"
            />
            <Feature
              icon={MessageSquare}
              titleKey="overview.features.conversations.title"
              descriptionKey="overview.features.conversations.description"
            />
            <Feature
              icon={Zap}
              titleKey="overview.features.workflows.title"
              descriptionKey="overview.features.workflows.description"
            />
            <Feature
              icon={Shield}
              titleKey="overview.features.secure.title"
              descriptionKey="overview.features.secure.description"
            />
            <Feature
              icon={Cpu}
              titleKey="overview.features.tools.title"
              descriptionKey="overview.features.tools.description"
            />
            <Feature
              icon={Globe}
              titleKey="overview.features.integrations.title"
              descriptionKey="overview.features.integrations.description"
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-4">
            {t('overview.cta.title')}
          </h2>
          <p className="text-[var(--text-muted)] mb-8">
            {t('overview.cta.subtitle')}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => navigate('/chat')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[var(--neon-cyan)] text-[var(--void)] font-medium hover:bg-[var(--neon-cyan-dim)] transition-colors"
            >
              <MessageSquare className="w-5 h-5" />
              {t('overview.cta.startChatting')}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="inline-flex items-center justify-center gap-2 px-8 py-3 rounded-xl bg-[var(--surface-secondary)] text-[var(--text-primary)] font-medium border border-[var(--border-default)] hover:border-[var(--border-hover)] transition-colors"
            >
              {t('overview.cta.configure')}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Overview;
