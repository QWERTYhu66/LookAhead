"use client";

// A bottom sheet in the Apple sense: it tracks the finger 1:1, rubber-bands at the top, and a flick
// dismisses it based on velocity (not just distance). It enters and leaves along the same path.

import { AnimatePresence, motion, type PanInfo } from "motion/react";
import { useEffect, useState } from "react";
import { CategoryGlyph } from "@/components/Glyph";
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
  const [cut, setCut] = useState(0); // what-if: cut the rest of the month by this share

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

  return (
    <AnimatePresence onExitComplete={() => setCut(0)}>
      {c && (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-30 bg-black/40"
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
            className="material-thick fixed inset-x-0 bottom-0 z-40 mx-auto flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl sm:bottom-6 sm:rounded-3xl"
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
              <span className="h-1.5 w-10 rounded-full bg-ghost/60" />
            </div>

            <div className="flex flex-col gap-5 overflow-y-auto px-5 pb-6 pt-3 sm:px-6" style={{ touchAction: "pan-y" }}>
              <div className="flex items-center gap-3">
                <CategoryGlyph category={c.category} size={40} />
                <div className="flex flex-col">
                  <span className="text-title">{label(c.category)}</span>
                  <span className="text-caption">by {monthEnd(asOf)}</span>
                </div>
                <motion.button type="button" onClick={onClose} whileTap={PRESS_SOFT} transition={spring} className="ml-auto rounded-full bg-hairline px-3 py-1 text-caption text-foreground">
                  Done
                </motion.button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <Stat title="Spent so far" value={fmt(c.spent_so_far)} />
                <Stat title="Forecast" value={fmt(c.predicted)} sub={`${fmt(c.low)}–${fmt(c.high)}`} strong />
                <Stat title="Last month" value={fmt(c.last_month)} sub={pctChange(c.predicted, c.last_month) ?? undefined} />
              </div>

              <p className="text-body">{c.note}</p>

              <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 p-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-headline">What if I cut the rest of the month?</span>
                  <span className="text-caption tabular">−{Math.round(cut * 100)}%</span>
                </div>
                <input className="slider" type="range" min={0} max={100} step={5} value={Math.round(cut * 100)} onChange={(e) => setCut(Number(e.target.value) / 100)} aria-label="Cut the rest of the month by" />
                <p className="text-body tabular">
                  You&apos;d end the month at <strong className={over ? "text-danger" : undefined}>{fmt(whatIf)}</strong>
                  {budget !== undefined && budget > 0 && (
                    <span className="text-muted"> — {over ? `${fmt(whatIf - budget)} over` : `${fmt(budget - whatIf)} under`} your budget</span>
                  )}
                </p>
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-headline">Budget for {label(c.category).toLowerCase()}</span>
                <input
                  className="field text-body"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={`e.g. ${fmt(Math.round(c.last_month / 100) * 100 || 100)}`}
                  value={budget ?? ""}
                  onChange={(e) => onBudget(e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)))}
                />
              </label>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function Stat({ title, value, sub, strong }: { title: string; value: string; sub?: string; strong?: boolean }) {
  return (
    <div className="flex flex-col rounded-2xl bg-surface-2 px-3 py-2.5">
      <span className="text-caption">{title}</span>
      <span className={`tabular ${strong ? "text-headline" : "text-body"}`}>{value}</span>
      {sub && <span className="text-caption tabular">{sub}</span>}
    </div>
  );
}
