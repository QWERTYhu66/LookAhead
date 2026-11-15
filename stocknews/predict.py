"""Run the headline model with only vaderSentiment (pure Python, no scikit-learn).

Usage:  python predict.py "headline one" "headline two" ...
Or import:  from predict import predict;  predict(["headline 1", "headline 2"])
Prototype, not financial advice. The model is close to a coin flip: P(up) stays between about 0.42 and 0.64.
"""

import json
import math
import os
import sys

from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

_HERE = os.path.dirname(os.path.abspath(__file__))
_PARAMS = json.load(open(os.path.join(_HERE, "model_params.json")))
_VADER = SentimentIntensityAnalyzer()


def _mean(xs):
    return sum(xs) / len(xs)


def features(headlines):
    scores = [_VADER.polarity_scores(h) for h in headlines if h and h.strip()]
    if not scores:
        return [0.0] * 8
    comp = [s["compound"] for s in scores]
    m = _mean(comp)
    return [
        m, min(comp), max(comp), math.sqrt(_mean([(c - m) ** 2 for c in comp])),
        _mean([s["neg"] for s in scores]), _mean([s["pos"] for s in scores]),
        sum(c < -0.05 for c in comp) / len(comp), sum(c > 0.05 for c in comp) / len(comp),
    ]


def predict(headlines):
    """headlines: list of up to 25 headline strings for one day. Returns a dict."""
    x = features(headlines[:25])
    z = _PARAMS["intercept"] + sum(
        w * (v - mu) / sd for w, v, mu, sd in zip(_PARAMS["coef"], x, _PARAMS["mean"], _PARAMS["std"])
    )
    p_up = 1 / (1 + math.exp(-z))
    return {
        "p_up": round(p_up, 4),
        "call": "up" if p_up >= 0.5 else "down",
        "features": dict(zip(_PARAMS["feature_names"], [round(v, 4) for v in x])),
        "disclaimer": "This project is a prototype and is not financial advice.",
    }


if __name__ == "__main__":
    print(json.dumps(predict(sys.argv[1:]), indent=2))
