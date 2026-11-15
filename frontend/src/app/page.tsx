"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { DISCLAIMER } from "@/lib/types";

const BLS_MONTHLY_AVERAGE = 6545;
const BLS_YEAR = "2024";
const BLS_SHARES: [string, number][] = [
  ["Housing", 33.4],
  ["Transportation", 17],
  ["Food", 12.9],
  ["Insurance + pensions", 12.5],
  ["Healthcare", 7.9],
  ["Entertainment", 4.6],
];
type Result = {
  monthlyIncome: number;
  desired: number;
  target: number;
  savings: number;
  gap: number;
  status: "comfortable" | "watch" | "stretched" | "over";
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.max(0, value));

export default function Home() {
  const [salary, setSalary] = useState("5000");
  const [frequency, setFrequency] = useState<"monthly" | "yearly">("monthly");
  const [spending, setSpending] = useState("3500");
  const [result, setResult] = useState<Result | null>(null);

  const formattedIncome = useMemo(() => {
    const value = Number(salary) || 0;
    return money(frequency === "yearly" ? value / 12 : value);
  }, [frequency, salary]);

  async function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const income = Number(salary);
    const monthlyIncome = frequency === "yearly" ? income / 12 : income;
    const desired = Number(spending);
    if (!Number.isFinite(monthlyIncome) || !Number.isFinite(desired) || monthlyIncome <= 0 || desired < 0) return;

    const target = monthlyIncome * 0.8;
    const ratio = desired / monthlyIncome;
    setResult({
      monthlyIncome,
      desired,
      target,
      savings: Math.max(0, monthlyIncome - desired),
      gap: target - desired,
      status: ratio > 1 ? "over" : ratio > 0.95 ? "stretched" : ratio > 0.8 ? "watch" : "comfortable",
    });

  }

  return (
    <div className="calculator-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="LookAhead home"><span className="brand-mark">LA</span><span>LookAhead</span></Link>
        <span className="header-note">A calmer way to plan a month</span>
      </header>

      <main className="calculator-main">
        <section className="intro">
          <p className="eyebrow">Monthly spending calculator</p>
          <h1>How much can you spend and still feel okay?</h1>
          <p className="intro-copy">Put in your take-home income and the amount you&apos;re thinking of spending. We&apos;ll show a practical target, what you&apos;d have left, and how it compares with current U.S. spending patterns.</p>
        </section>

        <div className="calculator-grid">
          <form className="input-card" onSubmit={calculate}>
            <div className="card-heading"><span className="step">1</span><div><h2>Your income</h2><p>Use take-home pay, after taxes.</p></div></div>
            <div className="frequency-toggle" role="group" aria-label="Salary frequency">
              {(["monthly", "yearly"] as const).map((option) => <button key={option} type="button" className={frequency === option ? "selected" : ""} onClick={() => setFrequency(option)}>{option}</button>)}
            </div>
            <label className="input-label" htmlFor="salary">{frequency === "monthly" ? "Monthly take-home pay" : "Yearly take-home pay"}<div className="money-input"><span>$</span><input id="salary" type="number" min="0" step="100" value={salary} onChange={(event) => setSalary(event.target.value)} /></div></label>
            <p className="field-hint">That works out to about <strong>{formattedIncome}</strong> each month.</p>

            <div className="card-heading spending-heading"><span className="step">2</span><div><h2>Your planned spending</h2><p>Everything you expect to spend this month.</p></div></div>
            <label className="input-label" htmlFor="spending">Monthly spending<div className="money-input"><span>$</span><input id="spending" type="number" min="0" step="50" value={spending} onChange={(event) => setSpending(event.target.value)} /></div></label>
            <button className="calculate-button" type="submit">Show my number <span aria-hidden>→</span></button>
            <p className="privacy-note">No account. No email. Nothing is saved.</p>
          </form>

          <section className="result-column" aria-live="polite">
            {!result ? <div className="empty-result"><span className="empty-arrow">↘</span><h2>Start with two numbers.</h2><p>Your result will land here, with a simple explanation instead of a mysterious score.</p></div> : (
              <>
                <div className={`result-card ${result.status}`}>
                  <div className="result-topline"><span className="eyebrow">Your practical monthly target</span><span className={`status-pill ${result.status}`}>{result.status === "over" ? "Over income" : result.status}</span></div>
                  <div className="big-number">{money(result.target)}</div>
                  <p className="result-explanation">A sensible starting point is to keep spending at or below <strong>80% of take-home pay</strong>, leaving the rest for savings, debt payments, and surprises.</p>
                  <div className="result-stats"><div><span>You entered</span><strong>{money(result.desired)}</strong></div><div><span>Left after spending</span><strong>{money(result.savings)}</strong></div><div><span>Room to target</span><strong>{result.gap >= 0 ? money(result.gap) : `−${money(-result.gap)}`}</strong></div></div>
                </div>

                <div className="comparison-card">
                  <div className="section-title"><div><p className="eyebrow">A useful comparison</p><h2>How does that stack up?</h2></div><span className="source-tag">BLS {BLS_YEAR}</span></div>
                  <div className="comparison-line"><div><span>Your plan</span><strong>{money(result.desired)} / month</strong></div><div className="bar-track"><span className="bar user-bar" style={{ width: `${Math.min(100, result.desired / Math.max(BLS_MONTHLY_AVERAGE, result.desired) * 100)}%` }} /></div></div>
                  <div className="comparison-line"><div><span>U.S. consumer-unit average</span><strong>{money(BLS_MONTHLY_AVERAGE)} / month</strong></div><div className="bar-track"><span className="bar average-bar" style={{ width: `${Math.min(100, BLS_MONTHLY_AVERAGE / Math.max(BLS_MONTHLY_AVERAGE, result.desired) * 100)}%` }} /></div></div>
                  <p className="small-copy">The average consumer unit spent {money(BLS_MONTHLY_AVERAGE)} a month in 2024. That household benchmark is context—not a goal—and includes about 2.4 people.</p>
                </div>

                <div className="breakdown-card"><div className="section-title"><div><p className="eyebrow">Typical mix</p><h2>Where the average dollar goes</h2></div></div><div className="breakdown-list">{BLS_SHARES.map(([name, share]) => <div className="breakdown-row" key={name}><div><span>{name}</span><strong>{share}%</strong></div><div className="bar-track"><span className="bar category-bar" style={{ width: `${share * 2.5}%` }} /></div><em>{money(BLS_MONTHLY_AVERAGE * Number(share) / 100)}</em></div>)}</div><p className="small-copy">These are BLS averages, not personalized recommendations. Your housing, health, family, and location can make your right number very different.</p></div>

                <div className="backend-card"><div><p className="eyebrow">Backend ready</p><h2>Waiting for the 2026 data layer.</h2><p>The calculator is intentionally using public benchmarks for now. Leon can plug his 2026 consumer dataset into this section later without changing the simple inputs or the math you see above.</p></div><span className="connection-dot" aria-label="waiting for 2026 data" /></div>
              </>
            )}
          </section>
        </div>

        <section className="how-it-works"><div><p className="eyebrow">How we got here</p><h2>Plain math, current sources.</h2></div><p>We use the CFPB&apos;s educational 50/30/20 framework as a starting point: 50% for needs, 30% for wants, and 20% for savings goals. We also show BLS consumer spending from 2024 and Census income data from 2025 so you can see the context behind the numbers.</p><div className="source-links"><a href="https://www.bls.gov/opub/reports/consumer-expenditures/2024/home.htm">BLS consumer spending ↗</a><a href="https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/teach/activities/analyzing-budgets/">CFPB budgeting framework ↗</a><a href="https://www.census.gov/library/publications/2026/demo/p60-289.html">Census income report ↗</a></div></section>
      </main>
      <footer className="calculator-footer"><span>{DISCLAIMER}</span><span>Benchmarks checked November 2026</span></footer>
    </div>
  );
}
