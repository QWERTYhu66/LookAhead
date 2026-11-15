"""Monthly table + the 8 model inputs. Training and /api/forecast call the same function."""

from __future__ import annotations

import pandas as pd

from app.categories import CATEGORY_ID, CATEGORY_ORDER
from app.data import month_idx_of

FEATURE_COLS = ["last1", "last2", "last3", "avg3", "so_far", "day", "days_in_month", "category_id"]


def build_monthly_table(
    purchases: pd.DataFrame,
    as_of_day: int = 20,
    *,
    months: pd.PeriodIndex | None = None,
) -> pd.DataFrame:
    """One row per customer × category × month.

    `purchases` columns: customer_id, date, category, amount (positive spend).
    `as_of_day` is 20 when we train, and as_of.day when we answer a forecast.
    Empty months are filled with zeros so last1/last2/last3 shift correctly.
    """
    if purchases.empty:
        return pd.DataFrame()

    df = purchases.copy()
    df["date"] = pd.to_datetime(df["date"])
    df["month"] = df["date"].dt.to_period("M")
    df["dom"] = df["date"].dt.day

    if months is None:
        months = pd.period_range(df["month"].min(), df["month"].max(), freq="M")
    customers = df["customer_id"].unique()

    amount = df.groupby(["customer_id", "category", "month"], observed=True)["amount"].sum()
    n_tx = df.groupby(["customer_id", "category", "month"], observed=True)["amount"].size()
    so_far = (
        df.loc[df["dom"] <= as_of_day]
        .groupby(["customer_id", "category", "month"], observed=True)["amount"]
        .sum()
    )

    idx = pd.MultiIndex.from_product(
        [customers, CATEGORY_ORDER, months],
        names=["customer_id", "category", "month"],
    )
    monthly = pd.DataFrame(index=idx)
    monthly["amount"] = amount.reindex(idx).fillna(0.0)
    monthly["n_tx"] = n_tx.reindex(idx).fillna(0).astype(int)
    monthly["so_far"] = so_far.reindex(idx).fillna(0.0)
    monthly = monthly.reset_index()

    monthly["day"] = int(as_of_day)
    monthly["days_in_month"] = monthly["month"].dt.days_in_month
    monthly["month_idx"] = month_idx_of(monthly["month"].dt.to_timestamp())
    monthly["category_id"] = monthly["category"].map(CATEGORY_ID).astype(int)
    monthly["remaining"] = (monthly["amount"] - monthly["so_far"]).clip(lower=0)

    monthly = monthly.sort_values(["customer_id", "category", "month"]).reset_index(drop=True)
    grouped = monthly.groupby(["customer_id", "category"], sort=False)
    monthly["last1"] = grouped["amount"].shift(1)
    monthly["last2"] = grouped["amount"].shift(2)
    monthly["last3"] = grouped["amount"].shift(3)
    monthly["avg3"] = monthly[["last1", "last2", "last3"]].mean(axis=1)
    monthly["last1_so_far"] = grouped["so_far"].shift(1)
    return monthly


def active_mask(monthly: pd.DataFrame) -> pd.Series:
    """Skip all-zero cells — they would make every method look perfect."""
    return (
        (monthly["so_far"] > 0)
        | (monthly["last1"].fillna(0) > 0)
        | (monthly["last2"].fillna(0) > 0)
        | (monthly["last3"].fillna(0) > 0)
    )


def feature_frame(monthly: pd.DataFrame) -> pd.DataFrame:
    return monthly[FEATURE_COLS].copy()
