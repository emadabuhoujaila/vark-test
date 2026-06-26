import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherLogin, teacherRegister, saveTeacherToken, getTeacherMe } from '../../utils/api';

export default function TeacherAuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = mode === 'login'
        ? await teacherLogin({ email, password })
        : await teacherRegister({ email, password, fullName });
      saveTeacherToken(data.token);
      const me = await getTeacherMe();
      navigate(me.assignments?.length ? '/teacher/home' : '/teacher/setup');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card form-card portal-card">
        <span className="portal-icon">👨‍🏫</span>
        <h1>بوابة المعلم</h1>
        <p className="muted">تسجيل الدخول أو إنشاء حساب معلم جديد</p>

        <div className="mode-toggle">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => setMode('login')}>
            دخول
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => setMode('register')}>
            تسجيل معلم جديد
          </button>
        </div>

        <form onSubmit={handleSubmit} className="student-form">
          {mode === 'register' && (
            <label>
              الاسم
              <input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="اسم المعلم" />
            </label>
          )}
          <label>
            البريد الإلكتروني
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
          </label>
          <label>
            كلمة المرور
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} dir="ltr" />
          </label>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'جاري...' : mode === 'login' ? 'دخول' : 'تسجيل ومتابعة'}
          </button>
        </form>
        <Link to="/" className="back-link">← الرئيسية</Link>
      </div>
    </div>
  );
}
