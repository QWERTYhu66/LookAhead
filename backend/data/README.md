# Data

Raw files are not committed. Download them (≈72 MB) with:

```bash
mkdir -p backend/data/raw && cd backend/data/raw
B=https://huggingface.co/datasets/dllllb/transactions-gender/resolve/main
for f in README.md gender_train.csv tr_mcc_codes.csv tr_types.csv transactions.csv.gz; do curl -sL -o "$f" "$B/$f"; done
```

Source: https://huggingface.co/datasets/dllllb/transactions-gender (mirror of the Kaggle course competition
https://www.kaggle.com/c/python-and-analyze-data-final-project/). Real, anonymized bank card transactions.

Files
- `transactions.csv.gz` — 6,849,346 rows: `customer_id, tr_datetime ("<day> HH:MM:SS", relative day number), mcc_code, tr_type, amount (negative = spend), term_id`
- `gender_train.csv` — `customer_id, gender` (0/1) for a labelled subset → used only for the fairness check
- `tr_mcc_codes.csv` — `mcc_code;mcc_description` (Russian) → we map codes to English spend categories in code
- `tr_types.csv` — `tr_type;tr_description` (Russian)

Caveats we state in the write-up: dates are relative day numbers (we anchor day 0 to a fixed date to form months);
currency is not stated (we show amounts as plain numbers); license is not stated on the dataset card.
