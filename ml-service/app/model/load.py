"""
ml-service/app/model/load.py — Loads a trained LSTMModel from MLflow.

CALLED BY:
  ml-service/app/routes/predict.py (predict endpoint)
  Call: model = load_model(run_id) before running model.forward()

LOADS FROM:
  MLflow tracking server at MLFLOW_TRACKING_URI (.env → http://mlflow:5000)
  Artifacts stored at: file:///mlflow/artifacts inside the mlflow container
  That path is the mlflow-artifacts Docker volume (docker-compose.yml + mlflow/Dockerfile)

MODEL LOGGED BY:
  pipeline/dags/train_model.py → log_to_mlflow task
  mlflow.pytorch.log_model(model, "model")
  The resulting run_id is the key needed to load the model here.

CURRENT STATE:
  Returns None (no model trained yet).
  predict endpoint in app/routes/predict.py falls back to dummy data when model is None.

TODO:
  Uncomment mlflow.pytorch.load_model() once a run_id is available.
  Alternative: use MLflow Model Registry to always load the latest "Production" model:
    mlflow.pytorch.load_model("models:/LSTMPriceModel/Production")
"""
import os
import mlflow


def load_model(run_id: str = None):
    """
    Load the Production LSTMModel from the MLflow Model Registry.

    The model is registered and promoted to Production by:
      pipeline/dags/train_model.py → log_to_mlflow task

    Returns None if no Production model exists yet (train_model DAG hasn't run).
    The predict endpoint returns HTTP 503 in that case.
    """
    tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    mlflow.set_tracking_uri(tracking_uri)

    try:
        model = mlflow.pytorch.load_model("models:/LSTMPriceModel/Production")
        return model
    except Exception as exc:
        print(f"load_model: no Production model available — {exc}")
        return None
