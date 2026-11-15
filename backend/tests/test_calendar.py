import pandas as pd

from app.data import _parse_dates, month_idx_of


def test_day_zero_is_1_sep_2014():
    dates = _parse_dates(pd.Series(["0 00:00:00", "1 12:00:00"]))
    assert dates.iloc[0] == pd.Timestamp("2014-09-01")
    assert dates.iloc[1] == pd.Timestamp("2014-09-02")


def test_month_idx_covers_15_months():
    dates = pd.to_datetime(["2014-09-01", "2014-10-15", "2015-08-01", "2015-11-20"])
    idx = month_idx_of(dates)
    assert list(idx) == [0, 1, 11, 14]


def test_stray_december_day_is_after_cutoff():
    dates = _parse_dates(pd.Series(["456 00:00:00"]))
    assert dates.iloc[0] >= pd.Timestamp("2015-12-01")
