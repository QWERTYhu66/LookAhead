import pandas as pd

from app.features import FEATURE_COLS, active_mask, build_monthly_table


def _purchases() -> pd.DataFrame:
    """One person, groceries only: 100 on day 5 and 50 on day 25, every month Sep–Nov 2014."""
    rows = []
    for month, start in [("2014-09", 1), ("2014-10", 1), ("2014-11", 1)]:
        rows.append({"customer_id": 1, "date": f"{month}-05", "category": "groceries", "amount": 100.0})
        rows.append({"customer_id": 1, "date": f"{month}-25", "category": "groceries", "amount": 50.0})
    return pd.DataFrame(rows)


def test_eight_feature_names():
    assert FEATURE_COLS == ["last1", "last2", "last3", "avg3", "so_far", "day", "days_in_month", "category_id"]


def test_monthly_table_so_far_and_lags():
    monthly = build_monthly_table(_purchases(), as_of_day=20)
    groc = monthly[monthly["category"] == "groceries"].sort_values("month")
    nov = groc[groc["month"] == pd.Period("2014-11", "M")].iloc[0]
    assert nov["so_far"] == 100.0
    assert nov["amount"] == 150.0
    assert nov["remaining"] == 50.0
    assert nov["last1"] == 150.0
    assert nov["last2"] == 150.0
    assert nov["day"] == 20
    assert nov["days_in_month"] == 30
    assert nov["last1_so_far"] == 100.0


def test_active_mask_drops_all_zero_categories():
    monthly = build_monthly_table(_purchases(), as_of_day=20)
    travel = monthly[monthly["category"] == "travel"]
    assert not active_mask(travel).any()
    groc = monthly[monthly["category"] == "groceries"]
    assert active_mask(groc).all()
