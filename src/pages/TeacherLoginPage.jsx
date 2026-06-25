import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyTeacherPin, DEFAULT_TEACHER_PIN } from '../utils/api';

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
      const valid = await verifyTeacherPin(pin);
      if (valid) {
        sessionStorage.setItem('vark-teacher-auth', '1');
        navigate('/teacher/dashboard');
      } else {
        setError('رمز الدخول غير صحيح');
      }
    } catch (err) {
      setError(err.message || 'تعذّر الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card form-card teacher-login">
        <h1>لوحة المعلم</h1>
        <p className="muted">
          أدخل رمز الدخول للوصول إلى التحليلات وجدول تصنيف الطلاب.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            رمز الدخول
            <input
              type="password"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setError(''); }}
              placeholder="••••••••"
              autoFocus
              disabled={loading}
            />
          </label>
          {error && <p className="error-msg">{error}</p>}
          <button type="submit" className="btn btn-primary btn-lg" disabled={loading}>
            {loading ? 'جاري التحقق...' : 'دخول'}
          </button>
        </form>
        <p className="hint">
          الرمز الافتراضي: <code>{DEFAULT_TEACHER_PIN}</code> — يمكنك تغييره من لوحة التحكم.
        </p>
      </div>
    </div>
  );
}
