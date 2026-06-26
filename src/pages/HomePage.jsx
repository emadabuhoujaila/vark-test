import { useState } from 'react';
import { Link } from 'react-router-dom';
import { STYLE_LABELS } from '../data/varkQuestions';
import { verifyHomeGate, saveHomeAccess, canAccessHome } from '../utils/api';

function HomeGateForm({ onUnlock }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await verifyHomeGate(password);
      saveHomeAccess();
      onUnlock();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card form-card portal-card">
        <span className="portal-icon">🔒</span>
        <h1>الصفحة الرئيسية</h1>
        <p className="muted">الدخول محصور — أدخل كلمة مرور التنظيم</p>
        <form onSubmit={handleSubmit} className="student-form">
          <label>
            كلمة مرور التنظيم
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              dir="ltr"
              autoComplete="current-password"
            />
          </label>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
        <Link to="/teacher" className="back-link">← بوابة المعلم</Link>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [unlocked, setUnlocked] = useState(() => canAccessHome());
  const styles = Object.entries(STYLE_LABELS);

  if (!unlocked) {
    return <HomeGateForm onUnlock={() => setUnlocked(true)} />;
  }

  return (
    <div className="page home-page">
      <section className="hero card">
        <div className="hero-content">
          <span className="hero-tag">اختبار VARK — أنماط التعلم</span>
          <h1>منصة مدرسة واحدة — ثلاث بوابات</h1>
          <p>
            الطلاب يجرون الاختبار، المعلمون يتابعون شعبهم، والإدارة تنظّم القوائم والتحليل العام.
          </p>
        </div>
        <div className="hero-visual">
          <div className="style-grid">
            {styles.map(([key, s]) => (
              <div key={key} className="style-card" style={{ '--accent': s.color }}>
                <span className="style-card-icon">{s.icon}</span>
                <strong>{s.name}</strong>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="portals-grid">
        <Link to="/test" className="card portal-card student-portal">
          <span className="portal-icon">🎓</span>
          <h2>بوابة الطالب</h2>
          <p>اختبار VARK — اختر صفك وشعبتك واسمك ثم المادة</p>
          <span className="portal-cta">ابدأ الاختبار →</span>
        </Link>

        <Link to="/teacher" className="card portal-card teacher-portal">
          <span className="portal-icon">👨‍🏫</span>
          <h2>بوابة المعلم</h2>
          <p>تسجيل الدخول بالبريد وكلمة المرور — متابعة طلاب شعبك</p>
          <span className="portal-cta">دخول المعلم →</span>
        </Link>

        <Link to="/admin" className="card portal-card admin-portal-card">
          <span className="portal-icon">🏛️</span>
          <h2>صفحة التنظيم</h2>
          <p>رفع القوائم · تحليل المدرسة · سجل المعلمين</p>
          <span className="portal-cta">دخول الإدارة →</span>
        </Link>
      </section>
    </div>
  );
}
