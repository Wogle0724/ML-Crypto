/**
 * backend/src/routes/predictions.js — GET /api/predict/:coin
 *
 * CALLER:   frontend/src/pages/Dashboard.jsx → api.get('/predict/bitcoin')
 *           (routed via frontend/vite.config.js proxy → backend/index.js)
 * FORWARDS: POST { coin } to ml-service/app/routes/predict.py at ML_SERVICE_URL/predict
 * RETURNS:  { coin: string, predictions: [{time: number, value: number}] }
 *
 * The backend acts as a pass-through gateway — no ML inference happens here.
 * ML_SERVICE_URL from .env resolves to http://ml-service:8000 inside Docker network.
 *
 * TODO — add Redis caching:
 *   const cached = await redis.get(`predict:${coin}`);
 *   if (cached) return res.json(JSON.parse(cached));
 *   // ... forward to ml-service ...
 *   await redis.setex(`predict:${coin}`, 300, JSON.stringify(data));  // 5-min TTL
 *   redis client: backend/src/services/redis.js
 *
 * ERROR HANDLING:
 *   ml-service unreachable → HTTP 502 with { error: 'ml-service unavailable', detail }
 */
const router = require('express').Router();
const axios  = require('axios');
const redis  = require('../services/redis');

// GET /api/predict/:coin
// 1. Check Redis cache (5-minute TTL — predictions change slowly)
// 2. Cache miss → POST to ml-service POST /predict
// 3. Store result in Redis before returning
router.get('/predict/:coin', async (req, res) => {
  const { coin } = req.params;
  const cacheKey    = `predict:${coin}`;
  const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://ml-service:8000';

  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return res.json(JSON.parse(cached));
    }

    const { data } = await axios.post(`${mlServiceUrl}/predict`, { coin });
    await redis.setex(cacheKey, 300, JSON.stringify(data));
    res.json(data);
  } catch (err) {
    const status = err.response?.status === 503 ? 503 : 502;
    res.status(status).json({
      error: 'ml-service unavailable',
      detail: err.message,
    });
  }
});

module.exports = router;
