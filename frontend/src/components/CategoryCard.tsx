"use client";

import { AnimatePresence, motion } from "motion/react";
import { fmt, pctChange } from "@/lib/format";
import { PRESS, useMotionSafe } from "@/lib/motion";
import { label, type CategoryForecast } from "@/lib/types";

type Props = {
  c: CategoryForecast;
  scale: number; // the amount that fills the whole bar
  budget?: number;
  open: boolean;
  onToggle: () => void;
};

/**
 * One category. The bar reads left to right: solid = spent so far, light = forecast to month-end,
 * tinted band = likely range, dashed tick = last month, thin tick = your budget. Tap for the one-line reason.
 */
export function CategoryCard({ c, scale, budget, open, onToggle }: Props) {
  const { spring } = useMotionSafe();
  const w = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const over = budget !== undefined && budget > 0 && c.predicted > budget;
  const vsLast = pctChange(c.predicted, c.last_month);

  return (
    <motion.li layout transition={spring} className="card rounded-2xl bg-surface">
      <motion.button
        type="button"
        onClick={onToggle}
        whileTap={PRESS}
        transition={spring}
        aria-expanded={open}
        className="flex w-full flex-col gap-2 px-4 py-3 text-left"
      >
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-body font-medium">{label(c.category)}</span>
          <span className="text-body tabular">
            <span className="text-muted">{fmt(c.spent_so_far)} → </span>
            <strong className={over ? "text-danger" : undefined}>{fmt(c.predicted)}</strong>
          </span>
        </div>

        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-hairline" aria-hidden>
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-range" animate={{ width: w(c.high) }} transition={spring} />
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-forecast" animate={{ width: w(c.predicted) }} transition={spring} />
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-spent" animate={{ width: w(c.spent_so_far) }} transition={spring} />
          <motion.div
            className="absolute inset-y-0 w-0 border-l-2 border-dashed border-ghost"
            animate={{ left: w(c.last_month) }}
            transition={spring}
          />
          {budget !== undefined && budget > 0 && (
            <motion.div className={`absolute inset-y-0 w-0.5 ${over ? "bg-danger" : "bg-good"}`} animate={{ left: w(budget) }} transition={spring} />
          )}
        </div>

        <div className="flex justify-between text-caption tabular">
          <span>
            likely {fmt(c.low)}–{fmt(c.high)}
          </span>
          <span>
            last month {fmt(c.last_month)}
            {vsLast && <span className={c.predicted > c.last_month * 1.05 ? " text-warn" : ""}> ({vsLast})</span>}
          </span>
        </div>
      </motion.button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="note"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <p className="border-t border-hairline px-4 py-3 text-body">{c.note}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}
