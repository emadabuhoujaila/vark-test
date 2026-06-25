import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { VARK_QUESTIONS } from '../data/varkQuestions';
import { ProgressBar } from '../components/UI';
import {
  calculateScores,
  getPercentages,
  getDominantStyles,
  getProfileLabel,
  getProfileType,
} from '../utils/varkScoring';
import { saveSubmission } from '../utils/api';

export default function StudentTestPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('info');
  const [studentName, setStudentName] = useState('');
  const [className, setClassName] = useState('الصف السابع');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const question = VARK_QUESTIONS[currentQ];
  const total = VARK_QUESTIONS.length;

  function startTest(e) {
    e.preventDefault();
    if (!studentName.trim()) return;
    setStep('quiz');
  }

  function selectOption(style) {
    setSelected(style);
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
        studentName: studentName.trim(),
        className: className.trim(),
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

  if (step === 'info') {
    return (
      <div className="page">
        <div className="card form-card">
          <h1>قبل البدء</h1>
          <p className="muted">أدخل اسمك ثم ابدأ الإجابة على 16 سؤالًا. اختر ما يناسبك فعلًا.</p>
          <form onSubmit={startTest} className="student-form">
            <label>
              الاسم الكامل
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="مثال: أحمد محمد"
                required
                autoFocus
              />
            </label>
            <label>
              الصف / الشعبة
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="الصف السابع - أ"
              />
            </label>
            <button type="submit" className="btn btn-primary btn-lg">
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
        <p className="quiz-student">الطالب: <strong>{studentName}</strong></p>
        <h2 className="quiz-question">{question.text}</h2>

        {error && <p className="error-msg">{error}</p>}

        <div className="options-grid">
          {question.options.map((opt, i) => (
            <button
              key={i}
              type="button"
              className={`option-btn ${selected === opt.style ? 'selected' : ''}`}
              onClick={() => selectOption(opt.style)}
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
