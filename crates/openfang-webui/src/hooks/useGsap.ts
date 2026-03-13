/**
 * GSAP hooks for complex animations
 */

import { useEffect, useRef, useCallback } from "react"
import { gsap } from "gsap"
import { useGSAP } from "@gsap/react"

// Register GSAP plugins
// Note: Additional plugins can be registered here as needed
// gsap.registerPlugin(ScrollTrigger, TextPlugin, etc.)

/**
 * Hook for GSAP timeline
 */
export function useGsapTimeline(
  options: gsap.TimelineVars = {},
  deps: unknown[] = []
) {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)
  const containerRef = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      timelineRef.current = gsap.timeline(options)
      return () => {
        timelineRef.current?.kill()
      }
    },
    { scope: containerRef, dependencies: deps }
  )

  return { timeline: timelineRef, containerRef }
}

/**
 * Hook for scroll-triggered animations
 */
export function useGsapScrollTrigger(
  animation: (tl: gsap.core.Timeline) => void,
  deps: unknown[] = []
) {
  const containerRef = useRef<HTMLElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  useGSAP(
    () => {
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top 80%",
          end: "bottom 20%",
          toggleActions: "play none none reverse",
        },
      })
      timelineRef.current = tl
      animation(tl)
      return () => {
        tl.kill()
      }
    },
    { scope: containerRef, dependencies: deps }
  )

  return { containerRef, timeline: timelineRef }
}

/**
 * Hook for text reveal animation
 * Returns refs and config - component should render the spans
 */
export function useTextReveal(text: string, speed = 0.05) {
  const containerRef = useRef<HTMLDivElement>(null)
  const charsRef = useRef<(HTMLSpanElement | null)[]>([])

  useEffect(() => {
    if (!containerRef.current || charsRef.current.length === 0) return

    const ctx = gsap.context(() => {
      gsap.fromTo(
        charsRef.current.filter(Boolean),
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: speed,
          ease: "back.out(1.7)",
        }
      )
    }, containerRef)

    return () => ctx.revert()
  }, [text, speed])

  // Return text array and ref setter for use in component
  const chars = text.split("")
  const setCharRef = (index: number) => (el: HTMLSpanElement | null) => {
    charsRef.current[index] = el
  }

  return { containerRef, chars, setCharRef }
}

/**
 * Hook for counter animation
 */
export function useCountUp(
  end: number,
  duration = 2,
  options: {
    start?: number
    decimals?: number
    suffix?: string
    prefix?: string
  } = {}
) {
  const { start = 0, decimals = 0, suffix = "", prefix = "" } = options
  const elementRef = useRef<HTMLSpanElement>(null)
  const valueRef = useRef({ value: start })

  const animate = useCallback(() => {
    if (!elementRef.current) return

    gsap.to(valueRef.current, {
      value: end,
      duration,
      ease: "power2.out",
      onUpdate: () => {
        if (elementRef.current) {
          const val = valueRef.current.value.toFixed(decimals)
          elementRef.current.textContent = `${prefix}${val}${suffix}`
        }
      },
    })
  }, [end, duration, decimals, prefix, suffix])

  useEffect(() => {
    animate()
  }, [animate])

  return { elementRef, animate }
}

/**
 * Hook for magnetic button effect
 */
export function useMagneticButton(strength = 0.3) {
  const buttonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!button) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = button.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width / 2
      const y = e.clientY - rect.top - rect.height / 2

      gsap.to(button, {
        x: x * strength,
        y: y * strength,
        duration: 0.3,
        ease: "power2.out",
      })
    }

    const handleMouseLeave = () => {
      gsap.to(button, {
        x: 0,
        y: 0,
        duration: 0.5,
        ease: "elastic.out(1, 0.3)",
      })
    }

    button.addEventListener("mousemove", handleMouseMove)
    button.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      button.removeEventListener("mousemove", handleMouseMove)
      button.removeEventListener("mouseleave", handleMouseLeave)
    }
  }, [strength])

  return buttonRef
}

/**
 * Hook for parallax effect
 */
export function useParallax(speed = 0.5) {
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const handleScroll = () => {
      const scrollY = window.scrollY
      const rect = element.getBoundingClientRect()
      const elementTop = rect.top + scrollY
      const offset = (scrollY - elementTop) * speed

      gsap.to(element, {
        y: offset,
        duration: 0.1,
        ease: "none",
      })
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [speed])

  return elementRef
}

/**
 * Hook for breathing animation with GSAP
 */
export function useGsapBreathing(duration = 4, scale = 1.02) {
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    const tl = gsap.timeline({ repeat: -1, yoyo: true })
    tl.to(element, {
      scale,
      duration: duration / 2,
      ease: "sine.inOut",
    })

    return () => {
      tl.kill()
    }
  }, [duration, scale])

  return elementRef
}

/**
 * Hook for gradient flow animation
 */
export function useGradientFlow(duration = 8) {
  const elementRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const element = elementRef.current
    if (!element) return

    gsap.to(element, {
      backgroundPosition: "200% 50%",
      duration,
      ease: "linear",
      repeat: -1,
    })
  }, [duration])

  return elementRef
}

/**
 * Hook for pulse ring animation
 */
export function usePulseRing(duration = 2) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Create pulse rings
    const createRing = () => {
      const ring = document.createElement("div")
      ring.style.cssText = `
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        border: 2px solid currentColor;
        opacity: 0.6;
        pointer-events: none;
      `
      container.appendChild(ring)

      gsap.to(ring, {
        scale: 1.5,
        opacity: 0,
        duration,
        ease: "power2.out",
        onComplete: () => ring.remove(),
      })
    }

    const interval = setInterval(createRing, duration * 500)
    createRing()

    return () => clearInterval(interval)
  }, [duration])

  return containerRef
}

/**
 * Hook for path drawing animation
 */
export function usePathDraw(duration = 1.5) {
  const pathRef = useRef<SVGPathElement>(null)

  useEffect(() => {
    const path = pathRef.current
    if (!path) return

    const length = path.getTotalLength()

    gsap.set(path, {
      strokeDasharray: length,
      strokeDashoffset: length,
    })

    gsap.to(path, {
      strokeDashoffset: 0,
      duration,
      ease: "power2.inOut",
    })
  }, [duration])

  return pathRef
}

/**
 * Hook for staggered children reveal
 */
export function useStaggerReveal(
  selector: string,
  options: {
    delay?: number
    stagger?: number
    duration?: number
    y?: number
  } = {}
) {
  const { delay = 0, stagger = 0.1, duration = 0.5, y = 20 } = options
  const containerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const children = container.querySelectorAll(selector)
    if (children.length === 0) return

    gsap.fromTo(
      children,
      { opacity: 0, y },
      {
        opacity: 1,
        y: 0,
        duration,
        stagger,
        delay,
        ease: "power2.out",
      }
    )
  }, [selector, delay, stagger, duration, y])

  return containerRef
}

/**
 * Hook for morphing blob animation
 */
export function useMorphBlob(duration = 8) {
  const blobRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const blob = blobRef.current
    if (!blob) return

    const tl = gsap.timeline({ repeat: -1 })

    tl.to(blob, {
      borderRadius: "30% 60% 70% 40% / 50% 60% 30% 60%",
      duration: duration / 3,
      ease: "sine.inOut",
    })
      .to(blob, {
        borderRadius: "60% 40% 30% 70% / 60% 30% 70% 40%",
        duration: duration / 3,
        ease: "sine.inOut",
      })
      .to(blob, {
        borderRadius: "40% 60% 70% 30% / 40% 70% 30% 60%",
        duration: duration / 3,
        ease: "sine.inOut",
      })

    return () => {
      tl.kill()
    }
  }, [duration])

  return blobRef
}

/**
 * Hook for timeline control
 */
export function useTimelineControl() {
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  const setTimeline = useCallback((tl: gsap.core.Timeline) => {
    timelineRef.current = tl
  }, [])

  const play = useCallback(() => {
    timelineRef.current?.play()
  }, [])

  const pause = useCallback(() => {
    timelineRef.current?.pause()
  }, [])

  const reverse = useCallback(() => {
    timelineRef.current?.reverse()
  }, [])

  const restart = useCallback(() => {
    timelineRef.current?.restart()
  }, [])

  return { setTimeline, play, pause, reverse, restart }
}
