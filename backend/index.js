/**
 * backend/index.js — Express entry point. Port 4000.
 *
 * CALLED BY:
 *   frontend/vite.config.js dev-server proxy — all /api/* browser requests
 *   are forwarded here by the Vite proxy running inside the frontend container.
 *
 * ROUTE MOUNTING:
 *   /api/prices/*   → backend/src/routes/prices.js
 *                     GET /api/prices/:coin — returns price history
 *   /api/*          → backend/src/routes/predictions.js
 *                     GET /api/predict/:coin — gateway to ml-service POST /predict
 *
 * SERVICES (instantiated lazily when first used by routes):
 *   backend/src/services/db.js    — mysql2 connection pool → mysql container:3306
 *   backend/src/services/redis.js — ioredis client → redis container:6379
 *
 * CALLS OUT TO:
 *   ml-service:8000/predict (ml-service/app/routes/predict.py)
 *   via backend/src/routes/predictions.js using ML_SERVICE_URL from .env
 *
 * ENV VARS (injected from .env via docker-compose env_file):
 *   MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE
 *   REDIS_URL, ML_SERVICE_URL, PORT
 */
require('dotenv').config();

const express = require('express');

const app = express();
app.use(express.json());

app.use('/api/prices', require('./src/routes/prices'));
app.use('/api', require('./src/routes/predictions'));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on :${PORT}`));
