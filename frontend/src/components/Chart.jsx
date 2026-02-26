/**
 * frontend/src/components/Chart.jsx — wraps TradingView Lightweight Charts.
 *
 * PROPS:
 *   data: { coin: string, prices: [{time: number, value: number}] }
 *         Received from frontend/src/pages/Dashboard.jsx (prices state)
 *         Sourced via GET /api/prices/:coin
 *           → backend/src/routes/prices.js
 *           → MySQL crypto_db.prices (written by pipeline/dags/fetch_prices.py)
 *
 * IMPLEMENTATION PATH (when building out real chart):
 *   import { createChart } from 'lightweight-charts';  // already in frontend/package.json
 *   const chartRef = useRef(null);
 *   useEffect(() => {
 *     const chart = createChart(chartRef.current, { width: 800, height: 400 });
 *     const series = chart.addLineSeries();
 *     series.setData(data.prices);
 *     // Pass chart instance to PredictionOverlay.jsx via context/prop for overlay series
 *   }, [data]);
 *   return <div ref={chartRef} />;
 */
// Placeholder — wire up lightweight-charts (TradingView LWC) here.
export default function Chart({ data }) {
  return (
    <div style={{ border: '1px dashed #ccc', padding: '1rem', marginBottom: '1rem' }}>
      <p>Chart placeholder – lightweight-charts goes here</p>
      {data && <pre style={{ fontSize: '0.75rem' }}>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
