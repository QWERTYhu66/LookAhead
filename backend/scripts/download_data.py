"""Download the raw transactions-gender dataset from Hugging Face.

Usage: uv run python scripts/download_data.py
"""

from __future__ import annotations

import gzip
import shutil
from pathlib import Path

import requests

RAW = Path(__file__).resolve().parents[1] / "data" / "raw"
BASE = "https://huggingface.co/datasets/dllllb/transactions-gender/resolve/main"

FILES = [
    "README.md",
    "gender_train.csv",
    "tr_mcc_codes.csv",
    "tr_types.csv",
    "transactions.csv.gz",
]


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    for name in FILES:
        out = RAW / name
        if out.exists() and out.stat().st_size > 0:
            print(f"skip (exists): {name}")
            continue
        url = f"{BASE}/{name}"
        print(f"downloading: {name}")
        with requests.get(url, stream=True, timeout=300) as r:
            r.raise_for_status()
            with open(out, "wb") as f:
                for chunk in r.iter_content(chunk_size=1 << 20):
                    if chunk:
                        f.write(chunk)
        # Decompress gz in place so pandas can read plain CSV.
        if name.endswith(".gz"):
            plain = out.with_suffix("")
            with gzip.open(out, "rb") as fi, open(plain, "wb") as fo:
                shutil.copyfileobj(fi, fo)
            print(f"decompressed: {plain.name}")
    print("done")


if __name__ == "__main__":
    main()
