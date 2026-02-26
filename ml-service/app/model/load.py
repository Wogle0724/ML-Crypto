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
    Load a trained LSTMModel from the MLflow registry.
    Returns None until a model has been trained and registered.
    """
    tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
    mlflow.set_tracking_uri(tracking_uri)

    if run_id is None:
        # Placeholder: no model registered yet
        return None

    # model = mlflow.pytorch.load_model(f"runs:/{run_id}/model")
    # return model
    return None
