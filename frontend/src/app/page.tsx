"use client";

// The forecast screen. Flow: Who are you? → pick the matching demo profile → forecast → optional budget → alerts.

import { useEffect, useMemo, useState } from "react";
import { AlertList } from "@/components/AlertList";
import { BudgetBox } from "@/components/BudgetBox";
import { CachedTag } from "@/components/CachedTag";
import { CategoryCard } from "@/components/CategoryCard";
import { PersonaCards, PersonaSwitch } from "@/components/PersonaPicker";
import { SummaryHeader } from "@/components/SummaryHeader";
import { computeAlerts, type Budget } from "@/lib/alerts";
import { getForecast, getProfiles, personaOf } from "@/lib/api";
import type { DemoProfile, ForecastResponse, Persona } from "@/lib/types";

export default function Home() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  // The loaded forecast remembers which persona it belongs to, so switching persona shows "working out…" until the new one arrives.
  const [loaded, setLoaded] = useState<{ persona: Persona; data: ForecastResponse; cached: boolean } | null>(null);
  const [budget, setBudget] = useState<Budget>({ by_category: {} });
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  useEffect(() => {
    getProfiles().then(({ data }) => setProfiles(data));
  }, []);

  useEffect(() => {
    if (!persona) return;
    const profile = profiles.find((p) => personaOf(p) === persona) ?? { id: `${persona}_a`, label: persona, as_of: "2015-11-20" };
    let alive = true;
    getForecast(profile).then(({ data, cached }) => {
      if (alive) setLoaded({ persona, data, cached });
    });
    return () => {
      alive = false;
    };
  }, [persona, profiles]);

  const forecast = loaded && loaded.persona === persona ? loaded.data : null;
  const cached = loaded?.cached ?? false;

  const alerts = useMemo(() => (forecast ? computeAlerts(forecast.categories, forecast.total, budget) : []), [forecast, budget]);
  const scale = useMemo(
    () => Math.max(1, ...(forecast?.categories.map((c) => Math.max(c.high, c.last_month, budget.by_category[c.category] ?? 0)) ?? [])),
    [forecast, budget],
  );

  if (!persona) return <PersonaCards onPick={setPersona} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <PersonaSwitch value={persona} onChange={setPersona} />
        {cached && <CachedTag />}
      </div>

      {!forecast ? (
        <p className="text-body text-muted">Working out your month…</p>
      ) : (
        <>
          <SummaryHeader f={forecast} />

          <AlertList alerts={alerts} />

          <ul className="flex flex-col gap-2">
            {forecast.categories.map((c) => (
              <CategoryCard
                key={c.category}
                c={c}
                scale={scale}
                budget={budget.by_category[c.category]}
                open={openCategory === c.category}
                onToggle={() => setOpenCategory((o) => (o === c.category ? null : c.category))}
              />
            ))}
          </ul>
          <p className="text-caption">
            Solid = spent so far · light = forecast · tinted band = likely range · dashed tick = last month. Tap a category for the reason.
          </p>

          <BudgetBox categories={forecast.categories} budget={budget} onChange={setBudget} />
        </>
      )}
    </div>
  );
}
