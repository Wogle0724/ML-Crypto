/**
 * frontend/src/pages/Dashboard.jsx — Main page. Fires two parallel API calls on mount.
 *
 * CALL 1: api.get('/prices/bitcoin')
 *   Proxy:   frontend/vite.config.js → backend container:4000
 *   Route:   backend/src/routes/prices.js  GET /api/prices/:coin
 *   Now:     returns hardcoded mock [{time, value}]
 *   Later:   queries MySQL crypto_db.prices via backend/src/services/db.js
 *            (rows written hourly by pipeline/dags/fetch_prices.py → store_to_mysql task)
 *
 * CALL 2: api.get('/predict/bitcoin')
 *   Proxy:   frontend/vite.config.js → backend container:4000
 *   Route:   backend/src/routes/predictions.js  GET /api/predict/:coin
 *   Gateway: backend POSTs to ml-service/app/routes/predict.py  POST /predict
 *   Now:     returns dummy [{time, value}]
 *   Later:   runs LSTM inference (ml-service/app/model/lstm.py)
 *            model loaded from MLflow via ml-service/app/model/load.py
 *            model trained daily by pipeline/dags/train_model.py → train_lstm task
 *
 * RENDERS:
 *   frontend/src/components/Chart.jsx             receives prices state
 *   frontend/src/components/PredictionOverlay.jsx receives predictions state
 */
import { useEffect, useState } from 'react';
import api from '../api/index.js';
import Chart from '../components/Chart.jsx';
import PredictionOverlay from '../components/PredictionOverlay.jsx';

export default function Dashboard() {
  const [prices, setPrices] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/prices/bitcoin'),
      api.get('/predict/bitcoin'),
    ])
      .then(([pricesRes, predictionsRes]) => {
        setPrices(pricesRes.data);
        setPredictions(predictionsRes.data);
      })
      .catch((err) => setError(err.message));
  }, []);

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>Crypto Predictor Dashboard</h1>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      <Chart data={prices}>
        <PredictionOverlay data={predictions} />
      </Chart>
    </div>
  );
}
