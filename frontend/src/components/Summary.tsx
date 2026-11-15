"use client";

import { motion } from "motion/react";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Glyph } from "@/components/Glyph";
import type { Budget } from "@/lib/alerts";
import { daysInMonth, dayOf, fmt, monthEnd, pctChange } from "@/lib/format";
import { useMotionSafe } from "@/lib/motion";
import type { Alert, ForecastResponse } from "@/lib/types";

type Props = { f: ForecastResponse; budget: Budget; onBudget: (b: Budget) => void; alerts: Alert[] };

/** The hero card: the number, its range, how the month is pacing, and your budget. */
export function Summary({ f, budget, onBudget, alerts }: Props) {
  const { spring } = useMotionSafe();
  const t = f.total;
  const scale = Math.max(t.high, t.last_month, budget.total ?? 0) * 1.04;
  const pct = (v: number) => `${Math.min(100, (v / scale) * 100)}%`;

  const day = dayOf(f.as_of);
  const dim = daysInMonth(f.as_of);
  const monthProgress = day / dim;
  const spendProgress = t.last_month > 0 ? t.spent_so_far / t.last_month : 0;
  const vsLast = pctChange(t.predicted, t.last_month);

  const totalBudget = budget.total;
  const budgetRatio = totalBudget && totalBudget > 0 ? t.predicted / totalBudget : null;
  const budgetTone = budgetRatio === null ? "" : budgetRatio > 1 ? "bg-danger" : budgetRatio > 0.9 ? "bg-warn" : "bg-good";
  const totalAlert = alerts.find((a) => a.category === "total");

  return (
    <section className="card flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-eyebrow">Likely spend by {monthEnd(f.as_of)}</p>
        <AnimatedNumber value={t.predicted} className="text-display text-gradient" />
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

      {/* Range bar: band = likely range, dot = forecast, dashed tick = last month, thin tick = budget */}
      <div className="flex flex-col gap-1.5" aria-label={`Forecast ${fmt(t.predicted)}, range ${fmt(t.low)} to ${fmt(t.high)}, last month ${fmt(t.last_month)}`}>
        <div className="relative h-3 w-full rounded-full bg-hairline">
          <motion.div className="absolute inset-y-0 rounded-full bg-range" animate={{ left: pct(t.low), width: `calc(${pct(t.high)} - ${pct(t.low)})` }} transition={spring} />
          <motion.div className="absolute inset-y-0 left-0 rounded-full bg-spent" animate={{ width: pct(t.spent_so_far) }} transition={spring} />
          <motion.div className="absolute top-1/2 h-4 w-4 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-surface bg-accent shadow" animate={{ left: pct(t.predicted) }} transition={spring} />
          <motion.div className="absolute -inset-y-1 w-0 border-l-2 border-dashed border-ghost" animate={{ left: pct(t.last_month) }} transition={spring} />
          {totalBudget ? <motion.div className={`absolute -inset-y-1 w-0.5 ${budgetTone}`} animate={{ left: pct(totalBudget) }} transition={spring} /> : null}
        </div>
        <div className="flex justify-between text-caption tabular">
          <span>spent {fmt(t.spent_so_far)}</span>
          <span>last month {fmt(t.last_month)}</span>
        </div>
      </div>

      {/* Pace: how far through the month vs how much of last month's total is gone */}
      <div className="glass flex flex-col gap-2 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-headline">Pace</span>
          <span className="text-caption tabular">
            day {day} of {dim}
          </span>
        </div>
        <PaceRow label="Month gone" value={monthProgress} tone="bg-ghost" />
        <PaceRow label="Of last month's total spent" value={spendProgress} tone={spendProgress > monthProgress + 0.05 ? "bg-warn" : "bg-spent"} />
        <p className="text-caption">
          {spendProgress > monthProgress + 0.05
            ? "You're spending faster than the calendar."
            : spendProgress < monthProgress - 0.05
              ? "You're behind last month's pace — in a good way."
              : "Right on last month's pace."}
        </p>
      </div>

      {/* Budget */}
      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-headline">Budget for the month</span>
          <input
            className="field text-body"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder={`e.g. ${fmt(Math.round(t.last_month / 1000) * 1000 || 1000)}`}
            value={totalBudget ?? ""}
            onChange={(e) => onBudget({ ...budget, total: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) })}
          />
        </label>
        {budgetRatio !== null && (
          <div className="flex flex-col gap-1.5">
            <div className="h-2 w-full overflow-hidden rounded-full bg-hairline">
              <motion.div className={`h-full rounded-full ${budgetTone}`} animate={{ width: `${Math.min(100, budgetRatio * 100)}%` }} transition={spring} />
            </div>
            <p className={`flex items-center gap-1.5 text-caption ${totalAlert ? "text-danger" : ""}`}>
              {totalAlert && <Glyph name="warn" size={14} />}
              {totalAlert
                ? `On track to go over by ${fmt(totalAlert.over_by)}`
                : `${Math.round(budgetRatio * 100)}% of budget used by month-end, if the forecast holds`}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function PaceRow({ label, value, tone }: { label: string; value: number; tone: string }) {
  const { spring } = useMotionSafe();
  return (
    <div className="flex items-center gap-3">
      <span className="w-44 shrink-0 text-caption">{label}</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-hairline">
        <motion.div className={`h-full rounded-full ${tone}`} animate={{ width: `${Math.min(100, value * 100)}%` }} transition={spring} />
      </div>
      <span className="w-10 text-right text-caption tabular">{Math.round(value * 100)}%</span>
    </div>
  );
}
