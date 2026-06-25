import { useEffect, useState } from 'react';
import { GRADE_LABELS, formatClassName } from '../data/grades';
import { getRosterSummary, getRosterStudents } from '../utils/api';
import { StatCard } from './UI';

export default function RosterNamesPanel() {
  const [summary, setSummary] = useState(null);
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    getRosterSummary()
      .then(setSummary)
      .finally(() => setLoading(false));
  }, []);

  const selectedGrade = summary?.grades?.find((g) => String(g.grade) === grade);

  useEffect(() => {
    if (!grade || !section) {
      setStudents([]);
      return;
    }
    setLoadingNames(true);
    getRosterStudents(grade, section)
      .then(setStudents)
      .catch(() => setStudents([]))
      .finally(() => setLoadingNames(false));
  }, [grade, section]);

  if (loading) {
    return <div className="loading-state">جاري تحميل قائمة الأسماء...</div>;
  }

  if (!summary?.totalStudents) {
    return (
      <div className="card empty-roster">
        <span className="roster-big-icon">📋</span>
        <p>لا توجد أسماء مسجّلة. ارفع ملف Excel من تبويب «رفع القوائم».</p>
      </div>
    );
  }

  return (
    <div className="roster-names-panel">
      <div className="stats-row">
        <StatCard title="👥 إجمالي الأسماء" value={summary.totalStudents} />
        <StatCard title="🏫 عدد الصفوف" value={summary.grades.length} />
        <StatCard
          title="📂 عدد الشعب"
          value={summary.grades.reduce((n, g) => n + g.sections.length, 0)}
        />
      </div>

      <div className="card">
        <h3>📚 الأسماء حسب الصف والشعبة</h3>
        <p className="muted">اضغط على بطاقة الصف ثم اختر الشعبة لعرض الأسماء.</p>

        <div className="grade-cards">
          {summary.grades.map((g) => (
            <button
              key={g.grade}
              type="button"
              className={`grade-card ${grade === String(g.grade) ? 'active' : ''}`}
              onClick={() => {
                setGrade(String(g.grade));
                setSection('');
              }}
            >
              <span className="grade-card-icon">🎓</span>
              <strong>{GRADE_LABELS[g.grade] || `الصف ${g.grade}`}</strong>
              <span className="grade-card-count">{g.total} طالب</span>
              <div className="section-pills">
                {g.sections.map(({ section: sec, count }) => (
                  <span key={sec} className="section-pill">
                    {sec} ({count})
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      {selectedGrade && (
        <div className="card">
          <h3>
            🧑‍🎓 {GRADE_LABELS[selectedGrade.grade] || `الصف ${selectedGrade.grade}`}
          </h3>
          <div className="section-picker">
            {selectedGrade.sections.map(({ section: sec, count }) => (
              <button
                key={sec}
                type="button"
                className={`section-btn ${section === String(sec) ? 'active' : ''}`}
                onClick={() => setSection(String(sec))}
              >
                الشعبة {sec}
                <small>{count} طالب</small>
              </button>
            ))}
          </div>
        </div>
      )}

      {grade && section && (
        <div className="card">
          <h3>
            👥 {formatClassName(Number(grade), Number(section))}
            <span className="muted-inline"> ({students.length} اسم)</span>
          </h3>

          {loadingNames ? (
            <div className="loading-state">جاري تحميل الأسماء...</div>
          ) : (
            <ul className="student-name-list">
              {students.map((s, i) => (
                <li key={`${s.studentNumber}-${s.nameAr}`}>
                  <span className="student-list-icon">👤</span>
                  <div>
                    <strong>{s.nameAr}</strong>
                    {s.nameEn && <small>{s.nameEn}</small>}
                    {s.studentNumber && <small className="student-id">#{s.studentNumber}</small>}
                  </div>
                  <span className="student-num">{i + 1}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
