/**
 * frontend/src/components/PastOverlay.jsx
 *
 * Plots the actual prices that materialised for previously-predicted timestamps.
 * Data comes from prediction_log.actual_price (back-filled by fetch_prices DAG).
 *
 * Rendered as a teal line on the chart so you can visually compare:
 *   Blue  = full price history
 *   Teal  = actual prices in the region that was once predicted  ← this component
 *   Red   = current model predictions (future)
 *
 * PROPS:
 *   data: [{ time: number (ms), value: number }]  — de-duplicated & sorted by Dashboard
 */
import { useContext, useEffect, useRef } from 'react';
import { ChartContext } from './Chart';

export default function PastOverlay({ data }) {
  const chartRef  = useContext(ChartContext);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!chartRef?.current) return;
    if (!data?.length) return;   // no confirmed predictions yet — don't touch the chart instance

    if (!seriesRef.current) {
      seriesRef.current = chartRef.current.addLineSeries({
        color: '#43a047',       // green — past predictions; compare against blue (actual prices)
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
      });
    }

    seriesRef.current.setData(
      data.map((p) => ({ time: Math.floor(p.time / 1000), value: p.value }))
    );
  }, [data, chartRef]);

  return null;
}
