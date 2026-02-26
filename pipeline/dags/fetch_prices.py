"""
pipeline/dags/fetch_prices.py — Airflow DAG: fetch_prices
Schedule: @hourly  |  Executor: LocalExecutor  |  catchup: False

TASK GRAPH:
  fetch_from_coingecko  >>  store_to_mysql

─── TASK DETAILS ────────────────────────────────────────────────────────────

fetch_from_coingecko:
  Purpose: Call CoinGecko REST API to retrieve OHLCV price history.
  Endpoint: {COINGECKO_BASE_URL}/coins/{coin}/market_chart?vs_currency=usd&days=90
  COINGECKO_BASE_URL is set in .env (https://api.coingecko.com/api/v3)
  Library: requests  (listed in pipeline/requirements.txt)
  Output: pass DataFrame to next task via XCom or shared variable

store_to_mysql:
  Purpose: Write fetched rows to MySQL crypto_db.prices table.
  Connection: mysql+pymysql://{MYSQL_USER}:{MYSQL_PASSWORD}@mysql:3306/{MYSQL_DATABASE}
              Credentials from .env; "mysql" resolves as hostname on crypto-net.
  Library: SQLAlchemy + pymysql  (pipeline/requirements.txt)
  Schema:  prices(id, coin VARCHAR(50), ts BIGINT, open, high, low, close, volume DECIMAL)
           Add this DDL to mysql/init.sql so the table exists on first boot.
  Method:  df.to_sql('prices', engine, if_exists='append', index=False)

─── DATA FLOW OUT ────────────────────────────────────────────────────────────

Data written here is consumed by:
  backend/src/routes/prices.js   → GET /api/prices/:coin → frontend dashboard
  pipeline/dags/train_model.py   → load_training_data task → LSTM training

─── AIRFLOW INTERNALS ───────────────────────────────────────────────────────

DAG metadata DB: MySQL airflow_db  (created by mysql/init.sql, separate from crypto_db)
DAG logs:        Docker volume airflow-logs → /opt/airflow/logs
Airflow UI:      http://localhost:8080  (admin/admin)
"""

from datetime import datetime

from airflow import DAG
from airflow.operators.python import PythonOperator


def fetch_from_coingecko(**context):
    """TODO: Call CoinGecko API and retrieve price data."""
    print("TODO: GET https://api.coingecko.com/api/v3/coins/bitcoin/market_chart")


def store_to_mysql(**context):
    """TODO: Write fetched price records to the MySQL crypto_db.prices table."""
    print("TODO: Insert price rows into MySQL")


with DAG(
    dag_id="fetch_prices",
    description="Fetch crypto prices from CoinGecko and store to MySQL",
    start_date=datetime(2024, 1, 1),
    schedule="@hourly",
    catchup=False,
    tags=["data", "ingestion"],
) as dag:

    fetch_task = PythonOperator(
        task_id="fetch_from_coingecko",
        python_callable=fetch_from_coingecko,
    )

    store_task = PythonOperator(
        task_id="store_to_mysql",
        python_callable=store_to_mysql,
    )

    fetch_task >> store_task
