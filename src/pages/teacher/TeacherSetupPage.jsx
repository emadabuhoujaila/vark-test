import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { SUBJECTS } from '../../data/subjects';
import { GRADE_LABELS } from '../../data/grades';
import {
  getTeacherMe,
  saveTeacherAssignments,
  getRosterGrades,
  getRosterSections,
  isTeacherLoggedIn,
} from '../../utils/api';

export default function TeacherSetupPage() {
  const navigate = useNavigate();
  const [grades, setGrades] = useState([]);
  const [sectionsMap, setSectionsMap] = useState({});
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isTeacherLoggedIn()) {
      navigate('/teacher');
      return;
    }
    Promise.all([getTeacherMe(), getRosterGrades()])
      .then(async ([me, g]) => {
        setGrades(g);
        setSelected(me.assignments || []);
        if (me.assignments?.length) {
          navigate('/teacher/home');
        }
        const map = {};
        for (const grade of g) {
          map[grade] = await getRosterSections(grade);
        }
        setSectionsMap(map);
      })
      .catch(() => setError('فشل تحميل البيانات'))
      .finally(() => setLoading(false));
  }, [navigate]);

  function toggle(subject, grade, section) {
    const key = `${subject}-${grade}-${section}`;
    setSelected((prev) => {
      const exists = prev.some((a) => `${a.subject}-${a.grade}-${a.section}` === key);
      if (exists) return prev.filter((a) => `${a.subject}-${a.grade}-${a.section}` !== key);
      return [...prev, { subject, grade, section }];
    });
  }

  function isSelected(subject, grade, section) {
    return selected.some((a) => a.subject === subject && a.grade === grade && a.section === section);
  }

  async function handleSave() {
    if (!selected.length) {
      setError('اختر مادة وصف وشعبة واحدة على الأقل');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await saveTeacherAssignments(selected);
      navigate('/teacher/home');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page"><div className="loading-state">جاري التحميل...</div></div>;

  if (!grades.length) {
    return (
      <div className="page">
        <div className="card form-card">
          <p className="error-msg">لم تُرفع قوائم الطلاب بعد. تواصل مع إدارة التنظيم.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page setup-page">
      <div className="card">
        <h1>⚙️ تحديد صفوفك وشعبك</h1>
        <p className="muted">اختر المواد والصفوف والشعب التي تدرّسها (يمكن اختيار أكثر من واحد)</p>

        {SUBJECTS.map((sub) => (
          <div key={sub.id} className="setup-subject-block">
            <h3>{sub.icon} {sub.name}</h3>
            <div className="setup-grid">
              {grades.map((g) => (
                <div key={g} className="setup-grade-box">
                  <strong>{GRADE_LABELS[g]}</strong>
                  <div className="section-checks">
                    {(sectionsMap[g] || []).map((sec) => (
                      <label key={sec} className="check-chip">
                        <input
                          type="checkbox"
                          checked={isSelected(sub.id, g, sec)}
                          onChange={() => toggle(sub.id, g, sec)}
                        />
                        ش{sec}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {error && <p className="error-msg">{error}</p>}
        <p className="muted">المختار: {selected.length} حصة</p>
        <button type="button" className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
          {saving ? 'جاري الحفظ...' : 'حفظ والمتابعة →'}
        </button>
      </div>
    </div>
  );
}
