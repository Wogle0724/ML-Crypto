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

-- Grant the app user full access to the Airflow DB
GRANT ALL PRIVILEGES ON airflow_db.* TO 'crypto_user'@'%';

FLUSH PRIVILEGES;

