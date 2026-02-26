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


def compute_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Compute technical indicator features from a price DataFrame.

    Expected input columns: open, high, low, close, volume
    Returns the DataFrame with additional indicator columns appended.
    """
    # Example (uncomment when implementing):
    # import pandas_ta as ta
    # df.ta.rsi(close='close', length=14, append=True)
    # df.ta.macd(close='close', append=True)
    # df.ta.bbands(close='close', append=True)
    return df
