/**
 * Framer Motion hooks for Glassmorphism animations
 */

import { useCallback, useMemo } from "react"
import {
  useReducedMotion,
  useAnimation,
  type Variants,
  type Transition,
} from "framer-motion"
import {
  springConfig,
  springConfigTight,
  fadeInUp,
  scaleIn,
  staggerContainer,
  staggerItem,
  breathe,
  breatheGlow,
  breatheRing,
  pulse,
  shimmer,
  float,
  rotate,
  gradientShift,
  pageTransition,
  dialogContent,
  toastSlideIn,
  hoverScale,
  hoverLift,
  tapScale,
  getVariants,
  reducedMotionVariants,
} from "@/lib/animations"

// ============================================
// Core Motion Hooks
// ============================================

/**
 * Hook to check reduced motion preference
 */
export function useMotionPreference() {
  const prefersReducedMotion = useReducedMotion()
  return { prefersReducedMotion: prefersReducedMotion ?? false }
}

/**
 * Hook to get animation variants with reduced motion support
 */
export function useAnimatedVariants(variants: Variants) {
  const { prefersReducedMotion } = useMotionPreference()
  return useMemo(
    () => getVariants(prefersReducedMotion, variants),
    [prefersReducedMotion, variants]
  )
}

/**
 * Hook for spring animation controls
 */
export function useSpringControls() {
  const controls = useAnimation()

  const springIn = useCallback(async () => {
    await controls.start({
      scale: 1,
      opacity: 1,
      transition: springConfig,
    })
  }, [controls])

  const springOut = useCallback(async () => {
    await controls.start({
      scale: 0.95,
      opacity: 0,
      transition: { duration: 0.2 },
    })
  }, [controls])

  return { controls, springIn, springOut }
}

// ============================================
// Preset Animation Hooks
// ============================================

/**
 * Hook for fade in up animation
 */
export function useFadeInUp() {
  return useAnimatedVariants(fadeInUp)
}

/**
 * Hook for scale in animation
 */
export function useScaleIn() {
  return useAnimatedVariants(scaleIn)
}

/**
 * Hook for stagger animations
 */
export function useStagger() {
  const container = useAnimatedVariants(staggerContainer)
  const item = useAnimatedVariants(staggerItem)
  return { container, item }
}

/**
 * Hook for page transitions
 */
export function usePageTransition() {
  return useAnimatedVariants(pageTransition)
}

/**
 * Hook for dialog animations
 */
export function useDialogAnimation() {
  const content = useAnimatedVariants(dialogContent)
  return { content }
}

/**
 * Hook for toast animations
 */
export function useToastAnimation() {
  return useAnimatedVariants(toastSlideIn)
}

// ============================================
// Breathing Animation Hooks
// ============================================

/**
 * Hook for breathing scale animation
 */
export function useBreathing(enabled = true) {
  const { prefersReducedMotion } = useMotionPreference()

  if (prefersReducedMotion || !enabled) {
    return { animate: "initial" }
  }

  return {
    animate: "animate",
    variants: breathe,
    initial: "initial",
  }
}

/**
 * Hook for breathing glow animation
 */
export function useBreathingGlow(enabled = true) {
  const { prefersReducedMotion } = useMotionPreference()

  if (prefersReducedMotion || !enabled) {
    return { animate: "initial" }
  }

  return {
    animate: "animate",
    variants: breatheGlow,
    initial: "initial",
  }
}

/**
 * Hook for breathing ring (pulse ring) animation
 */
export function useBreathingRing(enabled = true) {
  const { prefersReducedMotion } = useMotionPreference()

  if (prefersReducedMotion || !enabled) {
    return { animate: "initial" }
  }

  return {
    animate: "animate",
    variants: breatheRing,
    initial: "initial",
  }
}

// ============================================
// Loop Animation Hooks
// ============================================

/**
 * Hook for pulse animation
 */
export function usePulse(enabled = true) {
  const { prefersReducedMotion } = useMotionPreference()

  if (prefersReducedMotion || !enabled) {
    return {}
  }

  return {
    animate: "animate",
    variants: pulse,
  }
}

/**
 * Hook for shimmer animation (skeleton loading)
 */
export function useShimmer(enabled = true) {
  const { prefersReducedMotion } = useMotionPreference()

  if (prefersReducedMotion || !enabled) {
    return {}
  }

  return {
    initial: "initial",
    animate: "animate",
    variants: shimmer,
    style: {
      backgroundSize: "200% 100%",
      backgroundImage:
        "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
    },
  }
}

/**
 * Hook for float animation
 */
export function useFloat(enabled = true) {
  const { prefersReducedMotion } = useMotionPreference()

  if (prefersReducedMotion || !enabled) {
    return {}
  }

  return {
    animate: "animate",
    variants: float,
  }
}

/**
 * Hook for rotate animation
 */
export function useRotate(enabled = true, duration = 8) {
  const { prefersReducedMotion } = useMotionPreference()

  if (prefersReducedMotion || !enabled) {
    return {}
  }

  return {
    animate: { rotate: 360 },
    transition: {
      duration,
      ease: "linear",
      repeat: Infinity,
      repeatType: "loop" as const,
    },
  }
}

/**
 * Hook for gradient shift animation
 */
export function useGradientShift(enabled = true) {
  const { prefersReducedMotion } = useMotionPreference()

  if (prefersReducedMotion || !enabled) {
    return {}
  }

  return {
    initial: "initial",
    animate: "animate",
    variants: gradientShift,
    style: {
      backgroundSize: "200% 200%",
    },
  }
}

// ============================================
// Hover/Tap Interaction Hooks
// ============================================

/**
 * Hook for hover scale effect
 */
export function useHoverScale(scale = 1.02) {
  return {
    whileHover: { scale, transition: springConfigTight },
    whileTap: tapScale,
  }
}

/**
 * Hook for hover lift effect
 */
export function useHoverLift(y = -4) {
  return {
    whileHover: { y, transition: springConfigTight },
    whileTap: tapScale,
  }
}

/**
 * Hook for combined hover scale + lift
 */
export function useHoverEnhanced(scale = 1.02, y = -4) {
  return {
    whileHover: {
      scale,
      y,
      transition: springConfigTight,
    },
    whileTap: tapScale,
  }
}

/**
 * Hook for button interactions
 */
export function useButtonMotion() {
  return {
    whileHover: hoverScale,
    whileTap: tapScale,
    transition: springConfigTight,
  }
}

// ============================================
// Viewport Animation Hooks
// ============================================

/**
 * Hook for viewport-triggered animations
 */
export function useViewportAnimation(
  variants: Variants,
  options: {
    once?: boolean
    amount?: "some" | "all" | number
    margin?: string
  } = {}
) {
  const { prefersReducedMotion } = useMotionPreference()
  const safeVariants = prefersReducedMotion ? reducedMotionVariants : variants

  return {
    initial: "hidden",
    whileInView: "visible",
    viewport: {
      once: options.once ?? true,
      amount: options.amount ?? 0.3,
      margin: options.margin,
    },
    variants: safeVariants,
  }
}

/**
 * Hook for scroll-triggered fade in
 */
export function useScrollFadeIn(
  direction: "up" | "down" | "left" | "right" = "up"
) {
  const baseVariants = {
    up: fadeInUp,
    down: {
      hidden: { opacity: 0, y: -20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: springConfig,
      },
    },
    left: {
      hidden: { opacity: 0, x: -20 },
      visible: {
        opacity: 1,
        x: 0,
        transition: springConfig,
      },
    },
    right: {
      hidden: { opacity: 0, x: 20 },
      visible: {
        opacity: 1,
        x: 0,
        transition: springConfig,
      },
    },
  }

  return useViewportAnimation(baseVariants[direction])
}

// ============================================
// Gesture Hooks
// ============================================

/**
 * Hook for drag gestures with spring physics
 */
export function useDraggableSpring(
  constraints?: { left?: number; right?: number; top?: number; bottom?: number } | React.RefObject<Element>
) {
  return {
    drag: true,
    dragConstraints: constraints,
    dragElastic: 0.1,
    dragTransition: { bounceStiffness: 300, bounceDamping: 20 },
  }
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to combine multiple animation props
 */
export function useCombinedMotion(...props: Record<string, unknown>[]) {
  return useMemo(() => {
    if (props.length === 0) return {}
    return props.reduce((acc, prop) => {
      // Merge variants specially
      if (acc.variants && prop.variants) {
        return {
          ...acc,
          ...prop,
          variants: { ...acc.variants, ...prop.variants },
        }
      }
      return { ...acc, ...prop }
    })
  }, [props])
}

/**
 * Hook for sequenced animations
 */
export function useSequencedAnimation(
  steps: { key: string; delay: number; duration?: number }[]
) {
  const controls = useAnimation()

  const play = useCallback(async () => {
    for (const step of steps) {
      await new Promise((resolve) => setTimeout(resolve, step.delay * 1000))
      await controls.start(step.key)
    }
  }, [controls, steps])

  return { controls, play }
}
