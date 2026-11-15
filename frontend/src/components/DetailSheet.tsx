"use client";

// Bottom sheet: the one place a user actually manages a category.
// Shows safe-to-spend, daily pace, and a concrete what-if that tells you
// exactly how much to cut to get back on budget — usable in real life.

import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useEffect, useState } from "react";
import { CategoryGlyph, Glyph } from "@/components/Glyph";
import { fmt, monthEnd, pctChange } from "@/lib/format";
import { PRESS_SOFT, SHEET_CLOSE_OFFSET, SHEET_CLOSE_VELOCITY, useMotionSafe } from "@/lib/motion";
import { label, type CategoryForecast } from "@/lib/types";

type Props = {
  c: CategoryForecast | null;
  asOf: string;
  budget?: number;
  onBudget: (v: number | undefined) => void;
  onClose: () => void;
};

export function DetailSheet({ c, asOf, budget, onBudget, onClose }: Props) {
  const { reduced, spring, sheetSpring, sheetHidden, sheetShown } = useMotionSafe();
  const [cut, setCut] = useState(0);
  const [preset, setPreset] = useState<"none" | "last_month" | "forecast">("none");

  useEffect(() => {
    if (!c) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [c, onClose]);

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.velocity.y > SHEET_CLOSE_VELOCITY || info.offset.y > SHEET_CLOSE_OFFSET) onClose();
  };

  const remaining = c ? Math.max(0, c.predicted - c.spent_so_far) : 0;
  const whatIf = c ? c.spent_so_far + remaining * (1 - cut) : 0;
  const over = c && budget !== undefined && budget > 0 && whatIf > budget;
  const safeToSpend = c ? Math.max(0, (budget ?? Infinity) - c.spent_so_far) : 0;

  // Days remaining in the month, derived from the as-of date.
  const dayOfMonth = Number(asOf.slice(8, 10));
  const daysInMonth = new Date(Number(asOf.slice(0, 4)), Number(asOf.slice(5, 7)), 0).getDate();
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth);

  // How much per day for the rest of the month to stay on budget.
  const perDay = c ? Math.max(0, safeToSpend / daysRemaining) : 0;

  const cutToBudget = c && budget !== undefined && budget > 0 && remaining > 0
    ? Math.max(0, 1 - budget / remaining)
    : 0;

  const presetAmount =
    preset !== "none" && c
      ? preset === "last_month"
        ? c.last_month
        : c.predicted
      : undefined;

  const handlePreset = (p: "none" | "last_month" | "forecast") => {
    setPreset(p);
    if (p === "none") return;
    onBudget(presetAmount);
  };

  return (
    <AnimatePresence onExitComplete={() => setCut(0)}>
      {c && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-30 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
            onClick={onClose}
          />
          <motion.div
            key="sheet"
            role="dialog"
            aria-modal
            aria-label={`${label(c.category)} details`}
            className="material-thick fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[90vh] w-full max-w-lg flex-col rounded-t-3xl sm:bottom-6 sm:rounded-3xl border-t border-hairline"
            style={{ touchAction: "none" }}
            initial={sheetHidden}
            animate={sheetShown}
            exit={sheetHidden}
            transition={sheetSpring}
            drag={reduced ? false : "y"}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0.06, bottom: 0.7 }}
            onDragEnd={onDragEnd}
          >
            <div className="flex justify-center pt-3" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-accent/20 border border-accent/30" />
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-8 pt-3 sm:px-6" style={{ touchAction: "pan-y" }}>
              <div className="flex items-center gap-3">
                <CategoryGlyph category={c.category} size={44} />
                <div className="flex flex-col">
                  <span className="text-title font-black">{label(c.category)}</span>
                  <span className="text-caption">month-end forecast · {monthEnd(asOf)}</span>
                </div>
                <motion.button type="button" onClick={onClose} whileTap={PRESS_SOFT} transition={spring} className="ml-auto rounded-full bg-surface-2 px-3 py-1 text-caption text-foreground border border-hairline">
                  Done
                </motion.button>
              </div>

              {/* Headline numbers */}
              <div className="grid grid-cols-3 gap-3">
                <Stat title="Spent so far" value={fmt(c.spent_so_far)} tone="muted" />
                <Stat title="Forecast" value={fmt(c.predicted)} sub={`${fmt(c.low)}–${fmt(c.high)}`} tone="accent" />
                <Stat title="Last month" value={fmt(c.last_month)} sub={pctChange(c.predicted, c.last_month) ?? undefined} tone="ghost" />
              </div>

              <p className="text-body">{c.note}</p>

              {/* Budget + safe to spend */}
              <div className="glass flex flex-col gap-3 p-4 border border-hairline">
                <div className="flex flex-col gap-1.5">
                  <span className="text-caption font-bold text-accent">Safe to spend the rest of the month</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-display text-gold font-black tabular">
                      {budget !== undefined && budget > 0 ? fmt(safeToSpend) : "—"}
                    </span>
                    {budget !== undefined && budget > 0 && (
                      <span className="text-caption text-muted">of {fmt(budget)} budget</span>
                    )}
                  </div>
                  <p className="text-caption">
                    {budget !== undefined && budget > 0
                      ? safeToSpend <= 0
                        ? "You&rsquo;re already at your budget — any more puts you over."
                        : `That&rsquo;s about ${fmt(perDay)} per day for the rest of the month.`
                      : "Set a budget below to see your safe-to-spend limit."}
                  </p>
                </div>

                <div className="flex items-baseline gap-2">
                  <label className="text-caption font-bold">Budget for {label(c.category).toLowerCase()}</label>
                  {budget !== undefined && budget > 0 && (
                    <span className={`text-caption font-bold ml-auto ${over ? "text-danger" : "text-good"}`}>
                      {over ? "OVER" : "OK"}
                    </span>
                  )}
                </div>
                <input
                  className="field text-body tabular"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={`e.g. ${fmt(Math.round(c.last_month / 100) * 100 || 100)}`}
                  value={budget ?? ""}
                  onChange={(e) => {
                    setPreset("none");
                    onBudget(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)));
                  }}
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreset("last_month")}
                    disabled={preset === "last_month" || c.last_month <= 0}
                    className="flex-1 rounded-xl border border-hairline bg-surface-2 px-3 py-2 text-caption font-bold text-muted disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Match last month ({fmt(c.last_month)})
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreset("forecast")}
                    disabled={preset === "forecast"}
                    className="flex-1 rounded-xl border border-hairline bg-surface-2 px-3 py-2 text-caption font-bold text-muted disabled:opacity-40 disabled:pointer-events-none"
                  >
                    Match forecast ({fmt(c.predicted)})
                  </button>
                </div>
              </div>

              {/* What-if: concrete cut recommendation */}
              <div className="glass flex flex-col gap-3 p-4 border border-hairline">
                <div className="flex items-baseline gap-1">
                  <span className="text-caption font-bold text-accent">What if you cut the rest of the month?</span>
                  <span className="text-caption font-bold ml-auto text-gold">−{Math.round(cut * 100)}%</span>
                </div>
                <input
                  className="slider"
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(cut * 100)}
                  onChange={(e) => {
                    setCut(Number(e.target.value) / 100);
                    setPreset("none");
                  }}
                  aria-label="Cut the rest of the month by"
                />
                <div className="flex items-baseline gap-1.5 text-body tabular">
                  <span>You&rsquo;d end the month at</span>
                  <strong className="text-gold font-black">{fmt(whatIf)}</strong>
                  {budget !== undefined && budget > 0 && (
                    <>
                      <span className="text-muted">—</span>
                      <span className={`font-bold ${over ? "text-danger" : "text-good"}`}>
                        {over ? `${fmt(whatIf - budget)} over budget` : `${fmt(budget - whatIf)} under budget`}
                      </span>
                    </>
                  )}
                </div>
                {c.predicted > c.spent_so_far && remaining > 0 && (
                  <div className="flex items-center gap-2 px-1">
                    <Glyph name="arrow" size={14} className="shrink-0 text-muted" />
                    <span className={`text-caption font-bold ${over ? "text-danger" : "text-good"}`}>
                      {over
                        ? `Cut the rest of the month by ${Math.round(cutToBudget * 100)}% to hit your budget`
                        : `You&rsquo;re within budget — no cut needed`}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ title, value, sub, tone }: { title: string; value: string; sub?: string; tone?: "muted" | "accent" | "ghost" }) {
  const toneClass = tone === "accent" ? "text-gold font-black" : tone === "ghost" ? "text-muted" : "text-muted";
  return (
    <div className="rounded-2xl bg-surface-2 p-3 border border-hairline">
      <span className="text-caption font-bold">{title}</span>
      <span className={`tabular text-body ${toneClass}`}>{value}</span>
      {sub && <span className="text-caption tabular">{sub}</span>}
    </div>
  );
}
