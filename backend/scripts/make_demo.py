"""Pick three real customers (student / family / business) and write data/demo/*.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import pandas as pd

from app.forecast import forecast_request
from app.model import load_model
from app.paths import DATA_DEMO, DEMO_AS_OF, MONTHLY_TABLE, PROFILES_JSON, PURCHASES_TABLE
from app.schemas import ForecastRequest, Transaction

PERSONAS = [
    ("student_a", "student", 0.30, "Student A — Nov 20"),
    ("family_b", "family", 0.60, "Family B — Nov 20"),
    ("business_c", "business", 0.90, "Business C — Nov 20"),
]


def load_monthly() -> pd.DataFrame:
    df = pd.read_pickle(MONTHLY_TABLE)
    df["month"] = pd.to_datetime(df["month"]).dt.to_period("M")
    return df


def pick_customers(monthly: pd.DataFrame) -> dict[str, int]:
    span = monthly.groupby("customer_id")["month_idx"].agg(["min", "max"])
    full = span[(span["min"] <= 1) & (span["max"] == 14)].index
    last3 = monthly[(monthly["customer_id"].isin(full)) & (monthly["month_idx"] >= 12) & (monthly["amount"] > 0)]
    ncat = last3.groupby("customer_id")["category"].nunique()
    cands = ncat[ncat >= 5].index
    month_tot = monthly[monthly["customer_id"].isin(cands)].groupby(["customer_id", "month_idx"])["amount"].sum()
    avg = month_tot.groupby("customer_id").mean()
    # Day 20 is ~2/3 of November: keep people still mid-month, not already done spending.
    nov_so_far = monthly[monthly["month_idx"] == 14].groupby("customer_id")["so_far"].sum()
    ratio = (nov_so_far / avg).reindex(cands)
    mid_month = ratio[(ratio >= 0.35) & (ratio <= 0.80)].index
    cands = cands.intersection(mid_month)
    avg = avg.loc[cands]
    print(f"  {len(cands):,} candidates with 15 months, 5+ categories, and a mid-November so far")

    chosen: dict[str, int] = {}
    used: set[int] = set()
    for pid, _persona, q, _label in PERSONAS:
        target = float(avg.quantile(q))
        remaining = avg.drop(index=list(used), errors="ignore")
        cid = int((remaining - target).abs().idxmin())
        chosen[pid] = cid
        used.add(cid)
        print(f"  {pid}: customer {cid}  avg monthly spend {avg.loc[cid]:,.0f}  (target p{int(q*100)}={target:,.0f})")
    return chosen


def purchases_to_request(purchases: pd.DataFrame, as_of: str) -> ForecastRequest:
    cutoff = pd.Timestamp(as_of)
    txs = []
    for _, row in purchases.sort_values("date").iterrows():
        if row["date"] > cutoff:
            continue
        txs.append(
            Transaction(
                date=pd.Timestamp(row["date"]).strftime("%Y-%m-%d"),
                amount=round(float(row["amount"]), 2),
                category=str(row["category"]),
            )
        )
    return ForecastRequest(transactions=txs, as_of=as_of)


def main() -> None:
    monthly = load_monthly()
    purchases = pd.read_pickle(PURCHASES_TABLE)
    purchases["date"] = pd.to_datetime(purchases["date"])
    print("picking demo customers …")
    chosen = pick_customers(monthly)

    DATA_DEMO.mkdir(parents=True, exist_ok=True)
    bundle = load_model()
    profiles = []
    for pid, persona, _q, label in PERSONAS:
        cid = chosen[pid]
        req = purchases_to_request(purchases[purchases["customer_id"] == cid], DEMO_AS_OF)
        (DATA_DEMO / f"{pid}.json").write_text(req.model_dump_json(indent=2), encoding="utf-8")
        resp = forecast_request(bundle, req)
        (DATA_DEMO / f"forecast_{pid}.json").write_text(resp.model_dump_json(indent=2), encoding="utf-8")
        profiles.append({"id": pid, "persona": persona, "label": label, "as_of": DEMO_AS_OF})
        print(f"  {pid}: {len(req.transactions)} txs, predicted total {resp.total.predicted:,.0f}")

    PROFILES_JSON.write_text(json.dumps(profiles, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {PROFILES_JSON}")


if __name__ == "__main__":
    main()
