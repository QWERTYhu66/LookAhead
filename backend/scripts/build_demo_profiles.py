"""Pick 3 demo customers (student / family / business) and save their
transactions up to 2015-11-20 so the API can serve real profiles.

Usage: uv run python scripts/build_demo_profiles.py
"""

from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
PROCESSED = ROOT / "data" / "processed"
DEMO = ROOT / "data" / "demo"
DEMO.mkdir(parents=True, exist_ok=True)

AS_OF = "2015-11-20"


def main() -> None:
    daily = pd.read_parquet(PROCESSED / "daily.parquet")
    daily["date"] = pd.to_datetime(daily["date"])
    daily["month"] = daily["date"].dt.to_period("M").astype(str)

    # Total spend per customer in Nov 2015 (the demo month) → spend level.
    nov = daily[daily["month"] == "2015-11"]
    # Spend before the as-of date (the demo moment), so the forecast has real history.
    before = daily[daily["date"] <= pd.Timestamp(AS_OF)]
    spend = before.groupby("customer_id")["amount"].sum().sort_values()

    n = len(spend)
    i_student = max(0, int(n * 0.10))
    i_family = int(n * 0.50)
    i_business = min(n - 1, int(n * 0.90))

    picks = {
        "student_a": {"id": "student_a", "persona": "student",
                      "label": "Student A — Nov 20",
                      "customer_id": str(spend.index[i_student])},
        "family_b": {"id": "family_b", "persona": "family",
                     "label": "Family B — Nov 20",
                     "customer_id": str(spend.index[i_family])},
        "business_c": {"id": "business_c", "persona": "business",
                       "label": "Business C — Nov 20",
                       "customer_id": str(spend.index[i_business])},
    }

    profiles = []
    for pid, info in picks.items():
        cid = info["customer_id"]
        tx = daily[daily["customer_id"] == cid]
        tx = tx[tx["date"] <= pd.Timestamp(AS_OF)].copy()
        # Only categories present; include all spend for context.
        records = [
            {"date": r["date"].strftime("%Y-%m-%d"),
             "amount": float(r["amount"]),
             "category": r["category"]}
            for _, r in tx.iterrows()
        ]
        (DEMO / f"{pid}.json").write_text(json.dumps(records, indent=2))
        nov_spend = float(spend.loc[cid]) if cid in spend.index else 0.0
        profiles.append({
            "id": pid,
            "label": info["label"],
            "as_of": AS_OF,
            "persona": info["persona"],
        })
        print(f"{pid}: customer {cid}, {len(records)} transactions, pre-asof spend {nov_spend:,.0f}")

    (DEMO / "profiles.json").write_text(json.dumps(profiles, indent=2))
    print(f"saved {DEMO / 'profiles.json'} and per-customer transactions")


if __name__ == "__main__":
    main()
