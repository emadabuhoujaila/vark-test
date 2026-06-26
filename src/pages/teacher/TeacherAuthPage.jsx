import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherLogin, teacherForgotPassword, saveTeacherToken } from '../../utils/api';

export default function TeacherAuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const data = await teacherLogin({ email, password });
      saveTeacherToken(data.token);
      navigate('/teacher/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const r = await teacherForgotPassword(forgotEmail);
      setSuccess(r.message);
      setShowForgot(false);
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
        <p className="muted">تسجيل الدخول بالبريد وكلمة المرور — يُنشئ حسابك التنظيم</p>

        {!showForgot ? (
          <>
            <form onSubmit={handleSubmit} className="student-form">
              <label>
                البريد الإلكتروني
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
              </label>
              <label>
                كلمة المرور
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} dir="ltr" />
              </label>
              {error && <p className="error-msg">{error}</p>}
              {success && <p className="success-msg">{success}</p>}
              <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
                {loading ? 'جاري...' : 'دخول'}
              </button>
            </form>
            <button type="button" className="link-btn forgot-link" onClick={() => { setShowForgot(true); setError(''); setForgotEmail(email); }}>
              نسيت كلمة المرور؟
            </button>
          </>
        ) : (
          <form onSubmit={handleForgot} className="student-form">
            <p className="muted">سنرسل طلبًا إلى التنظيم لاستعادة كلمة المرور</p>
            <label>
              البريد الإلكتروني
              <input type="email" value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} required dir="ltr" />
            </label>
            {error && <p className="error-msg">{error}</p>}
            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowForgot(false)}>رجوع</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'جاري الإرسال...' : 'إرسال الطلب'}
              </button>
            </div>
          </form>
        )}

        <Link to="/teacher" className="back-link">← بوابة المعلم</Link>
      </div>
    </div>
  );
}
