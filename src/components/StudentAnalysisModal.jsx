import { STYLE_DESCRIPTIONS, TEACHING_TIPS, STYLE_LABELS } from '../data/varkQuestions';
import { StyleBadge, ScoreBars } from './UI';
import { getDominantStyles, getProfileLabel } from '../utils/varkScoring';

export default function StudentAnalysisModal({ student, className, onClose }) {
  if (!student) return null;

  const submission = student.submission;

  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div className="modal-card student-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="إغلاق">×</button>

        <div className="modal-header">
          <h2>{student.nameAr}</h2>
          <p className="muted">
            {className} · رقم {student.studentNumber || '—'}
          </p>
        </div>

        {!submission ? (
          <div className="empty-state compact">
            <p>⏳ لم ينجز هذا الطالب الاختبار بعد</p>
          </div>
        ) : (
          <>
            {(() => {
              const dominant = submission.dominantStyles || getDominantStyles(submission.scores);
              const profileLabel = submission.profileLabel || getProfileLabel(dominant);
              return (
                <>
                  <div className="modal-profile">
                    <p>النمط السائد:</p>
                    <div className="dominant-badges">
                      {dominant.map((s) => (
                        <StyleBadge key={s} style={s} large />
                      ))}
                    </div>
                    <h3>{profileLabel}</h3>
                    <p className="muted">
                      تاريخ الإنجاز: {new Date(submission.submittedAt).toLocaleString('ar-SA')}
                    </p>
                  </div>

                  <div className="modal-section">
                    <h4>📊 توزيع درجات VARK</h4>
                    <ScoreBars scores={submission.scores} percentages={submission.percentages} />
                  </div>

                  <div className="modal-tips">
                    {dominant.map((style) => (
                      <div key={style} className="tip-card compact">
                        <StyleBadge style={style} large />
                        <p>{STYLE_DESCRIPTIONS[style]}</p>
                        <h5>نصائح تعليمية للمعلم:</h5>
                        <ul>
                          {TEACHING_TIPS[style].map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div className="score-grid-mini">
                    {Object.entries(submission.scores).map(([style, score]) => (
                      <div key={style} className="score-mini" style={{ '--accent': STYLE_LABELS[style].color }}>
                        <span>{STYLE_LABELS[style].icon}</span>
                        <strong>{score}/16</strong>
                        <small>{submission.percentages[style]}%</small>
                      </div>
                    ))}
                  </div>
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}
