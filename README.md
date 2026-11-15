# LookAhead

**A market-news research brief for safer, more informed decisions.** LookAhead is based on challenge 4.2.4, “News headlines and the stock market.” The active ML work lives in `stocknews/`; the frontend lives in `frontend/`.

> This project is a prototype and is not financial advice.

## What it does

The active experiment uses the public StockNews dataset to test whether daily news headlines predict the Dow Jones direction. Ethan’s `stocknews/baseline.py` cleans the 25 daily headline columns, creates sentiment and TF-IDF features, trains logistic-regression models, compares them with simple always-up and previous-day baselines, and writes the measured results to `stocknews/results.json`.

The frontend is now connected to a local runner at `/api/stocknews/run`. Pressing **Run ML test** executes `stocknews/baseline.py` and `stocknews/category_test.py`, then reads their fresh result artifacts and displays the historical model score, baseline comparison, category test, feature explanation, and limitations. There is no email, name, account, or bank-login flow.

## Current ML pipeline

Run the historical experiment from the ML directory:

```bash
cd stocknews
python baseline.py
```

The script expects the public dataset at `stocknews/data/Combined_News_DJIA.csv` and uses chronological evaluation: earlier dates are used for training/validation and later dates are held out for testing. It writes the actual measured metrics to `stocknews/results.json`.

The current script is a historical Dow-direction experiment, not a live ticker crawler. Any live news, Reddit, yfinance, or FRED integration must be implemented and credited separately before the project claims to use it.

## Sources

- [StockNews dataset](https://www.kaggle.com/datasets/aaron7sun/stocknews)
- [yfinance](https://pypi.org/project/yfinance/) — planned/optional market-data source; not currently used by `stocknews/baseline.py`
- [FRED](https://fred.stlouisfed.org/) — planned/optional macroeconomic source; not currently used by `stocknews/baseline.py`

## Structure

```text
frontend/   Next.js market-news presentation UI and StockNews ML runner route
stocknews/  Ethan’s historical StockNews ML experiment and measured results
```

There is no active `backend/` application contract in the current project.

## Run the frontend locally

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm run build -- --webpack
```
