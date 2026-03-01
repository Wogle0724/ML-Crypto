/**
 * backend/src/routes/predictionLog.js — GET /api/prediction-log/:coin
 *
 * CALLER:   frontend/src/components/PredictionTable.jsx
 * RETURNS:  { coin, log: [{ time, predicted_at, horizon_step, predicted_price, actual_price }] }
 *
 * Queries crypto_db.prediction_log, populated by:
 *   ml-service/app/routes/predict.py  — inserts predicted_price rows on each inference call
 *   pipeline/dags/fetch_prices.py     — back-fills actual_price when the real candle arrives
 */
const router = require('express').Router();
const pool  = require('../services/db');
const redis = require('../services/redis');

router.get('/:coin', async (req, res) => {
  const { coin } = req.params;
  const cacheKey = `prediction-log:${coin}`;

  try {
    const cached = await redis.get(cacheKey);
    if (cached) return res.json(JSON.parse(cached));

    const [rows] = await pool.query(
      `SELECT
         predicted_for_ts                  AS time,
         predicted_at_ts                   AS predicted_at,
         horizon_step,
         CAST(predicted_price AS DOUBLE)   AS predicted_price,
         CAST(actual_price    AS DOUBLE)   AS actual_price
       FROM prediction_log
       WHERE coin = ?
       ORDER BY predicted_for_ts DESC
       LIMIT 500`,
      [coin]
    );

    const payload = { coin, log: rows };
    await redis.setex(cacheKey, 60, JSON.stringify(payload));
    res.json(payload);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch prediction log', detail: err.message });
  }
});

module.exports = router;
