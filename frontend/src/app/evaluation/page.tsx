"use client";

// "How good is it?" — the honest page: model vs. two simple rules on months it never saw, error by group, where it fails.

import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { CachedTag } from "@/components/CachedTag";
import { getEvaluation } from "@/lib/api";
import { fmt } from "@/lib/format";
import { useMotionSafe } from "@/lib/motion";
import { label, type Evaluation } from "@/lib/types";

function Tile({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="card flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3">
      <span className="text-caption">{title}</span>
      <span className="text-title tabular">{value}</span>
      {sub && <span className="text-caption">{sub}</span>}
    </div>
  );
}

function Bar({ value, max, strong }: { value: number; max: number; strong?: boolean }) {
  const { spring } = useMotionSafe();
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-hairline">
      <motion.div className={`h-full rounded-full ${strong ? "bg-accent" : "bg-forecast"}`} initial={{ width: 0 }} animate={{ width: `${(value / max) * 100}%` }} transition={spring} />
    </div>
  );
}

export default function EvaluationPage() {
  const [ev, setEv] = useState<Evaluation | null>(null);
  const [cached, setCached] = useState(false);
  useEffect(() => {
    getEvaluation().then(({ data, cached }) => {
      setEv(data);
      setCached(cached);
    });
  }, []);
  if (!ev) return <p className="text-body text-muted">Loading…</p>;

  const better = ((ev.mae.same_pace - ev.mae.model) / ev.mae.same_pace) * 100;
  const maxMae = Math.max(ev.mae.model, ev.mae.last_month, ev.mae.same_pace);

  return (
    <div className="flex flex-col gap-8">
      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-display">How good is it?</h1>
          {cached && <CachedTag />}
        </div>
        <p className="text-body">
          Tested on {ev.dataset.test_period}, three months the model never saw, across {fmt(ev.dataset.users)} people. Lower error is better.
          The model&apos;s average error is <strong>{better >= 0 ? `${better.toFixed(0)}% lower` : `${Math.abs(better).toFixed(0)}% higher`}</strong> than
          the best simple rule.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-title">Model vs. two simple rules</h2>
        {[
          { name: "Our model", v: ev.mae.model, strong: true },
          { name: "Rule: same pace as so far", v: ev.mae.same_pace },
          { name: "Rule: same as last month", v: ev.mae.last_month },
        ].map((r) => (
          <div key={r.name} className="flex flex-col gap-1">
            <div className="flex justify-between text-body tabular">
              <span>{r.name}</span>
              <span>{fmt(r.v)}</span>
            </div>
            <Bar value={r.v} max={maxMae} strong={r.strong} />
          </div>
        ))}
        <p className="text-caption">Average error per category-month (units). A handful of huge months pull the average up, so the typical error is much smaller.</p>
        <div className="grid grid-cols-3 gap-3">
          <Tile title="Typical error, model" value={fmt(ev.median_error.model)} sub="median" />
          <Tile title="Typical error, same pace" value={fmt(ev.median_error.same_pace)} sub="median" />
          <Tile title="Real value inside the range" value={`${Math.round(ev.range_coverage * 100)}%`} sub="of the time" />
        </div>
      </section>

      {ev.by_group.map((g) => (
        <section key={g.group_name} className="flex flex-col gap-3">
          <h2 className="text-title">Does it work equally well for everyone?</h2>
          <p className="text-caption">By {g.group_name}. The model never sees this information.</p>
          {g.groups.map((row) => {
            const max = Math.max(...g.groups.map((x) => Math.max(x.model, x.last_month)));
            return (
              <div key={row.label} className="flex flex-col gap-1">
                <div className="flex justify-between text-body tabular">
                  <span>
                    {row.label} <span className="text-caption">({fmt(row.n_users)} people)</span>
                  </span>
                  <span>
                    {fmt(row.model)} <span className="text-caption">vs rule {fmt(row.last_month)}</span>
                  </span>
                </div>
                <Bar value={row.model} max={max} strong />
              </div>
            );
          })}
        </section>
      ))}

      <section className="flex flex-col gap-3">
        <h2 className="text-title">Where it fails</h2>
        <ul className="flex flex-col gap-2">
          {ev.failures.map((f) => (
            <li key={`${f.user_id}-${f.category}-${f.month}`} className="card flex flex-col gap-1 rounded-2xl bg-surface px-4 py-3">
              <span className="text-body font-medium">
                {label(f.category)}, {f.month} · user {f.user_id}
              </span>
              <span className="text-body tabular">
                predicted {fmt(f.predicted)} · actual {fmt(f.actual)}
              </span>
              <span className="text-caption">{f.why}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-caption">
        Data: {ev.dataset.name} (<a className="underline" href={ev.dataset.source_url}>source</a>). Trained on {ev.dataset.train_period}.
      </p>
    </div>
  );
}
