import { SUBJECTS, getSubjectName } from '../../data/subjects';
import { GRADE_LABELS } from '../../data/grades';

export default function AdminSubjectMatrix({ matrix }) {
  if (!matrix?.length) {
    return (
      <div className="empty-state compact">
        <p>لم تُرفع قوائم الطلاب بعد — ارفع Excel من تبويب «رفع القوائم»</p>
      </div>
    );
  }

  return (
    <div className="subject-matrix">
      {matrix.map((gradeBlock) => (
        <div key={gradeBlock.grade} className="subject-matrix-grade">
          <h4>{GRADE_LABELS[gradeBlock.grade] || `الصف ${gradeBlock.grade}`}</h4>
          <div className="subject-matrix-sections">
            {gradeBlock.sections.map((sec) => (
              <div key={sec.section} className="subject-matrix-section card">
                <div className="section-matrix-head">
                  <strong>الشعبة {sec.section}</strong>
                  <span className="muted">{sec.studentCount} طالب</span>
                </div>
                <div className="subject-chip-grid">
                  {sec.subjects.map((sub) => {
                    const info = SUBJECTS.find((x) => x.id === sub.id);
                    return (
                      <div
                        key={sub.id}
                        className={`subject-chip ${sub.registered ? 'registered' : 'unregistered'}`}
                      >
                        <span className="subject-chip-icon">{info?.icon || '📚'}</span>
                        <span className="subject-chip-name">{getSubjectName(sub.id)}</span>
                        <span className="subject-chip-status">
                          {sub.registered ? 'مسجّل' : 'غير مسجّل'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
