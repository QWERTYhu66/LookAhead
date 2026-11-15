"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import type { Budget } from "@/lib/alerts";
import { daysInMonth, dayOf, fmt, monthEnd, pctChange } from "@/lib/format";
import { useMotionSafe } from "@/lib/motion";
import type { ForecastResponse } from "@/lib/types";

type Props = { f: ForecastResponse; budget: Budget; onBudget: (b: Budget) => void; moneyLeft: number };

/** The hero card: the number, its range, your plan, and what is left. */
export function Summary({ f, budget, onBudget, moneyLeft }: Props) {
  const { spring } = useMotionSafe();
  const t = f.total;
  const scale = Math.max(t.high, t.last_month, budget.total ?? 0) * 1.04;
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;

  const day = dayOf(f.as_of);
  const dim = daysInMonth(f.as_of);
  const monthProgress = day / dim;
  const vsLast = pctChange(t.predicted, t.last_month);

  const totalBudget = budget.total;
  const budgetRatio = totalBudget && totalBudget > 0 ? t.predicted / totalBudget : null;
  const overBudget = budgetRatio !== null && budgetRatio > 1;

  return (
    <section className="card strong flex flex-col gap-5 p-5 sm:p-6 border border-accent/30">
      <div className="flex flex-col gap-1">
        <p className="text-eyebrow">Likely spend by {monthEnd(f.as_of)}</p>
        <AnimatedNumber value={t.predicted} className="text-display text-gold" />
        <p className="text-body text-muted tabular">
          between {fmt(t.low)} and {fmt(t.high)}
          {vsLast && (
            <>
              {" · "}
              <span className={t.predicted > t.last_month * 1.05 ? "text-warn" : t.predicted < t.last_month * 0.95 ? "text-good" : ""}>{vsLast}</span> vs last month
            </>
          )}
        </p>
      </div>

      {/* Range bar: band = likely range, dot = forecast, dashed tick = last month, gold tick = budget */}
      <div className="flex flex-col gap-1.5" aria-label={`Forecast ${fmt(t.predicted)}, range ${fmt(t.low)} to ${fmt(t.high)}, last month ${fmt(t.last_month)}`}>
        <div className="relative h-3 w-full rounded-full bg-hairline">
          <motion.div className="absolute inset-y-0 rounded-full bg-range" animate={{ left: pct(t.low), width: `calc(${pct(t.high)} - ${pct(t.low)})` }} transition={spring} />
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-accent" animate={{ width: pct(t.predicted) }} transition={spring} />
          <motion.div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-surface bg-accent shadow" animate={{ left: pct(t.predicted) }} transition={spring} />
          <motion.div className="absolute -inset-y-1 w-0 border-l-2 border-dashed border-ghost" animate={{ left: pct(t.last_month) }} transition={spring} />
          {totalBudget ? <motion.div className={`absolute -inset-y-1 w-0.5 ${overBudget ? "bg-danger" : "bg-accent"}`} animate={{ left: pct(totalBudget) }} transition={spring} /> : null}
        </div>
        <div className="flex justify-between text-caption tabular">
          <span>spent {fmt(t.spent_so_far)}</span>
          <span>last month {fmt(t.last_month)}</span>
        </div>
      </div>

      {/* Budget: the part that&rsquo;s actually useful in real life */}
      <div className="glass flex flex-col gap-3 p-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
              <span className="text-headline font-black">Monthly spending plan</span>
            {totalBudget !== null && totalBudget !== undefined && (
              <span className={`text-caption font-bold ${overBudget ? "text-danger" : "text-good"}`}>
                {overBudget ? "OVER BUDGET" : "ON TRACK"}
              </span>
            )}
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-hairline">
            <motion.div className={`h-full rounded-full transition-all duration-700 ${overBudget ? "bg-danger" : "bg-accent"}`} animate={{ width: `${Math.min(100, (budgetRatio ?? 0) * 100)}%` }} transition={spring} />
          </div>
          <p className={`flex items-baseline gap-1.5 text-caption ${overBudget ? "text-danger" : ""}`}>
            {totalBudget !== null && totalBudget !== undefined
              ? overBudget
                ? `Predicted ${fmt(t.predicted)} — ${fmt(t.predicted - totalBudget)} over your ${fmt(totalBudget)} budget`
                : `${Math.round((budgetRatio ?? 0) * 100)}% of your ${fmt(totalBudget)} budget used by month-end`
              : "Set a monthly budget to see how you're pacing."}
          </p>
        </div>

        <label className="flex flex-col gap-1.5">
            <span className="text-caption font-medium">Set your monthly spending limit</span>
          <input
            className="field text-body"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={`e.g. ${fmt(Math.round(t.last_month / 1000) * 1000 || 1000)}`}
            value={totalBudget ?? ""}
            onChange={(e) => {
              const v = e.target.value === "" ? undefined : Math.max(0, Number(e.target.value));
              onBudget({ ...budget, total: v });
            }}
          />
        </label>

        {totalBudget !== null && totalBudget !== undefined && (
          <div className="flex items-baseline gap-1.5 text-caption">
            <span className="text-muted">Room left if the forecast holds:</span>
            <AnimatedNumber value={totalBudget - t.predicted} className={`text-body tabular font-bold ${moneyLeft < 0 ? "text-danger" : "text-good"}`} />
          </div>
        )}
      </div>

      {/* Pace */}
      <div className="glass flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-headline font-black">Your pace</span>
          <span className="text-caption tabular">day {day} of {dim}</span>
        </div>
        <PaceRow label="Month gone" value={monthProgress} tone="bg-ghost" />
            <PaceRow label="Vs last month's total" value={t.last_month > 0 ? t.spent_so_far / t.last_month : 0} tone={t.spent_so_far / Math.max(t.last_month, 1) > monthProgress + 0.05 ? "bg-warn" : "bg-accent"} />
        <p className="text-caption">
          {t.spent_so_far / Math.max(t.last_month, 1) > monthProgress + 0.05
            ? "Spending faster than last month — tighten up."
            : t.spent_so_far / Math.max(t.last_month, 1) < monthProgress - 0.05
              ? "Spending slower than last month — you're ahead."
              : "Right on last month's pace."}
        </p>
      </div>
    </section>
  );
}

function PaceRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  const { spring } = useMotionSafe();
  return (
    <div className="flex items-center gap-3">
      <span className="w-48 shrink-0 text-caption">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
        <motion.div className={`h-full rounded-full ${tone}`} animate={{ width: `${Math.min(100, value * 100)}%` }} transition={spring} />
      </div>
      <span className="w-10 text-right text-caption tabular">{Math.round(value * 100)}%</span>
    </div>
  );
}
