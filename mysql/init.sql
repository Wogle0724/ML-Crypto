-- Create the Airflow metadata database (separate from the app database)
CREATE DATABASE IF NOT EXISTS airflow_db;

-- Grant the app user full access to the Airflow DB
GRANT ALL PRIVILEGES ON airflow_db.* TO 'crypto_user'@'%';

FLUSH PRIVILEGES;
