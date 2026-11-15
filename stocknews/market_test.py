"""Make-it-your-own test 1: does the finding hold for other markets / single stocks (yfinance)?

Same headlines (Reddit WorldNews, 2008-2016) and same date split as baseline.py: train 2008-2014, test 2015-Jul 2016.
For each ticker we test two targets:
  same_day: did the ticker close up vs the previous close? (the dataset's own definition for the Dow)
  next_day: will the NEXT day close up? (what a trader could actually use)
Run after baseline.py. Needs: pip install yfinance
"""

import json
import re
import warnings

import numpy as np
import pandas as pd
import yfinance as yf
from scipy.stats import binomtest
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

warnings.filterwarnings("ignore")

TICKERS = {"^GSPC": "S&P 500", "^IXIC": "Nasdaq", "AAPL": "Apple", "JPM": "JPMorgan", "XOM": "ExxonMobil"}
CATEGORIES = {
    "economy_business": r"\b(econom\w*|market\w*|stock\w*|bank\w*|financ\w*|trade|tax\w*|debt|inflation|oil|price\w*|"
                        r"currency|dollar|euro|gdp|jobs?|unemploy\w*|compan\w*|business\w*|billion|million|"
                        r"investor\w*|crisis|recession|bailout|budget|sanction\w*)\b",
    "politics": r"\b(president|government|minister|parliament|election\w*|vote\w*|senate|congress|obama|putin|"
                r"trump|law\w*|court|police|protest\w*|party|leader\w*|prime|regime|democra\w*|china|chinese|"
                r"russia\w*|us|eu|un)\b",
    "war_conflict": r"\b(war|wars|military|army|troops?|attack\w*|bomb\w*|kill\w*|missile\w*|nuclear|terror\w*|"
                    r"isis|isil|syria\w*|iraq\w*|afghan\w*|israel\w*|gaza|palestin\w*|ukrain\w*|weapon\w*|"
                    r"soldier\w*|conflict|violence|shoot\w*|hostage\w*)\b",
    "crime_justice": r"\b(arrest\w*|prison\w*|jail\w*|crime\w*|murder\w*|rape\w*|abuse\w*|corrupt\w*|fraud|"
                     r"trial|guilty|sentenc\w*|charged|torture\w*|slave\w*|drug\w*|illegal)\b",
    "science_tech_health": r"\b(scien\w*|research\w*|study|scientist\w*|tech\w*|internet|google|facebook|apple|"
                           r"nsa|cyber\w*|hack\w*|space|nasa|climate|health|disease|virus|ebola|cancer|"
                           r"drug|medical|hospital)\b",
    "disaster_accident": r"\b(earthquake\w*|tsunami\w*|flood\w*|storm\w*|hurricane\w*|fire|crash\w*|disaster\w*|"
                         r"dead|dies|death\w*|explosion\w*|victim\w*|plane|accident\w*)\b",
}

df = pd.read_csv("data/Combined_News_DJIA.csv", parse_dates=["Date"]).sort_values("Date").reset_index(drop=True)
top_cols = [f"Top{i}" for i in range(1, 26)]


def clean(s):
    if not isinstance(s, str):
        return ""
    return re.sub(r"['\"]$", "", re.sub(r"^b['\"]", "", s)).strip()


for c in top_cols:
    df[c] = df[c].map(clean)

vader = SentimentIntensityAnalyzer()
patterns = {k: re.compile(v, re.I) for k, v in CATEGORIES.items()}
vader_rows, cat_rows = [], []
for _, r in df.iterrows():
    heads = [r[c] for c in top_cols if r[c]]
    sc = [vader.polarity_scores(h) for h in heads] or [{"compound": 0, "neg": 0, "pos": 0}]
    comp = np.array([s["compound"] for s in sc])
    vader_rows.append([comp.mean(), comp.min(), comp.max(), comp.std(), np.mean([s["neg"] for s in sc]),
                       np.mean([s["pos"] for s in sc]), (comp < -0.05).mean(), (comp > 0.05).mean()])
    row = []
    for p in patterns.values():
        m = np.array([bool(p.search(h)) for h in heads]) if heads else np.zeros(1, bool)
        row += [m.mean(), comp[m].mean() if m.any() else 0.0, comp[m].min() if m.any() else 0.0]
    cat_rows.append(row)
FEATURES = {"vader_sentiment": np.array(vader_rows), "headline_categories": np.array(cat_rows)}

train_idx = np.where(df["Date"] < "2015-01-01")[0]
test_idx = np.where(df["Date"] >= "2015-01-01")[0]
fit_idx = np.where(df["Date"] < "2014-01-01")[0]
valid_idx = np.where((df["Date"] >= "2014-01-01") & (df["Date"] < "2015-01-01"))[0]

prices = yf.download(list(TICKERS), start="2008-07-25", end="2016-08-10", auto_adjust=True, progress=False)["Close"]
prices = prices.ffill()


def evaluate(X, y, valid_ok):
    ok = valid_ok
    tr, te, fi, va = (np.intersect1d(i, np.where(ok)[0]) for i in (train_idx, test_idx, fit_idx, valid_idx))
    mu, sd = X[tr].mean(0), X[tr].std(0) + 1e-9
    Z = (X - mu) / sd
    best_c = max([0.01, 0.1, 1, 10], key=lambda c: accuracy_score(
        y[va], LogisticRegression(C=c, max_iter=1000).fit(Z[fi], y[fi]).predict(Z[va])))
    p = LogisticRegression(C=best_c, max_iter=1000).fit(Z[tr], y[tr]).predict(Z[te])
    up_rate = y[te].mean()
    correct = int((p == y[te]).sum())
    return {
        "n_test_days": int(len(te)),
        "always_up": round(float(up_rate), 4),
        "model": round(correct / len(te), 4),
        "p_value_vs_always_up": round(float(binomtest(correct, len(te), up_rate, alternative="greater").pvalue), 4),
        "share_predicted_up": round(float(p.mean()), 3),
    }


results = {}
for tick, name in TICKERS.items():
    px = prices[tick].reindex(df["Date"].values)
    ret_same = (px / px.shift(1) - 1).to_numpy()
    ret_next = (px.shift(-1) / px - 1).to_numpy()
    for target, ret in (("same_day", ret_same), ("next_day", ret_next)):
        ok = ~np.isnan(ret)
        y = np.where(np.isnan(ret), 0, (ret >= 0)).astype(int)
        for fname, X in FEATURES.items():
            results[f"{name} | {target} | {fname}"] = evaluate(X, y, ok)

n_tests = len(results)
out = {"bonferroni_threshold": round(0.05 / n_tests, 4), "n_tests": n_tests, "results": results}
print(json.dumps(out, indent=2))
with open("market_results.json", "w") as f:
    json.dump(out, f, indent=2)
