# LookAhead: do news headlines predict the Dow?

**Track:** Finance (Veritas AI International High School Hackathon 2026, brief 4.2.4 plus our own additions)
**Team:** Aaron Hsueh, Leon Pai, Ethan Huang
**Live demo:** https://look-ahead-red.vercel.app
**Full write-up, results and how to run the ML:** [stocknews/README.md](stocknews/README.md)

> This project is a prototype and is not financial advice.

## In one paragraph
We tested whether each day's top news headlines tell us anything about whether the Dow Jones went up or down, using a public dataset (Reddit WorldNews headlines, 2008 to 2016), a date-based split (train 2008-2014, test 2015 to Jul 2016) and two simple baselines. **The honest answer is "not really":** no headline model beat simply guessing "up" (50.8%; our models scored 49-53%), and the same held for 5 other markets and single stocks (20 tests via yfinance) and for 6 headline categories. We show real days where the model was confidently wrong.

## What is in this repo
```text
stocknews/  the ML: baselines, headline-category test, yfinance market test, results, demo data, and the model as plain numbers
frontend/   Next.js website (Market Pulse) that presents the measured results
```
The website shows **saved results** from `stocknews/` (the Python scripts do not run on the deployed site). There is no email, account or bank login, and the site is not a live trading signal.

## Run the ML
See [stocknews/README.md](stocknews/README.md#how-to-run). In short: download `Combined_News_DJIA.csv` from Kaggle into `stocknews/data/`, `pip install pandas scikit-learn vaderSentiment yfinance scipy`, then run `baseline.py`, `category_test.py`, `market_test.py`, `export_demo.py`.

## Run the website locally
```bash
cd frontend
npm install
npm run dev          # http://localhost:3000
```

## Sources and credits
- [Daily News for Stock Market Prediction (Kaggle, aaron7sun)](https://www.kaggle.com/datasets/aaron7sun/stocknews)
- yfinance / Yahoo Finance price data; VADER sentiment (vaderSentiment); scikit-learn, pandas, numpy, SciPy
- FRED was considered but is not used
- AI tools used: Claude (Anthropic), Manus, GitHub Copilot. We understand and can explain every part of the project.
