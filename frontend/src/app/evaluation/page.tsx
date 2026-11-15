"use client";

// "How good is it?" — the honest page: model vs. two simple rules on months it never saw, error by group, where it fails.

import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CachedTag } from "@/components/CachedTag";
import { CategoryGlyph } from "@/components/Glyph";
import { getEvaluation } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { fmt } from "@/lib/format";
import { useMotionSafe } from "@/lib/motion";
import { label, type Evaluation } from "@/lib/types";

function Bar({ value, max, tone = "bg-forecast", height = "h-2.5" }: { value: number; max: number; tone?: string; height?: string }) {
  const { spring } = useMotionSafe();
  return (
    <div className={`${height} w-full overflow-hidden rounded-full bg-hairline`}>
      <motion.div className={`h-full rounded-full ${tone}`} initial={{ width: "0%" }} animate={{ width: `${(value / max) * 100}%` }} transition={spring} />
    </div>
  );
}

function Tile({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <div className="card flex flex-col gap-0.5 px-4 py-3.5">
      <span className="text-caption">{title}</span>
      <span className="text-title tabular">{value}</span>
      {sub && <span className="text-caption">{sub}</span>}
    </div>
  );
}

export default function EvaluationPage() {
  const router = useRouter();

  useEffect(() => {
    if (!getSession()) router.replace("/login");
  }, [router]);

  const [ev, setEv] = useState<Evaluation | null>(null);
  const [cached, setCached] = useState(false);
  const { spring, enter, shown } = useMotionSafe();

  useEffect(() => {
    getEvaluation().then(({ data, cached }) => {
      setEv(data);
      setCached(cached);
    });
  }, []);

  if (!ev) {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-4 w-full max-w-prose" />
        <div className="skeleton h-40 w-full" />
      </div>
    );
  }

  const bestRule = Math.min(ev.mae.same_pace, ev.mae.last_month);
  const better = ((bestRule - ev.mae.model) / bestRule) * 100;
  const maxMae = Math.max(ev.mae.model, ev.mae.last_month, ev.mae.same_pace);
  const rows = [
    { name: "Our model", v: ev.mae.model, tone: "bg-accent" },
    { name: "Rule: same pace as so far", v: ev.mae.same_pace, tone: "bg-forecast" },
    { name: "Rule: same as last month", v: ev.mae.last_month, tone: "bg-forecast" },
  ];

  return (
    <motion.div initial={enter} animate={shown} transition={spring} className="flex flex-col gap-10">
      <section className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <p className="text-eyebrow">Tested on {ev.dataset.test_period}, months the model never saw</p>
          {cached && <CachedTag />}
        </div>
        <h1 className="text-display text-gold font-black">
          {better >= 0 ? `${better.toFixed(0)}% less error` : `${Math.abs(better).toFixed(0)}% more error`} than the best simple rule.
        </h1>
        <p className="text-body text-muted max-w-prose">
          Across {fmt(ev.dataset.users)} people and every category, we forecast each month from day 20 and compared the guess with what
          happened. Lower error is better. Nothing below was tuned on these months.
        </p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
        <section className="card flex flex-col gap-4 p-5 sm:p-6">
          <h2 className="text-title">Model vs. two simple rules</h2>
          <div className="flex flex-col gap-3">
            {rows.map((r) => (
              <div key={r.name} className="flex flex-col gap-1.5">
                <div className="flex justify-between text-body tabular">
                  <span>{r.name}</span>
                  <span className="font-medium">{fmt(r.v)}</span>
                </div>
                <Bar value={r.v} max={maxMae} tone={r.tone} />
              </div>
            ))}
          </div>
          <p className="text-caption">
            Average error per category-month, in the dataset&apos;s units. A few business-sized months pull every average up; the typical
            (median) error is far smaller.
          </p>
        </section>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
          <Tile title="Typical error, model" value={fmt(ev.median_error.model)} sub="median" />
          <Tile title="Typical error, best rule" value={fmt(Math.min(ev.median_error.same_pace, ev.median_error.last_month))} sub="median" />
          <Tile title="Real value inside the range" value={`${Math.round(ev.range_coverage * 100)}%`} sub="of the time" />
          <Tile title="People in the test" value={fmt(ev.dataset.users)} sub="all categories" />
        </div>
      </div>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title">Does it work equally well for everyone?</h2>
          <p className="text-caption">The model never sees any of this information. Bars: model (blue) vs. the &ldquo;last month&rdquo; rule (grey).</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {ev.by_group.map((g) => {
            const max = Math.max(...g.groups.map((x) => Math.max(x.model, x.last_month)));
            return (
              <div key={g.group_name} className="card flex flex-col gap-4 p-5">
                <span className="text-headline">By {g.group_name}</span>
                {g.groups.map((row) => (
                  <div key={row.label} className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-body tabular">
                      <span>
                        {row.label} <span className="text-caption">· {fmt(row.n_users)} people</span>
                      </span>
                      <span className="text-caption">
                        <span className="text-foreground font-medium">{fmt(row.model)}</span> vs {fmt(row.last_month)}
                      </span>
                    </div>
                    <Bar value={row.model} max={max} tone="bg-accent" height="h-2" />
                    <Bar value={row.last_month} max={max} tone="bg-forecast" height="h-1.5" />
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-title">Where it fails</h2>
          <p className="text-caption">The biggest misses, with our honest reading of why.</p>
        </div>
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-3">
          {ev.failures.map((f) => (
            <li key={`${f.user_id}-${f.category}-${f.month}`} className="card flex flex-col gap-3 p-5">
              <div className="flex items-center gap-3">
                <CategoryGlyph category={f.category} size={32} />
                <div className="flex flex-col">
                  <span className="text-headline">{label(f.category)}</span>
                  <span className="text-caption">
                    {f.month} · user {f.user_id}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-surface-2 px-3 py-2">
                  <div className="text-caption">predicted</div>
                  <div className="text-body tabular">{fmt(f.predicted)}</div>
                </div>
                <div className="rounded-xl bg-surface-2 px-3 py-2">
                  <div className="text-caption">actual</div>
                  <div className="text-body tabular">{fmt(f.actual)}</div>
                </div>
              </div>
              <p className="text-caption">{f.why}</p>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-caption">
        Data: {ev.dataset.name} (
        <a className="underline" href={ev.dataset.source_url}>
          source
        </a>
        ). Trained on {ev.dataset.train_period}; tested on {ev.dataset.test_period}.
      </p>
    </motion.div>
  );
}
