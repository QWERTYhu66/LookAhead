"""Turn one person's transactions into a ForecastResponse. Uses the same monthly table as training."""

from __future__ import annotations

import math

import pandas as pd

from app.features import active_mask, build_monthly_table
from app.model import predict_remaining
from app.paths import DISCLAIMER
from app.schemas import CategoryForecast, ForecastRequest, ForecastResponse, Totals


def _round(x: float) -> float:
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return 0.0
    return round(float(x), 2)


def _note(so_far: float, day: int, last1_so_far: float | None) -> str:
    spent = f"{so_far:,.0f}"
    if last1_so_far is None or (isinstance(last1_so_far, float) and math.isnan(last1_so_far)):
        return f"Spent {spent} by day {day}; no history for this category last month."
    return f"Spent {spent} by day {day}; by day {day} last month you were at {last1_so_far:,.0f}."


def request_to_purchases(req: ForecastRequest) -> tuple[pd.DataFrame, pd.Timestamp]:
    as_of = pd.Timestamp(req.as_of)
    rows = []
    for tx in req.transactions:
        date = pd.Timestamp(tx.date)
        if date > as_of:
            continue
        rows.append(
            {
                "customer_id": 0,
                "date": date,
                "category": tx.category,
                "amount": float(tx.amount),
            }
        )
    purchases = pd.DataFrame(rows)
    return purchases, as_of


def forecast_request(bundle: dict, req: ForecastRequest) -> ForecastResponse:
    purchases, as_of = request_to_purchases(req)
    if purchases.empty:
        return ForecastResponse(
            as_of=req.as_of,
            days_left=int(as_of.days_in_month - as_of.day),
            categories=[],
            total=Totals(spent_so_far=0, predicted=0, low=0, high=0, last_month=0),
            alerts=[],
            disclaimer=DISCLAIMER,
        )

    months = pd.period_range(purchases["date"].min().to_period("M"), as_of.to_period("M"), freq="M")
    monthly = build_monthly_table(purchases, as_of_day=int(as_of.day), months=months)
    current = monthly[monthly["month"] == as_of.to_period("M")].copy()
    predicted = predict_remaining(bundle, current)

    predicted = predicted[active_mask(predicted)]
    categories: list[CategoryForecast] = []
    for _, row in predicted.iterrows():
        last1 = row.get("last1")
        last1_val = 0.0 if pd.isna(last1) else float(last1)
        so_far = float(row["so_far"])
        categories.append(
            CategoryForecast(
                category=str(row["category"]),
                spent_so_far=_round(so_far),
                predicted=_round(row["predicted"]),
                low=_round(row["low"]),
                high=_round(row["high"]),
                last_month=_round(last1_val),
                note=_note(so_far, int(row["day"]), None if pd.isna(row.get("last1_so_far")) else float(row["last1_so_far"])),
            )
        )

    categories.sort(key=lambda c: c.predicted, reverse=True)
    total = Totals(
        spent_so_far=_round(sum(c.spent_so_far for c in categories)),
        predicted=_round(sum(c.predicted for c in categories)),
        low=_round(sum(c.low for c in categories)),
        high=_round(sum(c.high for c in categories)),
        last_month=_round(sum(c.last_month for c in categories)),
    )
    return ForecastResponse(
        as_of=req.as_of,
        days_left=int(as_of.days_in_month - as_of.day),
        categories=categories,
        total=total,
        alerts=[],
        disclaimer=DISCLAIMER,
    )
