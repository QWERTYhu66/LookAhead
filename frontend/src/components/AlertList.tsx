"use client";

import { AnimatePresence, motion } from "motion/react";
import { Glyph } from "@/components/Glyph";
import { fmt } from "@/lib/format";
import { useMotionSafe } from "@/lib/motion";
import type { Alert } from "@/lib/types";

/** Warnings appear the moment a budget is below the forecast, and leave the same way they came. */
export function AlertList({ alerts, onPick }: { alerts: Alert[]; onPick: (category: string) => void }) {
  const { spring, enter, shown } = useMotionSafe();
  const list = alerts.filter((a) => a.category !== "total"); // the total shows inside the summary card
  return (
    <AnimatePresence initial={false}>
      {list.length > 0 && (
        <motion.ul key="alerts" layout initial={enter} animate={shown} exit={enter} transition={spring} className="flex flex-col gap-2">
          {list.map((a) => (
            <motion.li key={a.category} layout initial={enter} animate={shown} exit={enter} transition={spring}>
              <button
                type="button"
                onClick={() => onPick(a.category)}
                className="flex w-full items-center gap-3 rounded-2xl border border-warn/50 bg-surface px-4 py-3 text-left"
              >
                <Glyph name="warn" size={18} className="shrink-0 text-warn" />
                <span className="flex-1 text-body">{a.message}</span>
                <span className="text-caption tabular whitespace-nowrap">
                  {fmt(a.projected)} / {fmt(a.budget)}
                </span>
              </button>
            </motion.li>
          ))}
        </motion.ul>
      )}
    </AnimatePresence>
  );
}
