# Do news headlines predict the Dow? (Veritas AI Hackathon 2026, AI + Finance)

**Track:** Finance (brief 4.2.4 plus our own additions)
**Team:** Aaron Hsueh, Leon Pai, Ethan Huang

This project is a prototype and is not financial advice.

## The problem
Someone who is new to investing (for example a student opening a first brokerage account) sees a scary or exciting headline and wonders whether it should change what they do with their money. News feels like it should move markets, but does it? We test this with a real public dataset and report the answer honestly, so a person can decide how much weight a headline deserves.

## What we built
- **In:** one day's top 25 news headlines (text).
- **What the model does:** scores the headlines with VADER sentiment (or word counts), then a logistic regression turns that into a probability that the Dow went up that day.
- **Out:** P(up) and an up/down call. Its probability only ranges from about 0.42 to 0.64, so it is close to a coin flip, and we say so.
- **How someone would use it:** the website shows our measured results and real test days (right and wrong) so a person can see how little headlines predict. `predict.py` runs the same model on any list of headlines.

## What this tests
Brief 4.2.4: does each day's top news headlines tell us anything about whether the Dow Jones went up or down that day?
We report the answer honestly. It is "not really".

## Data
Kaggle "Daily News for Stock Market Prediction" (`Combined_News_DJIA.csv`): top 25 Reddit WorldNews headlines per trading day plus the Dow's up/down label, Aug 2008 to Jul 2016. 1,989 days. Not included in this repo; download it from Kaggle.

## Method
- Split by date, never random: train 2008-2014 (1,611 days), test 2015-Jul 2016 (378 days).
- Settings (regularisation strength) were chosen on 2014 only, never on the test period.
- Features: VADER sentiment scores of the headlines, or TF-IDF word counts.
- Model: logistic regression.
- Baselines: always predict "up"; predict the same as yesterday.

## Results on the test period
| | Accuracy |
|---|---|
| Always "up" | 50.8% |
| Same as yesterday | 45.8% |
| VADER sentiment + logistic regression | 49.5% |
| TF-IDF words + logistic regression | 48.9% |

Neither model beats "always up". Both rarely predict a down day (recall 9-14%).

## What we added: do some kinds of headlines matter more?
`category_test.py` sorts headlines into 6 categories with a keyword list (economy/business, politics, war/conflict, crime/justice, science/tech/health, disaster/accident) and trains one small model per category.

| Category | Accuracy |
|---|---|
| Always "up" | 50.8% |
| Economy/business | 50.8% |
| Politics | 51.6% |
| War/conflict | 49.7% |
| Crime/justice | 50.8% |
| Science/tech/health | 50.8% |
| Disaster/accident | 49.7% |
| All categories together | 53.4% (p = 0.16, not distinguishable from luck) |

With 378 test days, differences of about 5 points are normal noise. Running 7 tests means a real signal would need p below about 0.007. None came close.

## Other markets (yfinance): does the finding hold elsewhere?
`market_test.py` repeats the test for the S&P 500, Nasdaq, Apple, JPMorgan and ExxonMobil (prices from yfinance), predicting both the same-day move and the next-day move (the one a trader could actually use), with sentiment features and with headline categories. That is 20 tests on the same 2015-Jul 2016 window.

No result was meaningfully better than "always up". The best was Apple next-day with headline categories at 52.8% vs 49.6% (p = 0.12). After correcting for 20 tests, a real signal would need p below about 0.0025. Full table: `demo_days.json` (key `other_markets_20_tests`).

## Where the model fails (real test days)
The model's probability of "up" only ranges from 0.42 to 0.64, so it calls "up" on 90% of days and catches only 17 of the 186 down days. Three confident misses (all days the Dow fell while the model said about 64% up): 2016-06-09 (death threats against German MPs), 2015-06-15 (Israeli force-feeding bill; asylum seeker violence in Germany), 2016-02-23 (Tunisian museum attack; Hungary EU referendum). Very negative headline sentiment did not track what moved the market. Examples with headlines are in `demo_days.json`.

## What these results would and wouldn't justify an investor doing
- They would **not** justify trading on headline sentiment or headline categories. No model beat simply guessing "up", and the best result is within noise.
- They do not show that news never matters. They show that these simple methods, on this one index and period (2015-2016), found no usable signal.
- The data pairs each day's headlines with that same day's close, so even a good result would not be a next-day prediction an investor could act on.
- Leakage check: results are near chance, not suspiciously good. We split by date, tuned only on 2014, and fit scalers and word lists on training data only.

## Limits
Keyword categories are crude and some words are ambiguous. One market, one 18-month test window, Reddit headlines only. Not tested yet: newer years (2017+), other news sources.

## What we'd do next
- Test newer years (2017 onward) and other news sources, for example the New York Times archive.
- Replace the keyword categories with a proper pretrained text classifier.
- Test whether headlines help a model that already knows yesterday's price moves.

## How to run
1. Download `Combined_News_DJIA.csv` from Kaggle into `stocknews/data/`.
2. `pip install pandas scikit-learn vaderSentiment yfinance scipy`
3. From `stocknews/`, run in order: `python baseline.py`, `python category_test.py`, `python market_test.py`, `python export_demo.py`. (`export_params.py` writes `model_params.json`; `python predict.py "headline 1" "headline 2"` runs the model.)

## Files
- `baseline.py`: baselines + VADER/TF-IDF models (writes `results.json`)
- `category_test.py`: per-category test (writes `category_results.json`)
- `market_test.py`: same test on other markets and single stocks (yfinance)
- `export_demo.py`: writes `demo_days.json` (real right/wrong test days for the website)
- `demo_days.json`: data for the website demo
- `export_params.py` / `model_params.json` / `predict.py`: the model as plain numbers, runnable with only vaderSentiment

## Credits
Kaggle dataset "Daily News for Stock Market Prediction" (Aaron7sun); VADER sentiment (vaderSentiment); scikit-learn, pandas, numpy, SciPy; yfinance / Yahoo Finance price data; AI tools used: Claude (Anthropic) as a coding assistant, Manus (AI agent that co-authored parts of the website), and GitHub Copilot (suggested some commit messages). We understand and can explain every part of the project.
