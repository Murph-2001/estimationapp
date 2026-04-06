export default function ProgressBar({ value, max, label, sublabel, color = '#3b82f6' }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  const met = value >= max

  return (
    <div className="progress-item">
      <div className="progress-header">
        <span className="progress-label">{label}</span>
        <span className={`progress-count ${met ? 'met' : ''}`}>
          {value.toFixed(1)} / {max} hrs {met ? '✓' : ''}
        </span>
      </div>
      {sublabel && <div className="progress-sublabel">{sublabel}</div>}
      <div className="progress-track">
        <div
          className={`progress-fill ${met ? 'progress-met' : ''}`}
          style={{ width: `${pct}%`, backgroundColor: met ? '#22c55e' : color }}
        />
      </div>
      <div className="progress-pct">{pct}%</div>
    </div>
  )
}
