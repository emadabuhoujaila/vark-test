import { Link } from 'react-router-dom';
import { STYLE_LABELS } from '../data/varkQuestions';

export default function HomePage() {
  const styles = Object.entries(STYLE_LABELS);

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
          <p>اختبار VARK — اختر صفك وشعبتك واسمك</p>
          <span className="portal-cta">ابدأ الاختبار →</span>
        </Link>

        <Link to="/teacher" className="card portal-card teacher-portal">
          <span className="portal-icon">👨‍🏫</span>
          <h2>بوابة المعلم</h2>
          <p>تسجيل دخول أو حساب جديد — متابعة طلاب شعبك</p>
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
