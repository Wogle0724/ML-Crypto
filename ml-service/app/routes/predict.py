"""
ml-service/app/routes/predict.py — POST /predict endpoint.

CALLED BY:
  backend/src/routes/predictions.js
  axios.post(`${ML_SERVICE_URL}/predict`, { coin })

REQUEST:   PredictRequest { coin: str }
RESPONSE:  PredictResponse { coin, predictions: [{time: int, value: float}] }

CURRENT STATE:
  Returns 3 hardcoded dummy data points (scaffold only).

TODO — real inference pipeline:
  1. model = load_model(run_id)          from app/model/load.py
             run_id was logged to MLflow by pipeline/dags/train_model.py → log_to_mlflow task
  2. raw_df = query MySQL crypto_db.prices for recent rows of `coin`
              (or add raw prices to the request body to avoid ML service needing DB access)
  3. features_df = compute_features(raw_df)   from app/features.py
  4. tensor = torch.tensor(features_df.values).unsqueeze(0).float()
  5. with torch.no_grad(): output = model(tensor)
  6. Return output as list of PredictionPoint

MODEL LOCATION:
  Trained by: pipeline/dags/train_model.py → train_lstm task
  Stored in:  mlflow-artifacts Docker volume → /mlflow/artifacts (mlflow/Dockerfile)
  Loaded by:  app/model/load.py → load_model(run_id)
"""
import os

import torch
import pandas as pd
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from sqlalchemy import create_engine, text

from app.features import FEATURE_COLS, compute_features
from app.model.load import load_model

router = APIRouter()

SEQ_LEN = 60           # must match train_model.py SEQ_LEN
CLOSE_COL_IDX = 3      # index of 'close' in FEATURE_COLS
HOUR_MS = 3_600_000    # 1 hour in milliseconds


class PredictRequest(BaseModel):
    coin: str


class PredictionPoint(BaseModel):
    time: int
    value: float


class PredictResponse(BaseModel):
    coin: str
    predictions: list[PredictionPoint]


def _get_engine():
    user = os.getenv("MYSQL_USER")
    pwd = os.getenv("MYSQL_PASSWORD")
    db = os.getenv("MYSQL_DATABASE", "crypto_db")
    return create_engine(f"mysql+pymysql://{user}:{pwd}@mysql:3306/{db}")


@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    model = load_model()
    if model is None:
        raise HTTPException(
            status_code=503,
            detail="No trained model available. Run the train_model Airflow DAG first.",
        )

    # Use DISTINCT in the subquery so LIMIT applies to unique timestamps.
    # Without this, each hourly fetch_prices run adds ~2160 duplicate rows and
    # the LIMIT fills up with duplicates before reaching enough unique rows.
    engine = _get_engine()
    with engine.connect() as conn:
        result = conn.execute(
            text("""
                SELECT ts, open, high, low, close, volume FROM (
                    SELECT DISTINCT ts, open, high, low, close, volume
                    FROM prices WHERE coin = :coin
                    ORDER BY ts DESC LIMIT 2000
                ) t ORDER BY ts ASC
            """),
            {"coin": req.coin},
        )
        df = pd.DataFrame(result.fetchall(), columns=list(result.keys()))
    df = df.reset_index(drop=True)
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col])

    last_ts = int(df.iloc[-1]["ts"])   # save before compute_features strips ts column

    df = compute_features(df)

    if len(df) < SEQ_LEN:
        raise HTTPException(
            status_code=422,
            detail=f"Not enough price history for {req.coin} (need {SEQ_LEN} rows after feature warmup).",
        )

    # Take the last SEQ_LEN rows and apply the same per-window normalisation
    # used during training: divide every feature by the first close value.
    window = df.iloc[-SEQ_LEN:].values.astype("float32")   # (SEQ_LEN, 12)
    first_close = float(window[0, CLOSE_COL_IDX])
    denom = first_close + 1e-8
    window_norm = window / denom

    tensor = torch.tensor(window_norm).unsqueeze(0)  # (1, SEQ_LEN, 12)

    model.eval()
    with torch.no_grad():
        pred_ratio = model(tensor).item()             # predicted close / first_close

    pred_price = round(pred_ratio * first_close, 2)

    # Return 3 hourly forward steps, all at the same predicted value.
    # A multi-step decoder would vary each step; single-output LSTM repeats.
    predictions = [
        {"time": last_ts + (i + 1) * HOUR_MS, "value": pred_price}
        for i in range(3)
    ]

    return {"coin": req.coin, "predictions": predictions}
