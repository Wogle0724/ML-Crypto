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
import { createChart } from 'lightweight-charts';
import { createContext, useEffect, useRef } from 'react';

// Shared context — PredictionOverlay consumes this to attach its own series
// to the same chart instance without needing a prop-drilling chain.
export const ChartContext = createContext(null);

export default function Chart({ data, children }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);

  // Create the chart once on mount; destroy on unmount.
  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current  = createChart(containerRef.current, { width: 800, height: 400 });
    seriesRef.current = chartRef.current.addLineSeries({ color: '#2962ff' });
    return () => chartRef.current.remove();
  }, []);

  // Re-draw whenever price data arrives or changes.
  // lightweight-charts requires time in Unix seconds, not milliseconds.
  useEffect(() => {
    if (!seriesRef.current || !data?.prices?.length) return;
    seriesRef.current.setData(
      data.prices.map((p) => ({ time: Math.floor(p.time / 1000), value: p.value }))
    );
    chartRef.current.timeScale().fitContent();
  }, [data]);

  return (
    <ChartContext.Provider value={chartRef}>
      <div ref={containerRef} />
      {children}
    </ChartContext.Provider>
  );
}
