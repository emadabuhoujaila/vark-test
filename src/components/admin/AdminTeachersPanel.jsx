import { useState } from 'react';
import { SUBJECTS, getSubjectName } from '../../data/subjects';
import { GRADE_LABELS } from '../../data/grades';
import {
  adminCreateTeacher,
  adminUpdateTeacher,
  adminResetTeacherPassword,
  adminDeleteTeacher,
  getRosterGrades,
  getRosterSections,
} from '../../utils/api';

function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 8; i += 1) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

export default function AdminTeachersPanel({ teachers, onRefresh }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editTeacher, setEditTeacher] = useState(null);
  const [passwordTeacher, setPasswordTeacher] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [passwordResult, setPasswordResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [grades, setGrades] = useState([]);
  const [sectionsMap, setSectionsMap] = useState({});

  const [form, setForm] = useState({
    email: '',
    password: '',
    fullName: '',
    assignments: [],
  });

  async function loadRosterMeta() {
    const g = await getRosterGrades();
    setGrades(g);
    const map = {};
    for (const grade of g) {
      map[grade] = await getRosterSections(grade);
    }
    setSectionsMap(map);
  }

  async function openAdd() {
    setError('');
    setForm({ email: '', password: generatePassword(), fullName: '', assignments: [] });
    setShowAdd(true);
    if (!grades.length) await loadRosterMeta();
  }

  async function openEdit(t) {
    setError('');
    setEditTeacher(t);
    setForm({
      email: t.email,
      password: '',
      fullName: t.fullName,
      assignments: [...t.assignments],
    });
    if (!grades.length) await loadRosterMeta();
  }

  function toggleAssignment(subject, grade, section) {
    const key = `${subject}-${grade}-${section}`;
    setForm((prev) => {
      const exists = prev.assignments.some(
        (a) => `${a.subject}-${a.grade}-${a.section}` === key
      );
      if (exists) {
        return {
          ...prev,
          assignments: prev.assignments.filter(
            (a) => `${a.subject}-${a.grade}-${a.section}` !== key
          ),
        };
      }
      return { ...prev, assignments: [...prev.assignments, { subject, grade, section }] };
    });
  }

  function isSelected(subject, grade, section) {
    return form.assignments.some(
      (a) => a.subject === subject && a.grade === grade && a.section === section
    );
  }

  async function handleAdd(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const r = await adminCreateTeacher(form);
      setPasswordResult(`تم إنشاء المعلم. كلمة المرور: ${r.password}`);
      setShowAdd(false);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEdit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await adminUpdateTeacher(editTeacher.id, {
        email: form.email,
        fullName: form.fullName,
        assignments: form.assignments,
      });
      setEditTeacher(null);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const pwd = newPassword || generatePassword();
      const r = await adminResetTeacherPassword(passwordTeacher.id, pwd);
      setPasswordResult(`كلمة المرور الجديدة لـ ${passwordTeacher.email}: ${r.password}`);
      setPasswordTeacher(null);
      setNewPassword('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(t) {
    if (!window.confirm(`حذف المعلم ${t.fullName || t.email}؟ لا يمكن التراجع.`)) return;
    setLoading(true);
    try {
      await adminDeleteTeacher(t.id);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function AssignmentPicker() {
    if (!grades.length) return <p className="muted">ارفع قوائم الطلاب أولاً لاختيار الشعب</p>;
    return SUBJECTS.map((sub) => (
      <div key={sub.id} className="setup-subject-block">
        <h4>{sub.icon} {sub.name}</h4>
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
                      onChange={() => toggleAssignment(sub.id, g, sec)}
                    />
                    ش{sec}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    ));
  }

  return (
    <div className="admin-teachers-panel">
      <div className="panel-top">
        <div>
          <h3>👨‍🏫 إدارة المعلمين ({teachers.length})</h3>
          <p className="muted">
            إضافة · تعديل · حذف · تعيين كلمة مرور جديدة
            (لا يمكن عرض كلمة المرور الحالية لأسباب أمنية)
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openAdd}>+ إضافة معلم</button>
      </div>

      {passwordResult && (
        <div className="success-box password-reveal">
          <p>{passwordResult}</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setPasswordResult('')}>
            إغلاق
          </button>
        </div>
      )}

      {error && <p className="error-msg">{error}</p>}

      <div className="card table-card">
        <div className="table-wrap">
          <table className="results-table">
            <thead>
              <tr>
                <th>الاسم</th>
                <th>البريد</th>
                <th>الحصص</th>
                <th>تاريخ التسجيل</th>
                <th>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {teachers.map((t) => (
                <tr key={t.id}>
                  <td>{t.fullName || '—'}</td>
                  <td dir="ltr">{t.email}</td>
                  <td>
                    {t.assignments.map((a) => (
                      <span key={`${a.subject}-${a.grade}-${a.section}`} className="class-pill">
                        {getSubjectName(a.subject)} {GRADE_LABELS[a.grade]}-{a.section}
                      </span>
                    ))}
                    {!t.assignments.length && <span className="muted">لم يحدد</span>}
                  </td>
                  <td>{new Date(t.createdAt).toLocaleDateString('ar-SA')}</td>
                  <td className="actions-cell">
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEdit(t)}>
                      تعديل
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setPasswordTeacher(t);
                        setNewPassword(generatePassword());
                        setError('');
                      }}
                    >
                      كلمة مرور
                    </button>
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => handleDelete(t)}>
                      حذف
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={() => setShowAdd(false)} role="presentation">
          <div className="modal-card admin-form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>➕ إضافة معلم جديد</h3>
            <form onSubmit={handleAdd} className="student-form">
              <label>
                الاسم
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>
              <label>
                البريد
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
              </label>
              <label>
                كلمة المرور
                <div className="input-with-btn">
                  <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} dir="ltr" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setForm({ ...form, password: generatePassword() })}>
                    توليد
                  </button>
                </div>
              </label>
              <AssignmentPicker />
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAdd(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editTeacher && (
        <div className="modal-overlay" onClick={() => setEditTeacher(null)} role="presentation">
          <div className="modal-card admin-form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>✏️ تعديل المعلم</h3>
            <form onSubmit={handleEdit} className="student-form">
              <label>
                الاسم
                <input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
              </label>
              <label>
                البريد
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required dir="ltr" />
              </label>
              <AssignmentPicker />
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setEditTeacher(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>حفظ</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {passwordTeacher && (
        <div className="modal-overlay" onClick={() => setPasswordTeacher(null)} role="presentation">
          <div className="modal-card admin-form-modal" onClick={(e) => e.stopPropagation()}>
            <h3>🔑 تعيين كلمة مرور جديدة</h3>
            <p className="muted">{passwordTeacher.email}</p>
            <p className="warn-box">لا يمكن عرض كلمة المرور القديمة — يمكنك تعيين كلمة جديدة فقط</p>
            <form onSubmit={handleResetPassword} className="student-form">
              <label>
                كلمة المرور الجديدة
                <div className="input-with-btn">
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} dir="ltr" />
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setNewPassword(generatePassword())}>
                    توليد
                  </button>
                </div>
              </label>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setPasswordTeacher(null)}>إلغاء</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>تعيين</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
