/**
 * backend/src/services/db.js — MySQL connection pool for the backend service.
 *
 * CONNECTS TO:
 *   mysql container (hostname "mysql" on crypto-net, port 3306)
 *   Database: crypto_db  (MYSQL_DATABASE env var, created on first MySQL boot)
 *
 * SCHEMA NOTE:
 *   The prices table must be created separately — add its DDL to mysql/init.sql
 *   or apply via: docker compose exec mysql mysql -uroot -p crypto_db < schema.sql
 *   Expected schema: prices(id, coin, ts BIGINT, open, high, low, close, volume)
 *
 * DATA WRITTEN BY:
 *   pipeline/dags/fetch_prices.py → store_to_mysql task
 *   Uses SQLAlchemy + pymysql (pipeline/requirements.txt); same credentials from .env
 *
 * IMPORTED BY:
 *   backend/src/routes/prices.js — will SELECT from prices table (after implementing)
 *
 * USAGE:
 *   const pool = require('./db');
 *   const [rows] = await pool.query('SELECT ...', [params]);
 */
const mysql = require('mysql2');

// Connection pool — connections are acquired lazily on first query.
const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'mysql',
  port: Number(process.env.MYSQL_PORT) || 3306,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASSWORD,
  database: process.env.MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool.promise();
