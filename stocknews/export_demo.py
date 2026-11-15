"""Export real test days (right and wrong) + the model's output range + multi-market results to demo_days.json.

For a website "pick a test day" demo. Run after baseline.py and market_test.py. Uses the same VADER + logistic
regression model as baseline.py (train 2008-2014, test 2015-Jul 2016).
"""

import json
import os
import warnings

import numpy as np

warnings.filterwarnings("ignore")
exec(open("baseline.py").read().split("y_test = test")[0])  # reuses data loading + sentiment_features

y_test = test["Label"].to_numpy()
Xtr, Xte = sentiment_features(train), sentiment_features(test)
mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-9
model = LogisticRegression(C=1, max_iter=1000).fit((Xtr - mu) / sd, train["Label"])
p_up = model.predict_proba((Xte - mu) / sd)[:, 1]
pred = (p_up >= 0.5).astype(int)


def day(i, kind):
    row = test.iloc[i]
    heads = [h for h in (row[c] for c in top_cols) if h]
    top = sorted(heads, key=lambda h: -abs(vader.polarity_scores(h)["compound"]))[:3]
    return {
        "kind": kind,
        "date": str(row["Date"].date()),
        "model_p_up": round(float(p_up[i]), 3),
        "model_call": "up" if pred[i] else "down",
        "actual": "up" if y_test[i] else "down",
        "top_headlines": [{"text": h[:160], "vader": round(vader.polarity_scores(h)["compound"], 3)} for h in top],
    }


wrong = np.where(pred != y_test)[0]
right_up = np.where((pred == 1) & (y_test == 1))[0]
right_down = np.where((pred == 0) & (y_test == 0))[0]
days = (
    [day(i, "wrong") for i in wrong[np.argsort(-np.abs(p_up[wrong] - 0.5))][:3]]
    + [day(i, "right") for i in right_up[np.argsort(-p_up[right_up])][:2]]
    + [day(i, "right") for i in right_down[np.argsort(p_up[right_down])][:2]]
)

market = []
if os.path.exists("market_results.json"):
    for k, v in json.load(open("market_results.json"))["results"].items():
        m, target, feats = [s.strip() for s in k.split("|")]
        market.append({"market": m, "target": target, "features": feats, "always_up": v["always_up"],
                       "model": v["model"], "p_value": v["p_value_vs_always_up"]})

out = {
    "note": "Real days from the 2015-Jul 2016 test period (never used for training). Prototype, not financial advice.",
    "model": "VADER sentiment features + logistic regression",
    "p_up_min": round(float(p_up.min()), 3),
    "p_up_max": round(float(p_up.max()), 3),
    "share_days_predicted_up": round(float(pred.mean()), 3),
    "down_days_caught": f"{int(((pred == 0) & (y_test == 0)).sum())} of {int((y_test == 0).sum())}",
    "days": days,
    "other_markets_20_tests": market,
}
with open("demo_days.json", "w") as f:
    json.dump(out, f, indent=2)
print(json.dumps(out, indent=2)[:3000])
