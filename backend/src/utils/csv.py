"""
Robust CSV ingestion with encoding fallback.

Real-world CSVs (including this repo's own sales_data_sample.csv) are often
Windows-encoded (cp1252/latin-1), not UTF-8. The default pd.read_csv assumes
UTF-8 and 400s on the first non-UTF-8 byte. This helper tries UTF-8 first
(BOM-aware), then cp1252, then latin-1 (which always decodes).
"""

import io
from typing import Tuple

import pandas as pd

from src.utils.logging import get_logger

logger = get_logger(__name__)

ENCODINGS: Tuple[str, ...] = ("utf-8-sig", "utf-8", "cp1252", "latin-1")


def read_csv_bytes(contents: bytes, filename: str = "upload.csv") -> pd.DataFrame:
    """Parse CSV bytes into a DataFrame, falling back across encodings.

    Only UnicodeDecodeError triggers the next encoding; any other parse error
    (empty file, malformed CSV) propagates to the caller for a clean 400.
    """
    if not contents or not contents.strip():
        raise ValueError("CSV file is empty.")

    last_decode_err: Exception | None = None
    for enc in ENCODINGS:
        try:
            df = pd.read_csv(io.BytesIO(contents), encoding=enc)
            if enc not in ("utf-8-sig", "utf-8"):
                logger.info(f"Decoded '{filename}' with fallback encoding '{enc}'.")
            return df
        except (UnicodeDecodeError, UnicodeError) as exc:
            last_decode_err = exc
            continue

    raise ValueError(
        f"Could not decode '{filename}' (tried {', '.join(ENCODINGS)}): {last_decode_err}"
    )
