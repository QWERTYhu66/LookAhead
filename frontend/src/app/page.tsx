"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AlertList } from "@/components/AlertList";
import { CachedTag } from "@/components/CachedTag";
import { CategoryCard } from "@/components/CategoryCard";
import { DetailSheet } from "@/components/DetailSheet";
import { PersonaCards } from "@/components/PersonaPicker";
import { ForecastSkeleton } from "@/components/Skeleton";
import { Summary } from "@/components/Summary";
import { Glyph } from "@/components/Glyph";
import { computeAlerts, type Budget } from "@/lib/alerts";
import { getForecast, getProfiles, personaOf } from "@/lib/api";
import { clearSession, getSession } from "@/lib/auth";
import type { DemoProfile, ForecastResponse, Persona } from "@/lib/types";

const PERSONA_CHOICES: { id: Persona; title: string }[] = [
  { id: "student", title: "Student" },
  { id: "family", title: "Family" },
  { id: "business", title: "Business" },
];

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    if (!getSession()) router.replace("/login");
  }, [router]);

  const [persona, setPersona] = useState<Persona | null>(null);
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [loaded, setLoaded] = useState<{ persona: Persona; data: ForecastResponse; cached: boolean } | null>(null);
  const [budget, setBudget] = useState<Budget>({ by_category: {} });
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

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
    () =>
      Math.max(
        1,
        ...(forecast?.categories.map((c) => Math.max(c.high, c.last_month, budget.by_category[c.category] ?? 0)) ?? []),
      ) * 1.04,
    [forecast, budget],
  );
  const openCatName = openCategory ?? "";
  const openC = forecast?.categories.find((c) => c.category === openCatName) ?? null;

  const moneyLeft = forecast
    ? Math.max(0, (budget.total ?? forecast.total.predicted) - forecast.total.spent_so_far) - forecast.total.predicted
    : 0;

  const setCategoryBudget = (category: string, v: number | undefined) => {
    const by = { ...budget.by_category };
    if (v === undefined) delete by[category];
    else by[category] = v;
    setBudget({ ...budget, by_category: by });
  };

  const handleLogout = () => {
    clearSession();
    router.push("/login");
    router.refresh();
  };

  if (!persona) return <PersonaCards onPick={setPersona} />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="material sticky top-0 z-30 border-b border-hairline">
        <nav className="mx-auto flex max-w-[1040px] items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => setPersona("student")}>
            <span className="tint flex h-9 w-9 items-center justify-center rounded-lg" style={{ ["--tint" as string]: "var(--accent)" }}>
              <Glyph name="arrow" size={16} />
            </span>
            <span className="text-title font-black tracking-tighter text-gold">LookAhead</span>
          </div>
          <div role="radiogroup" aria-label="Who are you" className="inline-flex rounded-full bg-surface-2 p-1 border border-hairline">
            {PERSONA_CHOICES.map((p) => {
              const active = persona === p.id;
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPersona(p.id)}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: "spring", bounce: 0, duration: 0.2 }}
                  className={`relative rounded-full px-3 py-1.5 text-caption font-bold transition-colors ${active ? "text-black bg-accent" : "text-muted"}`}
                >
                  {p.title}
                </motion.button>
              );
            })}
          </div>
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              onClick={() => setLogoutOpen(true)}
              whileTap={{ scale: 0.95 }}
              className="rounded-full bg-surface-2 px-3 py-1.5 text-caption font-bold text-muted border border-hairline hover:bg-accent hover:text-black transition-colors"
            >
              Sign out
            </motion.button>
          </div>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-[1040px] flex-1 px-4 pb-16 pt-8 sm:px-6 sm:pt-10">
        <div className="flex flex-wrap items-center gap-3 mb-2">
          {cached && <CachedTag />}
          <span className="text-eyebrow">Month-end forecast · {forecast?.as_of ?? "2015-11-20"}</span>
        </div>

        {!forecast ? (
          <ForecastSkeleton />
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[380px_minmax(0,1fr)] lg:gap-10">
            <div className="flex flex-col gap-5 lg:sticky lg:top-24">
              <Summary f={forecast} budget={budget} onBudget={setBudget} moneyLeft={moneyLeft} />
            </div>

            <div className="flex min-w-0 flex-col gap-6">
              <AlertList alerts={alerts} onPick={setOpenCategory} moneyLeft={moneyLeft} />
              <div className="flex items-baseline justify-between px-1">
                <h2 className="text-title font-black">By category</h2>
                <span className="text-caption">{forecast.categories.length} categories</span>
              </div>
              <ul className="flex flex-col gap-3">
                {forecast.categories.map((c) => (
                  <CategoryCard key={c.category} c={c} scale={scale} budget={budget.by_category[c.category]} onOpen={() => setOpenCategory(c.category)} />
                ))}
              </ul>
              <p className="text-caption px-1 max-w-prose">
                Solid = spent so far · light = forecast to month-end · tinted band = likely range · dashed tick = last month · gold tick = your budget.
                Tap a category for the reason and a what-if slider.
              </p>
            </div>
          </div>
        )}

        <DetailSheet
          c={openC}
          asOf={forecast?.as_of ?? "2015-11-20"}
          budget={openCategory ? budget.by_category[openCategory] : undefined}
          onBudget={(v) => openCategory && setCategoryBudget(openCategory, v)}
          onClose={() => setOpenCategory(null)}
        />
      </main>

      <div className="fixed inset-x-0 bottom-0 z-40 bg-surface border-t border-hairline p-4" aria-hidden={!logoutOpen ? "true" : "false"}>
        {logoutOpen && (
          <div className="mx-auto max-w-sm material rounded-2xl p-5 shadow-sheet">
            <h3 className="text-headline mb-2">Sign out of LookAhead?</h3>
            <p className="text-caption mb-4">Your session will be cleared from this device.</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLogoutOpen(false)}
                className="flex-1 rounded-xl border border-hairline bg-surface-2 px-4 py-2.5 text-caption font-bold text-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="flex-1 rounded-xl bg-accent px-4 py-2.5 text-black font-bold text-headline shadow-lg"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      <footer className="mx-auto w-full max-w-[1040px] px-4 pb-10 pt-6 sm:px-6 border-t border-hairline mt-auto">
        <p className="text-caption max-w-prose">
          &ldquo;This project is a prototype and is not financial advice.&rdquo; Amounts are in the dataset&apos;s unspecified units. Built by team
          &ldquo;Claude&rsquo;s Plan&rdquo; for the Veritas AI High School Hackathon 2026.
        </p>
      </footer>
    </div>
  );
}
