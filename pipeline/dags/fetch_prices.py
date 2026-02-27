"""
pipeline/dags/fetch_prices.py — Airflow DAG: fetch_prices
Schedule: @hourly  |  Executor: LocalExecutor  |  catchup: False

TASK GRAPH:
  fetch_from_coingecko  >>  store_to_mysql

─── TASK DETAILS ────────────────────────────────────────────────────────────

fetch_from_coingecko:
  Calls CoinGecko /coins/{coin}/market_chart?vs_currency=usd&days=90.
  The free Demo key returns hourly granularity for days=90.
  market_chart gives {prices: [[ts_ms, close]], total_volumes: [[ts_ms, vol]]}.
  No true OHLC on the free tier — open/high/low are set equal to close.
  All indicator features (RSI, MACD, BBands) use only 'close', so this is fine.

store_to_mysql:
  Writes to crypto_db.prices using INSERT IGNORE to skip duplicates.
  Duplicate detection relies on UNIQUE INDEX uq_coin_ts(coin, ts) in mysql/init.sql.
  Connection: mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@mysql:3306/{MYSQL_DATABASE}

─── DATA FLOW OUT ────────────────────────────────────────────────────────────

Data written here is consumed by:
  backend/src/routes/prices.js   → GET /api/prices/:coin → frontend dashboard
  pipeline/dags/train_model.py   → load_training_data task → LSTM training

─── AIRFLOW INTERNALS ───────────────────────────────────────────────────────

DAG metadata DB: MySQL airflow_db  (created by mysql/init.sql, separate from crypto_db)
DAG logs:        Docker volume airflow-logs → /opt/airflow/logs
Airflow UI:      http://localhost:8080  (admin/admin)
"""

import os
from datetime import datetime

import pandas as pd
import requests
from airflow import DAG
from airflow.operators.python import PythonOperator
from sqlalchemy import create_engine, text

# Extend this list to track additional coins
COINS = ["bitcoin", "ethereum"]


def fetch_and_store(**context):
    """
    Fetch price data from CoinGecko and write directly to MySQL in one step.

    XCom is intentionally not used for the DataFrame — the payload (~850 KB)
    exceeds the airflow_db xcom.value BLOB column limit (64 KB).
    Only a small summary dict is pushed to XCom for logging purposes.
    """
    base = os.getenv("COINGECKO_BASE_URL", "https://api.coingecko.com/api/v3")
    api_key = os.getenv("COINGECKO_API_KEY", "")
    user = os.getenv("MYSQL_USER")
    pwd = os.getenv("MYSQL_PASSWORD")
    db = os.getenv("MYSQL_DATABASE", "crypto_db")
    engine = create_engine(f"mysql+pymysql://{user}:{pwd}@mysql:3306/{db}")

    summary = {}
    for coin in COINS:
        url = f"{base}/coins/{coin}/market_chart"
        resp = requests.get(
            url,
            params={"vs_currency": "usd", "days": 90},
            headers={"x-cg-demo-api-key": api_key},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()

        prices = pd.DataFrame(data["prices"], columns=["ts", "close"])
        volumes = pd.DataFrame(data["total_volumes"], columns=["ts", "volume"])
        df = prices.merge(volumes, on="ts")
        df["open"] = df["high"] = df["low"] = df["close"]
        df["coin"] = coin
        df = df[["coin", "ts", "open", "high", "low", "close", "volume"]]
        print(f"  {coin}: {len(df)} rows fetched from CoinGecko")

        inserted = 0
        with engine.begin() as conn:
            for _, row in df.iterrows():
                result = conn.execute(
                    text(
                        "INSERT IGNORE INTO prices (coin, ts, open, high, low, close, volume) "
                        "VALUES (:coin, :ts, :open, :high, :low, :close, :volume)"
                    ),
                    {
                        "coin": row["coin"],
                        "ts": int(row["ts"]),
                        "open": float(row["open"]),
                        "high": float(row["high"]),
                        "low": float(row["low"]),
                        "close": float(row["close"]),
                        "volume": float(row["volume"]),
                    },
                )
                inserted += result.rowcount

        print(f"  {coin}: {inserted} new rows inserted ({len(df) - inserted} duplicates skipped)")
        summary[coin] = {"fetched": len(df), "inserted": inserted}

    # Push only the tiny summary dict — safe for XCom
    context["ti"].xcom_push(key="summary", value=summary)


with DAG(
    dag_id="fetch_prices",
    description="Fetch crypto prices from CoinGecko and store to MySQL",
    start_date=datetime(2024, 1, 1),
    schedule="@hourly",
    catchup=False,
    tags=["data", "ingestion"],
) as dag:

    PythonOperator(
        task_id="fetch_and_store",
        python_callable=fetch_and_store,
    )
