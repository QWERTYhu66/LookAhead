"""Baseline for brief 4.2.4: do daily news headlines predict the Dow's direction?

Run: python baseline.py   (needs data/Combined_News_DJIA.csv)
Train on 2008-2014, test on 2015-2016. Split by date, never random.
"""

import json
import re

import numpy as np
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, balanced_accuracy_score, precision_score, recall_score
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

df = pd.read_csv("data/Combined_News_DJIA.csv", parse_dates=["Date"]).sort_values("Date").reset_index(drop=True)
top_cols = [f"Top{i}" for i in range(1, 26)]


def clean(s):
    if not isinstance(s, str):
        return ""
    s = re.sub(r"^b['\"]", "", s)
    return re.sub(r"['\"]$", "", s).strip()


for c in top_cols:
    df[c] = df[c].map(clean)

train_end, valid_start = "2015-01-01", "2014-01-01"
train = df[df["Date"] < train_end]
test = df[df["Date"] >= train_end]
fit = train[train["Date"] < valid_start]
valid = train[train["Date"] >= valid_start]
print(f"train {len(train)} days ({train.Date.min().date()}..{train.Date.max().date()}), "
      f"test {len(test)} days ({test.Date.min().date()}..{test.Date.max().date()})")

vader = SentimentIntensityAnalyzer()


def sentiment_features(frame):
    rows = []
    for _, r in frame.iterrows():
        sc = [vader.polarity_scores(r[c]) for c in top_cols if r[c]]
        comp = np.array([s["compound"] for s in sc]) if sc else np.zeros(1)
        rows.append([
            comp.mean(), comp.min(), comp.max(), comp.std(),
            np.mean([s["neg"] for s in sc]) if sc else 0,
            np.mean([s["pos"] for s in sc]) if sc else 0,
            (comp < -0.05).mean(), (comp > 0.05).mean(),
        ])
    return np.array(rows)


def joined(frame):
    return frame[top_cols].apply(lambda r: " ".join(x for x in r if x), axis=1)


def score(y, p):
    return {
        "accuracy": round(accuracy_score(y, p), 4),
        "balanced_accuracy": round(balanced_accuracy_score(y, p), 4),
        "down_precision": round(precision_score(y, p, pos_label=0, zero_division=0), 4),
        "down_recall": round(recall_score(y, p, pos_label=0, zero_division=0), 4),
    }


y_test = test["Label"].to_numpy()
results = {}

results["baseline_always_up"] = score(y_test, np.ones_like(y_test))
prev = df["Label"].shift(1).loc[test.index].to_numpy().astype(int)
results["baseline_same_as_yesterday"] = score(y_test, prev)

Xs_fit, Xs_valid, Xs_train, Xs_test = (sentiment_features(f) for f in (fit, valid, train, test))
mu, sd = Xs_train.mean(0), Xs_train.std(0) + 1e-9
Xs = {k: (v - mu) / sd for k, v in dict(fit=Xs_fit, valid=Xs_valid, train=Xs_train, test=Xs_test).items()}

best_c = max([0.01, 0.1, 1, 10], key=lambda c: accuracy_score(
    valid["Label"], LogisticRegression(C=c, max_iter=1000).fit(Xs["fit"], fit["Label"]).predict(Xs["valid"])))
m = LogisticRegression(C=best_c, max_iter=1000).fit(Xs["train"], train["Label"])
results["model_vader_logreg"] = score(y_test, m.predict(Xs["test"]))
results["model_vader_logreg"]["C"] = best_c

tf = TfidfVectorizer(stop_words="english", min_df=5, max_features=20000)
T_fit = tf.fit_transform(joined(fit))
best_c2 = max([0.01, 0.1, 1, 10], key=lambda c: accuracy_score(
    valid["Label"], LogisticRegression(C=c, max_iter=1000).fit(T_fit, fit["Label"]).predict(tf.transform(joined(valid)))))
tf = TfidfVectorizer(stop_words="english", min_df=5, max_features=20000)
T_train = tf.fit_transform(joined(train))
m2 = LogisticRegression(C=best_c2, max_iter=1000).fit(T_train, train["Label"])
results["model_tfidf_logreg"] = score(y_test, m2.predict(tf.transform(joined(test))))
results["model_tfidf_logreg"]["C"] = best_c2

results["test_share_up"] = round(float(y_test.mean()), 4)
results["n_test_days"] = int(len(y_test))
print(json.dumps(results, indent=2))
with open("results.json", "w") as f:
    json.dump(results, f, indent=2)
