import { STYLE_LABELS } from '../../data/varkQuestions';
import { getDominantStyles } from '../../utils/varkScoring';

export function CompletionChart({ completed, pending, rate }) {
  const total = completed + pending || 1;
  const donePct = Math.round((completed / total) * 100);
  const pendingPct = 100 - donePct;

  return (
    <div className="chart-card">
      <h4>📈 نسبة إنجاز الاختبار</h4>
      <div className="completion-visual">
        <div
          className="completion-donut"
          style={{
            background: `conic-gradient(#059669 0 ${donePct}%, #fbbf24 ${donePct}% 100%)`,
          }}
        >
          <div className="completion-donut-inner">
            <strong>{rate}%</strong>
            <span>أنجزوا</span>
          </div>
        </div>
        <div className="completion-legend">
          <div className="legend-row">
            <span className="legend-dot done" />
            <span>أنجزوا: <strong>{completed}</strong></span>
          </div>
          <div className="legend-row">
            <span className="legend-dot pending" />
            <span>لم ينجزوا: <strong>{pending}</strong></span>
          </div>
          <div className="stacked-bar">
            <div className="stacked-done" style={{ width: `${donePct}%` }} />
            <div className="stacked-pending" style={{ width: `${pendingPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProfileBarChart({ breakdown, maxCount }) {
  const peak = maxCount || Math.max(...breakdown.map((b) => b.count), 1);

  return (
    <div className="chart-card">
      <h4>📊 توزيع أنماط الطلاب</h4>
      <div className="h-bar-chart">
        {breakdown.map(({ label, count }) => (
          <div key={label} className="h-bar-row">
            <span className="h-bar-label">{label}</span>
            <div className="h-bar-track">
              <div
                className="h-bar-fill profile-fill"
                style={{ width: `${(count / peak) * 100}%` }}
              />
            </div>
            <span className="h-bar-value">{count}</span>
          </div>
        ))}
        {!breakdown.length && <p className="muted">لا توجد نتائج بعد</p>}
      </div>
    </div>
  );
}

export function StyleCountChart({ submissions }) {
  const styles = ['V', 'A', 'R', 'K'];
  const counts = { V: 0, A: 0, R: 0, K: 0, MULTI: 0 };
  submissions.forEach((sub) => {
    const dom = getDominantStyles(sub.scores);
    if (dom.length === 1) counts[dom[0]] += 1;
    else counts.MULTI += 1;
  });
  const multi = counts.MULTI;
  const peak = Math.max(...styles.map((s) => counts[s] || 0), multi, 1);

  return (
    <div className="chart-card">
      <h4>🎯 النمط السائد لكل طالب</h4>
      <div className="style-count-grid">
        {styles.map((style) => (
          <div key={style} className="style-count-item">
            <div className="style-count-head">
              <span>{STYLE_LABELS[style].icon}</span>
              <strong>{STYLE_LABELS[style].name}</strong>
            </div>
            <div className="style-count-bar">
              <div
                className="style-count-fill"
                style={{
                  height: `${((counts[style] || 0) / peak) * 100}%`,
                  background: STYLE_LABELS[style].color,
                }}
              />
            </div>
            <span className="style-count-num">{counts[style] || 0}</span>
          </div>
        ))}
        {multi > 0 && (
          <div className="style-count-item multi">
            <div className="style-count-head">
              <span>🔀</span>
              <strong>متعدد</strong>
            </div>
            <div className="style-count-bar">
              <div
                className="style-count-fill"
                style={{ height: `${(multi / peak) * 100}%`, background: '#6366f1' }}
              />
            </div>
            <span className="style-count-num">{multi}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function CompareBars({ label, value, max, color }) {
  return (
    <div className="compare-bar-row">
      <span className="compare-label">{label}</span>
      <div className="compare-track">
        <div className="compare-fill" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
      <span className="compare-value">{value}</span>
    </div>
  );
}
