"""Clean the raw transactions and build the person × category × month grid.

Steps (mirrors DECISIONS.md):
  1. load transactions + gender + MCC code map
  2. anchor relative day 0 to 2014-09-01, derive month
  3. keep card purchases only (spend amounts), map MCC → 9 categories
  4. dedupe, drop the stray day, drop customers with too little history
  5. aggregate to one row per customer × category × month (spend amount)
  6. save to data/processed/grid.parquet

Usage: uv run python scripts/prepare_data.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw"
PROCESSED = ROOT / "data" / "processed"
PROCESSED.mkdir(parents=True, exist_ok=True)

ANCHOR = pd.Timestamp("2014-09-01")  # day 0
STRAY_DAY = 456  # 2015-12-01, outside the 15-month window
MIN_MONTHS_HISTORY = 2  # customers need at least this many active months

# Standard MCC code → one of the 9 spend categories. Codes not listed → "other".
MCC_TO_CATEGORY: dict[int, str] = {
    # groceries
    5411: "groceries", 5499: "groceries",
    # eating out
    5812: "eating_out", 5813: "eating_out", 5814: "eating_out",
    # transport / fuel
    4111: "transport", 4121: "transport", 4131: "transport",
    4511: "transport", 4582: "transport",
    5541: "transport", 5542: "transport", 5551: "transport",
    # travel
    4722: "travel", 7011: "travel", 7512: "travel",
    # shopping
    5311: "shopping", 5331: "shopping", 5611: "shopping", 5621: "shopping",
    5631: "shopping", 5641: "shopping", 5651: "shopping", 5661: "shopping",
    5691: "shopping", 5732: "shopping", 5942: "shopping", 5944: "shopping",
    5947: "shopping", 5948: "shopping", 5999: "shopping",
    # entertainment
    7832: "entertainment", 7991: "entertainment", 7999: "entertainment",
    # health
    5912: "health", 8011: "health", 8021: "health", 8041: "health",
    8049: "health", 8099: "health",
    # bills / services
    4812: "bills_services", 4814: "bills_services", 4900: "bills_services",
    5960: "bills_services",
}

CATEGORIES = [
    "groceries", "eating_out", "transport", "travel", "shopping",
    "entertainment", "health", "bills_services", "other",
]


def load_transactions() -> pd.DataFrame:
    path = RAW / "transactions.csv"
    if not path.exists():
        gz = RAW / "transactions.csv.gz"
        import gzip, shutil
        with gzip.open(gz, "rb") as fi, open(path, "wb") as fo:
            shutil.copyfileobj(fi, fo)
    # Read everything as object to avoid mixed int/string column inference failures,
    # then convert the numeric columns manually.
    df = pd.read_csv(path, dtype="object")
    df = df.rename(columns={"tr_datetime": "datetime_raw"})
    df["amount"] = pd.to_numeric(df["amount"], errors="coerce")
    df["mcc_code"] = pd.to_numeric(df["mcc_code"], errors="coerce")
    df["customer_id"] = df["customer_id"].astype("string")
    return df


def load_gender() -> pd.DataFrame:
    path = RAW / "gender_train.csv"
    if not path.exists():
        return pd.DataFrame(columns=["customer_id", "gender"])
    g = pd.read_csv(path, dtype="object")
    g["customer_id"] = g["customer_id"].astype("string")
    g["gender"] = pd.to_numeric(g["gender"], errors="coerce")
    return g


def parse_day(s: pd.Series) -> pd.Series:
    # tr_datetime looks like "20 14:30:00" → leading integer is the relative day.
    return s.astype(str).str.split().str[0].astype("float64")


def mcc_category(code) -> str:
    if pd.isna(code):
        return "other"
    return MCC_TO_CATEGORY.get(int(code), "other")


def main() -> None:
    tx = load_transactions()
    gender = load_gender()

    # Parse relative day → calendar date → month.
    tx["day"] = parse_day(tx["datetime_raw"])
    tx["date"] = (ANCHOR + pd.to_timedelta(tx["day"], unit="D")).dt.normalize()
    tx["month"] = tx["date"].dt.to_period("M").astype(str)
    tx = tx.drop(columns=["datetime_raw"])

    # Keep card purchases only: negative amount = spend (income/refunds are positive).
    tx = tx[tx["amount"] < 0].copy()
    tx["amount"] = tx["amount"].abs()
    # Map MCC → category.
    tx["category"] = tx["mcc_code"].map(mcc_category)
    dedupe_cols = [c for c in ("customer_id", "date", "mcc_code", "amount") if c in tx.columns]
    before = len(tx)
    tx = tx.drop_duplicates(subset=dedupe_cols)
    print(f"deduped {before} → {len(tx)} rows")

    # Drop the stray day (Dec 1) outside Sep 2014 – Nov 2015.
    tx = tx[tx["day"] != STRAY_DAY].copy()
    print(f"after dropping stray day: {len(tx)} rows")

    # Gender join (used only for the fairness check, never a model input).
    if not gender.empty:
        tx = tx.merge(gender, on="customer_id", how="left")

    # Customer history: number of distinct months with any spend.
    months_per_user = tx.groupby("customer_id")["month"].nunique()
    keep_users = set(months_per_user[months_per_user >= MIN_MONTHS_HISTORY].index)
    tx = tx[tx["customer_id"].isin(keep_users)].copy()
    print(f"customers kept: {tx['customer_id'].nunique()}")

    # Save cleaned daily-level table (needed for "spent so far as of day 20").
    daily = tx[["customer_id", "date", "category", "amount"]].copy()
    daily_out = PROCESSED / "daily.parquet"
    daily.to_parquet(daily_out, index=False)
    print(f"saved {daily_out}: {len(daily)} rows")

    # Aggregate to customer × category × month spend.
    grid = (
        tx.groupby(["customer_id", "category", "month"], as_index=False)["amount"]
        .sum()
        .rename(columns={"amount": "spend"})
    )
    # Ensure every category exists per (customer, month) with 0 fill.
    grid = grid.pivot_table(
        index=["customer_id", "month"], columns="category", values="spend", aggfunc="sum", fill_value=0
    ).reset_index()
    for c in CATEGORIES:
        if c not in grid.columns:
            grid[c] = 0.0
    grid = grid[["customer_id", "month"] + CATEGORIES]

    # Attach gender if available.
    if not gender.empty:
        grid = grid.merge(gender, on="customer_id", how="left")

    out = PROCESSED / "grid.parquet"
    grid.to_parquet(out, index=False)
    print(f"saved {out}: {len(grid)} rows, {grid['customer_id'].nunique()} customers, "
          f"{grid['month'].nunique()} months")


if __name__ == "__main__":
    main()
