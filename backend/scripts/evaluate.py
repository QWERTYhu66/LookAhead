"""Score the model vs two simple rules on months 12–14. Writes reports/evaluation.json."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np
import pandas as pd

from app.features import active_mask
from app.model import load_model, predict_remaining
from app.paths import (
    DISCLAIMER,
    EVALUATION_JSON,
    GENDER_TABLE,
    MONTHLY_TABLE,
    REPORTS_DIR,
    TEST_MONTHS,
)


def load_monthly() -> pd.DataFrame:
    df = pd.read_pickle(MONTHLY_TABLE)
    df["month"] = pd.to_datetime(df["month"]).dt.to_period("M")
    return df


def mae(y: pd.Series, yhat: pd.Series) -> float:
    return float(np.mean(np.abs(y - yhat)))


def medae(y: pd.Series, yhat: pd.Series) -> float:
    return float(np.median(np.abs(y - yhat)))


def group_block(test: pd.DataFrame, labels: pd.Series, group_name: str, order: list[str]) -> dict:
    rows = []
    for label in order:
        ids = labels[labels == label].index
        part = test[test["customer_id"].isin(ids)]
        n_users = int((labels == label).sum())
        if part.empty:
            rows.append({"label": label, "n_users": n_users, "model": 0.0, "last_month": 0.0})
            continue
        rows.append(
            {
                "label": label,
                "n_users": n_users,
                "model": round(mae(part["amount"], part["predicted"]), 2),
                "last_month": round(mae(part["amount"], part["base_last"]), 2),
            }
        )
    return {"group_name": group_name, "groups": rows}


def failure_why(row: pd.Series) -> str:
    actual = float(row["amount"])
    pred = float(row["predicted"])
    last1 = float(row["last1"]) if pd.notna(row["last1"]) else 0.0
    so_far = float(row["so_far"])
    late = max(actual - so_far, 0.0)
    ratio = actual / last1 if last1 > 0 else float("inf")
    ratio_txt = "no last-month history" if last1 <= 0 else f"{ratio:.0f}× last month"
    if late >= 0.6 * actual:
        return (
            f"A one-off {row['category']} spend ({ratio_txt}), almost all of it after day 20. "
            "A model that only sees the first 20 days could not have seen it coming."
        )
    return (
        f"Predicted {pred:,.0f} against an actual {actual:,.0f} ({ratio_txt}). "
        "This month did not look like the person's recent history."
    )


def main() -> None:
    monthly = load_monthly()
    test = monthly[monthly["month_idx"].isin(list(TEST_MONTHS))]
    test = test[active_mask(test)].copy()
    print(f"test months 12–14: {len(test):,} active cells, {test['customer_id'].nunique():,} people")

    bundle = load_model()
    test = predict_remaining(bundle, test)
    test["base_last"] = test["last1"].fillna(0.0)
    test["base_pace"] = np.where(
        test["day"] > 0,
        test["so_far"] / test["day"] * test["days_in_month"],
        0.0,
    )

    y, m, last, pace = test["amount"], test["predicted"], test["base_last"], test["base_pace"]
    coverage = float(((test["amount"] >= test["low"]) & (test["amount"] <= test["high"])).mean())

    print()
    print("held-out MAE (units)     median AE")
    print(f"  model:              {mae(y, m):10,.1f}   {medae(y, m):10,.1f}")
    print(f"  pace so far:        {mae(y, pace):10,.1f}   {medae(y, pace):10,.1f}")
    print(f"  same as last month: {mae(y, last):10,.1f}   {medae(y, last):10,.1f}")
    print(f"  range coverage:     {coverage:.1%}")

    if mae(y, m) > mae(y, pace):
        print("NOTE: the model did not beat 'same pace'. Report this honestly.")

    gender = pd.read_pickle(GENDER_TABLE)
    gender_map = gender.set_index("customer_id")["gender"]
    g_label = test["customer_id"].map(gender_map)
    g_label = g_label.map({0: "group 0", 1: "group 1"}).fillna("unlabelled")
    # n_users should be unique people in the whole kept set, labelled as in the test frame
    people = monthly.drop_duplicates("customer_id")[["customer_id"]].copy()
    people["gl"] = people["customer_id"].map(gender_map).map({0: "group 0", 1: "group 1"}).fillna("unlabelled")
    gender_labels = people.set_index("customer_id")["gl"]

    month_tot = monthly.groupby(["customer_id", "month_idx"])["amount"].sum()
    avg_spend = month_tot.groupby("customer_id").mean()
    spend_labels = pd.qcut(avg_spend, 3, labels=["low spenders", "mid", "high spenders"])

    test["abs_err"] = (test["predicted"] - test["amount"]).abs()
    top = (
        test.sort_values("abs_err", ascending=False)
        .drop_duplicates("customer_id")
        .head(3)
    )
    failures = []
    for _, row in top.iterrows():
        failures.append(
            {
                "user_id": str(int(row["customer_id"])),
                "category": str(row["category"]),
                "month": str(row["month"]),
                "predicted": round(float(row["predicted"]), 2),
                "actual": round(float(row["amount"]), 2),
                "why": failure_why(row),
            }
        )
        print(f"  failure: user {row['customer_id']} {row['category']} {row['month']} "
              f"pred {row['predicted']:,.0f} actual {row['amount']:,.0f}")

    payload = {
        "dataset": {
            "name": "dllllb/transactions-gender (Hugging Face; anonymized bank card transactions)",
            "users": int(monthly["customer_id"].nunique()),
            "train_period": "2014-12 → 2015-08",
            "test_period": "2015-09 → 2015-11",
            "source_url": "https://huggingface.co/datasets/dllllb/transactions-gender",
        },
        "mae": {
            "model": round(mae(y, m), 2),
            "last_month": round(mae(y, last), 2),
            "same_pace": round(mae(y, pace), 2),
        },
        "median_error": {
            "model": round(medae(y, m), 2),
            "last_month": round(medae(y, last), 2),
            "same_pace": round(medae(y, pace), 2),
        },
        "range_coverage": round(coverage, 4),
        "by_group": [
            group_block(
                test,
                gender_labels,
                "gender label (dataset code 0/1, meaning undocumented)",
                ["group 0", "group 1", "unlabelled"],
            ),
            group_block(
                test,
                spend_labels,
                "spend level (student-like, family-like, business-like)",
                ["low spenders", "mid", "high spenders"],
            ),
        ],
        "failures": failures,
        "disclaimer": DISCLAIMER,
    }

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    EVALUATION_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {EVALUATION_JSON}")


if __name__ == "__main__":
    main()
