/**
 * frontend/src/pages/Dashboard.jsx — Main page.
 *
 * Fires three parallel API calls whenever the selected coin changes:
 *   GET /api/prices/:coin          → price history for chart
 *   GET /api/predict/:coin         → 24-step LSTM forecast
 *   GET /api/prediction-log/:coin  → historical predictions vs actuals for table
 */
import { useEffect, useState } from 'react';
import api from '../api/index.js';
import Chart from '../components/Chart.jsx';
import PredictionOverlay from '../components/PredictionOverlay.jsx';
import ActualsOverlay from '../components/ActualsOverlay.jsx';
import PredictionTable from '../components/PredictionTable.jsx';

const COINS = ['bitcoin', 'ethereum'];

const RANGES = [
  { label: 'Past 1 Day',   days: 1  },
  { label: 'Past 7 Days',  days: 7  },
  { label: 'Past 30 Days', days: 30 },
  { label: 'Past 90 Days', days: 90 },
];

export default function Dashboard() {
  const [coin, setCoin]               = useState('bitcoin');
  const [range, setRange]             = useState(30);
  const [prices, setPrices]           = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [predictionLog, setPredictionLog] = useState(null);
  const [error, setError]             = useState(null);

  useEffect(() => {
    setPrices(null);
    setPredictions(null);
    setPredictionLog(null);
    setError(null);

    Promise.all([
      api.get(`/prices/${coin}`),
      api.get(`/predict/${coin}`),
      api.get(`/prediction-log/${coin}`),
    ])
      .then(([pricesRes, predictionsRes, logRes]) => {
        setPrices(pricesRes.data);
        setPredictions(predictionsRes.data);
        setPredictionLog(logRes.data);
      })
      .catch((err) => setError(err.message));
  }, [coin]);

  const lastPrice       = prices?.prices?.at(-1);
  const predictionEndMs = predictions?.predictions?.at(-1)?.time ?? null;

  // Past predictions with confirmed actuals — plots predicted_price so you can see
  // where the model thought prices would be vs the blue actual-price line.
  // Only included once the hour has passed and fetch_prices has back-filled actual_price.
  const pastPredictions = (() => {
    if (!predictionLog?.log?.length) return [];
    const map = new Map();
    for (const row of predictionLog.log) {
      if (row.actual_price != null && !map.has(String(row.time))) {
        map.set(String(row.time), { time: Number(row.time), value: Number(row.predicted_price) });
      }
    }
    return Array.from(map.values()).sort((a, b) => a.time - b.time);
  })();

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Crypto Predictor</h1>

        <select
          value={coin}
          onChange={(e) => setCoin(e.target.value)}
          style={selectStyle}
        >
          {COINS.map((c) => (
            <option key={c} value={c}>
              {c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>

        <select
          value={range}
          onChange={(e) => setRange(Number(e.target.value))}
          style={selectStyle}
        >
          {RANGES.map((r) => (
            <option key={r.days} value={r.days}>{r.label}</option>
          ))}
        </select>

        {!prices && !error && (
          <span style={{ color: '#888', fontSize: '0.9rem' }}>Loading…</span>
        )}
      </div>

      {error && (
        <p style={{ color: '#c62828', background: '#ffebee', padding: '0.75rem 1rem', borderRadius: '6px' }}>
          Error: {error}
        </p>
      )}

      <Chart data={prices} range={range} predictionEndMs={predictionEndMs}>
        <PredictionOverlay data={predictions} lastPrice={lastPrice} />
        <ActualsOverlay data={pastPredictions} />
      </Chart>

      <PredictionTable data={predictionLog} />
    </div>
  );
}

const selectStyle = {
  fontSize: '1rem',
  padding: '0.4rem 0.8rem',
  borderRadius: '6px',
  border: '1px solid #ccc',
  cursor: 'pointer',
};
