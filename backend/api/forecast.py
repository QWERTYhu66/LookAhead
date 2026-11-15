"""Core forecasting logic: turn a customer's transactions + an as-of date into a
month-end forecast per category, using the trained gradient-boosted models.

Mirrors the training feature contract (8 numbers per category).
"""

from __future__ import annotations

from pathlib import Path

import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
MODELS = ROOT / "models"

CATEGORIES = [
    "groceries", "eating_out", "transport", "travel", "shopping",
    "entertainment", "health", "bills_services", "other",
]
CATEGORY_ENC = joblib.load(MODELS / "category_enc.joblib")
POINT = joblib.load(MODELS / "point_model.joblib")
LOW = joblib.load(MODELS / "low_model.joblib")
HIGH = joblib.load(MODELS / "high_model.joblib")


def _month_minus(month: str, lag: int) -> str:
    y, m = int(month[:4]), int(month[5:])
    total = y * 12 + (m - 1) - lag
    return f"{total // 12}-{total % 12:02d}"


def _monthly_totals(df: pd.DataFrame) -> pd.DataFrame:
    """Sum spend per (month, category). df has date, amount, category."""
    df = df.copy()
    df["month"] = pd.to_datetime(df["date"]).dt.to_period("M").astype(str)
    return df.groupby(["month", "category"], as_index=False)["amount"].sum()


def forecast(transactions: list[dict], as_of: str) -> dict:
    """Return per-category forecast + total for the given transactions as of `as_of`."""
    as_of_ts = pd.Timestamp(as_of)
    dom = int(as_of_ts.day)
    import calendar
    dim = calendar.monthrange(as_of_ts.year, as_of_ts.month)[1]
    as_of_month = str(as_of_ts.to_period("M"))
    days_left = dim - dom

    df = pd.DataFrame(transactions)
    if df.empty:
        df = pd.DataFrame(columns=["date", "amount", "category"])
    else:
        df["date"] = pd.to_datetime(df["date"])

    totals = _monthly_totals(df)

    def total_for(month: str, category: str) -> float:
        row = totals[(totals["month"] == month) & (totals["category"] == category)]
        return float(row["amount"].iloc[0]) if len(row) else 0.0

    # Spent so far in the as_of month up to (and including) as_of day.
    sofar_df = df[(df["date"].dt.to_period("M").astype(str) == as_of_month)
                  & (df["date"].dt.day <= dom)]
    sofar_by_cat = sofar_df.groupby("category")["amount"].sum() if len(sofar_df) else pd.Series(dtype=float)

    categories = []
    total_spent_so_far = 0.0
    total_predicted = 0.0
    total_low = 0.0
    total_high = 0.0
    total_last_month = 0.0

    for cat in CATEGORIES:
        sofar = float(sofar_by_cat.get(cat, 0.0))
        m1 = total_for(_month_minus(as_of_month, 1), cat)
        m2 = total_for(_month_minus(as_of_month, 2), cat)
        m3 = total_for(_month_minus(as_of_month, 3), cat)
        m_avg = (m1 + m2 + m3) / 3.0

        X = np.array([[m1, m2, m3, m_avg, sofar, dom, dim, CATEGORY_ENC[cat]]], dtype=float)
        p_point = float(POINT.predict(X)[0])
        p_low = float(LOW.predict(X)[0])
        p_high = float(HIGH.predict(X)[0])
        p_low = min(p_low, p_point)
        p_high = max(p_high, p_point)

        predicted = sofar + p_point
        low = sofar + p_low
        high = sofar + p_high

        categories.append({
            "category": cat,
            "spent_so_far": round(sofar, 2),
            "predicted": round(predicted, 2),
            "low": round(low, 2),
            "high": round(high, 2),
            "last_month": round(m1, 2),
            "note": _note(cat, sofar, predicted, m1, days_left),
        })

        total_spent_so_far += sofar
        total_predicted += predicted
        total_low += low
        total_high += high
        total_last_month += m1

    return {
        "as_of": as_of,
        "days_left": days_left,
        "categories": categories,
        "total": {
            "spent_so_far": round(total_spent_so_far, 2),
            "predicted": round(total_predicted, 2),
            "low": round(total_low, 2),
            "high": round(total_high, 2),
            "last_month": round(total_last_month, 2),
        },
    }


def _note(cat: str, sofar: float, predicted: float, last_month: float, days_left: int) -> str:
    label = cat.replace("_", " ")
    if last_month > 0 and predicted > last_month * 1.1:
        return f"Tracking to finish above last month's {label} spend ({predicted:,.0f} vs {last_month:,.0f})."
    if last_month > 0 and predicted < last_month * 0.9:
        return f"Tracking to finish below last month's {label} spend ({predicted:,.0f} vs {last_month:,.0f})."
    if sofar > 0 and days_left > 0:
        return f"{sofar:,.0f} spent so far with {days_left} days left; {label} is on a steady pace."
    if predicted > 0:
        return f"No recent history in {label}; the range is wide because this category is irregular."
    return f"No {label} spend recorded this month."
