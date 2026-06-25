import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VARK_QUESTIONS } from '../data/varkQuestions';
import { GRADE_LABELS, formatClassName } from '../data/grades';
import { ProgressBar, EmptyState } from '../components/UI';
import {
  calculateScores,
  getPercentages,
  getDominantStyles,
  getProfileLabel,
  getProfileType,
} from '../utils/varkScoring';
import {
  saveSubmission,
  getRosterMeta,
  getRosterGrades,
  getRosterSections,
  getRosterStudents,
} from '../utils/api';

export default function StudentTestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('info');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [rosterReady, setRosterReady] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const question = VARK_QUESTIONS[currentQ];
  const total = VARK_QUESTIONS.length;
  const className = grade && section ? formatClassName(Number(grade), Number(section)) : '';

  useEffect(() => {
    getRosterMeta()
      .then(async (meta) => {
        if (!meta.totalStudents) {
          setRosterReady(false);
          return;
        }
        const g = await getRosterGrades();
        setGrades(g);
      })
      .catch(() => setRosterReady(false))
      .finally(() => setLoadingRoster(false));
  }, []);

  useEffect(() => {
    if (!grade) {
      setSections([]);
      setSection('');
      return;
    }
    getRosterSections(grade)
      .then(setSections)
      .catch(() => setSections([]));
    setSection('');
    setStudentName('');
    setStudentNumber('');
  }, [grade]);

  useEffect(() => {
    if (!grade || !section) {
      setStudents([]);
      return;
    }
    getRosterStudents(grade, section)
      .then(setStudents)
      .catch(() => setStudents([]));
    setStudentName('');
    setStudentNumber('');
  }, [grade, section]);

  function handleStudentPick(nameAr) {
    const found = students.find((s) => s.nameAr === nameAr);
    setStudentName(nameAr);
    setStudentNumber(found?.studentNumber || '');
  }

  function startTest(e) {
    e.preventDefault();
    if (!grade || !section || !studentName) return;
    setStep('quiz');
  }

  async function nextQuestion() {
    if (!selected || saving) return;
    const newAnswers = [...answers, selected];
    setAnswers(newAnswers);
    setSelected(null);

    if (currentQ + 1 >= total) {
      await finishTest(newAnswers);
    } else {
      setCurrentQ((q) => q + 1);
    }
  }

  function prevQuestion() {
    if (currentQ === 0) return;
    const prevAnswers = answers.slice(0, -1);
    setAnswers(prevAnswers);
    setSelected(prevAnswers[prevAnswers.length - 1] ?? null);
    setCurrentQ((q) => q - 1);
  }

  async function finishTest(finalAnswers) {
    setSaving(true);
    setError('');
    try {
      const scores = calculateScores(finalAnswers);
      const percentages = getPercentages(scores);
      const dominant = getDominantStyles(scores);
      const entry = await saveSubmission({
        studentName,
        className,
        studentNumber,
        answers: finalAnswers,
        scores,
        percentages,
        dominantStyles: dominant,
        profileLabel: getProfileLabel(dominant),
        profileType: getProfileType(dominant),
      });
      navigate(`/result/${entry.id}`);
    } catch (err) {
      setError(err.message || 'فشل حفظ النتيجة');
      setSaving(false);
    }
  }

  if (loadingRoster) {
    return (
      <div className="page">
        <div className="loading-state">جاري تحميل قائمة الأسماء...</div>
      </div>
    );
  }

  if (!rosterReady) {
    return (
      <div className="page">
        <EmptyState
          message="لم يرفع المعلم قائمة الأسماء بعد. اطلب من معلمك رفع ملف Excel من لوحة المعلم."
          actionLabel="العودة للرئيسية"
          actionTo="/"
        />
      </div>
    );
  }

  if (step === 'info') {
    return (
      <div className="page">
        <div className="card form-card">
          <h1>اختر اسمك</h1>
          <p className="muted">اختر الصف ثم الشعبة ثم اسمك من القائمة.</p>
          <form onSubmit={startTest} className="student-form">
            <label>
              الصف
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
              الشعبة
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

            <label>
              اسم الطالب
              <select
                value={studentName}
                onChange={(e) => handleStudentPick(e.target.value)}
                required
                disabled={!section}
              >
                <option value="">— اختر اسمك —</option>
                {students.map((s) => (
                  <option key={`${s.studentNumber}-${s.nameAr}`} value={s.nameAr}>
                    {s.nameAr}
                  </option>
                ))}
              </select>
            </label>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={!studentName}
            >
              ابدأ الاختبار ({total} سؤال)
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page quiz-page">
      <ProgressBar current={currentQ + 1} total={total} />

      <div className="card quiz-card">
        <p className="quiz-student">
          الطالب: <strong>{studentName}</strong> — {className}
        </p>
        <h2 className="quiz-question">{question.text}</h2>

        {error && <p className="error-msg">{error}</p>}

        <div className="options-grid">
          {question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={`option-btn ${selected === opt.style ? 'selected' : ''}`}
              onClick={() => setSelected(opt.style)}
              disabled={saving}
            >
              <span className="option-letter">{String.fromCharCode(1571 + i)}</span>
              <span>{opt.text}</span>
            </button>
          ))}
        </div>

        <div className="quiz-nav">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={prevQuestion}
            disabled={currentQ === 0 || saving}
          >
            السابق
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={nextQuestion}
            disabled={!selected || saving}
          >
            {saving ? 'جاري الحفظ...' : currentQ + 1 >= total ? 'إنهاء وعرض النتيجة' : 'التالي'}
          </button>
        </div>
      </div>
    </div>
  );
}
