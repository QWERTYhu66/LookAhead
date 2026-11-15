"use client";

import { motion } from "motion/react";
import { CategoryGlyph, Glyph } from "@/components/Glyph";
import { fmt, pctChange } from "@/lib/format";
import { PRESS, useMotionSafe } from "@/lib/motion";
import { label, type CategoryForecast } from "@/lib/types";

type Props = { c: CategoryForecast; scale: number; budget?: number; onOpen: () => void };

/**
 * One category. The bar reads left to right: solid = spent so far, light = forecast to month-end,
 * tinted band = likely range, dashed tick = last month, coloured tick = your budget. Tap to open the detail sheet.
 */
export function CategoryCard({ c, scale, budget, onOpen }: Props) {
  const { spring } = useMotionSafe();
  const w = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;
  const hasBudget = budget !== undefined && budget > 0;
  const over = hasBudget && c.predicted > budget;
  const vsLast = pctChange(c.predicted, c.last_month);
  const up = c.predicted > c.last_month * 1.05;

  return (
    <motion.li layout transition={spring}>
      <motion.button
        type="button"
        onClick={onOpen}
        whileTap={PRESS}
        transition={spring}
        className="card flex w-full items-center gap-4 px-4 py-3.5 text-left sm:px-5"
        aria-label={`${label(c.category)}: spent ${fmt(c.spent_so_far)}, forecast ${fmt(c.predicted)}. Open details`}
      >
        <CategoryGlyph category={c.category} />
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-headline truncate">{label(c.category)}</span>
            <span className="text-body tabular whitespace-nowrap">
              <span className="text-muted">{fmt(c.spent_so_far)} → </span>
              <strong className={over ? "text-danger" : undefined}>{fmt(c.predicted)}</strong>
            </span>
          </span>

          <span className="relative block h-2.5 w-full overflow-hidden rounded-full bg-hairline" aria-hidden>
            <motion.span className="absolute inset-y-0 left-0 rounded-full bg-range" animate={{ width: w(c.high) }} transition={spring} />
            <motion.span className="absolute inset-y-0 left-0 rounded-full bg-forecast" animate={{ width: w(c.predicted) }} transition={spring} />
            <motion.span className="absolute inset-y-0 left-0 rounded-full bg-spent" animate={{ width: w(c.spent_so_far) }} transition={spring} />
            <motion.span className="absolute inset-y-0 w-0 border-l-2 border-dashed border-ghost" animate={{ left: w(c.last_month) }} transition={spring} />
            {hasBudget && <motion.span className={`absolute inset-y-0 w-0.5 ${over ? "bg-danger" : "bg-good"}`} animate={{ left: w(budget) }} transition={spring} />}
          </span>

          <span className="flex flex-wrap justify-between gap-x-3 text-caption tabular">
            <span className="whitespace-nowrap">
              likely {fmt(c.low)}–{fmt(c.high)}
            </span>
            <span className="whitespace-nowrap">
              last month {fmt(c.last_month)}
              {vsLast && <span className={up ? " text-warn" : ""}> ({vsLast})</span>}
            </span>
          </span>
        </span>
        <Glyph name="arrow" size={16} className="hidden shrink-0 text-muted sm:block" />
      </motion.button>
    </motion.li>
  );
}
