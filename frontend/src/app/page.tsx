"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { DISCLAIMER } from "@/lib/types";
import { useScrollAnimations } from "@/lib/useScrollAnimations";
import type { ReportedStockNewsResults } from "@/data/stocknews-results";

type StockNewsResults = ReportedStockNewsResults;

const scorePercent = (value: number | undefined) => value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<StockNewsResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useScrollAnimations(rootRef, { refreshKey: results ? 1 : 0 });

  async function loadResults() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/stocknews/run", { method: "POST", cache: "no-store" });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? "Measured stocknews results could not be loaded.");
      }
      setResults((await response.json()) as StockNewsResults);
    } catch (requestError) {
      setResults(null);
      setError(requestError instanceof Error ? requestError.message : "Measured stocknews results could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  const model = results?.model_tfidf_logreg ?? results?.model_vader_logreg;
  const modelName = results?.model_tfidf_logreg ? "TF-IDF logistic regression" : "VADER logistic regression";
  const modelAccuracy = model?.accuracy ?? 0;
  const baselineAccuracy = results?.baseline_same_as_yesterday.accuracy ?? 0;
  const bestScore = Math.max(modelAccuracy, baselineAccuracy, results?.baseline_always_up.accuracy ?? 0.5);

  return (
    <div ref={rootRef} className="calculator-page market-page">
      <div className="scroll-progress" data-scroll-progress aria-hidden="true" />
      <header className="site-header">
        <Link className="brand" href="/" aria-label="LookAhead Market Pulse home"><span className="brand-mark">LA</span><span>LookAhead Market Pulse</span></Link>
        <span className="header-note">Historical headline benchmark · StockNews</span>
      </header>

      <main className="calculator-main">
        <section className="intro">
          <span className="hero-ornament" aria-hidden="true" />
          <p className="eyebrow reveal">News + market direction</p>
          <h1 className="reveal">Do headlines predict the Dow?</h1>
          <p className="intro-copy reveal">LookAhead tests the question with a public historical dataset, chronological evaluation, and simple baselines. This page shows the measurements the model actually produced — not a made-up live forecast.</p>
        </section>

        <div className="market-grid">
          <section className="input-card">
            <div className="card-heading"><span className="step">1</span><div><h2>Run the ML test</h2><p>Execute <code>stocknews/baseline.py</code> and the category test on the local dataset.</p></div></div>
            <div className="study-summary"><span className="study-label">Dataset</span><strong>Daily News for Stock Market Prediction</strong><span className="study-label">Target</span><strong>Dow direction: up or down</strong><span className="study-label">Evaluation</span><strong>Chronological held-out test</strong></div>
            <button className="calculate-button" type="button" onClick={loadResults} disabled={loading}>{loading ? "Running ML test…" : "Run ML test"}<span aria-hidden>→</span></button>
            <p className="privacy-note">Runtime source: StockNews scripts + public dataset. Research only, not financial advice.</p>
            {error && <p className="market-error" role="alert">{error}</p>}
          </section>

          <section className="result-column" aria-live="polite">
            {!results ? <div className="empty-result"><span className="empty-arrow">↘</span><h2>Run the study to see its result.</h2><p>{error ? "The frontend is connected, but stocknews/results.json has not been generated yet." : "The frontend reads stocknews/results.json directly through a small local adapter."}</p></div> : (
              <>
                <div className="result-card market-result flat">
                  <div className="result-topline"><span className="eyebrow">StockNews · held-out test</span><span className="status-pill">Runtime result</span></div>
                  <div className="big-number">{scorePercent(model?.accuracy)}</div>
                  <p className="result-explanation">The best available headline model, <strong>{modelName}</strong>, correctly classified <strong>{scorePercent(model?.accuracy)}</strong> of held-out Dow-direction days. That is a historical benchmark, not a promise about the next session.</p>
                  <div className="result-stats"><div><span>Test days</span><strong>{results.n_test_days}</strong></div><div><span>Up days in test</span><strong>{scorePercent(results.test_share_up)}</strong></div><div><span>Balanced accuracy</span><strong>{scorePercent(model?.balanced_accuracy)}</strong></div></div>
                </div>

                <div className="forecast-card" data-forecast-pin>
                  <div className="section-title"><div><p className="eyebrow">Model vs. simple rules</p><h2>Does the text add signal?</h2></div><span className="source-tag">Accuracy</span></div>
                  <div className="benchmark-bars"><div className="benchmark-row"><div><span>{modelName}</span><strong>{scorePercent(model?.accuracy)}</strong></div><div className="bar-track"><span className="bar user-bar" style={{ width: `${bestScore ? (modelAccuracy / bestScore) * 100 : 0}%` }} /></div></div><div className="benchmark-row"><div><span>Same as yesterday</span><strong>{scorePercent(results.baseline_same_as_yesterday.accuracy)}</strong></div><div className="bar-track"><span className="bar average-bar" style={{ width: `${bestScore ? (baselineAccuracy / bestScore) * 100 : 0}%` }} /></div></div><div className="benchmark-row"><div><span>Always predict up</span><strong>{scorePercent(results.baseline_always_up.accuracy)}</strong></div><div className="bar-track"><span className="bar neutral-bar" style={{ width: `${bestScore ? (results.baseline_always_up.accuracy / bestScore) * 100 : 0}%` }} /></div></div></div>
                  <div className="forecast-note"><span className="connection-dot" aria-hidden="true" /><span>A model only adds value if it beats a reasonable simple rule on data it never saw.</span></div>
                </div>

                <div className="comparison-card">
                  <div className="section-title"><div><p className="eyebrow">Evaluation detail</p><h2>Metrics we can explain</h2></div><span className="source-tag">No shuffled dates</span></div>
                  <div className="metric-grid"><div><span>Model accuracy</span><strong>{scorePercent(model?.accuracy)}</strong></div><div><span>Balanced accuracy</span><strong>{scorePercent(model?.balanced_accuracy)}</strong></div><div><span>Down precision</span><strong>{scorePercent(model?.down_precision)}</strong></div><div><span>Down recall</span><strong>{scorePercent(model?.down_recall)}</strong></div></div>
                  <p className="small-copy">Raw accuracy is not the whole story. Balanced accuracy, down precision, and down recall show whether the model is simply riding the most common direction.</p>
                </div>

                <div className="comparison-card">
                  <div className="section-title"><div><p className="eyebrow">Make-it-your-own test</p><h2>Do headline categories matter?</h2></div><span className="source-tag">Keyword study</span></div>
                  <div className="category-grid">{Object.entries(results.category_results).map(([category, score]) => <div className="category-result" key={category}><span>{category.replaceAll("_", " ")}</span><strong>{scorePercent(score.accuracy)}</strong></div>)}<div className="category-result combined"><span>All categories combined</span><strong>{scorePercent(results.all_categories_combined.accuracy)}</strong></div></div>
                  <p className="small-copy">The combined result is reported as p = {results.all_categories_combined.p_value_vs_always_up ?? "—"}; Ethan’s README says it is not distinguishable from luck.</p>
                </div>

                <div className="investor-callout reveal"><div><p className="eyebrow">Investor takeaway</p><h2>What this does — and does not — justify</h2></div><div className="investor-columns"><div><strong>It does not justify</strong><p>Trading on headline sentiment, headline categories, or this model’s direction. Neither headline model beat the always-up baseline, and the best category result was within ordinary noise.</p></div><div><strong>It does justify</strong><p>Saying that these simple methods found no usable signal in this one index and test window. It does not prove that news never matters, or that a different dataset or method could not work.</p></div></div><div className="leakage-check"><span className="connection-dot connected" aria-hidden="true" /><span><strong>Leakage check:</strong> dates were split chronologically; 2015–2016 test days were not used to fit the models, and settings were selected on 2014 only.</span></div></div>

                <div className="breakdown-card"><div className="section-title"><div><p className="eyebrow">What is in the artifact</p><h2>Headline features, not live evidence</h2></div><span className="source-tag">{results.n_test_days} days</span></div><div className="headline-list"><article className="headline-item"><span className="sentiment-dot positive" /><div><h3>VADER sentiment features</h3><p>Average, minimum, maximum, volatility, positive/negative share</p></div></article><article className="headline-item"><span className="sentiment-dot neutral" /><div><h3>TF-IDF headline features</h3><p>Up to 20,000 English terms learned from training headlines</p></div></article><article className="headline-item"><span className="sentiment-dot negative" /><div><h3>Known limitation</h3><p>The saved result is aggregate metrics; it does not include current headlines or a per-ticker forecast.</p></div></article></div></div>

                <div className="how-it-works reveal"><div><p className="eyebrow">Data and limits</p><h2>Honest scope beats a flashy claim.</h2></div><p>The button runs the two local scripts and reads their freshly written artifacts. The experiment uses earlier dates for fitting and later dates for testing. It studies Dow direction, not individual stocks. yfinance, FRED, Reddit, and live news are not active inputs.</p><div className="source-links"><a href="https://www.kaggle.com/datasets/aaron7sun/stocknews" target="_blank" rel="noreferrer">StockNews dataset ↗</a><a href="https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html" target="_blank" rel="noreferrer">LogisticRegression ↗</a></div></div>
              </>
            )}
          </section>
        </div>
      </main>
      <footer className="calculator-footer"><span>{DISCLAIMER}</span><span>Historical benchmark · not a live trading signal</span></footer>
    </div>
  );
}
