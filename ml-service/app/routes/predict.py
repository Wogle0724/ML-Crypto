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
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class PredictRequest(BaseModel):
    coin: str


class PredictionPoint(BaseModel):
    time: int
    value: float


class PredictResponse(BaseModel):
    coin: str
    predictions: list[PredictionPoint]


# POST /predict
# Returns a dummy prediction array. Replace with real model inference later.
@router.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    dummy_predictions = [
        {"time": 1, "value": 51000.0},
        {"time": 2, "value": 51500.0},
        {"time": 3, "value": 52000.0},
    ]
    return {"coin": req.coin, "predictions": dummy_predictions}
