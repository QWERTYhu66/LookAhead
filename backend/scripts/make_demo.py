"""Pick three real customers whose spending mix matches student / family / business."""

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

# The bank dump has no "student / family / business" label. We pick real people
# whose recent spend is concentrated in categories that fit that story, then
# keep only those categories in the demo JSON the app loads.
PERSONA_CATEGORIES: dict[str, list[str]] = {
    "student": ["eating_out", "groceries", "transport", "entertainment", "shopping"],
    "family": ["groceries", "shopping", "health", "bills_services", "transport", "eating_out"],
    "business": ["bills_services", "transport", "travel", "shopping"],
}
MUST_HAVE: dict[str, list[str]] = {
    "student": ["eating_out", "groceries"],
    "family": ["groceries", "bills_services", "health"],
    "business": ["bills_services", "transport"],
}
PERSONAS = [
    ("student_a", "student", 0.30, "Student A — Nov 20"),
    ("family_b", "family", 0.60, "Family B — Nov 20"),
    ("business_c", "business", 0.90, "Business C — Nov 20"),
]


def load_monthly() -> pd.DataFrame:
    df = pd.read_pickle(MONTHLY_TABLE)
    df["month"] = pd.to_datetime(df["month"]).dt.to_period("M")
    return df


def pick_customer(monthly: pd.DataFrame, persona: str, q: float, used: set[int]) -> int:
    cats = PERSONA_CATEGORIES[persona]
    must = MUST_HAVE[persona]
    last3 = monthly[(monthly["month_idx"] >= 12) & (monthly["amount"] > 0)]
    tot = last3.groupby("customer_id")["amount"].sum()
    in_story = last3[last3["category"].isin(cats)].groupby("customer_id")["amount"].sum()
    share = (in_story / tot).dropna()
    share = share[share >= 0.55]

    have = last3[last3["category"].isin(must)].groupby("customer_id")["category"].nunique()
    have = have[have >= len(must)]

    span = monthly.groupby("customer_id")["month_idx"].agg(["min", "max"])
    full = span[(span["min"] <= 1) & (span["max"] == 14)].index

    story_spend = (
        monthly[monthly["category"].isin(cats)]
        .groupby(["customer_id", "month_idx"])["amount"]
        .sum()
        .groupby("customer_id")
        .mean()
    )
    nov_so_far = (
        monthly[(monthly["month_idx"] == 14) & (monthly["category"].isin(cats))]
        .groupby("customer_id")["so_far"]
        .sum()
    )
    ratio = (nov_so_far / story_spend).replace([float("inf"), -float("inf")], pd.NA).dropna()
    mid = ratio[(ratio >= 0.30) & (ratio <= 0.85)].index

    cands = share.index.intersection(have.index).intersection(full).intersection(mid)
    cands = pd.Index([c for c in cands if int(c) not in used])
    if len(cands) == 0:
        raise RuntimeError(f"no demo candidates for {persona}")

    avg = story_spend.loc[cands]
    target = float(avg.quantile(q))
    cid = int((avg - target).abs().idxmin())
    print(
        f"  {persona}: customer {cid}  story-cat monthly avg {avg.loc[cid]:,.0f}  "
        f"share {share.loc[cid]:.0%}  (target p{int(q*100)}={target:,.0f})"
    )
    return cid


def purchases_to_request(purchases: pd.DataFrame, as_of: str, categories: list[str]) -> ForecastRequest:
    cutoff = pd.Timestamp(as_of)
    allowed = set(categories)
    txs = []
    for _, row in purchases.sort_values("date").iterrows():
        if row["date"] > cutoff:
            continue
        if str(row["category"]) not in allowed:
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
    print("picking demo customers whose mix matches each persona …")
    used: set[int] = set()
    chosen: dict[str, int] = {}
    for pid, persona, q, _label in PERSONAS:
        cid = pick_customer(monthly, persona, q, used)
        chosen[pid] = cid
        used.add(cid)

    DATA_DEMO.mkdir(parents=True, exist_ok=True)
    bundle = load_model()
    profiles = []
    for pid, persona, _q, label in PERSONAS:
        cid = chosen[pid]
        cats = PERSONA_CATEGORIES[persona]
        req = purchases_to_request(purchases[purchases["customer_id"] == cid], DEMO_AS_OF, cats)
        (DATA_DEMO / f"{pid}.json").write_text(req.model_dump_json(indent=2), encoding="utf-8")
        resp = forecast_request(bundle, req)
        (DATA_DEMO / f"forecast_{pid}.json").write_text(resp.model_dump_json(indent=2), encoding="utf-8")
        profiles.append({"id": pid, "persona": persona, "label": label, "as_of": DEMO_AS_OF})
        shown = ", ".join(c.category for c in resp.categories)
        print(f"  {pid}: {len(req.transactions)} txs, predicted {resp.total.predicted:,.0f}, cats: {shown}")

    PROFILES_JSON.write_text(json.dumps(profiles, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {PROFILES_JSON}")


if __name__ == "__main__":
    main()
