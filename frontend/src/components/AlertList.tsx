"use client";

import { AnimatePresence, motion } from "motion/react";
import { fmt } from "@/lib/format";
import { useMotionSafe } from "@/lib/motion";
import type { Alert } from "@/lib/types";

/** Warnings appear the moment a budget is below the forecast, and leave the same way they came. */
export function AlertList({ alerts }: { alerts: Alert[] }) {
  const { spring, enter, shown } = useMotionSafe();
  return (
    <AnimatePresence initial={false}>
      {alerts.length > 0 && (
        <motion.ul key="alerts" layout initial={enter} animate={shown} exit={enter} transition={spring} className="flex flex-col gap-2">
          {alerts.map((a) => (
            <motion.li
              key={a.category}
              layout
              initial={enter}
              animate={shown}
              exit={enter}
              transition={spring}
              className="flex items-baseline justify-between gap-3 rounded-xl border border-warn/50 bg-surface px-4 py-3"
            >
              <span className="text-body">{a.message}</span>
              <span className="text-caption tabular whitespace-nowrap">
                {fmt(a.projected)} vs {fmt(a.budget)}
              </span>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}
