"""Load the public bank-card dump and apply the cleaning rules in instructionsForLeon.md."""

from __future__ import annotations

from pathlib import Path
from urllib.request import Request, urlopen

import pandas as pd

from app.categories import category_of
from app.paths import (
    GENDER_CSV,
    GENDER_TABLE,
    HF_BASE,
    MCC_CSV,
    ORIGIN,
    TRANSACTIONS_GZ,
    TYPES_CSV,
)

RAW_FILES = ("transactions.csv.gz", "gender_train.csv", "tr_mcc_codes.csv", "tr_types.csv")


def download_raw(dest_dir: Path | None = None) -> None:
    dest_dir = dest_dir or TRANSACTIONS_GZ.parent
    dest_dir.mkdir(parents=True, exist_ok=True)
    for name in RAW_FILES:
        path = dest_dir / name
        if path.exists() and path.stat().st_size > 0:
            print(f"already have {path.name} ({path.stat().st_size:,} bytes)")
            continue
        url = f"{HF_BASE}/{name}"
        print(f"downloading {url}")
        req = Request(url, headers={"User-Agent": "lookahead-backend/0.1"})
        with urlopen(req, timeout=120) as resp, open(path, "wb") as out:
            while True:
                chunk = resp.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
        print(f"  wrote {path} ({path.stat().st_size:,} bytes)")


def _parse_dates(tr_datetime: pd.Series) -> pd.Series:
    day_num = tr_datetime.str.split(" ", n=1, expand=True)[0].astype(int)
    origin = pd.Timestamp(ORIGIN)
    return origin + pd.to_timedelta(day_num, unit="D")


def month_idx_of(dates: pd.Series | pd.DatetimeIndex | pd.Index) -> pd.Series:
    """Sep 2014 = 0, Nov 2015 = 14."""
    s = dates if isinstance(dates, pd.Series) else pd.Series(dates)
    s = pd.to_datetime(s)
    return (s.dt.year - 2014) * 12 + s.dt.month - 9


def clean_transactions(raw: pd.DataFrame) -> tuple[pd.DataFrame, dict[str, int]]:
    """Return purchase rows (positive amounts, 9 categories) plus cleaning counts."""
    counts: dict[str, int] = {"raw_rows": int(len(raw)), "raw_customers": int(raw["customer_id"].nunique())}

    df = raw.drop_duplicates(subset=["customer_id", "tr_datetime", "mcc_code", "tr_type", "amount"])
    counts["after_dedup"] = int(len(df))
    counts["dedup_removed"] = counts["raw_rows"] - counts["after_dedup"]

    df = df.copy()
    df["date"] = _parse_dates(df["tr_datetime"])
    df = df[df["date"] < pd.Timestamp("2015-12-01")]
    counts["after_date_filter"] = int(len(df))

    df["month_idx"] = month_idx_of(df["date"])
    first = df.groupby("customer_id")["month_idx"].min()
    keep_ids = first[first <= 1].index
    counts["dropped_late_starters"] = int((first > 1).sum())
    df = df[df["customer_id"].isin(keep_ids)]
    counts["customers_kept"] = int(df["customer_id"].nunique())

    amount = df["amount"]
    tr_type = df["tr_type"].astype(int)
    is_income = amount > 0
    is_purchase = (~is_income) & ((tr_type < 2000) | tr_type.between(2320, 2323))
    purchases = df.loc[is_purchase].copy()
    purchases["amount"] = purchases["amount"].abs()
    purchases["category"] = purchases["mcc_code"].map(category_of)
    purchases = purchases.dropna(subset=["category"])
    counts["purchase_rows"] = int(len(purchases))
    counts["purchase_customers"] = int(purchases["customer_id"].nunique())

    out = purchases[["customer_id", "date", "category", "amount", "month_idx"]].reset_index(drop=True)
    out["category"] = out["category"].astype(str)
    return out, counts


def load_raw_transactions(path: Path | None = None) -> pd.DataFrame:
    path = path or TRANSACTIONS_GZ
    return pd.read_csv(
        path,
        usecols=["customer_id", "tr_datetime", "mcc_code", "tr_type", "amount"],
        dtype={"customer_id": "int64", "mcc_code": "int32", "tr_type": "int32", "amount": "float64"},
    )


def load_gender(path: Path | None = None) -> pd.DataFrame:
    path = path or GENDER_CSV
    gender = pd.read_csv(path)
    gender.columns = [c.strip().lower() for c in gender.columns]
    return gender[["customer_id", "gender"]].drop_duplicates("customer_id")


def save_gender(gender: pd.DataFrame, path: Path | None = None) -> None:
    path = path or GENDER_TABLE
    path.parent.mkdir(parents=True, exist_ok=True)
    gender.to_pickle(path)
