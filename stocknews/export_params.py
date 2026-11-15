"""Export the trained VADER + logistic regression model as plain numbers (model_params.json).

predict.py can then run the model with only the vaderSentiment package (no scikit-learn / pandas), so it is easy
to host. Same model as baseline.py: train 2008-2014, C=1. Run: python export_params.py
"""

import json
import warnings

warnings.filterwarnings("ignore")
exec(open("baseline.py").read().split("y_test = test")[0])  # data loading + sentiment_features

Xtr = sentiment_features(train)
mu, sd = Xtr.mean(0), Xtr.std(0) + 1e-9
model = LogisticRegression(C=1, max_iter=1000).fit((Xtr - mu) / sd, train["Label"])
params = {
    "description": "VADER sentiment features of a day's headlines -> logistic regression -> P(Dow up). Prototype, not financial advice.",
    "trained_on": "2008-08-08 to 2014-12-31 (Reddit WorldNews top-25 headlines, Kaggle 'Daily News for Stock Market Prediction')",
    "feature_names": ["mean_compound", "min_compound", "max_compound", "std_compound", "mean_neg", "mean_pos",
                      "share_negative", "share_positive"],
    "mean": [float(x) for x in mu],
    "std": [float(x) for x in sd],
    "coef": [float(x) for x in model.coef_[0]],
    "intercept": float(model.intercept_[0]),
}
with open("model_params.json", "w") as f:
    json.dump(params, f, indent=2)
print("wrote model_params.json", params["coef"], params["intercept"])
