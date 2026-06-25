import { Link } from 'react-router-dom';
import { STYLE_LABELS } from '../data/varkQuestions';

export default function HomePage() {
  const styles = Object.entries(STYLE_LABELS);

  return (
    <div className="page home-page">
      <section className="hero card">
        <div className="hero-content">
          <span className="hero-tag">مادة العلوم — الصف السابع</span>
          <h1>اكتشف نمط تعلّمك مع اختبار VARK</h1>
          <p>
            يساعدك هذا الاختبار (16 سؤالًا) على معرفة الطريقة التي تتعلّم بها أفضل:
            بصري، سمعي، قرائي/كتابي، أو حركي/عملي. النتائج تُحفظ تلقائيًا
            ليتمكن معلمك من تحليلها وتوجيهك.
          </p>
          <div className="hero-actions">
            <Link to="/test" className="btn btn-primary btn-lg">
              ابدأ الاختبار
            </Link>
            <Link to="/teacher" className="btn btn-secondary btn-lg">
              دخول المعلم
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="style-grid">
            {styles.map(([key, s]) => (
              <div key={key} className="style-card" style={{ '--accent': s.color }}>
                <span className="style-card-icon">{s.icon}</span>
                <strong>{s.name}</strong>
                <small>({key})</small>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="info-grid">
        <div className="card info-card">
          <h3>📋 للطلاب</h3>
          <ul>
            <li>أجب بصدق — لا توجد إجابات صحيحة أو خاطئة</li>
            <li>اختر الصف ثم الشعبة ثم اسمك من قائمة المدرسة</li>
            <li>سترى نتيجتك فور الانتهاء مع نصائح مخصصة</li>
          </ul>
        </div>
        <div className="card info-card">
          <h3>👨‍🏫 للمعلم</h3>
          <ul>
            <li>يدخل المعلم → يختار المادة والصف والشعبة → تظهر أسماء الطلاب</li>
            <li>تحليل VARK لطلاب الشعبة المختارة</li>
            <li>تحليل فردي لكل طالب مع توصيات تعليمية</li>
            <li>جدول تصنيف تلقائي حسب النمط السائد</li>
            <li>النتائج تُحفظ في قاعدة بيانات مركزية لجميع الطلاب</li>
            <li>تصدير النتائج إلى ملف CSV</li>
          </ul>
        </div>
      </section>
    </div>
  );
}
