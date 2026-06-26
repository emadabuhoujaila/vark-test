import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { adminLogin, saveAdminToken } from '../../utils/api';

export default function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await adminLogin({ email, password });
      saveAdminToken(data.token);
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card form-card portal-card admin-portal">
        <span className="portal-icon">🏛️</span>
        <h1>صفحة التنظيم</h1>
        <p className="muted">دخول الإدارة — رفع القوائم والتحليل العام</p>
        <form onSubmit={handleSubmit} className="student-form">
          <label>
            البريد الإلكتروني
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required dir="ltr" />
          </label>
          <label>
            كلمة المرور
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required dir="ltr" />
          </label>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'جاري...' : 'دخول'}
          </button>
        </form>
        <Link to="/" className="back-link">← الرئيسية</Link>
      </div>
    </div>
  );
}
