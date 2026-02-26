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
// Placeholder — overlay predicted values on top of the chart here.
export default function PredictionOverlay({ data }) {
  return (
    <div style={{ border: '1px dashed #aaf', padding: '1rem' }}>
      <p>Prediction overlay placeholder</p>
      {data && <pre style={{ fontSize: '0.75rem' }}>{JSON.stringify(data, null, 2)}</pre>}
    </div>
  );
}
