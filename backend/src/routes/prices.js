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
const pool  = require('../services/db');
const redis = require('../services/redis');

// GET /api/prices/:coin
// 1. Check Redis cache (60-second TTL)
// 2. Cache miss → query MySQL crypto_db.prices
// 3. Store result in Redis before returning
router.get('/:coin', async (req, res) => {
  const { coin } = req.params;
  const cacheKey = `prices:${coin}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const [rows] = await pool.query(
      'SELECT ts AS time, close AS value FROM prices WHERE coin = ? ORDER BY ts ASC LIMIT 200',
      [coin]
    );

    const payload = { coin, prices: rows };
    await redis.setex(cacheKey, 60, JSON.stringify(payload));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prices', detail: err.message });
  }
});

module.exports = router;
