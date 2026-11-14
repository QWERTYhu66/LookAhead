"use client";

// Motion settings from the apple-design skill: springs instead of fixed-duration animations,
// no overshoot by default, feedback on pointer-down, and gentler motion when the user asks for it.

import { useReducedMotion, type Transition } from "motion/react";

/** Critically damped: smooth settle, no bounce. Apple's default for UI that just moves. */
export const SPRING: Transition = { type: "spring", bounce: 0, duration: 0.35 };

/** A touch of bounce, only for things the user "throws" (sheets, dragged cards). */
export const SPRING_BOUNCY: Transition = { type: "spring", bounce: 0.2, duration: 0.3 };

/** Press feedback. `whileTap` fires on pointer-down, not on release. */
export const PRESS = { scale: 0.97 };

export function useMotionSafe() {
  const reduced = useReducedMotion();
  return {
    reduced,
    spring: reduced ? ({ duration: 0.15 } as Transition) : SPRING,
    enter: reduced ? { opacity: 0 } : { opacity: 0, y: 12 },
    shown: { opacity: 1, y: 0 },
  };
}
