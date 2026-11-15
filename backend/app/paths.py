"""All backend file paths. Scripts and the API import from here so they agree."""

from __future__ import annotations

from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]

DATA_RAW = BACKEND_ROOT / "data" / "raw"
DATA_PROCESSED = BACKEND_ROOT / "data" / "processed"
DATA_DEMO = BACKEND_ROOT / "data" / "demo"
MODELS_DIR = BACKEND_ROOT / "models"
REPORTS_DIR = BACKEND_ROOT / "reports"

TRANSACTIONS_GZ = DATA_RAW / "transactions.csv.gz"
GENDER_CSV = DATA_RAW / "gender_train.csv"
MCC_CSV = DATA_RAW / "tr_mcc_codes.csv"
TYPES_CSV = DATA_RAW / "tr_types.csv"

# pickle, not parquet: this machine's AppLocker blocks pyarrow's parquet DLL
MONTHLY_TABLE = DATA_PROCESSED / "monthly.pkl"
PURCHASES_TABLE = DATA_PROCESSED / "purchases.pkl"
GENDER_TABLE = DATA_PROCESSED / "gender.pkl"

MODEL_PATH = MODELS_DIR / "model.joblib"
EVALUATION_JSON = REPORTS_DIR / "evaluation.json"
PROFILES_JSON = DATA_DEMO / "profiles.json"

DISCLAIMER = "This project is a prototype and is not financial advice."
HF_BASE = "https://huggingface.co/datasets/dllllb/transactions-gender/resolve/main"
ORIGIN = "2014-09-01"
TRAIN_MONTHS = range(3, 12)  # Dec 2014 – Aug 2015
TEST_MONTHS = range(12, 15)  # Sep – Nov 2015
AS_OF_DAY_TRAIN = 20
DEMO_AS_OF = "2015-11-20"
