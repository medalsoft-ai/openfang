/**
 * EnterpriseClaw Animation System v2.0
 * Cyber-Neon Dark theme animations
 * Using Framer Motion
 */

// ============================================
// CYBER THEME COLORS
// ============================================

export const cyberColors = {
  cyan: 'var(--neon-cyan)',
  amber: 'var(--neon-amber)',
  magenta: 'var(--neon-magenta)',
  green: 'var(--neon-green)',
  void: 'var(--void)',
  surface: 'var(--surface-primary)',
  elevated: 'var(--surface-secondary)',
  border: 'var(--border-subtle)',
  glowCyan: 'var(--neon-cyan)',
  glowAmber: 'var(--neon-amber)',
} as const;

// ============================================
// EASING FUNCTIONS (Cyber Edition)
// ============================================

import type { Variants, Transition } from "framer-motion"

// ============================================
// Spring/Damping Animations (阻尼感动画)
// ============================================

export const springConfig: Transition = {
  type: "spring",
  stiffness: 100,
  damping: 15,
  mass: 1,
}

export const springConfigTight: Transition = {
  type: "spring",
  stiffness: 200,
  damping: 20,
  mass: 0.8,
}

export const fadeInUp: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig,
  },
}

export const fadeInDown: Variants = {
  hidden: {
    opacity: 0,
    y: -20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig,
  },
}

export const fadeInLeft: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: springConfig,
  },
}

export const fadeInRight: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: springConfig,
  },
}

export const scaleIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 },
  },
}

export const popIn: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
    },
  },
}

// ============================================
// Stagger Animations (交错动画)
// ============================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
}

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: springConfig,
  },
}

// Alias for backward compatibility
export const listItem = staggerItem

export const staggerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
}

// ============================================
// Breathing Animations (呼吸感动画)
// ============================================

export const breathe: Variants = {
  initial: {
    scale: 1,
  },
  animate: {
    scale: [1, 1.02, 1],
    transition: {
      duration: 4,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
}

export const breatheGlow: Variants = {
  initial: {
    boxShadow: "0 0 20px rgba(var(--primary), 0.2)",
  },
  animate: {
    boxShadow: [
      "0 0 20px rgba(var(--primary), 0.2)",
      "0 0 40px rgba(var(--primary), 0.4)",
      "0 0 20px rgba(var(--primary), 0.2)",
    ],
    transition: {
      duration: 4,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
}

export const breatheRing: Variants = {
  initial: {
    scale: 1,
    opacity: 0.6,
  },
  animate: {
    scale: [1, 1.3, 1],
    opacity: [0.6, 0, 0.6],
    transition: {
      duration: 2,
      ease: "easeOut",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
}

// ============================================
// Loop Animations (循环播放动画)
// ============================================

export const pulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
}

export const shimmer: Variants = {
  initial: {
    backgroundPosition: "-200% 0",
  },
  animate: {
    backgroundPosition: ["-200% 0", "200% 0"],
    transition: {
      duration: 1.5,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
}

export const float: Variants = {
  animate: {
    y: [0, -10, 0],
    transition: {
      duration: 3,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
}

export const rotate: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 8,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
}

export const gradientShift: Variants = {
  animate: {
    backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
    transition: {
      duration: 8,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
}

// ============================================
// Hover Effects (悬停效果)
// ============================================

export const hoverScale = {
  scale: 1.02,
  transition: springConfigTight,
}

export const hoverLift = {
  y: -4,
  transition: springConfigTight,
}

export const hoverGlow = {
  boxShadow: "0 20px 40px rgba(0, 0, 0, 0.15)",
  transition: { duration: 0.3 },
}

export const tapScale = {
  scale: 0.98,
}

// ============================================
// Page Transitions (页面过渡)
// ============================================

export const pageTransition: Variants = {
  initial: {
    opacity: 0,
    x: 20,
  },
  animate: {
    opacity: 1,
    x: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      damping: 20,
      mass: 1,
    },
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: {
      duration: 0.2,
    },
  },
}

export const pageFade: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

// ============================================
// Dialog/Modal Animations (弹窗动画)
// ============================================

export const dialogOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.2 },
  },
}

export const dialogContent: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.95,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: { duration: 0.2 },
  },
}

// ============================================
// Toast/Notification Animations
// ============================================

export const toastSlideIn: Variants = {
  initial: {
    opacity: 0,
    x: 100,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: springConfig,
  },
  exit: {
    opacity: 0,
    x: 100,
    scale: 0.9,
    transition: { duration: 0.2 },
  },
}

// ============================================
// Special Effects (特效)
// ============================================

export const morphBlob: Variants = {
  animate: {
    borderRadius: [
      "60% 40% 30% 70% / 60% 30% 70% 40%",
      "30% 60% 70% 40% / 50% 60% 30% 60%",
      "60% 40% 30% 70% / 60% 30% 70% 40%",
    ],
    transition: {
      duration: 8,
      ease: "easeInOut",
      repeat: Infinity,
      repeatType: "loop",
    },
  },
}

export const drawPath: Variants = {
  hidden: {
    pathLength: 0,
    opacity: 0,
  },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 1, ease: "easeInOut" },
      opacity: { duration: 0.3 },
    },
  },
}

// ============================================
// CSS Classes for Tailwind (Glassmorphism)
// ============================================

export const glassClasses = {
  base: "backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 border border-white/20 dark:border-white/10",
  card: "backdrop-blur-xl bg-white/80 dark:bg-slate-900/70 border border-white/20 dark:border-white/10 rounded-xl shadow-lg",
  hover: "transition-all duration-300 hover:shadow-xl hover:scale-[1.02]",
  active: "active:scale-[0.98] transition-transform",
  input: "backdrop-blur-md bg-white/50 dark:bg-slate-800/50 border border-white/30 dark:border-white/10 focus:ring-2 focus:ring-primary/50",
}

// ============================================
// Reduced Motion Support
// ============================================

export const reducedMotionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.1 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
}

// Helper to get variants based on motion preference
export function getVariants(
  prefersReducedMotion: boolean,
  variants: Variants
): Variants {
  return prefersReducedMotion ? reducedMotionVariants : variants
}
