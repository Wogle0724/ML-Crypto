/**
 * backend/src/routes/prices.js — GET /api/prices/:coin
 *
 * CALLER:   frontend/src/pages/Dashboard.jsx → api.get('/prices/bitcoin')
 *           (routed via frontend/vite.config.js proxy → backend/index.js)
 * RETURNS:  { coin: string, prices: [{time: number, value: number}] }
 *
 * CURRENT:  returns 3 hardcoded mock data points.
 *
 * TODO — real implementation:
 *   1. Check Redis cache (backend/src/services/redis.js) for key `prices:{coin}`
 *   2. Cache miss → query MySQL using the pool from backend/src/services/db.js:
 *        const [rows] = await pool.query(
 *          'SELECT ts AS time, close AS value FROM prices WHERE coin = ? ORDER BY ts ASC LIMIT 200',
 *          [coin]
 *        );
 *   3. Write result back to Redis: redis.setex(`prices:${coin}`, 60, JSON.stringify(rows))
 *   4. Return rows
 *
 * DATA SOURCE:
 *   MySQL crypto_db.prices table, written hourly by:
 *   pipeline/dags/fetch_prices.py → store_to_mysql task (SQLAlchemy + pymysql)
 */
const router = require('express').Router();

// GET /api/prices/:coin
// Returns hardcoded mock OHLCV data. Replace with real MySQL queries later.
router.get('/:coin', (req, res) => {
  const { coin } = req.params;
  res.json({
    coin,
    prices: [
      { time: Date.now() - 2000, value: 49500 },
      { time: Date.now() - 1000, value: 50200 },
      { time: Date.now(),        value: 50000 },
    ],
  });
});

module.exports = router;
