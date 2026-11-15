"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
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
import { getForecast, getForecastForTransactions, getProfiles, personaOf } from "@/lib/api";
import { clearSession, getSession, type SessionUser } from "@/lib/auth";
import type { DemoProfile, ForecastRequest, ForecastResponse, Persona, Transaction } from "@/lib/types";

const PERSONA_CHOICES: { id: Persona; title: string }[] = [
  { id: "student", title: "Student" },
  { id: "family", title: "Family" },
  { id: "business", title: "Business" },
];

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"' && line[i + 1] === '"') { value += '"'; i += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === "," && !quoted) { values.push(value.trim()); value = ""; }
    else value += char;
  }
  values.push(value.trim());
  return values;
}

function parseTransactionsCsv(text: string): ForecastRequest {
  const lines = text.split(/\r?\n/).filter((line) => line.trim());
  if (lines.length < 2) throw new Error("The CSV needs a header row and at least one transaction.");
  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase().replace(/^\uFEFF/, "").trim());
  const dateIndex = headers.findIndex((header) => ["date", "transaction_date", "posted_date"].includes(header));
  const amountIndex = headers.findIndex((header) => ["amount", "value", "debit", "spent"].includes(header));
  const categoryIndex = headers.findIndex((header) => ["category", "type", "merchant_category"].includes(header));
  const descriptionIndex = headers.findIndex((header) => ["description", "merchant", "name"].includes(header));
  if (dateIndex < 0 || amountIndex < 0 || categoryIndex < 0) throw new Error("Include date, amount, and category columns.");
  const transactions: Transaction[] = lines.slice(1).map((line, row) => {
    const cells = parseCsvLine(line);
    const date = new Date(cells[dateIndex]);
    const amount = Number(cells[amountIndex].replace(/[$,]/g, "").replace(/[()]/g, ""));
    if (Number.isNaN(date.getTime()) || !Number.isFinite(amount)) throw new Error(`Row ${row + 2} has an invalid date or amount.`);
    return { date: date.toISOString().slice(0, 10), amount: Math.abs(amount), category: normalizeCategory(cells[categoryIndex]), description: descriptionIndex >= 0 ? cells[descriptionIndex] : undefined };
  });
  const asOf = transactions.reduce((latest, transaction) => transaction.date > latest ? transaction.date : latest, transactions[0].date);
  return { transactions, as_of: asOf };
}

function normalizeCategory(raw: string): string {
  const value = raw.toLowerCase();
  if (/grocer|supermarket|market/.test(value)) return "groceries";
  if (/restaurant|dining|coffee|food|eat/.test(value)) return "eating_out";
  if (/transport|transit|uber|lyft|gas|fuel|parking/.test(value)) return "transport";
  if (/travel|hotel|airline|flight/.test(value)) return "travel";
  if (/shop|retail|clothing|online/.test(value)) return "shopping";
  if (/movie|music|game|entertainment|sport/.test(value)) return "entertainment";
  if (/health|medical|pharmacy|doctor/.test(value)) return "health";
  if (/bill|utility|rent|phone|internet|service|subscription/.test(value)) return "bills_services";
  return "other";
}

export default function Home() {
  const router = useRouter();
  const [sessionUser] = useState<SessionUser | null>(() => getSession()?.user ?? null);
  const hydrated = useSyncExternalStore(() => () => {}, () => true, () => false);

  useEffect(() => {
    if (hydrated && !sessionUser) router.replace("/login");
  }, [hydrated, router, sessionUser]);

  const [persona, setPersona] = useState<Persona | null>(() => {
    const user = getSession()?.user;
    if (!user) return null;
    return window.localStorage.getItem(`lookahead.imported.${user.id}`) ? "student" : null;
  });
  const [profiles, setProfiles] = useState<DemoProfile[]>([]);
  const [loaded, setLoaded] = useState<{ persona: Persona; data: ForecastResponse; cached: boolean } | null>(null);
  const [imported, setImported] = useState<{ data: ForecastResponse; label: string } | null>(() => {
    const user = getSession()?.user;
    if (!user) return null;
    try {
      const saved = window.localStorage.getItem(`lookahead.imported.${user.id}`);
      return saved ? (JSON.parse(saved) as { data: ForecastResponse; label: string }) : null;
    } catch {
      return null;
    }
  });
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [budget, setBudget] = useState<Budget>(() => {
    const user = getSession()?.user;
    if (!user) return { by_category: {} };
    try {
      const saved = window.localStorage.getItem(`lookahead.budget.${user.id}`);
      return saved ? (JSON.parse(saved) as Budget) : { by_category: {} };
    } catch {
      return { by_category: {} };
    }
  });
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [logoutOpen, setLogoutOpen] = useState(false);

  useEffect(() => {
    if (!sessionUser) return;
    window.localStorage.setItem(`lookahead.budget.${sessionUser.id}`, JSON.stringify(budget));
  }, [budget, sessionUser]);

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

  const handleImport = async (file: File) => {
    setImporting(true);
    setImportError(null);
    try {
      const result = await getForecastForTransactions(parseTransactionsCsv(await file.text()));
      const next = { data: result.data, label: file.name };
      setImported(next);
      if (sessionUser) window.localStorage.setItem(`lookahead.imported.${sessionUser.id}`, JSON.stringify(next));
      setPersona("student");
    } catch (error) {
      setImportError(error instanceof Error ? error.message : "We could not read that CSV.");
    } finally {
      setImporting(false);
    }
  };

  const choosePersona = (next: Persona) => {
    setImported(null);
    if (sessionUser) window.localStorage.removeItem(`lookahead.imported.${sessionUser.id}`);
    setImportError(null);
    setPersona(next);
  };

  const forecast = imported?.data ?? (loaded && loaded.persona === persona ? loaded.data : null);
  const cached = imported ? false : (loaded?.cached ?? false);

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
    ? (budget.total ?? forecast.total.predicted) - forecast.total.predicted
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

  if (!hydrated) return <ForecastSkeleton />;
  if (!persona) return <PersonaCards onPick={choosePersona} onImport={handleImport} />;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="material sticky top-0 z-30 border-b border-hairline">
        <nav className="mx-auto flex max-w-[1040px] items-center justify-between px-4 py-3 sm:px-6">
          <button type="button" aria-label="Back to your workspace" className="flex items-center gap-2 cursor-pointer" onClick={() => choosePersona("student")}>
            <span className="tint flex h-9 w-9 items-center justify-center rounded-lg" style={{ ["--tint" as string]: "var(--accent)" }}>
              <Glyph name="arrow" size={16} />
            </span>
            <span className="text-title font-black tracking-tighter text-gold">LookAhead</span>
          </button>
          <div role="radiogroup" aria-label="Planning lens" className="inline-flex rounded-full bg-surface-2 p-1 border border-hairline">
            {PERSONA_CHOICES.map((p) => {
              const active = persona === p.id;
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => choosePersona(p.id)}
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
            <label className="hidden cursor-pointer rounded-full border border-hairline px-3 py-1.5 text-caption font-bold text-muted transition-colors hover:border-accent hover:text-accent sm:inline-flex">
              {importing ? "Importing…" : "Import CSV"}
              <input className="sr-only" type="file" accept=".csv,text/csv" disabled={importing} onChange={(event) => { const file = event.target.files?.[0]; if (file) void handleImport(file); event.currentTarget.value = ""; }} />
            </label>
            <Link href="/evaluation" className="hidden rounded-full border border-hairline px-3 py-1.5 text-caption font-bold text-muted transition-colors hover:border-accent hover:text-accent sm:inline-flex">
              Forecast quality
            </Link>
            <span className="hidden text-caption text-muted md:inline">{sessionUser?.name}</span>
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
          <span className="text-eyebrow">{imported ? `${imported.label} · imported history` : `${sessionUser ? `${sessionUser.name}'s workspace` : "Your workspace"} · monthly outlook`} · {forecast?.as_of ?? "2015-11-20"}</span>
        </div>

        {importError && <div className="mb-5 flex items-center justify-between gap-4 rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-caption text-danger" role="alert"><span>{importError}</span><button type="button" className="font-bold underline" onClick={() => setImportError(null)}>Dismiss</button></div>}

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
                <h2 className="text-title font-black">Where your money goes</h2>
                <span className="text-caption">{forecast.categories.length} active categories</span>
              </div>
              <ul className="flex flex-col gap-3">
                {forecast.categories.map((c) => (
                  <CategoryCard key={c.category} c={c} scale={scale} budget={budget.by_category[c.category]} onOpen={() => setOpenCategory(c.category)} />
                ))}
              </ul>
              <p className="text-caption px-1 max-w-prose">
                Filled = spent so far · light = projected by month-end · band = likely range · dashed tick = last month · gold tick = your plan.
                Open a category for the reason, a limit, and a what-if check.
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

    </div>
  );
}
