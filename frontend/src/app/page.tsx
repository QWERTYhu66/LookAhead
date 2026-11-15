"use client";

import { FormEvent, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { DISCLAIMER } from "@/lib/types";
import { useScrollAnimations } from "@/lib/useScrollAnimations";

type Headline = { title: string; source: string; url?: string; published_at?: string; sentiment?: "positive" | "negative" | "neutral" };
type MarketPrediction = {
  symbol: string;
  company_name?: string;
  horizon: string;
  predicted_direction: "up" | "down" | "flat";
  predicted_return_low: number;
  predicted_return_typical: number;
  predicted_return_high: number;
  confidence: number;
  model_name: string;
  model_version: string;
  data_as_of: string;
  headlines: Headline[];
  market_context?: { price?: number; change_percent?: number; source?: string };
  baseline?: { name: string; direction: "up" | "down" | "flat"; accuracy?: number };
  evaluation?: { metric?: string; model_score?: number; baseline_score?: number; test_period?: string; range_coverage?: number };
  sources?: { name: string; url: string }[];
  disclaimer?: string;
};

const percent = (value: number) => `${value >= 0 ? "+" : "−"}${Math.abs(value).toFixed(2)}%`;

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [symbol, setSymbol] = useState("SPY");
  const [horizon, setHorizon] = useState("next_session");
  const [prediction, setPrediction] = useState<MarketPrediction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useScrollAnimations(rootRef, { refreshKey: prediction ? 1 : 0 });

  const directionLabel = useMemo(() => {
    if (!prediction) return "Awaiting a market brief";
    return prediction.predicted_direction === "up" ? "Model leans up" : prediction.predicted_direction === "down" ? "Model leans down" : "Model sees a flat session";
  }, [prediction]);

  async function predict(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanSymbol = symbol.trim().toUpperCase();
    if (!cleanSymbol) return;
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/market/predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: cleanSymbol, horizon }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("The market brief could not be loaded.");
      setPrediction((await response.json()) as MarketPrediction);
    } catch (requestError) {
      setPrediction(null);
      setError(requestError instanceof Error ? requestError.message : "The market brief could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div ref={rootRef} className="calculator-page market-page">
      <div className="scroll-progress" data-scroll-progress aria-hidden="true" />
      <header className="site-header">
        <Link className="brand" href="/" aria-label="LookAhead Market Pulse home"><span className="brand-mark">LA</span><span>LookAhead Market Pulse</span></Link>
        <span className="header-note">News, context, and a modelled market signal</span>
      </header>

      <main className="calculator-main">
        <section className="intro">
          <span className="hero-ornament" aria-hidden="true" />
          <p className="eyebrow reveal">News + market forecast</p>
          <h1 className="reveal">What is the news saying about the next move?</h1>
          <p className="intro-copy reveal">Choose a market and horizon. LookAhead combines recent headlines with market data to show a modelled direction, a range, and the evidence behind it.</p>
        </section>

        <div className="market-grid">
          <form className="input-card" onSubmit={predict}>
            <div className="card-heading"><span className="step">1</span><div><h2>Choose a market</h2><p>Use a ticker such as SPY, AAPL, or TSLA.</p></div></div>
            <label className="input-label" htmlFor="symbol">Ticker symbol<div className="money-input ticker-input"><span>#</span><input id="symbol" type="text" inputMode="text" autoCapitalize="characters" value={symbol} onChange={(event) => setSymbol(event.target.value.toUpperCase())} placeholder="SPY" /></div></label>
            <div className="card-heading market-step"><span className="step">2</span><div><h2>Set the horizon</h2><p>Short forecasts are easier to test honestly.</p></div></div>
            <label className="input-label" htmlFor="horizon">Prediction horizon<select id="horizon" className="field" value={horizon} onChange={(event) => setHorizon(event.target.value)}><option value="next_session">Next trading session</option><option value="next_week">Next 5 trading sessions</option></select></label>
            <button className="calculate-button" type="submit" disabled={loading}>{loading ? "Reading the market…" : "Build my market brief"}<span aria-hidden>→</span></button>
            <p className="privacy-note">Research signal only. Not financial advice.</p>
            {error && <p className="market-error" role="alert">{error}</p>}
          </form>

          <section className="result-column" aria-live="polite">
            {!prediction ? <div className="empty-result"><span className="empty-arrow">↘</span><h2>Start with a ticker.</h2><p>The model result, recent evidence, and baseline comparison will land here.</p></div> : (
              <>
                <div className={`result-card market-result ${prediction.predicted_direction}`}>
                  <div className="result-topline"><span className="eyebrow">{prediction.symbol} · {prediction.horizon.replace("_", " ")}</span><span className="status-pill">{directionLabel}</span></div>
                  <div className="big-number">{percent(prediction.predicted_return_typical)}</div>
                  <p className="result-explanation">The model&apos;s typical return estimate is <strong>{percent(prediction.predicted_return_typical)}</strong>, with a likely range of <strong>{percent(prediction.predicted_return_low)} to {percent(prediction.predicted_return_high)}</strong>.</p>
                  <div className="result-stats"><div><span>Confidence</span><strong>{Math.round(prediction.confidence * 100)}%</strong></div><div><span>Model</span><strong>{prediction.model_name}</strong></div><div><span>Data through</span><strong>{prediction.data_as_of}</strong></div></div>
                </div>

                <div className="forecast-card" data-forecast-pin>
                  <div className="section-title"><div><p className="eyebrow">Model range</p><h2>Possible next move</h2></div><span className="source-tag">{prediction.model_version}</span></div>
                  <div className="market-range-number"><span>{percent(prediction.predicted_return_low)}</span><strong>{percent(prediction.predicted_return_typical)}</strong><span>{percent(prediction.predicted_return_high)}</span></div>
                  <div className="forecast-scale market-scale"><span>Lower</span><div className="forecast-track"><span className="forecast-range" /><span className="forecast-marker" /></div><span>Higher</span></div>
                  <div className="forecast-note"><span className="connection-dot" aria-hidden="true" /><span>This is a modelled range, not a promise. Check the evaluation panel before treating it as useful.</span></div>
                </div>

                <div className="comparison-card">
                  <div className="section-title"><div><p className="eyebrow">Baseline check</p><h2>Does the model add signal?</h2></div><span className="source-tag">Honest comparison</span></div>
                  {prediction.baseline ? <><div className="comparison-line"><div><span>{prediction.model_name}</span><strong>{prediction.predicted_direction}</strong></div><div className="bar-track"><span className="bar user-bar" style={{ width: `${Math.min(100, prediction.confidence * 100)}%` }} /></div></div><div className="comparison-line"><div><span>{prediction.baseline.name}</span><strong>{prediction.baseline.direction}</strong></div><div className="bar-track"><span className="bar average-bar" style={{ width: `${Math.min(100, (prediction.baseline.accuracy ?? 0.5) * 100)}%` }} /></div></div></> : <p className="small-copy">The backend will return a simple baseline beside the model so the signal can be judged fairly.</p>}
                  {prediction.evaluation && <p className="small-copy">{prediction.evaluation.metric}: model {prediction.evaluation.model_score ?? "—"} vs baseline {prediction.evaluation.baseline_score ?? "—"}. Test period: {prediction.evaluation.test_period ?? "—"}.</p>}
                </div>

                <div className="breakdown-card"><div className="section-title"><div><p className="eyebrow">Why the model leans this way</p><h2>Recent evidence</h2></div><span className="source-tag">{prediction.headlines.length} headlines</span></div><div className="headline-list">{prediction.headlines.map((headline, index) => <article className="headline-item" key={`${headline.title}-${index}`}><span className={`sentiment-dot ${headline.sentiment ?? "neutral"}`} /><div><h3>{headline.title}</h3><p>{headline.source}{headline.published_at ? ` · ${headline.published_at}` : ""}</p></div>{headline.url && <a href={headline.url} target="_blank" rel="noreferrer" aria-label={`Open ${headline.source}`}>↗</a>}</article>)}</div></div>

                <div className="how-it-works reveal"><div><p className="eyebrow">Data and limits</p><h2>News is noisy. We show the receipts.</h2></div><p>LookAhead combines public headlines with market data, then compares its learned signal with a simple rule. The model can be wrong, headlines can be duplicated or ambiguous, and past test performance does not guarantee a future result.</p><div className="source-links">{(prediction.sources ?? []).map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.name} ↗</a>)}</div></div>
              </>
            )}
          </section>
        </div>
      </main>
      <footer className="calculator-footer"><span>{prediction?.disclaimer ?? DISCLAIMER}</span><span>Market data and headlines are for research only</span></footer>
    </div>
  );
}
