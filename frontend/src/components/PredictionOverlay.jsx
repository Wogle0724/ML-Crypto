/**
 * frontend/src/components/PredictionOverlay.jsx — overlays predicted future prices on the chart.
 *
 * PROPS:
 *   data: { coin: string, predictions: [{time: number, value: number}] }
 *         Received from frontend/src/pages/Dashboard.jsx (predictions state)
 *         Sourced via GET /api/predict/:coin
 *           → backend/src/routes/predictions.js (pass-through gateway)
 *           → ml-service/app/routes/predict.py  POST /predict
 *           → ml-service/app/model/lstm.py       LSTMModel inference
 *           → ml-service/app/model/load.py       loads from MLflow artifact store
 *           → Model trained by pipeline/dags/train_model.py → train_lstm task
 *
 * IMPLEMENTATION PATH (when building out real overlay):
 *   Receive the chart instance created in Chart.jsx via a shared React context or prop.
 *   const overlaySeries = chart.addLineSeries({ color: '#f00', lineStyle: 2 });
 *   overlaySeries.setData(data.predictions);
 */
import { useContext, useEffect, useRef } from 'react';
import { ChartContext } from './Chart';

// Renders nothing to the DOM — attaches a dashed red line series directly
// to the lightweight-charts instance created by the parent <Chart>.
export default function PredictionOverlay({ data }) {
  const chartRef  = useContext(ChartContext);
  const seriesRef = useRef(null);

  useEffect(() => {
    if (!chartRef?.current || !data?.predictions?.length) return;

    // Create the overlay series once; reuse it on subsequent data changes.
    if (!seriesRef.current) {
      seriesRef.current = chartRef.current.addLineSeries({
        color: '#ef5350',
        lineStyle: 2,   // dashed
        lineWidth: 2,
      });
    }

    seriesRef.current.setData(
      data.predictions.map((p) => ({ time: Math.floor(p.time / 1000), value: p.value }))
    );
  }, [data, chartRef]);

  return null;
}
