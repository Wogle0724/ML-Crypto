"""
ml-service/app/main.py — FastAPI application entry point. Port 8000.

CALLED BY:
  backend/src/routes/predictions.js
  axios.post(`${ML_SERVICE_URL}/predict`, { coin })
  ML_SERVICE_URL resolves to http://ml-service:8000 on the crypto-net Docker network.

ROUTERS:
  app/routes/predict.py  →  POST /predict
                             Accepts { coin: str }, returns { coin, predictions: [{time, value}] }

SUPPORTING MODULES (wired up during implementation):
  app/features.py        →  compute_features(df)   — pandas-ta indicator feature pipeline
  app/model/lstm.py      →  LSTMModel              — PyTorch LSTM architecture
  app/model/load.py      →  load_model(run_id)     — loads trained weights from MLflow

MLFLOW INTEGRATION:
  Tracking server: http://mlflow:5000  (MLFLOW_TRACKING_URI in .env)
  Artifact volume: mlflow-artifacts → /mlflow/artifacts (mlflow/Dockerfile + docker-compose.yml)
  Models are trained and logged by: pipeline/dags/train_model.py → log_to_mlflow task
  Models are loaded for inference by: app/model/load.py → load_model(run_id)
"""
from fastapi import FastAPI
from app.routes.predict import router as predict_router

app = FastAPI(title="ML Service", version="0.1.0")

app.include_router(predict_router)


@app.get("/health")
def health():
    return {"status": "ok"}
