"use client";

// A number that springs from its previous value to the new one (and simply jumps under reduced motion).

import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { fmt } from "@/lib/format";
import { SPRING } from "@/lib/motion";

export function AnimatedNumber({ value, className }: { value: number; className?: string }) {
  const mv = useMotionValue(value);
  const [text, setText] = useState(() => fmt(value));
  const reduced = useReducedMotion();

  useEffect(() => {
    const controls = animate(mv, value, reduced ? { duration: 0 } : SPRING);
    return () => controls.stop();
  }, [value, mv, reduced]);

  useMotionValueEvent(mv, "change", (v) => setText(fmt(v)));

  return <span className={`tabular ${className ?? ""}`}>{text}</span>;
}
