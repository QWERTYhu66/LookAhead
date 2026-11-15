"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DISCLAIMER } from "@/lib/types";
import { useScrollAnimations } from "@/lib/useScrollAnimations";

const FED_EMERGENCY_SAVINGS_RATE = 55;
const CFPB_SAVINGS_RATE = 20;

type Result = {
  monthlyIncome: number;
  desiredSavings: number;
  targetSavings: number;
  spendable: number;
  gap: number;
  status: "needs_more" | "on_track" | "strong" | "over";
};

const money = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.max(0, value));

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [salary, setSalary] = useState("5000");
  const [frequency, setFrequency] = useState<"monthly" | "yearly">("monthly");
  const [savings, setSavings] = useState("1000");
  const [result, setResult] = useState<Result | null>(null);
  useScrollAnimations(rootRef, { refreshKey: result ? 1 : 0 });

  const formattedIncome = useMemo(() => {
    const value = Number(salary) || 0;
    return money(frequency === "yearly" ? value / 12 : value);
  }, [frequency, salary]);

  function calculate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const income = Number(salary);
    const monthlyIncome = frequency === "yearly" ? income / 12 : income;
    const desiredSavings = Number(savings);
    if (!Number.isFinite(monthlyIncome) || !Number.isFinite(desiredSavings) || monthlyIncome <= 0 || desiredSavings < 0) return;

    const targetSavings = monthlyIncome * (CFPB_SAVINGS_RATE / 100);
    const ratio = desiredSavings / monthlyIncome;
    setResult({
      monthlyIncome,
      desiredSavings,
      targetSavings,
      spendable: Math.max(0, monthlyIncome - desiredSavings),
      gap: desiredSavings - targetSavings,
      status: ratio > 1 ? "over" : ratio >= 0.3 ? "strong" : ratio >= 0.2 ? "on_track" : "needs_more",
    });
  }

  const statusLabel = result?.status === "needs_more" ? "Needs more" : result?.status === "on_track" ? "On track" : result?.status === "strong" ? "Strong" : "Too high";

  return (
    <div ref={rootRef} className="calculator-page">
      <div className="scroll-progress" data-scroll-progress aria-hidden="true" />
      <header className="site-header">
        <Link className="brand" href="/" aria-label="LookAhead home"><span className="brand-mark">LA</span><span>LookAhead</span></Link>
        <span className="header-note">A calmer way to build a cushion</span>
      </header>

      <main className="calculator-main">
        <section className="intro">
          <span className="hero-ornament" aria-hidden="true" />
          <p className="eyebrow reveal">Monthly savings calculator</p>
          <h1 className="reveal">How much should you save each month?</h1>
          <p className="intro-copy reveal">Put in your take-home income and the amount you&apos;d like to save. We&apos;ll show a practical target, what you&apos;d have left to live on, and how quickly your cushion could grow.</p>
        </section>

        <div className="calculator-grid">
          <form className="input-card" onSubmit={calculate}>
            <div className="card-heading"><span className="step">1</span><div><h2>Your income</h2><p>Use take-home pay, after taxes.</p></div></div>
            <div className="frequency-toggle" role="group" aria-label="Salary frequency">
              {(["monthly", "yearly"] as const).map((option) => <button key={option} type="button" className={frequency === option ? "selected" : ""} onClick={() => setFrequency(option)}>{option}</button>)}
            </div>
            <label className="input-label" htmlFor="salary">{frequency === "monthly" ? "Monthly take-home pay" : "Yearly take-home pay"}<div className="money-input"><span>$</span><input id="salary" type="number" min="0" step="any" value={salary} onChange={(event) => setSalary(event.target.value)} /></div></label>
            <p className="field-hint">That works out to about <strong>{formattedIncome}</strong> each month.</p>

            <div className="card-heading spending-heading"><span className="step">2</span><div><h2>Your savings plan</h2><p>What you want to put away this month.</p></div></div>
            <label className="input-label" htmlFor="savings">Monthly savings goal<div className="money-input"><span>$</span><input id="savings" type="number" min="0" step="any" value={savings} onChange={(event) => setSavings(event.target.value)} /></div></label>
            <button className="calculate-button" type="submit">Show my savings number <span aria-hidden>→</span></button>
            <p className="privacy-note">No account. No email. Nothing is saved.</p>
          </form>

          <section className="result-column" aria-live="polite">
            {!result ? <div className="empty-result"><span className="empty-arrow">↘</span><h2>Start with two numbers.</h2><p>Your result will land here, with a simple savings target instead of a mysterious score.</p></div> : (
              <>
                <div className={`result-card ${result.status}`}>
                  <div className="result-topline"><span className="eyebrow">Your practical monthly savings target</span><span className={`status-pill ${result.status}`}>{statusLabel}</span></div>
                  <div className="big-number">{money(result.targetSavings)}</div>
                  <p className="result-explanation">A useful starting point is to save <strong>20% of take-home pay</strong>. It leaves the other 80% for everyday life, bills, and flexible spending.</p>
                  <div className="result-stats"><div><span>You want to save</span><strong>{money(result.desiredSavings)}</strong></div><div><span>Left to live on</span><strong>{money(result.spendable)}</strong></div><div><span>Against target</span><strong>{result.gap >= 0 ? `+${money(result.gap)}` : `−${money(-result.gap)}`}</strong></div></div>
                </div>

                <div className="forecast-card" data-forecast-pin>
                  <div className="section-title"><div><p className="eyebrow">Savings forecast</p><h2>Where your cushion could land</h2></div><span className="source-tag">Planning range</span></div>
                  <div className="forecast-number">{money(result.desiredSavings * 12)} <span className="forecast-period">a year</span></div>
                  <p className="small-copy forecast-copy">If you keep this goal for 12 months, you could build roughly <strong>{money(result.desiredSavings * 12 * 0.9)}–{money(result.desiredSavings * 12 * 1.1)}</strong>. This range is based on your goal and is meant to make progress easy to picture.</p>
                  <div className="forecast-scale"><span>{money(result.desiredSavings * 12 * 0.9)}</span><div className="forecast-track"><span className="forecast-range" /><span className="forecast-marker" /></div><span>{money(result.desiredSavings * 12 * 1.1)}</span></div>
                  <div className="forecast-note"><span className="connection-dot" aria-hidden="true" /><span>Keep this number visible as a simple benchmark for your own progress.</span></div>
                </div>

                <div className="comparison-card">
                  <div className="section-title"><div><p className="eyebrow">A useful savings benchmark</p><h2>Are you building a buffer?</h2></div><span className="source-tag">CFPB + Fed</span></div>
                  <div className="comparison-line"><div><span>Your savings plan</span><strong>{money(result.desiredSavings)} / month</strong></div><div className="bar-track"><span className="bar user-bar" style={{ width: `${Math.min(100, result.desiredSavings / Math.max(result.targetSavings, result.desiredSavings) * 100)}%` }} /></div></div>
                  <div className="comparison-line"><div><span>20% starting target</span><strong>{money(result.targetSavings)} / month</strong></div><div className="bar-track"><span className="bar average-bar" style={{ width: `${Math.min(100, result.targetSavings / Math.max(result.targetSavings, result.desiredSavings) * 100)}%` }} /></div></div>
                  <p className="small-copy">The CFPB uses 20% of monthly net income as a savings-goal starting point. The Federal Reserve reported that {FED_EMERGENCY_SAVINGS_RATE}% of adults had savings for three months of expenses in 2025.</p>
                </div>

                <div className="breakdown-card"><div className="section-title"><div><p className="eyebrow">Your next milestones</p><h2>Make the cushion feel concrete</h2></div></div><div className="breakdown-list"><div className="breakdown-row"><div><span>One month of living costs</span><strong>{money(result.spendable)}</strong></div><div className="bar-track"><span className="bar category-bar" style={{ width: "33%" }} /></div><em>{money(result.desiredSavings > 0 ? result.spendable / result.desiredSavings : 0)} months</em></div><div className="breakdown-row"><div><span>Three-month cushion</span><strong>{money(result.spendable * 3)}</strong></div><div className="bar-track"><span className="bar category-bar" style={{ width: "66%" }} /></div><em>{money(result.desiredSavings > 0 ? result.spendable * 3 / result.desiredSavings : 0)} months</em></div><div className="breakdown-row"><div><span>One year of your goal</span><strong>{money(result.desiredSavings * 12)}</strong></div><div className="bar-track"><span className="bar category-bar" style={{ width: "100%" }} /></div><em>12 months</em></div></div><p className="small-copy">These milestones use your numbers. They are a way to make progress visible, not a prescription for how much cash you must keep.</p></div>

              </>
            )}
          </section>
        </div>

        <section className="how-it-works reveal"><div><p className="eyebrow">How we got here</p><h2>Plain math, useful milestones.</h2></div><p>We use the CFPB&apos;s educational 50/30/20 framework as a starting point: 50% for needs, 30% for wants, and 20% for savings goals. We also use Federal Reserve emergency-savings context so the forecast is about building resilience, not just hitting an arbitrary number.</p><div className="source-links"><a href="https://www.consumerfinance.gov/consumer-tools/educator-tools/youth-financial-education/teach/activities/analyzing-budgets/">CFPB savings framework ↗</a><a href="https://www.federalreserve.gov/publications/2026-economic-well-being-of-us-households-in-2025-savings-investments.htm">Federal Reserve savings report ↗</a><a href="https://www.census.gov/library/publications/2026/demo/p60-289.html">Census income report ↗</a></div></section>
      </main>
      <footer className="calculator-footer"><span>{DISCLAIMER}</span><span>Savings benchmarks checked November 2026</span></footer>
    </div>
  );
}
