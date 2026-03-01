/**
 * frontend/src/components/Chart.jsx — wraps TradingView Lightweight Charts.
 *
 * PROPS:
 *   data: { coin: string, prices: [{time: number, value: number}] }
 *         Received from frontend/src/pages/Dashboard.jsx (prices state)
 *         Sourced via GET /api/prices/:coin
 *           → backend/src/routes/prices.js
 *           → MySQL crypto_db.prices (written by pipeline/dags/fetch_prices.py)
 */
import { createChart } from 'lightweight-charts';
import { createContext, useEffect, useRef } from 'react';

// Shared context — PredictionOverlay consumes this to attach its own series
// to the same chart instance without needing a prop-drilling chain.
export const ChartContext = createContext(null);

// range:          number of days to show (1 | 7 | 30 | 90)
// predictionEndMs: Unix ms of the last predicted point — used to anchor the right edge
export default function Chart({ data, range, predictionEndMs, children }) {
  const containerRef = useRef(null);
  const chartRef     = useRef(null);
  const seriesRef    = useRef(null);

  // Create the chart once on mount; destroy on unmount.
  // autoSize: true lets it fill the container width responsively.
  useEffect(() => {
    if (!containerRef.current) return;
    chartRef.current  = createChart(containerRef.current, {
      autoSize: true,
      height: 400,
      layout: { background: { color: '#ffffff' }, textColor: '#333' },
      grid: { vertLines: { color: '#f0f0f0' }, horzLines: { color: '#f0f0f0' } },
      localization: {
        // Crosshair tooltip — full date + time with timezone abbreviation (EST/EDT)
        timeFormatter: (unixSec) =>
          new Date(unixSec * 1000).toLocaleString('en-US', {
            timeZone: 'America/New_York',
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false,
            timeZoneName: 'short',
          }),
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        // Axis tick labels — format in ET, append timezone on time-level ticks
        tickMarkFormatter: (unixSec, tickMarkType) => {
          const d = new Date(unixSec * 1000);
          const tz = { timeZone: 'America/New_York' };
          // tickMarkType: 0=Year 1=Month 2=Day 3=Time 4=TimeWithSecs
          if (tickMarkType === 0)
            return d.toLocaleDateString('en-US', { ...tz, year: 'numeric' });
          if (tickMarkType === 1)
            return d.toLocaleDateString('en-US', { ...tz, month: 'short', year: 'numeric' });
          if (tickMarkType === 2)
            return d.toLocaleDateString('en-US', { ...tz, month: 'short', day: 'numeric' });
          // Time and TimeWithSecs — show "HH:MM ET"
          const time = d.toLocaleTimeString('en-US', { ...tz, hour: '2-digit', minute: '2-digit', hour12: false });
          const tzAbbr = d.toLocaleTimeString('en-US', { ...tz, timeZoneName: 'short' }).split(' ').at(-1);
          return `${time} ${tzAbbr}`;
        },
      },
    });
    seriesRef.current = chartRef.current.addLineSeries({
      color: '#2962ff',
      lineWidth: 2,
    });
    return () => chartRef.current.remove();
  }, []);

  // Re-draw series data whenever price data arrives or changes.
  // lightweight-charts requires time in Unix seconds, not milliseconds.
  useEffect(() => {
    if (!seriesRef.current || !data?.prices?.length) return;
    seriesRef.current.setData(
      data.prices.map((p) => ({ time: Math.floor(p.time / 1000), value: p.value }))
    );
  }, [data]);

  // Set visible range whenever data, range, or predictionEndMs changes.
  // from = lastPrice − range days  (always shows exactly `range` days of history)
  // to   = last prediction          (predictions always land at the right edge)
  // Total width = range days + prediction horizon (e.g. 7D range + 24h = ~8 days shown)
  useEffect(() => {
    if (!chartRef.current || !data?.prices?.length) return;
    const lastPriceSec = Math.floor(data.prices.at(-1).time / 1000);
    const fromSec = lastPriceSec - range * 86400;
    const toSec   = predictionEndMs
      ? Math.floor(predictionEndMs / 1000)
      : lastPriceSec;
    chartRef.current.timeScale().setVisibleRange({ from: fromSec, to: toSec });
  }, [data, range, predictionEndMs]);

  return (
    <ChartContext.Provider value={chartRef}>
      <div ref={containerRef} style={{ width: '100%' }} />
      {children}
    </ChartContext.Provider>
  );
}
