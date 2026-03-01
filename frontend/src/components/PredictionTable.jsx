/**
 * frontend/src/components/PredictionTable.jsx
 *
 * Renders a table of historical predictions vs actual prices from prediction_log.
 * Data sourced via GET /api/prediction-log/:coin
 *   → backend/src/routes/predictionLog.js
 *   → MySQL crypto_db.prediction_log
 *
 * Columns:
 *   Predicted For  — the future timestamp this prediction was targeting
 *   Step (hr)      — how many hours ahead (1–24)
 *   Predicted ($)  — the model's predicted close price
 *   Actual ($)     — the real close price once it arrived (Pending if not yet)
 *   MSE            — squared error (predicted − actual)², colored by magnitude
 */
export default function PredictionTable({ data }) {
  if (!data) return null;

  if (!data.log?.length) {
    return (
      <div style={{ marginTop: '2rem' }}>
        <h2 style={styles.heading}>Prediction Log</h2>
        <p style={{ color: '#888' }}>
          No predictions logged yet. Run the <code>train_model</code> DAG and trigger{' '}
          <code>/predict</code> to populate this table.
        </p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={styles.heading}>Prediction Log</h2>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Predicted For (ET)</th>
              <th style={{ ...styles.th, textAlign: 'center' }}>Step (hr)</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Predicted ($)</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>Actual ($)</th>
              <th style={{ ...styles.th, textAlign: 'right' }}>MSE</th>
            </tr>
          </thead>
          <tbody>
            {data.log.map((row, i) => {
              const hasActual = row.actual_price != null;
              const mse = hasActual
                ? Math.pow(row.predicted_price - row.actual_price, 2)
                : null;

              return (
                <tr
                  key={i}
                  style={{
                    background: i % 2 === 0 ? '#fafafa' : '#ffffff',
                    borderBottom: '1px solid #ebebeb',
                  }}
                >
                  <td style={styles.td}>
                    {new Date(Number(row.time)).toLocaleString('en-US', {
                      timeZone: 'America/New_York',
                      month: 'short', day: 'numeric', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', hour12: false,
                      timeZoneName: 'short',
                    })}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'center', color: '#555' }}>
                    +{row.horizon_step}h
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {fmt(row.predicted_price)}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                    {hasActual ? fmt(row.actual_price) : <span style={{ color: '#bbb' }}>Pending</span>}
                  </td>
                  <td style={{ ...styles.td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', ...mseColor(mse) }}>
                    {mse != null ? fmtMse(mse) : <span style={{ color: '#bbb' }}>—</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function fmt(n) {
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtMse(n) {
  // Use compact notation for large squared-dollar values
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(2)}K`;
  return n.toFixed(2);
}

function mseColor(mse) {
  if (mse == null)       return {};
  if (mse < 10_000)      return { color: '#2e7d32' }; // green  — within ~$100
  if (mse < 1_000_000)   return { color: '#e65100' }; // orange — within ~$1000
  return { color: '#c62828' };                         // red    — >$1000 off
}

const styles = {
  heading: { fontSize: '1.1rem', fontWeight: 600, marginBottom: '0.75rem' },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    fontSize: '0.875rem',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    overflow: 'hidden',
  },
  th: {
    padding: '0.65rem 1rem',
    fontWeight: 600,
    background: '#f5f5f5',
    borderBottom: '2px solid #ddd',
    textAlign: 'left',
    whiteSpace: 'nowrap',
  },
  td: { padding: '0.5rem 1rem', whiteSpace: 'nowrap' },
};
