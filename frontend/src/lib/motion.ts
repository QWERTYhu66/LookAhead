"use client";

// Motion settings from the apple-design skill: springs instead of fixed-duration animations,
// no overshoot by default, a little bounce only for things the user throws, feedback on pointer-down,
// and gentler motion when the user asks for it.

import { useReducedMotion, type Transition } from "motion/react";

/** Critically damped (damping 1.0, response ~0.35 s): smooth settle, no bounce. */
export const SPRING: Transition = { type: "spring", bounce: 0, duration: 0.35 };

/** Apple's drawer/sheet feel (damping ~0.8, response 0.3 s): a touch of bounce because a flick preceded it. */
export const SPRING_SHEET: Transition = { type: "spring", bounce: 0.2, duration: 0.3 };

/** Press feedback. Motion applies `whileTap` on pointer-down, not on release. */
export const PRESS = { scale: 0.97 };
export const PRESS_SOFT = { scale: 0.985 };

/** A sheet closes when the flick is fast enough or it was dragged far enough. Velocity sign decides direction. */
export const SHEET_CLOSE_VELOCITY = 500; // px/s
export const SHEET_CLOSE_OFFSET = 160; // px

export function useMotionSafe() {
  const reduced = useReducedMotion() ?? false;
  return {
    reduced,
    spring: reduced ? ({ duration: 0.15 } as Transition) : SPRING,
    sheetSpring: reduced ? ({ duration: 0.2 } as Transition) : SPRING_SHEET,
    enter: reduced ? { opacity: 0 } : { opacity: 0, y: 12 },
    shown: { opacity: 1, y: 0 },
    sheetHidden: reduced ? { opacity: 0 } : { y: "100%" },
    sheetShown: reduced ? { opacity: 1 } : { y: 0 },
  };
}
