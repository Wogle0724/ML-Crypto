/**
 * frontend/src/components/PredictionOverlay.jsx — overlays predicted future prices on the chart.
 *
 * PROPS:
 *   data:       { coin, predictions: [{time: number, value: number}] }
 *   lastPrice:  { time: number, value: number } — last historical price point, used to
 *               anchor the prediction line so it connects visually to the price chart.
 */
import { useContext, useEffect, useRef } from 'react';
import { ChartContext } from './Chart';

export default function PredictionOverlay({ data, lastPrice }) {
  const chartRef  = useContext(ChartContext);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!chartRef?.current || !data?.predictions?.length) return;

    if (!seriesRef.current) {
      seriesRef.current = chartRef.current.addLineSeries({
        color: '#ef5350',
        lineWidth: 2,
        lastValueVisible: false,
        priceLineVisible: false,
      });
    }

    const predPoints = data.predictions.map((p) => ({
      time: Math.floor(p.time / 1000),
      value: p.value,
    }));

    // Prepend the last historical price so the prediction line connects to the price chart.
    // Skip the anchor if prices have advanced past the first prediction (would break time ordering).
    const anchorSec = lastPrice ? Math.floor(lastPrice.time / 1000) : null;
    const anchor = (anchorSec && predPoints.length && anchorSec < predPoints[0].time)
      ? [{ time: anchorSec, value: lastPrice.value }]
      : [];

    seriesRef.current.setData([...anchor, ...predPoints]);
  }, [data, lastPrice, chartRef]);

  return null;
}
