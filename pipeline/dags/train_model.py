"""
pipeline/dags/train_model.py — Airflow DAG: train_model
Schedule: @daily  |  Executor: LocalExecutor  |  catchup: False

TASK GRAPH:
  load_training_data  >>  train_lstm  >>  log_to_mlflow

ml-service/app is bind-mounted at /opt/airflow/ml_service_app (docker-compose.yml)
so this DAG can import features.py and model/lstm.py without duplicating them.

DATA IN:    MySQL crypto_db.prices  (written hourly by fetch_prices DAG)
MODEL OUT:  MLflow artifact store   (http://mlflow:5000, volume mlflow-artifacts)
MODEL USED: ml-service/app/model/load.py → ml-service/app/routes/predict.py
"""

import os
import sys
from datetime import datetime

from airflow import DAG
from airflow.operators.python import PythonOperator

sys.path.insert(0, "/opt/airflow/ml_service_app")

SEQ_LEN = 60
HORIZON = 24   # number of future hourly closes to predict
EPOCHS = 20
BATCH_SIZE = 32
LEARNING_RATE = 1e-3
CLOSE_COL_IDX = 3   # index of 'close' in FEATURE_COLS
CHECKPOINT_PATH = "/tmp/lstm_checkpoint.pt"


def load_training_data(**context):
    """Query MySQL for price history, compute features, build sliding-window sequences."""
    import numpy as np
    import pandas as pd
    from sqlalchemy import create_engine, text

    from features import FEATURE_COLS, compute_features

    user = os.getenv("MYSQL_USER")
    pwd = os.getenv("MYSQL_PASSWORD")
    db = os.getenv("MYSQL_DATABASE", "crypto_db")
    engine = create_engine(f"mysql+pymysql://{user}:{pwd}@mysql:3306/{db}")

    with engine.connect() as conn:
        result = conn.execute(text("SELECT * FROM prices WHERE coin = 'bitcoin' ORDER BY ts ASC"))
        df = pd.DataFrame(result.fetchall(), columns=list(result.keys()))
    for col in ["open", "high", "low", "close", "volume"]:
        df[col] = pd.to_numeric(df[col])
    print(f"Loaded {len(df)} raw rows from MySQL")

    df = compute_features(df)
    print(f"After features: {len(df)} rows, {len(FEATURE_COLS)} cols")

    values = df.values.astype("float32")  # (n_rows, 12)

    X, y = [], []
    for i in range(SEQ_LEN, len(values) - HORIZON + 1):
        X.append(values[i - SEQ_LEN : i])
        y.append(values[i : i + HORIZON, CLOSE_COL_IDX])   # (HORIZON,) future closes

    X = np.array(X, dtype="float32")   # (n_samples, SEQ_LEN, 12)
    y = np.array(y, dtype="float32")   # (n_samples, HORIZON)

    # Normalise each window by its first close value so the model learns
    # relative movements; no scaler artifact needed at inference time.
    first_close = X[:, 0, CLOSE_COL_IDX]          # (n_samples,)
    denom = first_close + 1e-8
    X_norm = X / denom[:, np.newaxis, np.newaxis]
    y_norm = y / denom[:, np.newaxis]              # broadcast over HORIZON axis

    # Arrays are too large for XCom (Airflow's xcom.value BLOB is capped at 64 KB).
    # Save to /tmp and push only the tiny file paths via XCom.
    X_path = "/tmp/X_train.npy"
    y_path = "/tmp/y_train.npy"
    np.save(X_path, X_norm)
    np.save(y_path, y_norm)
    context["ti"].xcom_push(key="X_path", value=X_path)
    context["ti"].xcom_push(key="y_path", value=y_path)
    print(f"Built {len(X_norm)} sequences of length {SEQ_LEN}, saved to {X_path}")


def train_lstm(**context):
    """Run PyTorch training loop, save checkpoint to /tmp."""
    import numpy as np
    import torch
    import torch.nn as nn
    from torch.utils.data import DataLoader, TensorDataset

    from model.lstm import LSTMModel

    ti = context["ti"]
    X_path = ti.xcom_pull(key="X_path", task_ids="load_training_data")
    y_path = ti.xcom_pull(key="y_path", task_ids="load_training_data")
    X = torch.tensor(np.load(X_path))
    y = torch.tensor(np.load(y_path))   # shape: (n_samples, HORIZON)

    split = int(0.8 * len(X))
    loader = DataLoader(
        TensorDataset(X[:split], y[:split]),
        batch_size=BATCH_SIZE,
        shuffle=True,
    )

    model = LSTMModel(input_size=12, hidden_size=64, num_layers=2, output_size=HORIZON)
    optimizer = torch.optim.Adam(model.parameters(), lr=LEARNING_RATE)
    loss_fn = nn.MSELoss()

    for epoch in range(EPOCHS):
        model.train()
        batch_loss = 0.0
        for xb, yb in loader:
            optimizer.zero_grad()
            loss = loss_fn(model(xb), yb)
            loss.backward()
            optimizer.step()
            batch_loss += loss.item()
        if (epoch + 1) % 5 == 0:
            print(f"Epoch {epoch+1}/{EPOCHS}  loss={batch_loss/len(loader):.6f}")

    model.eval()
    with torch.no_grad():
        val_loss = loss_fn(model(X[split:]), y[split:]).item()
    print(f"Val MSE (normalised): {val_loss:.6f}")

    torch.save(model.state_dict(), CHECKPOINT_PATH)
    ti.xcom_push(key="val_loss", value=val_loss)


def log_to_mlflow(**context):
    """Load checkpoint, log to MLflow, register and promote to Production."""
    import mlflow
    import mlflow.pytorch
    import numpy as np
    import torch
    from sqlalchemy import create_engine, text

    from model.lstm import LSTMModel

    ti = context["ti"]
    val_loss = ti.xcom_pull(key="val_loss", task_ids="train_lstm")

    # Compute real-world MSE from prediction_log (rows with actuals back-filled
    # by fetch_prices DAG). Skipped gracefully if no completed rows exist yet.
    user = os.getenv("MYSQL_USER")
    pwd = os.getenv("MYSQL_PASSWORD")
    db = os.getenv("MYSQL_DATABASE", "crypto_db")
    engine = create_engine(f"mysql+pymysql://{user}:{pwd}@mysql:3306/{db}")
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT horizon_step,
                   AVG(POW(predicted_price - actual_price, 2)) AS mse,
                   COUNT(*) AS n
            FROM prediction_log
            WHERE actual_price IS NOT NULL AND coin = 'bitcoin'
            GROUP BY horizon_step
            ORDER BY horizon_step
        """)).fetchall()

    mlflow.set_tracking_uri(os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000"))
    mlflow.set_experiment("crypto-lstm")

    model = LSTMModel(input_size=12, hidden_size=64, num_layers=2, output_size=HORIZON)
    model.load_state_dict(torch.load(CHECKPOINT_PATH, weights_only=True))
    model.eval()

    with mlflow.start_run() as run:
        mlflow.log_params({
            "input_size": 12, "hidden_size": 64, "num_layers": 2,
            "seq_len": SEQ_LEN, "horizon": HORIZON, "epochs": EPOCHS, "lr": LEARNING_RATE,
        })
        mlflow.log_metric("val_loss_normalised", val_loss)

        if rows:
            per_step = {f"tracking_mse_step_{r[0]:02d}": float(r[1]) for r in rows}
            overall_mse = float(np.mean([r[1] for r in rows]))
            mlflow.log_metric("tracking_mse_usd2", overall_mse)
            mlflow.log_metrics(per_step)
            print(f"Tracking MSE (bitcoin, {len(rows)} steps with actuals): {overall_mse:.2f}")
        mlflow.pytorch.log_model(
            model,
            artifact_path="model",
            registered_model_name="LSTMPriceModel",
        )
        print(f"MLflow run_id={run.info.run_id}")

    # Promote the latest registered version to Production;
    # ml-service loads "models:/LSTMPriceModel/Production" on each request.
    client = mlflow.MlflowClient()
    versions = client.get_latest_versions("LSTMPriceModel", stages=["None"])
    if versions:
        client.transition_model_version_stage(
            name="LSTMPriceModel",
            version=versions[0].version,
            stage="Production",
            archive_existing_versions=True,
        )
        print(f"Version {versions[0].version} → Production")


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
