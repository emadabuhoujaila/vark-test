import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../data/subjects';
import { GRADE_LABELS, formatClassName } from '../data/grades';
import {
  getRosterGrades,
  getRosterSections,
  getRosterStudents,
  getRosterMeta,
} from '../utils/api';
import {
  getTeacherClass,
  setTeacherClass,
  isTeacherAuthed,
} from '../utils/teacherSession';

export default function TeacherClassSelectPage() {
  const navigate = useNavigate();
  const saved = getTeacherClass();

  const [subject, setSubject] = useState(saved?.subject || 'science');
  const [grade, setGrade] = useState(saved?.grade ? String(saved.grade) : '');
  const [section, setSection] = useState(saved?.section ? String(saved.section) : '');
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [totalRegistered, setTotalRegistered] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingNames, setLoadingNames] = useState(false);

  useEffect(() => {
    if (!isTeacherAuthed()) {
      navigate('/teacher');
      return;
    }
    getRosterMeta()
      .then((meta) => {
        setTotalRegistered(meta.totalStudents || 0);
        if (!meta.totalStudents) return [];
        return getRosterGrades();
      })
      .then((g) => setGrades(g || []))
      .finally(() => setLoading(false));
  }, [navigate]);

  useEffect(() => {
    if (!grade) {
      setSections([]);
      setSection('');
      return;
    }
    getRosterSections(grade).then(setSections).catch(() => setSections([]));
    if (saved?.grade !== Number(grade)) setSection('');
  }, [grade]);

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

  function handleContinue() {
    if (!subject || !grade || !section) return;
    setTeacherClass({ subject, grade, section });
    navigate('/teacher/dashboard');
  }

  const selectedSubject = SUBJECTS.find((s) => s.id === subject);
  const classLabel = grade && section ? formatClassName(Number(grade), Number(section)) : '';

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">جاري التحميل...</div>
      </div>
    );
  }

  if (!totalRegistered) {
    return (
      <div className="page">
        <div className="card form-card">
          <h1>اختيار الصف</h1>
          <p className="error-msg">لم تُرفع قائمة الأسماء بعد.</p>
          <p className="muted">ارفع ملف Excel من لوحة التحكم أولًا.</p>
          <Link to="/teacher/dashboard?tab=roster" className="btn btn-primary">
            الذهاب لرفع القوائم
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="page teacher-class-page">
      <div className="card form-card">
        <h1>👨‍🏫 لوحة المعلم</h1>
        <p className="muted">
          اختر المادة ثم الصف ثم الشعبة لعرض أسماء الطلاب.
          <br />
          <small>{totalRegistered} طالب مسجل في المدرسة</small>
        </p>

        <div className="student-form class-select-form">
          <label>
            📚 المادة
            <select value={subject} onChange={(e) => setSubject(e.target.value)}>
              {SUBJECTS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.icon} {s.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            🎓 الصف
            <select
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              required
            >
              <option value="">— اختر الصف —</option>
              {grades.map((g) => (
                <option key={g} value={g}>
                  {GRADE_LABELS[g] || `الصف ${g}`}
                </option>
              ))}
            </select>
          </label>

          <label>
            🏫 الشعبة
            <select
              value={section}
              onChange={(e) => setSection(e.target.value)}
              required
              disabled={!grade}
            >
              <option value="">— اختر الشعبة —</option>
              {sections.map((s) => (
                <option key={s} value={s}>الشعبة {s}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {grade && section && (
        <div className="card">
          <div className="class-header-bar">
            <div>
              <h2>
                {selectedSubject?.icon} {selectedSubject?.name} — {classLabel}
              </h2>
              <p className="muted">{students.length} طالب/طالبة</p>
            </div>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleContinue}
              disabled={!students.length}
            >
              لوحة التحليل VARK →
            </button>
          </div>

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
                  </div>
                  <span className="student-num">{i + 1}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="class-page-actions">
        <Link to="/teacher/dashboard?tab=roster" className="btn btn-secondary">
          ⬆️ رفع / تحديث القوائم
        </Link>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => navigate('/teacher')}
        >
          خروج
        </button>
      </div>
    </div>
  );
}
