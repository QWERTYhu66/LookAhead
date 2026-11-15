"""Download the public dump, clean it, write monthly.parquet. Run from backend/: python scripts/prepare_data.py"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from app.data import clean_transactions, download_raw, load_gender, load_raw_transactions, save_gender
from app.features import build_monthly_table
from app.paths import AS_OF_DAY_TRAIN, DATA_PROCESSED, MONTHLY_TABLE, PURCHASES_TABLE


def main() -> None:
    download_raw()
    print("loading transactions.csv.gz …")
    raw = load_raw_transactions()
    purchases, counts = clean_transactions(raw)
    for key, value in counts.items():
        print(f"  {key}: {value:,}")

    print("building monthly table (customer × category × month) …")
    months = pd_period_range()
    monthly = build_monthly_table(purchases, as_of_day=AS_OF_DAY_TRAIN, months=months)
    print(f"  monthly rows: {len(monthly):,}")

    DATA_PROCESSED.mkdir(parents=True, exist_ok=True)
    to_save = monthly.copy()
    to_save["month"] = to_save["month"].dt.to_timestamp()
    to_save.to_pickle(MONTHLY_TABLE)
    print(f"wrote {MONTHLY_TABLE} ({MONTHLY_TABLE.stat().st_size / 1e6:.1f} MB)")

    purchases.to_pickle(PURCHASES_TABLE)
    print(f"wrote {PURCHASES_TABLE} ({PURCHASES_TABLE.stat().st_size / 1e6:.1f} MB)")

    gender = load_gender()
    save_gender(gender)
    print(f"wrote gender for {len(gender):,} labelled customers")


def pd_period_range():
    import pandas as pd

    return pd.period_range("2014-09", "2015-11", freq="M")


if __name__ == "__main__":
    main()
