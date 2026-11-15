# Data

Public, anonymized bank-card transactions from Hugging Face: [dllllb/transactions-gender](https://huggingface.co/datasets/dllllb/transactions-gender).

`python scripts/prepare_data.py` downloads four files into `data/raw/` (gitignored) and writes the cleaned monthly table to `data/processed/` (also gitignored, pickle files — parquet is blocked on some Windows machines).

`data/demo/` is committed: three real customers used as Student A / Family B / Business C, plus their saved forecasts.

Dates in the dump are relative day numbers. We map day 0 → 2014-09-01. Currency is not stated; the app shows **units**. Cash withdrawals and transfers are not forecast.
