/**
 * Orage Core · Framer Motion variants
 * Mirrors the keyframes in app/globals.css so JS-driven animations
 * stay visually identical to the locked design system.
 */

import type { Transition, Variants } from "framer-motion"

// ============================================================================
// EASING (mirrors --ease-* CSS variables)
// ============================================================================
export const easeOut = [0.16, 1, 0.3, 1] as const
export const easeSpring = [0.34, 1.56, 0.64, 1] as const
export const easeGlide = [0.4, 0, 0.2, 1] as const

// ============================================================================
// DURATIONS (mirrors --t-* CSS variables, in seconds)
// ============================================================================
export const tFast = 0.15
export const tBase = 0.22
export const tSlow = 0.4

// ============================================================================
// REUSABLE TRANSITIONS
// ============================================================================
export const baseTransition: Transition = {
  duration: tBase,
  ease: easeOut,
}

export const springTransition: Transition = {
  type: "spring",
  stiffness: 320,
  damping: 24,
  mass: 0.9,
}

// ============================================================================
// VARIANTS
// ============================================================================
export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: baseTransition },
  exit: { opacity: 0, transition: { duration: tFast } },
}

export const slideUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: baseTransition },
  exit: { opacity: 0, y: 8, transition: { duration: tFast } },
}

export const slideInRight: Variants = {
  hidden: { x: "100%" },
  visible: { x: 0, transition: { duration: tBase, ease: easeOut } },
  exit: { x: "100%", transition: { duration: tBase, ease: easeOut } },
}

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: { opacity: 1, scale: 1, transition: springTransition },
  exit: { opacity: 0, scale: 0.96, transition: { duration: tFast } },
}

export const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96, y: 8 },
  visible: { opacity: 1, scale: 1, y: 0, transition: springTransition },
  exit: { opacity: 0, scale: 0.96, y: 8, transition: { duration: tFast } },
}

// Stagger container — pairs with `slideUp` children.
export const staggerContainer: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.05, delayChildren: 0 },
  },
}

// Drag overlay (the @dnd-kit floating ghost).
export const dragOverlayVariants: Variants = {
  picked: {
    rotate: 2,
    scale: 1.02,
    transition: springTransition,
  },
}
