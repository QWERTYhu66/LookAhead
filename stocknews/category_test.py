"""Make-it-your-own test: do some KINDS of headlines matter more than others?

Headlines are put into categories with a transparent keyword list, then one small model per category
is trained on 2008-2014 and tested on 2015-2016 (split by date). Run after baseline.py.
"""

import json
import re
import warnings

import numpy as np
import pandas as pd
from scipy.stats import binomtest
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

warnings.filterwarnings("ignore")

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
feat = {k: [] for k in CATEGORIES}
for _, r in df.iterrows():
    heads = [r[c] for c in top_cols if r[c]]
    comp = np.array([vader.polarity_scores(h)["compound"] for h in heads]) if heads else np.zeros(1)
    for k, p in patterns.items():
        mask = np.array([bool(p.search(h)) for h in heads]) if heads else np.zeros(1, bool)
        share = mask.mean()
        feat[k].append([share, comp[mask].mean() if mask.any() else 0.0, comp[mask].min() if mask.any() else 0.0])
feat = {k: np.array(v) for k, v in feat.items()}

train_idx = np.where(df["Date"] < "2015-01-01")[0]
test_idx = np.where(df["Date"] >= "2015-01-01")[0]
fit_idx = np.where(df["Date"] < "2014-01-01")[0]
valid_idx = np.where((df["Date"] >= "2014-01-01") & (df["Date"] < "2015-01-01"))[0]
y = df["Label"].to_numpy()
y_test = y[test_idx]
up_rate = float(y_test.mean())


def run(X):
    mu, sd = X[train_idx].mean(0), X[train_idx].std(0) + 1e-9
    Z = (X - mu) / sd
    best_c = max([0.01, 0.1, 1, 10], key=lambda c: accuracy_score(
        y[valid_idx], LogisticRegression(C=c, max_iter=1000).fit(Z[fit_idx], y[fit_idx]).predict(Z[valid_idx])))
    p = LogisticRegression(C=best_c, max_iter=1000).fit(Z[train_idx], y[train_idx]).predict(Z[test_idx])
    acc = accuracy_score(y_test, p)
    correct = int((p == y_test).sum())
    pval = binomtest(correct, len(y_test), up_rate, alternative="greater").pvalue
    return {"accuracy": round(acc, 4), "p_value_vs_always_up": round(float(pval), 4), "share_predicted_up": round(float(p.mean()), 3)}


share_all = {k: float((v[:, 0] > 0).mean()) for k, v in feat.items()}
results = {"always_up_accuracy": round(up_rate, 4), "n_test_days": int(len(y_test)),
           "bonferroni_threshold": round(0.05 / (len(CATEGORIES) + 1), 4), "by_category": {}}
for k, X in feat.items():
    results["by_category"][k] = run(X)
    results["by_category"][k]["days_with_category_headline"] = round(share_all[k], 3)
results["all_categories_combined"] = run(np.hstack(list(feat.values())))
print(json.dumps(results, indent=2))
with open("category_results.json", "w") as f:
    json.dump(results, f, indent=2)
