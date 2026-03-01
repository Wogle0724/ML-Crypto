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

    // Prepend the last historical price so the prediction line connects
    // to the end of the price chart rather than starting as a floating segment.
    const anchor = lastPrice
      ? [{ time: Math.floor(lastPrice.time / 1000), value: lastPrice.value }]
      : [];

    seriesRef.current.setData([
      ...anchor,
      ...data.predictions.map((p) => ({ time: Math.floor(p.time / 1000), value: p.value })),
    ]);
  }, [data, lastPrice, chartRef]);

  return null;
}
