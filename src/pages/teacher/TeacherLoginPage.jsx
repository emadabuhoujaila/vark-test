import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { teacherLogin, saveTeacherToken } from '../../utils/api';

export default function TeacherLoginPage() {
  const navigate = useNavigate();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const data = await teacherLogin(pin);
      saveTeacherToken(data.token);
      navigate('/teacher/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card form-card portal-card teacher-portal">
        <span className="portal-icon">👨‍🏫</span>
        <h1>دخول المعلم</h1>
        <p className="muted">أدخل كلمة السر للوصول إلى لوحة التحكم</p>
        <form onSubmit={handleSubmit} className="student-form">
          <label>
            كلمة السر
            <input
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              dir="ltr"
              autoComplete="off"
            />
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
