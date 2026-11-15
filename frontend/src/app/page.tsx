"use client";

// The forecast screen. Flow: Who are you? → matching demo profile → forecast → budget → alerts → detail sheet.

import { useEffect, useMemo, useState } from "react";
import { AlertList } from "@/components/AlertList";
import { CachedTag } from "@/components/CachedTag";
import { CategoryCard } from "@/components/CategoryCard";
import { DetailSheet } from "@/components/DetailSheet";
import { PersonaCards, PersonaSwitch } from "@/components/PersonaPicker";
import { ForecastSkeleton } from "@/components/Skeleton";
import { Summary } from "@/components/Summary";
import { computeAlerts, type Budget } from "@/lib/alerts";
import { getForecast, getProfiles, personaOf } from "@/lib/api";
import type { DemoProfile, ForecastResponse, Persona } from "@/lib/types";

export default function Home() {
  const [persona, setPersona] = useState<Persona | null>(null);
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  // The loaded forecast remembers its persona, so switching shows the skeleton until the new one arrives.
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
    () => Math.max(1, ...(forecast?.categories.map((c) => Math.max(c.high, c.last_month, budget.by_category[c.category] ?? 0)) ?? [])) * 1.04,
    [forecast, budget],
  );
  const openC = forecast?.categories.find((c) => c.category === openCategory) ?? null;

  const setCategoryBudget = (category: string, v: number | undefined) => {
    const by = { ...budget.by_category };
    if (v === undefined) delete by[category];
    else by[category] = v;
    setBudget({ ...budget, by_category: by });
  };

  if (!persona) return <PersonaCards onPick={setPersona} />;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <PersonaSwitch value={persona} onChange={setPersona} />
        {cached && <CachedTag />}
      </div>

      {!forecast ? (
        <ForecastSkeleton />
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)] lg:items-start lg:gap-8">
          <div className="flex flex-col gap-4 lg:sticky lg:top-20">
            <Summary f={forecast} budget={budget} onBudget={setBudget} alerts={alerts} />
          </div>

          <div className="flex min-w-0 flex-col gap-4">
            <AlertList alerts={alerts} onPick={setOpenCategory} />
            <div className="flex items-baseline justify-between px-1">
              <h2 className="text-title">By category</h2>
              <span className="text-caption">{forecast.categories.length} categories</span>
            </div>
            <ul className="flex flex-col gap-3">
              {forecast.categories.map((c) => (
                <CategoryCard key={c.category} c={c} scale={scale} budget={budget.by_category[c.category]} onOpen={() => setOpenCategory(c.category)} />
              ))}
            </ul>
            <p className="text-caption px-1">
              Solid = spent so far · light = forecast · tinted band = likely range · dashed tick = last month. Tap a category for the reason and a
              what-if.
            </p>
          </div>
        </div>
      )}

      <DetailSheet
        c={openC}
        asOf={forecast?.as_of ?? "2015-11-20"}
        budget={openC ? budget.by_category[openC.category] : undefined}
        onBudget={(v) => openC && setCategoryBudget(openC.category, v)}
        onClose={() => setOpenCategory(null)}
      />
    </div>
  );
}
