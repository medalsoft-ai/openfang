// Custom hooks for EnterpriseClaw
export { useTheme, type Theme } from './useTheme';
export { usePageTransition } from './usePageTransition';
export { useSpotlight } from './useSpotlight';
export { useKineticScroll } from './useKineticScroll';
export { useLocalStorage } from './useLocalStorage';
export { useDebounce, useDebouncedCallback } from './useDebounce';
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop, useIsDarkMode, usePrefersReducedMotion } from './useMediaQuery';
export { useKeyboard, useKeyCombo, useEscapeKey, useEnterKey, useCtrlKey } from './useKeyboard';
export { useAuthQuery, useAuthQueryClient } from './useAuthQuery';
export {
  useGsapTimeline,
  useGsapScrollTrigger,
  useTextReveal,
  useCountUp,
  useMagneticButton,
  useParallax,
  useGsapBreathing,
  useGradientFlow,
  usePulseRing,
  usePathDraw,
  useStaggerReveal,
  useMorphBlob,
  useTimelineControl,
} from './useGsap';

export {
  useMotionPreference,
  useAnimatedVariants,
  useSpringControls,
  useFadeInUp,
  useScaleIn,
  useStagger,
  useDialogAnimation,
  useToastAnimation,
  useBreathing,
  useBreathingGlow,
  useBreathingRing,
  usePulse,
  useShimmer,
  useFloat,
  useRotate,
  useGradientShift,
  useHoverScale,
  useHoverLift,
  useHoverEnhanced,
  useButtonMotion,
  useViewportAnimation,
  useScrollFadeIn,
  useDraggableSpring,
  useCombinedMotion,
  useSequencedAnimation,
} from './useMotion';
export { useSessionWebSocket, type UseSessionWebSocketOptions, type UseSessionWebSocketReturn } from './useSessionWebSocket';
