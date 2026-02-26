/**
 * backend/src/services/redis.js — ioredis client for the backend service.
 *
 * CONNECTS TO:
 *   redis container (hostname "redis" on crypto-net, port 6379)
 *   REDIS_URL from .env: redis://redis:6379
 *
 * PLANNED USAGE (to implement in routes):
 *   backend/src/routes/prices.js      — cache GET /api/prices/:coin  (TTL ~60s)
 *   backend/src/routes/predictions.js — cache GET /api/predict/:coin (TTL ~300s)
 *
 * CACHING PATTERN:
 *   const redis = require('../services/redis');
 *   const cached = await redis.get(`prices:${coin}`);
 *   if (cached) return res.json(JSON.parse(cached));
 *   // ... fetch from MySQL or ml-service ...
 *   await redis.setex(`prices:${coin}`, 60, JSON.stringify(result));
 */
const Redis = require('ioredis');

const client = new Redis(process.env.REDIS_URL || 'redis://redis:6379');

client.on('error', (err) => console.error('Redis error:', err));

module.exports = client;
