import { Link, useLocation } from 'react-router-dom';

function getPortal(pathname) {
  if (pathname.startsWith('/admin')) return 'admin';
  if (pathname.startsWith('/teacher')) return 'teacher';
  if (pathname === '/test' || pathname.startsWith('/result')) return 'student';
  return 'home';
}

const PORTAL_META = {
  student: { home: '/test', subtitle: 'بوابة الطالب' },
  teacher: { home: '/teacher', subtitle: 'طالب · معلم' },
  admin: { home: '/admin', subtitle: 'طالب · معلم · تنظيم' },
  home: { home: '/', subtitle: 'طالب · معلم · تنظيم' },
};

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const portal = getPortal(pathname);
  const meta = PORTAL_META[portal];

  const showStudent = portal === 'teacher' || portal === 'admin' || portal === 'home';
  const showTeacher = portal === 'teacher' || portal === 'admin' || portal === 'home';
  const showAdmin = portal === 'admin' || portal === 'home';

  return (
    <div className={`app portal-${portal}`}>
      <header className="header">
        <div className="header-inner">
          <Link to={meta.home} className="brand">
            <span className="brand-icon">🧬</span>
            <div>
              <strong>اختبار VARK</strong>
              <small>{meta.subtitle}</small>
            </div>
          </Link>
          {(showStudent || showTeacher || showAdmin) && (
            <nav className="nav">
              {showStudent && (
                <Link to="/test" className={pathname === '/test' || pathname.startsWith('/result') ? 'active' : ''}>
                  الطالب
                </Link>
              )}
              {showTeacher && (
                <Link to="/teacher" className={pathname.startsWith('/teacher') ? 'active' : ''}>
                  المعلم
                </Link>
              )}
              {showAdmin && (
                <Link to="/admin" className={pathname.startsWith('/admin') ? 'active' : ''}>
                  التنظيم
                </Link>
              )}
            </nav>
          )}
        </div>
      </header>
      <main className="main">{children}</main>
      <footer className="footer">
        <p>منصة أنماط التعلم VARK — للاستخدام التعليمي</p>
      </footer>
    </div>
  );
}
