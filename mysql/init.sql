-- Create the Airflow metadata database (separate from the app database)
CREATE DATABASE IF NOT EXISTS airflow_db;

CREATE TABLE IF NOT EXISTS crypto_db.prices (
  id        BIGINT AUTO_INCREMENT PRIMARY KEY,
  coin      VARCHAR(50) NOT NULL,
  ts        BIGINT NOT NULL,
  open      DECIMAL(18,8),
  high      DECIMAL(18,8),
  low       DECIMAL(18,8),
  close     DECIMAL(18,8),
  volume    DECIMAL(24,8),
  INDEX idx_coin_ts (coin, ts),
  UNIQUE INDEX uq_coin_ts (coin, ts)
);

CREATE TABLE IF NOT EXISTS crypto_db.prediction_log (
  id               BIGINT AUTO_INCREMENT PRIMARY KEY,
  coin             VARCHAR(50)   NOT NULL,
  predicted_for_ts BIGINT        NOT NULL,   -- future timestamp this prediction targets (ms)
  predicted_at_ts  BIGINT        NOT NULL,   -- last observed candle ts when inference ran (ms)
  horizon_step     TINYINT       NOT NULL,   -- 1..24 (which hour ahead this row covers)
  predicted_price  DECIMAL(18,8) NOT NULL,
  actual_price     DECIMAL(18,8) NULL,       -- filled in by fetch_prices DAG when candle arrives
  INDEX idx_pl_coin_ts (coin, predicted_for_ts),
  UNIQUE INDEX uq_pl_coin_step (coin, predicted_at_ts, horizon_step)
);

-- Grant the app user full access to the Airflow DB
GRANT ALL PRIVILEGES ON airflow_db.* TO 'crypto_user'@'%';

FLUSH PRIVILEGES;

