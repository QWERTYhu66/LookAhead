"""Train gradient-boosted trees to predict rest-of-month spend per category.

Features (8 numbers, matches TEAM.md):
  1. spend last month, 2. spend 2 months ago, 3. spend 3 months ago,
  4. their average, 5. spent so far this month (as of day 20),
  6. day of month (20), 7. days in month, 8. category (ordinal)

Target: rest of month spend (total − spent so far).

Trains three models: point (squared error), low (quantile 0.1), high (quantile 0.9).
Saves to backend/models/.

Usage: uv run python scripts/train_model.py
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import HistGradientBoostingRegressor

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
MODELS = ROOT / "models"
MODELS.mkdir(parents=True, exist_ok=True)

AS_OF_DAY = 20
TRAIN_START = "2014-12"
TRAIN_END = "2015-08"

CATEGORY_ENC = {c: i for i, c in enumerate(
    ["groceries", "eating_out", "transport", "travel", "shopping",
     "entertainment", "health", "bills_services", "other"]
)}


def load() -> tuple[pd.DataFrame, pd.DataFrame]:
    grid = pd.read_parquet(PROCESSED / "grid.parquet")
    daily = pd.read_parquet(PROCESSED / "daily.parquet")
    daily["date"] = pd.to_datetime(daily["date"])
    daily["month"] = daily["date"].dt.to_period("M").astype(str)
    daily["day"] = daily["date"].dt.day
    return grid, daily


def month_bounds(month: str) -> tuple[int, int]:
    y, m = month.split("-")
    y, m = int(y), int(m)
    import calendar
    return 1, calendar.monthrange(y, m)[1]


def build_feature_table(grid: pd.DataFrame, daily: pd.DataFrame) -> pd.DataFrame:
    # Long monthly totals: customer, month, category, total
    long = grid.melt(id_vars=["customer_id", "month"], var_name="category",
                     value_name="total")
    long["cat_enc"] = long["category"].map(CATEGORY_ENC)

    # Spent so far as of day 20 per (customer, month, category)
    sofar = (daily[daily["day"] <= AS_OF_DAY]
             .groupby(["customer_id", "month", "category"])["amount"]
             .sum().rename("sofar").reset_index())

    df = long.merge(sofar, on=["customer_id", "month", "category"], how="left")
    df = df.loc[:, ~df.columns.duplicated()]
    df["sofar"] = df["sofar"].fillna(0.0)
    df["target"] = df["total"] - df["sofar"]  # rest of month after day 20

    # Lag features: totals from m-1, m-2, m-3 via self-join on shifted month
    def month_minus(month: str, lag: int) -> str:
        y, m = int(month[:4]), int(month[5:])
        total = y * 12 + (m - 1) - lag
        return f"{total // 12}-{total % 12:02d}"

    frames = []
    for lag, name in ((1, "m1"), (2, "m2"), (3, "m3")):
        shifted = long[["customer_id", "month", "category", "total"]].copy()
        shifted["month"] = shifted["month"].apply(lambda x: month_minus(x, lag))
        shifted = shifted.rename(columns={"total": name})
        frames.append(shifted)

    base = df[["customer_id", "month", "category", "cat_enc", "total", "sofar",
               "target"]].copy()
    for f in frames:
        base = base.merge(f, on=["customer_id", "month", "category"], how="left")

    for name in ("m1", "m2", "m3"):
        base[name] = base[name].fillna(0.0)
    base["m_avg"] = base[["m1", "m2", "m3"]].mean(axis=1)

    base["dom"] = AS_OF_DAY
    base["dim"] = base["month"].apply(lambda x: month_bounds(x)[1])

    feature_cols = ["m1", "m2", "m3", "m_avg", "sofar", "dom", "dim", "cat_enc"]
    return base[feature_cols + ["target", "customer_id", "month", "category"]]
def train(df: pd.DataFrame) -> None:
    train_mask = (df["month"] >= TRAIN_START) & (df["month"] <= TRAIN_END)
    tr = df[train_mask].copy()
    # Only cells with some history (avoid all-zero cold starts dominating).
    tr = tr[(tr[["m1", "m2", "m3"]].sum(axis=1) > 0) | (tr["sofar"] > 0)]
    X = tr[["m1", "m2", "m3", "m_avg", "sofar", "dom", "dim", "cat_enc"]].to_numpy(dtype=float)
    y = tr["target"].to_numpy(dtype=float)
    print(f"training rows: {len(X)}")

    models = {}
    for name, loss, q in (("point", "squared_error", None),
                          ("low", "quantile", 0.1),
                          ("high", "quantile", 0.9)):
        kwargs = dict(loss=loss, max_iter=300, learning_rate=0.08,
                      max_leaf_nodes=31, min_samples_leaf=20, random_state=42)
        if q is not None:
            kwargs["quantile"] = q
        m = HistGradientBoostingRegressor(**kwargs)
        m.fit(X, y)
        pred = m.predict(X)
        mae = float(np.abs(pred - y).mean())
        models[name] = m
        print(f"{name}: train MAE = {mae:,.0f}")

    for name, m in models.items():
        joblib.dump(m, MODELS / f"{name}_model.joblib")
    joblib.dump(CATEGORY_ENC, MODELS / "category_enc.joblib")
    print(f"saved models to {MODELS}")


def main() -> None:
    grid, daily = load()
    df = build_feature_table(grid, daily)
    train(df)


if __name__ == "__main__":
    main()
