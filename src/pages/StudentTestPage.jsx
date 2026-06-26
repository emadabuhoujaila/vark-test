import { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GRADE_LABELS, formatClassName } from '../data/grades';
import { getSubjectIcon, getSubjectName } from '../data/subjects';
import {
  getQuestionsForSubject,
  SUBJECT_STATUS_MESSAGES,
  TEST_DURATION_MS,
} from '../data/questions/index';
import { ProgressBar, EmptyState } from '../components/UI';
import QuestionImage from '../components/QuestionImage';
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
  getSubjectAvailability,
} from '../utils/api';

function formatTime(ms) {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function getTimerStorageKey(grade, section, studentNumber, studentName, subjectId) {
  return `vark-timer-${grade}-${section}-${studentNumber}-${studentName}-${subjectId}`;
}

export default function StudentTestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('info');
  const [grade, setGrade] = useState('');
  const [section, setSection] = useState('');
  const [studentName, setStudentName] = useState('');
  const [studentNumber, setStudentNumber] = useState('');
  const [subject, setSubject] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [grades, setGrades] = useState([]);
  const [sections, setSections] = useState([]);
  const [students, setStudents] = useState([]);
  const [rosterReady, setRosterReady] = useState(true);
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [timeLeft, setTimeLeft] = useState(TEST_DURATION_MS);
  const submittingRef = useRef(false);
  const answersRef = useRef([]);
  const selectedRef = useRef(null);

  const questions = subject ? getQuestionsForSubject(subject) : [];
  const question = questions[currentQ];
  const total = questions.length;
  const className = grade && section ? formatClassName(Number(grade), Number(section)) : '';

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

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

  const finishTest = useCallback(async (finalAnswers, { timedOut = false } = {}) => {
    if (submittingRef.current) return;

    if (!timedOut && finalAnswers.length !== total) {
      setError('يجب الإجابة على جميع الأسئلة قبل التسليم');
      return;
    }
    if (finalAnswers.length === 0) {
      setError('لم تُجب على أي سؤال');
      return;
    }

    submittingRef.current = true;
    setSaving(true);
    setError('');

    const answeredTotal = timedOut ? finalAnswers.length : total;
    const scores = calculateScores(finalAnswers);
    const percentages = getPercentages(scores, answeredTotal);
    const dominant = getDominantStyles(scores);

    try {
      const entry = await saveSubmission({
        studentName,
        className,
        studentNumber,
        subject,
        answers: finalAnswers,
        scores,
        percentages,
        dominantStyles: dominant,
        profileLabel: getProfileLabel(dominant),
        profileType: getProfileType(dominant),
        timedOut,
        answeredCount: finalAnswers.length,
      });
      sessionStorage.removeItem(getTimerStorageKey(grade, section, studentNumber, studentName, subject));
      navigate(`/result/${entry.id}`);
    } catch (err) {
      if (err.message?.includes('409') || err.message?.includes('مسبق')) {
        setError(err.message);
      } else {
        setError(err.message || 'فشل حفظ النتيجة');
      }
      submittingRef.current = false;
      setSaving(false);
    }
  }, [className, grade, navigate, section, studentName, studentNumber, subject, total]);

  const handleTimeout = useCallback(() => {
    if (submittingRef.current || saving) return;
    const finalAnswers = [...answersRef.current];
    if (selectedRef.current) finalAnswers.push(selectedRef.current);
    finishTest(finalAnswers, { timedOut: true });
  }, [finishTest, saving]);

  useEffect(() => {
    if (step !== 'quiz' || !subject) return undefined;

    const timerKey = getTimerStorageKey(grade, section, studentNumber, studentName, subject);
    let startAt = sessionStorage.getItem(timerKey);
    if (!startAt) {
      startAt = String(Date.now());
      sessionStorage.setItem(timerKey, startAt);
    }
    const endAt = parseInt(startAt, 10) + TEST_DURATION_MS;

    function tick() {
      const remaining = endAt - Date.now();
      setTimeLeft(Math.max(0, remaining));
      if (remaining <= 0) handleTimeout();
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [step, subject, grade, section, studentNumber, studentName, handleTimeout]);

  function handleStudentPick(nameAr) {
    const found = students.find((s) => s.nameAr === nameAr);
    setStudentName(nameAr);
    setStudentNumber(found?.studentNumber || '');
  }

  async function goToSubjects(e) {
    e.preventDefault();
    if (!grade || !section || !studentName) return;
    setLoadingSubjects(true);
    setError('');
    try {
      const list = await getSubjectAvailability(grade, section, studentNumber, studentName);
      setSubjects(list);
      setStep('subject');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSubjects(false);
    }
  }

  function handleSubjectPick(sub) {
    if (sub.status === 'open') {
      setSubject(sub.id);
      setCurrentQ(0);
      setAnswers([]);
      setSelected(null);
      setTimeLeft(TEST_DURATION_MS);
      submittingRef.current = false;
      setSaving(false);
      setError('');
      setStep('quiz');
      return;
    }
    if (sub.status === 'done' && sub.submissionId) {
      navigate(`/result/${sub.submissionId}`);
    }
  }

  async function nextQuestion() {
    if (!selected || saving || submittingRef.current) return;
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
    if (currentQ === 0 || saving) return;
    const prevAnswers = answers.slice(0, -1);
    setAnswers(prevAnswers);
    setSelected(prevAnswers[prevAnswers.length - 1] ?? null);
    setCurrentQ((q) => q - 1);
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
          message="لم تُرفع قائمة الأسماء بعد. تواصل مع إدارة التنظيم."
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
          <p className="muted">اختر الصف ثم الشعبة ثم اسمك — بعدها تختار المادة. مدة الاختبار 45 دقيقة.</p>
          <form onSubmit={goToSubjects} className="student-form">
            <label>
              الصف
              <select value={grade} onChange={(e) => setGrade(e.target.value)} required>
                <option value="">— اختر الصف —</option>
                {grades.map((g) => (
                  <option key={g} value={g}>{GRADE_LABELS[g] || `الصف ${g}`}</option>
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
            {error && <p className="error-msg">{error}</p>}
            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={!studentName || loadingSubjects}
            >
              {loadingSubjects ? 'جاري...' : 'اختيار المادة →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (step === 'subject') {
    return (
      <div className="page">
        <div className="card form-card">
          <h1>اختر المادة</h1>
          <p className="muted">
            {studentName} — {className}
          </p>
          <p className="muted quiz-time-note">⏱️ لديك 45 دقيقة لإكمال الاختبار بعد البدء</p>
          <div className="subject-pick-grid">
            {subjects.map((sub) => {
              const isOpen = sub.status === 'open';
              const isDone = sub.status === 'done';
              const isSoon = sub.status === 'soon';
              const msg = SUBJECT_STATUS_MESSAGES[sub.status];
              return (
                <button
                  key={sub.id}
                  type="button"
                  className={`subject-pick-card status-${sub.status}`}
                  onClick={() => handleSubjectPick(sub)}
                  disabled={sub.status === 'waiting' || sub.status === 'soon'}
                >
                  <span className="subject-pick-icon">{getSubjectIcon(sub.id)}</span>
                  <strong>{getSubjectName(sub.id)}</strong>
                  {isOpen && <span className="subject-pick-cta">ابدأ النشاط →</span>}
                  {isDone && <span className="subject-pick-done">✅ أنجزت — عرض النتيجة</span>}
                  {(sub.status === 'waiting' || isSoon) && (
                    <span className="subject-pick-wait">{msg}</span>
                  )}
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setStep('info')}
          >
            ← رجوع
          </button>
        </div>
      </div>
    );
  }

  const timerWarning = timeLeft <= 5 * 60 * 1000;

  return (
    <div className="page quiz-page">
      <div className={`quiz-timer ${timerWarning ? 'warning' : ''}`}>
        <span>⏱️ الوقت المتبقي: {formatTime(timeLeft)}</span>
        <span className="muted">من 45:00</span>
      </div>

      <ProgressBar current={currentQ + 1} total={total} />

      <div className="card quiz-card">
        <p className="quiz-student">
          {getSubjectIcon(subject)} <strong>{getSubjectName(subject)}</strong>
          {' · '}
          {studentName} — {className}
        </p>

        {question && (
          <>
            <QuestionImage scene={question.scene} questionId={question.id} />
            <h2 className="quiz-question">{question.text}</h2>
          </>
        )}

        {error && <p className="error-msg">{error}</p>}

        <div className="options-grid">
          {question?.options.map((opt, i) => (
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
