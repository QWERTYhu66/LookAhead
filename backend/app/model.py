"""Train, save, load, and predict with three quantile gradient-boosted trees."""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

from app.features import FEATURE_COLS, feature_frame
from app.paths import MODEL_PATH

MODEL_PARAMS = dict(
    max_iter=150,
    learning_rate=0.05,
    max_leaf_nodes=31,
    min_samples_leaf=50,
    categorical_features=["category_id"],
    early_stopping=False,
    random_state=42,
)


def _fit_one(X: pd.DataFrame, y: np.ndarray, quantile: float) -> HistGradientBoostingRegressor:
    model = HistGradientBoostingRegressor(loss="quantile", quantile=quantile, **MODEL_PARAMS)
    model.fit(X, y)
    return model


def clip_targets(train: pd.DataFrame) -> pd.Series:
    """Cap remaining spend at each category's 99.5th percentile so a few huge months don't dominate."""
    y = train["remaining"].astype(float).copy()
    caps = train.groupby("category")["remaining"].quantile(0.995)
    for cat, cap in caps.items():
        mask = train["category"] == cat
        y.loc[mask] = y.loc[mask].clip(upper=float(cap))
    return y


def train(monthly: pd.DataFrame, sample_n: int = 1_000_000, seed: int = 42) -> dict:
    if len(monthly) > sample_n:
        monthly = monthly.sample(n=sample_n, random_state=seed)
        print(f"sampled {sample_n:,} training rows")
    else:
        print(f"training on all {len(monthly):,} rows (under the {sample_n:,} cap)")

    X = feature_frame(monthly)
    y = clip_targets(monthly).to_numpy()
    print("fitting p50 / p10 / p90 …")
    bundle = {
        "p50": _fit_one(X, y, 0.5),
        "p10": _fit_one(X, y, 0.1),
        "p90": _fit_one(X, y, 0.9),
        "feature_cols": FEATURE_COLS,
    }
    return bundle


def save_model(bundle: dict, path: Path | None = None) -> Path:
    path = path or MODEL_PATH
    path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(bundle, path)
    print(f"wrote {path} ({path.stat().st_size / 1e6:.1f} MB)")
    return path


def load_model(path: Path | None = None) -> dict:
    path = path or MODEL_PATH
    return joblib.load(path)


def predict_remaining(bundle: dict, monthly: pd.DataFrame) -> pd.DataFrame:
    """Add rem_p10 / rem_p50 / rem_p90 / predicted / low / high. Remaining is clipped at 0."""
    X = feature_frame(monthly)
    rem50 = np.maximum(bundle["p50"].predict(X), 0)
    rem10 = np.maximum(bundle["p10"].predict(X), 0)
    rem90 = np.maximum(bundle["p90"].predict(X), 0)
    so_far = monthly["so_far"].to_numpy()
    out = monthly.copy()
    out["rem_p10"] = rem10
    out["rem_p50"] = rem50
    out["rem_p90"] = rem90
    out["predicted"] = so_far + rem50
    out["low"] = so_far + np.minimum(rem10, rem50)
    out["high"] = so_far + np.maximum(rem90, rem50)
    return out
