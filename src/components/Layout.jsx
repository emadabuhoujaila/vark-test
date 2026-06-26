import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="brand">
            <span className="brand-icon">🧬</span>
            <div>
              <strong>تقييم VARK</strong>
              <small>طالب · معلم</small>
            </div>
          </Link>
          <nav className="nav">
            <Link to="/test" className={pathname === '/test' ? 'active' : ''}>الطالب</Link>
            <Link to="/teacher" className={pathname.startsWith('/teacher') ? 'active' : ''}>المعلم</Link>
          </nav>
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p>تقييم أنماط التعلم VARK — للاستخدام التعليمي</p>
      </footer>
    </div>
  );
}
