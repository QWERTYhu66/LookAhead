# Instructions for Leon — the LookAhead backend

You own `backend/`. Nobody else edits it. The frontend is already built and waits for your API: when your routes answer, the app's "cached" tag disappears and real numbers show up. Paste this whole file into your AI assistant as context.

**Deadline:** Sunday 6 PM Taiwan for a first working version (we submit then and improve after). Hard stop Monday 12:59 PM.

## 1. What you're building, in one paragraph

A Python API (FastAPI) with a small machine-learning model. Given one person's card transactions up to "today" (e.g. Nov 20), it forecasts how much they'll spend by month-end **per category**, with a low/high range, and compares that with two simple rules. You also produce one JSON file of honest evaluation numbers and three demo profiles (student, family, business). Keep the code **small and readable**: about 6 short files. Judges will ask you to explain it.

## 2. Setup (10 minutes)

```bash
cd backend
uv init --bare --python 3.13          # or: python -m venv .venv && source .venv/bin/activate
uv add fastapi "uvicorn[standard]" pandas scikit-learn pydantic pyarrow
uv add --dev pytest httpx
mkdir -p data/raw && cd data/raw
B=https://huggingface.co/datasets/dllllb/transactions-gender/resolve/main
for f in transactions.csv.gz gender_train.csv tr_mcc_codes.csv tr_types.csv; do curl -sL -o "$f" "$B/$f"; done
cd ../..
```

Add to `.gitignore` (repo root already ignores `backend/data/raw/` and `backend/data/processed/` — keep it that way; never commit the raw data).

## 3. The data (real, public, anonymized)

`transactions.csv.gz` — 6,849,346 rows. Columns:

| column | meaning |
|---|---|
| `customer_id` | the person (15,000 of them) |
| `tr_datetime` | `"<day number> HH:MM:SS"`, day 0–456. **Relative days, not real dates.** |
| `mcc_code` | merchant category code (what kind of shop) |
| `tr_type` | bank's transaction type code |
| `amount` | negative = money out, positive = money in |
| `term_id` | terminal id, 40% empty, ignore it |

`gender_train.csv` — `customer_id, gender` (0/1, meaning undocumented) for 8,400 customers. **Never a model input**; only used for the fairness check.
`tr_mcc_codes.csv` / `tr_types.csv` — code descriptions in Russian, `;`-separated. You don't need them beyond the mapping below.

### Cleaning rules (we already verified these; just apply them)

1. **Remove duplicates** on the full row `(customer_id, tr_datetime, mcc_code, tr_type, amount)` — **ignore `term_id`**, and keep the full timestamp to the second (two identical purchases on the same day are *not* duplicates). That removes ~24k rows.
2. **Dates:** day 0 = **2014-09-01**. `date = 2014-09-01 + day`. Drop rows on/after 2015-12-01 (one stray day). That gives exactly 15 calendar months, Sep 2014 → Nov 2015. `month_idx` = 0..14 (Sep 2014 = 0, Nov 2015 = 14).
3. **Row kind** from `tr_type` and sign:
   - `amount > 0` → `income` (ignore)
   - `tr_type < 2000`, or `2320 ≤ tr_type ≤ 2323` → `purchase` ✅ (what we forecast)
   - other `tr_type < 3000` → cash withdrawal / transfer (ignore — can't know what the money was for)
   - `tr_type ≥ 3000` → bank fee (ignore)
4. **Drop customers whose first transaction is after month 1** (too little history): 1,463 of 15,000 → 13,537 remain.
5. `amount` → use the absolute value.

### MCC → category (the 9 categories the app shows)

```python
CATEGORIES = {
  "groceries":      [5411,5422,5441,5451,5462,5499,5300,5309,5310,5311,5331,5399],
  "eating_out":     [5811,5812,5813,5814],
  "transport":      [4111,4112,4121,4131,4784,4789,5541,5542,7523,7512,3351,5511,5532,5533,7531,7538,7542,5172,5983],
  "travel":         [3000,3501,4411,4511,4722,7011],
  "shopping":       [5611,5621,5631,5641,5651,5655,5661,5681,5691,5697,5699,5131,5137,5200,5211,5231,5251,5261,
                     5712,5713,5714,5719,5722,5732,5733,5734,5735,*range(5940,5951),*range(5964,5972),5977,5992,
                     5993,5995,5999,5013,5039,5044,5045,5065,5072,5074,5085,5094,5099,5111,5169,5192,5193,5199,5931,7278],
  "entertainment":  [5816,7829,7832,7841,7922,7932,7933,7991,7993,7994,7995,7996,7997,7999,5921,7273],
  "health":         [5912,5122,5976,8011,8021,8043,8062,8071,8099,7298,5047],
  "bills_services": [4814,4812,4816,4899,4900,7372,7375,7399,7311,7338,7210,7216,7221,7230,7299,7395,7629,7699,8999,
                     6300,6513,9211,9222,9311,9399,9402,4214,4215,2741,742,1711,1731,1799,8220,8244,8299,8398,8641,8699,6211],
}
# anything else → "other". MCC 6010/6011 = cash and 4829/6536/6051/6012 = transfers: exclude from the target.
```

Use these exact category ids — the app shows labels for them (`groceries` → "Groceries", `eating_out` → "Eating out", `transport` → "Transport & fuel", `travel` → "Trips", `shopping` → "Shopping", `entertainment` → "Fun & games", `health` → "Health", `bills_services` → "Phone, bills & services", `other` → "Other").

## 4. The monthly table (one row per person × category × month)

For every kept customer, each of the 9 categories, each of the 15 months (fill zeros where nothing happened):
- `amount` = total purchase spend that month
- `so_far` = spend from day 1 to **day 20** of that month (the demo moment)
- `n_tx` = number of purchases (optional)

Then add the person's own history per (customer, category): `last1`, `last2`, `last3` = spend 1/2/3 months earlier (NaN when there is no earlier month), `avg3` = their mean.

**The 8 model inputs:** `last1, last2, last3, avg3, so_far, day (=20), days_in_month, category_id (0–8)`. Nothing about who the person is.

**Target:** `remaining = max(amount − so_far, 0)` — how much *more* they spend after day 20. Forecast = `so_far + predicted remaining`. (Predicting the remaining amount means the forecast can never be below what's already spent.)

## 5. Train / test split — never shuffle

- **Train:** target months 3..11 (Dec 2014 – Aug 2015). Months 0–2 only provide the lags.
- **Test:** months 12, 13, 14 (Sep – Nov 2015). The model never sees them.
- Evaluate only **active cells**: `so_far > 0` or any of `last1..3 > 0` (two thirds of the grid is all zeros and would make everyone look perfect).

## 6. The model (scikit-learn, nothing fancy)

Three `HistGradientBoostingRegressor` with `loss="quantile"`: `quantile=0.5` (point), `0.1` (low), `0.9` (high). Params: `max_iter=150, learning_rate=0.05, max_leaf_nodes=31, min_samples_leaf=50, categorical_features=[index of category_id]`.
- **Clip the training target** at each category's 99.5th percentile (a few business-sized months would otherwise dominate).
- **Train on a random sample of ~1,000,000 training rows** — the full table makes training take hours; the sample trains in minutes.
- After predicting: `remaining = max(pred, 0)`, `predicted = so_far + remaining_p50`, `low = so_far + min(rem_p10, rem_p50)`, `high = so_far + max(rem_p90, rem_p50)`.
- Save with `joblib.dump` to `backend/models/model.joblib` and **commit it** (a few MB) so the API never needs the raw data.

## 7. Baselines (the rules the model must beat) and metrics

- **Same as last month:** `predicted = last1`
- **Same pace as so far:** `predicted = so_far / 20 × days_in_month`

Report **mean absolute error** (MAE) and **median absolute error** on the active test cells, for the model and both rules; **range coverage** = share of cells where the real amount fell inside [low, high].
Also the error by group: (a) gender label 0 / 1 / unlabelled; (b) spend level — split customers into thirds by their average monthly spend: "low spenders" (student-like), "mid" (family-like), "high spenders" (business-like).
And **3 failure examples**: the biggest misses (one per customer), each with one honest sentence why (usually a one-off huge purchase late in the month).

For reference, an earlier quick attempt got: model MAE **25,576** vs same-pace **29,843** vs last-month **74,894**; median error model ~1,200 vs 5,151 vs 16,244; coverage 90%. Yours should be in that neighbourhood. If the model does **not** beat "same pace", report it honestly — judges score honesty over a suspiciously good number — and tell Aaron.

## 8. The API — exactly these routes and shapes (the app depends on them)

Run: `uv run uvicorn app.main:app --reload --port 8000`. Enable CORS for `http://localhost:3000` and later the Vercel URL (env var `CORS_ORIGINS`, comma-separated).

| Route | Returns |
|---|---|
| `GET /api/health` | `{ "ok": true }` |
| `GET /api/demo-profiles` | `[ { "id": "student_a", "persona": "student", "label": "Student A — Nov 20", "as_of": "2015-11-20" }, … ]` — ids must start with `student_`, `family_`, `business_` |
| `GET /api/demo-profiles/{id}` | a `ForecastRequest` (below) for that demo customer |
| `POST /api/forecast` | body `ForecastRequest` → `ForecastResponse` |
| `GET /api/evaluation` | the contents of `backend/reports/evaluation.json` (shape below) |

```ts
// ForecastRequest
{ "transactions": [ { "date": "2015-11-03", "amount": 1392.47, "category": "groceries", "description": "Supermarket" }, … ],
  "as_of": "2015-11-20",
  "budget": { "total": 50000, "by_category": { "eating_out": 7000 } } }   // optional; the app computes alerts itself, you may return []

// ForecastResponse
{ "as_of": "2015-11-20", "days_left": 10,
  "categories": [
    { "category": "groceries", "spent_so_far": 18400, "predicted": 27900, "low": 24000, "high": 33500, "last_month": 25100,
      "note": "Spent 18,400 by day 20; by day 20 last month you were at 16,700." }
  ],
  "total": { "spent_so_far": 41400, "predicted": 59100, "low": 48700, "high": 77400, "last_month": 56500 },
  "alerts": [],
  "disclaimer": "This project is a prototype and is not financial advice." }

// Evaluation  (backend/reports/evaluation.json)
{ "dataset": { "name": "dllllb/transactions-gender (Hugging Face; anonymized bank card transactions)", "users": 13537,
               "train_period": "2014-12 → 2015-08", "test_period": "2015-09 → 2015-11",
               "source_url": "https://huggingface.co/datasets/dllllb/transactions-gender" },
  "mae":          { "model": 0, "last_month": 0, "same_pace": 0 },
  "median_error": { "model": 0, "last_month": 0, "same_pace": 0 },
  "range_coverage": 0.0,
  "by_group": [
    { "group_name": "gender label (dataset code 0/1, meaning undocumented)",
      "groups": [ { "label": "group 0", "n_users": 0, "model": 0, "last_month": 0 }, { "label": "group 1", … }, { "label": "unlabelled", … } ] },
    { "group_name": "spend level (student-like, family-like, business-like)",
      "groups": [ { "label": "low spenders", … }, { "label": "mid", … }, { "label": "high spenders", … } ] } ],
  "failures": [ { "user_id": "69065209", "category": "groceries", "month": "2015-09", "predicted": 0, "actual": 0, "why": "one sentence" } ],
  "disclaimer": "This project is a prototype and is not financial advice." }
```

**`POST /api/forecast` step by step:** keep purchases in the 9 categories with `date ≤ as_of`; build the same monthly table for this one person (real calendar months from the dates, `day = as_of.day`, `so_far` = spend from day 1 to `as_of`); compute the 8 inputs for the current month; predict; sort categories by `predicted` descending; drop categories with no history and nothing spent; `total` = sums; `days_left = days_in_month − day`; `note` = one plain sentence from the numbers you already have, e.g. `"Spent {so_far} by day {day}; by day {day} last month you were at {last_month_so_far}."` (store last month's day-20 spend in the monthly table so this is a lookup, not a model).

**Use the same function** to build the monthly table for training and for a request. If they're two different pieces of code, they will disagree and the forecasts will be wrong.

## 9. Demo profiles (three real anonymized customers)

Pick from customers with the full 15 months: one around the 30th percentile of average monthly spend (`student_a`), one around the 60th (`family_b`), one around the 90th (`business_c`); each should have used at least 5 categories in the last 3 months. Write each one's purchases (Sep 2014 → Nov 20 2015) as a `ForecastRequest` JSON to `backend/data/demo/<id>.json` plus `profiles.json` with the list. **Commit these** so the API works without the raw data. Also save each one's `ForecastResponse` as `backend/data/demo/forecast_<id>.json` and send them to Aaron — he'll drop them into the app as the saved fallback.

## 10. Suggested files (keep each short)

```
backend/
  app/categories.py   the mapping in §3
  app/data.py         load + clean (§3)
  app/features.py     monthly table + 8 inputs (§4) — ONE function used by training and by /api/forecast
  app/model.py        train / load / predict (§6)
  app/main.py         the 5 routes (§8)
  scripts/prepare_data.py   raw → data/processed/monthly.parquet (prints the cleaning counts)
  scripts/train.py          → models/model.joblib
  scripts/evaluate.py       → reports/evaluation.json (§7)
  scripts/make_demo.py      → data/demo/*.json (§9)
  tests/                    a few pytest tests: categories, calendar, one forecast on a demo profile
```

## 11. Done when

- `uv run python scripts/evaluate.py` prints the model vs. both rules on the test months and writes `reports/evaluation.json`.
- `curl -X POST localhost:8000/api/forecast -H 'Content-Type: application/json' -d @data/demo/student_a.json` answers in under a second with the shape in §8.
- `models/model.joblib`, `data/demo/*.json`, `reports/evaluation.json` are committed; raw/processed data is not.
- Open a PR to `main`; post the link in the group chat.

## 12. Pitfalls we already hit

- Deduping after dropping the time of day deleted 374k real rows. Dedupe on the full timestamp.
- Training on all 3.3M rows with 300 trees took 2.5 hours. Sample ~1M rows, 150 trees.
- Predicting the month *total* made forecasts collapse to "spent so far" with a zero-width range when a big bill was already paid. Predict the *remaining* spend instead.
- If your model beats "last month" by a huge margin but not "same pace", that's normal — "last month" ignores the 20 days already spent. "Same pace" is the honest bar.
- Results that look too good usually mean test months leaked into training. Check the month filter.

Questions → the group chat. Aaron can show you the earlier attempt's code if useful (it's on his Mac, not in the repo).
