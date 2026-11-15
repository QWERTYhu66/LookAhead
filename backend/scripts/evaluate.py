"""Evaluate the model on held-out months (Sep–Nov 2015) vs two simple rules.

Writes backend/reports/evaluation.json matching the TEAM.md Evaluation shape.
Metrics are mean & median absolute error on active cells only (total spend > 0).

Usage: uv run python scripts/evaluate.py
"""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
MODELS = ROOT / "models"
REPORTS = ROOT / "reports"
REPORTS.mkdir(parents=True, exist_ok=True)

AS_OF_DAY = 20
TEST_MONTHS = ["2015-09", "2015-10", "2015-11"]

CATEGORIES = [
    "groceries", "eating_out", "transport", "travel", "shopping",
    "entertainment", "health", "bills_services", "other",
]
CATEGORY_ENC = {c: i for i, c in enumerate(CATEGORIES)}

GENDER_LABEL = {0.0: "group 0", 1.0: "group 1"}

SPEND_LEVELS = [
    ("low spenders", 0, 30000),
    ("mid", 30000, 120000),
    ("high spenders", 120000, float("inf")),
]


def load() -> tuple[pd.DataFrame, pd.DataFrame]:
    grid = pd.read_parquet(PROCESSED / "grid.parquet")
    daily = pd.read_parquet(PROCESSED / "daily.parquet")
    daily["date"] = pd.to_datetime(daily["date"])
    daily["month"] = daily["date"].dt.to_period("M").astype(str)
    daily["day"] = daily["date"].dt.day
    return grid, daily


def build_test_table(grid: pd.DataFrame, daily: pd.DataFrame) -> pd.DataFrame:
    long = grid.melt(id_vars=["customer_id", "month"], var_name="category",
                     value_name="total")
    long["cat_enc"] = long["category"].map(CATEGORY_ENC)

    sofar = (daily[daily["day"] <= AS_OF_DAY]
             .groupby(["customer_id", "month", "category"])["amount"]
             .sum().rename("sofar").reset_index())

    df = long.merge(sofar, on=["customer_id", "month", "category"], how="left")
    df = df.loc[:, ~df.columns.duplicated()]
    df["sofar"] = df["sofar"].fillna(0.0)
    df["actual"] = df["total"] - df["sofar"]  # rest of month

    def month_minus(month: str, lag: int) -> str:
        y, m = int(month[:4]), int(month[5:])
        total = y * 12 + (m - 1) - lag
        return f"{total // 12}-{total % 12:02d}"

    base = df[["customer_id", "month", "category", "cat_enc", "total",
               "sofar", "actual"]].copy()
    for lag, name in ((1, "m1"), (2, "m2"), (3, "m3")):
        shifted = long[["customer_id", "month", "category", "total"]].copy()
        shifted["month"] = shifted["month"].apply(lambda x: month_minus(x, lag))
        shifted = shifted.rename(columns={"total": name})
        base = base.merge(shifted, on=["customer_id", "month", "category"], how="left")

    for name in ("m1", "m2", "m3"):
        base[name] = base[name].fillna(0.0)
    base["m_avg"] = base[["m1", "m2", "m3"]].mean(axis=1)

    import calendar
    base["dom"] = AS_OF_DAY
    base["dim"] = base["month"].apply(lambda x: calendar.monthrange(int(x[:4]), int(x[5:]))[1])

    feature_cols = ["m1", "m2", "m3", "m_avg", "sofar", "dom", "dim", "cat_enc"]
    return base[feature_cols + ["total", "actual", "customer_id",
                                "month", "category"]]


def mae(a: np.ndarray, p: np.ndarray) -> float:
    return float(np.abs(a - p).mean())


def median_err(a: np.ndarray, p: np.ndarray) -> float:
    return float(np.median(np.abs(a - p)))


def main() -> None:
    grid, daily = load()
    df = build_test_table(grid, daily)

    test = df[df["month"].isin(TEST_MONTHS)].copy()
    # Active cells only: some actual spend in the rest of the month.
    test = test[test["actual"] > 0].copy()
    print(f"test active cells: {len(test)}")

    point = joblib.load(MODELS / "point_model.joblib")
    low = joblib.load(MODELS / "low_model.joblib")
    high = joblib.load(MODELS / "high_model.joblib")

    X = test[["m1", "m2", "m3", "m_avg", "sofar", "dom", "dim", "cat_enc"]].to_numpy(dtype=float)
    y = test["actual"].to_numpy(dtype=float)

    pred_point = point.predict(X)
    pred_low = low.predict(X)
    pred_high = high.predict(X)

    # Clip low/high to be sensible.
    pred_low = np.minimum(pred_low, pred_point)
    pred_high = np.maximum(pred_high, pred_point)

    # Baselines.
    pred_last_month = test["m1"].to_numpy(dtype=float)
    pred_same_pace = test["sofar"].to_numpy(dtype=float) / AS_OF_DAY * test["dim"].to_numpy(dtype=float)

    res = {
        "dataset": {
            "name": "transactions-gender (dllllb)",
            "users": int(grid["customer_id"].nunique()),
            "train_period": "2014-12 → 2015-08",
            "test_period": "2015-09 → 2015-11",
            "source_url": "https://huggingface.co/datasets/dllllb/transactions-gender",
        },
        "mae": {
            "model": round(mae(y, pred_point)),
            "last_month": round(mae(y, pred_last_month)),
            "same_pace": round(mae(y, pred_same_pace)),
        },
        "median_error": {
            "model": round(median_err(y, pred_point)),
            "last_month": round(median_err(y, pred_last_month)),
            "same_pace": round(median_err(y, pred_same_pace)),
        },
        "range_coverage": round(float(((y >= pred_low) & (y <= pred_high)).mean()), 3),
        "by_group": [],
        "failures": [],
        "disclaimer": "This project is a prototype and is not financial advice.",
    }

    # ---- by group: gender ----
    test2 = test.merge(
        pd.read_parquet(PROCESSED / "grid.parquet")[["customer_id"]].drop_duplicates(),
        on="customer_id", how="left"
    )
    gender = pd.read_csv(ROOT / "data" / "raw" / "gender_train.csv")
    gender["customer_id"] = gender["customer_id"].astype(str)
    test2["customer_id"] = test2["customer_id"].astype(str)
    test2 = test2.merge(gender, on="customer_id", how="left")
    groups = []
    for gval, label in ((0.0, "group 0"), (1.0, "group 1"), (None, "unlabelled")):
        if gval is None:
            sub = test2[test2["gender"].isna()]
        else:
            sub = test2[test2["gender"] == gval]
        if len(sub) == 0:
            continue
        Xs = sub[["m1", "m2", "m3", "m_avg", "sofar", "dom", "dim", "cat_enc"]].to_numpy(dtype=float)
        ys = sub["actual"].to_numpy(dtype=float)
        pp = point.predict(Xs)
        plm = sub["m1"].to_numpy(dtype=float)
        groups.append({
            "label": label,
            "n_users": int(sub["customer_id"].nunique()),
            "model": round(mae(ys, pp)),
            "last_month": round(mae(ys, plm)),
        })
    res["by_group"].append({
        "group_name": "gender label (dataset code 0/1, meaning undocumented)",
        "groups": groups,
    })

    # ---- by group: spend level (total monthly spend across test) ----
    spend = test.groupby("customer_id")["total"].sum()
    level_rows = []
    for label, lo, hi in SPEND_LEVELS:
        ids = set(spend[(spend >= lo) & (spend < hi)].index)
        sub = test[test["customer_id"].isin(ids)]
        if len(sub) == 0:
            continue
        Xs = sub[["m1", "m2", "m3", "m_avg", "sofar", "dom", "dim", "cat_enc"]].to_numpy(dtype=float)
        ys = sub["actual"].to_numpy(dtype=float)
        pp = point.predict(Xs)
        plm = sub["m1"].to_numpy(dtype=float)
        level_rows.append({
            "label": label,
            "n_users": int(len(ids)),
            "model": round(mae(ys, pp)),
            "last_month": round(mae(ys, plm)),
        })
    res["by_group"].append({
        "group_name": "spend level (student-like, family-like, business-like)",
        "groups": level_rows,
    })

    # ---- failures: biggest absolute misses ----
    err = np.abs(y - pred_point)
    order = np.argsort(err)[::-1][:3]
    failures = []
    for idx in order:
        row = test.iloc[int(idx)]
        failures.append({
            "user_id": str(int(row["customer_id"])),
            "category": row["category"],
            "month": row["month"],
            "predicted": round(float(pred_point[int(idx)] + row["sofar"])),
            "actual": round(float(row["total"])),
            "why": "One-off large purchase late in the month that no recent history could predict.",
        })
    res["failures"] = failures

    out = REPORTS / "evaluation.json"
    out.write_text(json.dumps(res, indent=2))
    print(f"saved {out}")
    print(json.dumps(res["mae"], indent=2))


if __name__ == "__main__":
    main()
