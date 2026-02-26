/**
 * frontend/src/api/index.js — Centralized axios instance for all backend calls.
 *
 * baseURL '/api' is intentionally relative — requests go to the Vite dev server
 * (frontend/vite.config.js), which proxies /api/* to the backend container at
 * http://backend:4000 (set via BACKEND_URL env var in docker-compose.yml).
 *
 * Endpoints mapped through this instance:
 *   GET /api/prices/:coin   → backend/src/routes/prices.js
 *                              Returns { coin, prices: [{time, value}] }
 *                              Currently mock; will query MySQL crypto_db.prices
 *                              (data written by pipeline/dags/fetch_prices.py)
 *
 *   GET /api/predict/:coin  → backend/src/routes/predictions.js
 *                              Forwarded to ml-service/app/routes/predict.py POST /predict
 *                              Returns { coin, predictions: [{time, value}] }
 *
 * Usage: import api from '../api/index.js'   (see frontend/src/pages/Dashboard.jsx)
 */
import axios from 'axios';

const api = axios.create({ baseURL: '/api' });

export default api;
