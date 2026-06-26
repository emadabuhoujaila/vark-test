import { Link } from 'react-router-dom';
import { STYLE_LABELS } from '../data/varkQuestions';

export default function HomePage() {
  const styles = Object.entries(STYLE_LABELS);

  return (
    <div className="page home-page">
      <section className="hero card">
        <div className="hero-content">
          <span className="hero-tag">تقييم أنماط التعلم VARK</span>
          <h1>تعرّف على أسلوب تعلّمك</h1>
          <p>
            نشاط تفاعلي من {15} سؤالاً — للطلاب. المعلم يتابع النتائج ويصدّر تحليل كل شعبة.
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

      <section className="portals-grid two-col">
        <Link to="/test" className="card portal-card student-portal">
          <span className="portal-icon">🎓</span>
          <h2>بوابة الطالب</h2>
          <p>ابدأ تقييم أنماط التعلم — 15 سؤالاً</p>
          <span className="portal-cta">ابدأ التقييم →</span>
        </Link>

        <Link to="/teacher" className="card portal-card teacher-portal">
          <span className="portal-icon">👨‍🏫</span>
          <h2>بوابة المعلم</h2>
          <p>متابعة الطلاب · رفع القوائم · تصدير التحليل</p>
          <span className="portal-cta">دخول المعلم →</span>
        </Link>
      </section>
    </div>
  );
}
