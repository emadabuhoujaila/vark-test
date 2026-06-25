import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const isTeacher = pathname.startsWith('/teacher');

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-icon">🧬</span>
            <div>
              <strong>اختبار VARK</strong>
              <small>أنماط التعلم — الصف السابع · علوم</small>
            </div>
          </Link>
          <nav className="nav">
            <Link to="/test" className={pathname === '/test' ? 'active' : ''}>
              اختبار الطالب
            </Link>
            <Link to="/teacher" className={isTeacher ? 'active' : ''}>
              لوحة المعلم
            </Link>
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p>أداة لتحديد أنماط التعلم (بصري · سمعي · قرائي · حركي) — للاستخدام التعليمي</p>
      </footer>
    </div>
  );
}
