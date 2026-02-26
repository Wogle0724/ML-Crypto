"""
pipeline/dags/train_model.py — Airflow DAG: train_model
Schedule: @daily  |  Executor: LocalExecutor  |  catchup: False

TASK GRAPH:
  load_training_data  >>  train_lstm  >>  log_to_mlflow

─── TASK DETAILS ────────────────────────────────────────────────────────────

load_training_data:
  Purpose: Query MySQL for price history and compute feature indicators.
  Source:  MySQL crypto_db.prices  (written hourly by pipeline/dags/fetch_prices.py)
  Connection: mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@mysql:3306/{MYSQL_DATABASE}
  Features: import and call ml-service/app/features.py:compute_features(df)
            (pipeline/requirements.txt includes pandas-ta, matching ml-service)
  Output: numpy array / tensor passed to train_lstm via XCom or local variable

train_lstm:
  Purpose: Instantiate LSTMModel and run the PyTorch training loop.
  Model: import ml-service/app/model/lstm.py:LSTMModel
         (pipeline/requirements.txt includes torch, same as ml-service/requirements.txt)
  Loop:  DataLoader → MSELoss + Adam optimizer → N epochs → best checkpoint

log_to_mlflow:
  Purpose: Log experiment results and save model artifact to MLflow.
  Tracking URI: MLFLOW_TRACKING_URI (.env) → http://mlflow:5000
  Calls:
    mlflow.set_experiment("crypto-lstm")
    mlflow.log_param("hidden_size", 64)
    mlflow.log_metric("val_loss", val_loss)
    mlflow.pytorch.log_model(model, "model")
  Artifact stored in: Docker volume mlflow-artifacts → /mlflow/artifacts
  The run_id returned by MLflow is used in ml-service/app/model/load.py
  to load this model version for inference.

─── DATA FLOW ───────────────────────────────────────────────────────────────

DATA IN:    MySQL crypto_db.prices  ← pipeline/dags/fetch_prices.py
MODEL OUT:  mlflow-artifacts volume ← viewed at http://localhost:5000
MODEL USED: ml-service/app/model/load.py → ml-service/app/routes/predict.py

─── AIRFLOW INTERNALS ───────────────────────────────────────────────────────

DAG metadata DB: MySQL airflow_db  (created by mysql/init.sql)
DAG logs:        Docker volume airflow-logs → /opt/airflow/logs
Airflow UI:      http://localhost:8080  (admin/admin)
"""

from datetime import datetime

from airflow import DAG
from airflow.operators.python import PythonOperator


def load_training_data(**context):
    """TODO: Query MySQL for historical price + indicator data."""
    print("TODO: SELECT * FROM prices WHERE ...")


def train_lstm(**context):
    """TODO: Instantiate LSTMModel, run training loop, compute loss."""
    print("TODO: torch training loop")


def log_to_mlflow(**context):
    """TODO: Log params, metrics, and model artifact to MLflow tracking server."""
    print("TODO: mlflow.log_metric / mlflow.pytorch.log_model")


with DAG(
    dag_id="train_model",
    description="Train LSTM price-prediction model and log results to MLflow",
    start_date=datetime(2024, 1, 1),
    schedule="@daily",
    catchup=False,
    tags=["ml", "training"],
) as dag:

    load_task = PythonOperator(
        task_id="load_training_data",
        python_callable=load_training_data,
    )

    train_task = PythonOperator(
        task_id="train_lstm",
        python_callable=train_lstm,
    )

    log_task = PythonOperator(
        task_id="log_to_mlflow",
        python_callable=log_to_mlflow,
    )

    load_task >> train_task >> log_task
