"use client";

import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import type { Budget } from "@/lib/alerts";
import { PRESS, useMotionSafe } from "@/lib/motion";
import { label, type CategoryForecast } from "@/lib/types";

type Props = { categories: CategoryForecast[]; budget: Budget; onChange: (b: Budget) => void };

/** Type a budget for the month, or per category. Alerts update as you type. */
export function BudgetBox({ categories, budget, onChange }: Props) {
  const [showAll, setShowAll] = useState(false);
  const { spring } = useMotionSafe();
  const num = (v: string) => (v.trim() === "" ? undefined : Math.max(0, Number(v)));

  return (
    <section className="card flex flex-col gap-3 rounded-2xl bg-surface px-4 py-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-title">Your budget</h2>
        <motion.button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          whileTap={PRESS}
          transition={spring}
          className="text-caption text-accent"
        >
          {showAll ? "Hide categories" : "Per category"}
        </motion.button>
      </div>
      <label className="flex flex-col gap-1 text-caption">
        Whole month
        <input
          className="field text-body"
          type="number"
          inputMode="numeric"
          min={0}
          placeholder="e.g. 50000"
          value={budget.total ?? ""}
          onChange={(e) => onChange({ ...budget, total: num(e.target.value) })}
        />
      </label>
      <AnimatePresence initial={false}>
        {showAll && (
          <motion.div
            key="per-category"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-2 gap-3 pt-1">
              {categories.map((c) => (
                <label key={c.category} className="flex flex-col gap-1 text-caption">
                  {label(c.category)}
                  <input
                    className="field text-body"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={budget.by_category[c.category] ?? ""}
                    onChange={(e) => {
                      const v = num(e.target.value);
                      const by = { ...budget.by_category };
                      if (v === undefined) delete by[c.category];
                      else by[c.category] = v;
                      onChange({ ...budget, by_category: by });
                    }}
                  />
                </label>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
