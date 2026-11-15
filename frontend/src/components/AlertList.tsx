"use client";

import { AnimatePresence, motion } from "motion/react";
import { Glyph } from "@/components/Glyph";
import { fmt } from "@/lib/format";
import { useMotionSafe } from "@/lib/motion";
import type { Alert } from "@/lib/types";

/** Warnings appear the moment a budget is below the forecast, with a clear fix. */
export function AlertList({ alerts, onPick, moneyLeft }: { alerts: Alert[]; onPick: (category: string) => void; moneyLeft?: number }) {
  const { spring, enter, shown } = useMotionSafe();
  const list = alerts.filter((a) => a.category !== "total");
  const total = alerts.find((a) => a.category === "total");
  return (
    <AnimatePresence initial={false}>
      {total && (
        <motion.li key="total-alert" layout initial={enter} animate={shown} exit={enter} transition={spring}>
          <button
            type="button"
            onClick={() => onPick("total")}
            className="flex w-full items-center gap-3 rounded-2xl border border-danger/50 bg-danger/10 px-4 py-3 text-left"
          >
            <Glyph name="warn" size={18} className="shrink-0 text-danger" />
            <span className="flex-1 text-body">
              <span className="font-bold">You&rsquo;re over budget.</span>{" "}
              Predicted {fmt(total.projected)} vs {fmt(total.budget)} — that&rsquo;s {fmt(total.over_by)} over.
            </span>
            <span className="text-caption tabular whitespace-nowrap text-danger">
              {fmt(total.projected)} / {fmt(total.budget)}
            </span>
          </button>
        </motion.li>
      )}
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
      {total && moneyLeft !== undefined && moneyLeft < 0 && (
        <motion.li key="money-left" layout initial={enter} animate={shown} exit={enter} transition={spring}>
          <div className="flex w-full items-center gap-3 rounded-2xl border border-warn/50 bg-warn/10 px-4 py-3 text-left">
            <Glyph name="warn" size={18} className="shrink-0 text-warn" />
            <span className="flex-1 text-body">
              At this pace you&rsquo;ll have {fmt(Math.abs(moneyLeft))} less than your budget by month-end. Cut a category to close the gap.
            </span>
          </div>
        </motion.li>
      )}
    </AnimatePresence>
  );
}
