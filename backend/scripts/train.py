"""Fit the three quantile models on months 3–11. Run from backend/: python scripts/train.py"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pandas as pd

from app.features import active_mask
from app.model import save_model, train
from app.paths import MONTHLY_TABLE, TRAIN_MONTHS


def load_monthly() -> pd.DataFrame:
    df = pd.read_pickle(MONTHLY_TABLE)
    df["month"] = pd.to_datetime(df["month"]).dt.to_period("M")
    return df


def main() -> None:
    monthly = load_monthly()
    train_rows = monthly[monthly["month_idx"].isin(list(TRAIN_MONTHS))]
    active = train_rows[active_mask(train_rows)]
    print(f"train months 3–11: {len(train_rows):,} rows, {len(active):,} active")
    bundle = train(active)
    save_model(bundle)


if __name__ == "__main__":
    main()
