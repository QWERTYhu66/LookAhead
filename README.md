# LookAhead

**A market-news research brief for safer, more informed decisions.** LookAhead combines recent headlines, public market data, and a machine-learning signal to estimate a selected ticker's next move. It shows the prediction range, confidence, evidence, and a simple baseline beside the model so users can judge the result instead of treating it as certainty.

> This project is a prototype and is not financial advice.

## What it does

The root frontend route accepts a ticker such as `SPY`, `AAPL`, or `TSLA` and a short forecast horizon. It calls `POST /api/market/predict` and renders the backend's model output, predicted range, recent headlines, source links, held-out evaluation metrics, and baseline comparison. There is no email, name, account, or bank-login flow.

The frontend does not fabricate market predictions, live headlines, Reddit content, or evaluation metrics. Until the backend returns a response, the page presents a neutral input state. Ethan's backend owns source collection, crawler compliance, feature engineering, model training, and prediction generation.

## Data direction

The backend is expected to use the supplied StockNews dataset, yfinance market data, FRED macroeconomic data, permitted news sources, and permitted Reddit API data. Training must use chronological splits and avoid look-ahead bias. Results should be compared with a simple baseline using the same held-out period.

Supplied references:

- [StockNews dataset](https://www.kaggle.com/datasets/aaron7sun/stocknews)
- [yfinance](https://pypi.org/project/yfinance/)
- [FRED](https://fred.stlouisfed.org/)

## Structure

```text
frontend/   Next.js market-news prediction UI
backend/    Ethan's crawler, ML service, and /api/market/predict endpoint
```

## Run locally

```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
npm run typecheck
npm run lint
npm run build -- --webpack
```

The frontend expects a response from `POST /api/market/predict` with the contract documented in the backend handoff prompt and typed locally in `src/app/page.tsx`.
