import { Link } from 'react-router-dom';
import { STYLE_LABELS } from '../data/varkQuestions';

export function StyleBadge({ style, large }) {
  const info = STYLE_LABELS[style];
  if (!info) return null;
  return (
    <span
      className={`style-badge ${large ? 'large' : ''}`}
      style={{ '--badge-color': info.color }}
    >
      <span>{info.icon}</span>
      {info.name}
    </span>
  );
}

export function ProgressBar({ current, total }) {
  const pct = Math.round((current / total) * 100);
  return (
    <div className="progress-wrap">
      <div className="progress-meta">
        <span>السؤال {current} من {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function ScoreBars({ scores, percentages, questionTotal = 16 }) {
  return (
    <div className="score-bars">
      {Object.entries(scores).map(([style, score]) => (
        <div key={style} className="score-row">
          <div className="score-label">
            <StyleBadge style={style} />
            <span>{score}/{questionTotal} ({percentages[style]}%)</span>
          </div>
          <div className="score-track">
            <div
              className="score-fill"
              style={{
                width: `${percentages[style]}%`,
                background: STYLE_LABELS[style].color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function StatCard({ title, value, subtitle, color }) {
  return (
    <div className="stat-card" style={color ? { '--accent': color } : undefined}>
      <p className="stat-title">{title}</p>
      <p className="stat-value">{value}</p>
      {subtitle && <p className="stat-sub">{subtitle}</p>}
    </div>
  );
}

export function EmptyState({ message, actionLabel, actionTo }) {
  return (
    <div className="empty-state">
      <p>{message}</p>
      {actionLabel && actionTo && (
        <Link to={actionTo} className="btn btn-primary">{actionLabel}</Link>
      )}
    </div>
  );
}
