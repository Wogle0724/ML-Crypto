"""
ml-service/app/features.py — Technical indicator feature engineering pipeline.

CALLED BY:
  ml-service/app/routes/predict.py  — at inference time, before model.forward()
  pipeline/dags/train_model.py      — at training time, before the training loop
  CRITICAL: both callers must call compute_features() with the same indicators
  so that training features and inference features are identical — any mismatch
  causes silent model degradation.

INPUT DataFrame:
  Columns: open, high, low, close, volume
  Rows sourced from MySQL crypto_db.prices
  Written hourly by: pipeline/dags/fetch_prices.py → store_to_mysql task

OUTPUT DataFrame:
  Same rows + additional indicator columns, e.g.:
    RSI_14          (Relative Strength Index)
    MACD_12_26_9    (Moving Average Convergence Divergence — signal, histogram)
    BBL/BBM/BBU     (Bollinger Bands — lower, middle, upper)
  These columns become the input_size feature dimension fed into LSTMModel
  (see ml-service/app/model/lstm.py for expected input_size)

DEPENDENCY:
  pandas-ta is listed in both ml-service/requirements.txt AND pipeline/requirements.txt
  so both services can import this module (pipeline imports it directly for training).
"""
import pandas as pd
import pandas_ta as ta  # noqa: F401 — registers df.ta accessor

# Exact 12 columns fed into LSTMModel (input_size=12).
# CRITICAL: this list must stay in sync with the model's input_size.
# Training (pipeline/dags/train_model.py) and inference (routes/predict.py)
# both call compute_features(), so column order here defines the tensor shape.
FEATURE_COLS = [
    "open", "high", "low", "close", "volume",   # 5 — raw OHLCV
    "RSI_14",                                     # 1 — momentum
    "MACD_12_26_9", "MACDh_12_26_9", "MACDs_12_26_9",  # 3 — trend
    "BBL_5_2.0", "BBM_5_2.0", "BBU_5_2.0",      # 3 — volatility bands
]  # total = 12


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute technical indicator features from a price DataFrame.

    Expected input columns: open, high, low, close, volume
    Returns a DataFrame with exactly FEATURE_COLS columns, NaN-leading rows dropped.
    """
    df = df.copy()
    df.ta.rsi(close="close", length=14, append=True)
    df.ta.macd(close="close", append=True)      # adds MACD_12_26_9, MACDh_12_26_9, MACDs_12_26_9

    # Compute Bollinger Bands manually — pandas-ta's bbands relies on numba JIT which
    # can fail silently on some dtype configurations, returning None without appending.
    _close = df["close"].astype("float64")
    _mean  = _close.rolling(5).mean()
    _std   = _close.rolling(5).std(ddof=0)
    df["BBM_5_2.0"] = _mean
    df["BBL_5_2.0"] = _mean - 2.0 * _std
    df["BBU_5_2.0"] = _mean + 2.0 * _std

    df = df.dropna()
    return df[FEATURE_COLS]
