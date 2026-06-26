import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getSubmission } from '../utils/api';
import { STYLE_DESCRIPTIONS, TEACHING_TIPS } from '../data/varkQuestions';
import { StyleBadge, ScoreBars, EmptyState } from '../components/UI';
import { getDominantStyles, getProfileLabel } from '../utils/varkScoring';
import { getSubjectName, getSubjectIcon } from '../data/subjects';

export default function StudentResultPage() {
  const { id } = useParams();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSubmission(id)
      .then(setSubmission)
      .catch(() => setSubmission(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">جاري تحميل النتيجة...</div>
      </div>
    );
  }

  if (!submission) {
    return (
      <div className="page">
        <EmptyState
          message="لم يتم العثور على هذه النتيجة."
          actionLabel="العودة للرئيسية"
          actionTo="/"
        />
      </div>
    );
  }

  const dominant = submission.dominantStyles || getDominantStyles(submission.scores);
  const profileLabel = submission.profileLabel || getProfileLabel(dominant);
  const questionTotal = submission.answeredCount || submission.answers?.length || 16;

  return (
    <div className="page result-page">
      <div className="card result-header">
        <span className="result-tag">نتيجة الاختبار</span>
        {submission.timedOut && (
          <p className="warn-box timed-out-note">
            ⏱️ انتهى وقت الاختبار (45 دقيقة) — النتيجة محسوبة من {questionTotal} إجابة فقط
          </p>
        )}
        <h1>{submission.studentName}</h1>
        <p className="muted">
          {submission.className}
          {submission.subject && (
            <> · {getSubjectIcon(submission.subject)} {getSubjectName(submission.subject)}</>
          )}
        </p>
        <div className="dominant-profile">
          <p>نمطك السائد:</p>
          <div className="dominant-badges">
            {dominant.map((s) => (
              <StyleBadge key={s} style={s} large />
            ))}
          </div>
          {dominant.length > 1 && (
            <p className="multi-note">لديك نمطان متساويان — أنت متعلّم متعدد الأنماط</p>
          )}
          <h2>{profileLabel}</h2>
        </div>
      </div>

      <div className="card">
        <h3>توزيع درجاتك</h3>
        <ScoreBars scores={submission.scores} percentages={submission.percentages} questionTotal={questionTotal} />
      </div>

      <div className="tips-grid">
        {dominant.map((style) => (
          <div key={style} className="card tip-card">
            <StyleBadge style={style} large />
            <p>{STYLE_DESCRIPTIONS[style]}</p>
            <h4>نصائح للتعلّم:</h4>
            <ul>
              {TEACHING_TIPS[style].map((tip, i) => (
                <li key={i}>{tip}</li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="result-actions">
        <Link to="/test" className="btn btn-secondary">العودة للاختبار</Link>
      </div>
    </div>
  );
}
