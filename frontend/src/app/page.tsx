"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { DISCLAIMER } from "@/lib/types";
import { useScrollAnimations } from "@/lib/useScrollAnimations";
import type { ReportedStockNewsResults } from "@/data/stocknews-results";
import type { DemoDay, DemoDays, OtherMarketTest } from "@/data/demo-days";

type StockNewsResults = ReportedStockNewsResults;

const MARKETS = [
  { ticker: "SPY", market: "S&P 500", label: "SPY · S&P 500" },
  { ticker: "QQQ", market: "Nasdaq", label: "QQQ · Nasdaq" },
  { ticker: "AAPL", market: "Apple", label: "AAPL · Apple" },
  { ticker: "JPM", market: "JPMorgan", label: "JPM · JPMorgan" },
  { ticker: "XOM", market: "ExxonMobil", label: "XOM · ExxonMobil" },
] as const;

const scorePercent = (value: number | undefined) => value === undefined ? "—" : `${(value * 100).toFixed(1)}%`;
const sentimentClass = (vader: number) => (vader > 0.05 ? "positive" : vader < -0.05 ? "negative" : "neutral");

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, { cache: "no-store", ...init });
  const body = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) throw new Error(body.error ?? "Measured stocknews results could not be loaded.");
  return body as T;
}

export default function Home() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<StockNewsResults | null>(null);
  const [demo, setDemo] = useState<DemoDays | null>(null);
  const [selectedDate, setSelectedDate] = useState("");
  const [ticker, setTicker] = useState<(typeof MARKETS)[number]["ticker"]>("SPY");
  const [horizon, setHorizon] = useState<"same_day" | "next_day">("next_day");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedDay = demo?.days.find((day) => day.date === selectedDate) ?? demo?.days[0] ?? null;
  const selectedMarket = MARKETS.find((item) => item.ticker === ticker) ?? MARKETS[0];
  const marketTests = (demo?.other_markets_20_tests ?? []).filter((test) => test.market === selectedMarket.market && test.target === horizon);
  useScrollAnimations(rootRef, { refreshKey: `${selectedDay?.date ?? ""}-${ticker}-${horizon}-${results ? 1 : 0}` });

  async function loadStudy(reRun: boolean) {
    setLoading(true);
    setError("");
    try {
      const nextDemo = await fetchJson<DemoDays>("/api/stocknews/demo");
      setDemo(nextDemo);
      setSelectedDate((current) => current || nextDemo.days[0]?.date || "");
      try {
        const nextResults = reRun
          ? await fetchJson<StockNewsResults>("/api/stocknews/run", { method: "POST" })
          : await fetchJson<StockNewsResults>("/api/stocknews");
        setResults(nextResults);
      } catch {
        setResults(await fetchJson<StockNewsResults>("/api/stocknews"));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Measured stocknews results could not be loaded.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudy(false);
  }, []);

  const model = results?.model_tfidf_logreg ?? results?.model_vader_logreg;
  const modelName = results?.model_tfidf_logreg ? "TF-IDF logistic regression" : "VADER logistic regression";
  const modelAccuracy = model?.accuracy ?? 0;
  const baselineAccuracy = results?.baseline_same_as_yesterday.accuracy ?? 0;
  const bestScore = Math.max(modelAccuracy, baselineAccuracy, results?.baseline_always_up.accuracy ?? 0.5);
  const bestMarket = demo?.other_markets_20_tests.reduce((best, test) => (test.model > best.model ? test : best));

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
          <h1 className="reveal">What is the news saying about the next move?</h1>
          <p className="intro-copy reveal">Choose a market Ethan actually tested. The scores are held-out 2015–2016 accuracy against always-up — not a live ticker forecast.</p>
        </section>

        <div className="market-grid">
          <section className="input-card">
            <div className="card-heading"><span className="step">1</span><div><h2>Choose a market</h2><p>These are the tickers in <code>market_test.py</code>: SPY, Nasdaq, AAPL, JPM, XOM.</p></div></div>
            <label className="input-label" htmlFor="ticker">Ticker
              <select id="ticker" className="field" value={ticker} onChange={(event) => setTicker(event.target.value as (typeof MARKETS)[number]["ticker"])}>
                {MARKETS.map((item) => <option key={item.ticker} value={item.ticker}>{item.label}</option>)}
              </select>
            </label>
            <div className="card-heading market-step"><span className="step">2</span><div><h2>Set the horizon</h2><p>Same-day matches the original Dow label. Next-day is the one a trader could actually use.</p></div></div>
            <label className="input-label" htmlFor="horizon">Prediction horizon
              <select id="horizon" className="field" value={horizon} onChange={(event) => setHorizon(event.target.value as "same_day" | "next_day")}>
                <option value="next_day">Next trading day</option>
                <option value="same_day">Same trading day</option>
              </select>
            </label>
            <div className="card-heading market-step"><span className="step">3</span><div><h2>Pick a held-out test day</h2><p>Real 2015–2016 days. Headlines are the same Reddit WorldNews used for every ticker.</p></div></div>
            <label className="input-label" htmlFor="demo-day">Test day
              <select id="demo-day" className="field" value={selectedDay?.date ?? ""} onChange={(event) => setSelectedDate(event.target.value)} disabled={!demo}>
                {(demo?.days ?? []).map((day) => (
                  <option key={day.date} value={day.date}>{day.date} · {day.kind} · Dow model {day.model_call}</option>
                ))}
              </select>
            </label>
            <button className="calculate-button" type="button" onClick={() => void loadStudy(true)} disabled={loading}>{loading ? "Loading study…" : "Refresh study results"}<span aria-hidden>→</span></button>
            <p className="privacy-note">Source: Ethan’s StockNews + yfinance tests. Research only, not financial advice.</p>
            {error && <p className="market-error" role="alert">{error}</p>}
          </section>

          <section className="result-column" aria-live="polite">
            {!selectedDay ? (
              <div className="empty-result">
                <span className="empty-arrow">↘</span>
                <h2>{loading ? "Loading the measured study…" : "The demo days have not loaded yet."}</h2>
                <p>{error || "The page reads stocknews/demo_days.json, including right and wrong test days."}</p>
              </div>
            ) : (
              <>
                <MarketBrief ticker={selectedMarket.ticker} market={selectedMarket.market} horizon={horizon} tests={marketTests} />

                <DayCard day={selectedDay} />

                <div className="forecast-card" data-forecast-pin>
                  <div className="section-title"><div><p className="eyebrow">How sure was the model?</p><h2>Probability of up</h2></div><span className="source-tag">{scorePercent(selectedDay.model_p_up)}</span></div>
                  <div className="market-range-number"><span>{demo ? scorePercent(demo.p_up_min) : "—"}</span><strong>{scorePercent(selectedDay.model_p_up)}</strong><span>{demo ? scorePercent(demo.p_up_max) : "—"}</span></div>
                  <div className="forecast-scale market-scale"><span>More down</span><div className="forecast-track"><span className="forecast-range" /><span className="forecast-marker" style={{ left: `${selectedDay.model_p_up * 100}%` }} /></div><span>More up</span></div>
                  <div className="forecast-note"><span className="connection-dot" aria-hidden="true" /><span>The model’s P(up) only ranges from {demo ? scorePercent(demo.p_up_min) : "41.5%"} to {demo ? scorePercent(demo.p_up_max) : "64.1%"}, so it calls up on {demo ? scorePercent(demo.share_days_predicted_up) : "89.7%"} of days.</span></div>
                </div>

                <div className="breakdown-card">
                  <div className="section-title"><div><p className="eyebrow">Evidence for this day</p><h2>Top headlines by |VADER|</h2></div><span className="source-tag">{selectedDay.top_headlines.length} headlines</span></div>
                  <div className="headline-list">
                    {selectedDay.top_headlines.map((headline) => (
                      <article className="headline-item" key={`${selectedDay.date}-${headline.text}`}>
                        <span className={`sentiment-dot ${sentimentClass(headline.vader)}`} />
                        <div>
                          <h3>{headline.text}</h3>
                          <p>VADER {headline.vader >= 0 ? "+" : ""}{headline.vader.toFixed(3)}</p>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>

                {results && (
                  <>
                    <div className={`result-card market-result flat`}>
                      <div className="result-topline"><span className="eyebrow">StockNews · held-out test</span><span className="status-pill">{results.result_source.startsWith("runtime") ? "Fresh runtime result" : "Saved test result"}</span></div>
                      <div className="big-number">{scorePercent(model?.accuracy)}</div>
                      <p className="result-explanation">The best available headline model, <strong>{modelName}</strong>, correctly classified <strong>{scorePercent(model?.accuracy)}</strong> of held-out Dow-direction days. That is a historical benchmark, not a promise about the next session.</p>
                      <div className="result-stats"><div><span>Test days</span><strong>{results.n_test_days}</strong></div><div><span>Up days in test</span><strong>{scorePercent(results.test_share_up)}</strong></div><div><span>Balanced accuracy</span><strong>{scorePercent(model?.balanced_accuracy)}</strong></div></div>
                    </div>

                    <div className="comparison-card">
                      <div className="section-title"><div><p className="eyebrow">Model vs. simple rules</p><h2>Does the text add signal?</h2></div><span className="source-tag">Accuracy</span></div>
                      <div className="benchmark-bars">
                        <div className="benchmark-row"><div><span>{modelName}</span><strong>{scorePercent(model?.accuracy)}</strong></div><div className="bar-track"><span className="bar user-bar" style={{ width: `${bestScore ? (modelAccuracy / bestScore) * 100 : 0}%` }} /></div></div>
                        <div className="benchmark-row"><div><span>Same as yesterday</span><strong>{scorePercent(results.baseline_same_as_yesterday.accuracy)}</strong></div><div className="bar-track"><span className="bar average-bar" style={{ width: `${bestScore ? (baselineAccuracy / bestScore) * 100 : 0}%` }} /></div></div>
                        <div className="benchmark-row"><div><span>Always predict up</span><strong>{scorePercent(results.baseline_always_up.accuracy)}</strong></div><div className="bar-track"><span className="bar neutral-bar" style={{ width: `${bestScore ? (results.baseline_always_up.accuracy / bestScore) * 100 : 0}%` }} /></div></div>
                      </div>
                      <p className="small-copy">A model only adds value if it beats a reasonable simple rule on data it never saw.</p>
                    </div>

                    <div className="comparison-card">
                      <div className="section-title"><div><p className="eyebrow">Make-it-your-own test</p><h2>Do headline categories matter?</h2></div><span className="source-tag">Keyword study</span></div>
                      <div className="category-grid">{Object.entries(results.category_results ?? {}).map(([category, score]) => <div className="category-result" key={category}><span>{category.replaceAll("_", " ")}</span><strong>{scorePercent(score.accuracy)}</strong></div>)}<div className="category-result combined"><span>All categories combined</span><strong>{scorePercent(results.all_categories_combined?.accuracy)}</strong></div></div>
                      <p className="small-copy">The combined result is reported as p = {results.all_categories_combined?.p_value_vs_always_up ?? "—"}; Ethan’s README says it is not distinguishable from luck.</p>
                    </div>
                  </>
                )}

                {demo && (
                  <div className="comparison-card">
                    <div className="section-title"><div><p className="eyebrow">Other markets · yfinance</p><h2>Does the finding hold elsewhere?</h2></div><span className="source-tag">20 tests</span></div>
                    <div className="category-grid">
                      {demo.other_markets_20_tests.map((test) => {
                        const label = `${test.market} · ${test.target.replace("_", " ")} · ${test.features.replace("_", " ")}`;
                        const isSelected = test.market === selectedMarket.market && test.target === horizon;
                        const isBest = test === bestMarket;
                        return (
                          <div className={`category-result${isBest || isSelected ? " combined" : ""}`} key={label}>
                            <span>{label}</span>
                            <strong>{scorePercent(test.model)} vs {scorePercent(test.always_up)}</strong>
                          </div>
                        );
                      })}
                    </div>
                    <p className="small-copy">Best result: {bestMarket ? `${bestMarket.market} ${bestMarket.target.replace("_", " ")} with ${bestMarket.features.replaceAll("_", " ")} at ${scorePercent(bestMarket.model)} vs always-up ${scorePercent(bestMarket.always_up)} (p = ${bestMarket.p_value}).` : "—"} After 20 tests a real signal would need p below about 0.0025. None reached that.</p>
                  </div>
                )}

                <div className="investor-callout reveal"><div><p className="eyebrow">Investor takeaway</p><h2>What this does — and does not — justify</h2></div><div className="investor-columns"><div><strong>It does not justify</strong><p>Trading on headline sentiment, headline categories, or this model’s direction. Neither headline model beat the always-up baseline, and the best category and yfinance results were within ordinary noise.</p></div><div><strong>It does justify</strong><p>Saying that these simple methods found no usable signal in this index, these single stocks, and this test window. It does not prove that news never matters, or that a different dataset or method could not work.</p></div></div><div className="leakage-check"><span className="connection-dot connected" aria-hidden="true" /><span><strong>Leakage check:</strong> dates were split chronologically; 2015–2016 test days were not used to fit the models, and settings were selected on 2014 only.</span></div></div>

                <div className="how-it-works reveal"><div><p className="eyebrow">Data and limits</p><h2>Honest scope beats a flashy claim.</h2></div><p>The page reads Ethan’s measured artifacts: <code>results.json</code>, <code>category_results.json</code>, and <code>demo_days.json</code>. <code>market_test.py</code> used yfinance prices for S&amp;P 500, Nasdaq, Apple, JPMorgan, and ExxonMobil on the same date split. Same-day labels are not a next-day trade. Live news, Reddit, and FRED are not inputs.</p><div className="source-links"><a href="https://www.kaggle.com/datasets/aaron7sun/stocknews" target="_blank" rel="noreferrer">StockNews dataset ↗</a><a href="https://finance.yahoo.com/" target="_blank" rel="noreferrer">yfinance / Yahoo Finance ↗</a><a href="https://scikit-learn.org/stable/modules/generated/sklearn.linear_model.LogisticRegression.html" target="_blank" rel="noreferrer">LogisticRegression ↗</a></div></div>
              </>
            )}
          </section>
        </div>
      </main>
      <footer className="calculator-footer"><span>{DISCLAIMER}</span><span>Historical benchmark · not a live trading signal</span></footer>
    </div>
  );
}

function MarketBrief({ ticker, market, horizon, tests }: { ticker: string; market: string; horizon: "same_day" | "next_day"; tests: OtherMarketTest[] }) {
  const best = tests.reduce<OtherMarketTest | undefined>((lead, test) => (!lead || test.model > lead.model ? test : lead), undefined);
  const beats = best ? best.model > best.always_up : false;
  const horizonLabel = horizon === "next_day" ? "next day" : "same day";
  return (
    <div className={`result-card market-result ${beats ? "flat" : "down"}`}>
      <div className="result-topline">
        <span className="eyebrow">{ticker} · {horizonLabel} · 2015–2016 test</span>
        <span className="status-pill">{beats ? "Above always-up, still noise" : "Did not beat always-up"}</span>
      </div>
      <div className="big-number">{scorePercent(best?.model)}</div>
      <p className="result-explanation">Headline text on <strong>{market}</strong> for the <strong>{horizonLabel}</strong> move scored <strong>{scorePercent(best?.model)}</strong> vs always-up <strong>{scorePercent(best?.always_up)}</strong>{best ? ` (p = ${best.p_value})` : ""}. This is held-out accuracy, not a live price target.</p>
      <div className="result-stats">
        {tests.map((test) => (
          <div key={test.features}><span>{test.features.replaceAll("_", " ")}</span><strong>{scorePercent(test.model)} vs {scorePercent(test.always_up)}</strong></div>
        ))}
        <div><span>Ticker tested</span><strong>{ticker}</strong></div>
      </div>
    </div>
  );
}

function DayCard({ day }: { day: DemoDay }) {
  const matched = day.model_call === day.actual;
  return (
    <div className={`result-card market-result ${matched ? "up" : "down"}`}>
      <div className="result-topline">
        <span className="eyebrow">{day.date} · Dow example day</span>
        <span className="status-pill">{matched ? "Model matched the Dow" : "Model missed the Dow"}</span>
      </div>
      <div className="big-number">{day.model_call}</div>
      <p className="result-explanation">The Dow model called <strong>{day.model_call}</strong> with P(up) = <strong>{scorePercent(day.model_p_up)}</strong>. The Dow actually went <strong>{day.actual}</strong>. These headlines were the same WorldNews input used for SPY, Nasdaq, AAPL, JPM, and XOM.</p>
      <div className="result-stats">
        <div><span>Model call</span><strong>{day.model_call}</strong></div>
        <div><span>Actual Dow</span><strong>{day.actual}</strong></div>
        <div><span>Example type</span><strong>{day.kind}</strong></div>
      </div>
    </div>
  );
}
