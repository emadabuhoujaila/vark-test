import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getAdminOverview,
  adminUploadRoster,
  adminDeleteSubmission,
  clearAdminAuth,
  isAdminLoggedIn,
} from '../../utils/api';
import AdminTeachersPanel from '../../components/admin/AdminTeachersPanel';
import AdminSubjectMatrix from '../../components/admin/AdminSubjectMatrix';
import AdminMessagesPanel from '../../components/admin/AdminMessagesPanel';
import { GRADE_LABELS } from '../../data/grades';
import { getSubjectName } from '../../data/subjects';
import { analyzeClassResults } from '../../utils/varkScoring';
import { StatCard, ScoreBars } from '../../components/UI';
import { STYLE_LABELS } from '../../data/varkQuestions';

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const [deleteError, setDeleteError] = useState('');

  function refresh() {
    setLoading(true);
    getAdminOverview()
      .then(setData)
      .catch(() => navigate('/admin'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isAdminLoggedIn()) {
      navigate('/admin');
      return;
    }
    refresh();
  }, [navigate]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadError('');
    setUploadMsg('');
    try {
      const r = await adminUploadRoster(uploadFile);
      setUploadMsg(r.message);
      setUploadFile(null);
      setFileKey((k) => k + 1);
      refresh();
    } catch (err) {
      setUploadError(err.message);
    }
  }

  function logout() {
    clearAdminAuth();
    navigate('/admin');
  }

  async function handleDeleteSubmission(id, name) {
    if (!window.confirm(`حذف نتيجة ${name}؟`)) return;
    setDeleteError('');
    try {
      await adminDeleteSubmission(id);
      refresh();
    } catch (err) {
      setDeleteError(err.message);
    }
  }

  if (loading || !data) {
    return <div className="page"><div className="loading-state">جاري التحميل...</div></div>;
  }

  const schoolAnalysis = analyzeClassResults(data.submissions);

  return (
    <div className="page dashboard-page">
      <div className="dashboard-top">
        <div>
          <h1>🏛️ صفحة التنظيم</h1>
          <p className="muted">
            {data.roster.totalStudents} طالب · {data.totalTeachers} معلم · {data.totalSubmissions} نتيجة اختبار
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={logout}>خروج</button>
      </div>

      <div className="tabs">
        <button type="button" className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>تحليل عام</button>
        <button type="button" className={tab === 'classes' ? 'active' : ''} onClick={() => setTab('classes')}>الصفوف والشعب</button>
        <button type="button" className={tab === 'teachers' ? 'active' : ''} onClick={() => setTab('teachers')}>المعلمون</button>
        <button type="button" className={tab === 'messages' ? 'active' : ''} onClick={() => setTab('messages')}>✉️ المراسلات</button>
        <button type="button" className={tab === 'results' ? 'active' : ''} onClick={() => setTab('results')}>نتائج الاختبار</button>
        <button type="button" className={tab === 'subjects' ? 'active' : ''} onClick={() => setTab('subjects')}>المواد</button>
        <button type="button" className={tab === 'roster' ? 'active' : ''} onClick={() => setTab('roster')}>رفع القوائم</button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="stats-row">
            <StatCard title="👥 الطلاب" value={data.roster.totalStudents} />
            <StatCard title="👨‍🏫 المعلمون" value={data.totalTeachers} />
            <StatCard title="📋 نتائج VARK" value={data.totalSubmissions} />
          </div>
          {data.totalSubmissions > 0 && (
            <div className="card">
              <h3>📊 تحليل عام للمدرسة — اختبار VARK</h3>
              <p>النمط الأغلب: <strong>{STYLE_LABELS[schoolAnalysis.dominantClassStyle]?.name}</strong></p>
              <ScoreBars scores={schoolAnalysis.averageScores} percentages={schoolAnalysis.averagePercentages} />
            </div>
          )}
        </>
      )}

      {tab === 'classes' && (
        <div className="card">
          <h3>📚 الصفوف والشعب</h3>
          {data.summary.grades.map((g) => (
            <div key={g.grade} className="admin-grade-block">
              <h4>{GRADE_LABELS[g.grade]} — {g.total} طالب</h4>
              <div className="section-pills">
                {g.sections.map(({ section, count }) => (
                  <span key={section} className="class-pill">ش{section}: {count}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'teachers' && (
        <AdminTeachersPanel teachers={data.teachers} onRefresh={refresh} />
      )}

      {tab === 'messages' && (
        <div className="card">
          <h3>✉️ مراسلة المعلمين</h3>
          <p className="muted">الوارد · الصادر · الرد · حذف من عند التنظيم والمعلم</p>
          <AdminMessagesPanel teachers={data.teachers} />
        </div>
      )}

      {tab === 'results' && (
        <div className="card table-card">
          <h3>📋 نتائج VARK ({data.submissions.length})</h3>
          {deleteError && <p className="error-msg">{deleteError}</p>}
          <div className="table-wrap">
            <table className="results-table">
              <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>الصف</th>
                    <th>المادة</th>
                    <th>النمط</th>
                  <th>التاريخ</th>
                  <th>حذف</th>
                </tr>
              </thead>
              <tbody>
                {data.submissions.map((s) => (
                  <tr key={s.id}>
                    <td><strong>{s.studentName}</strong></td>
                    <td>{s.className}</td>
                    <td>{getSubjectName(s.subject || 'science')}</td>
                    <td>{s.profileLabel}</td>
                    <td>{new Date(s.submittedAt).toLocaleString('ar-SA')}</td>
                    <td>
                      <button
                        type="button"
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteSubmission(s.id, s.studentName)}
                      >
                        حذف
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'subjects' && (
        <div className="card">
          <h3>📖 حالة المواد — حسب الصف والشعبة</h3>
          <p className="muted subject-matrix-legend">
            <span className="legend-sample registered">مسجّل</span>
            معلم مسجّل للمادة في هذه الشعبة ·
            <span className="legend-sample unregistered">غير مسجّل</span>
            لا يوجد معلم بعد
          </p>
          <AdminSubjectMatrix matrix={data.subjectMatrix} />
        </div>
      )}

      {tab === 'roster' && (
        <div className="card form-card">
          <h3>⬆️ رفع / تحديث قوائم الطلاب</h3>
          <p className="muted">ملف Excel — سجل الأسماء.xlsx</p>
          {data.roster.totalStudents > 0 && (
            <div className="success-box">
              <p><strong>{data.roster.totalStudents}</strong> اسم مسجل</p>
              {data.roster.uploadedAt && (
                <p className="muted">آخر تحديث: {new Date(data.roster.uploadedAt).toLocaleString('ar-SA')}</p>
              )}
            </div>
          )}
          <form onSubmit={handleUpload} className="student-form">
            <label>
              ملف Excel
              <input key={fileKey} type="file" accept=".xlsx" onChange={(e) => setUploadFile(e.target.files?.[0])} />
            </label>
            {uploadError && <p className="error-msg">{uploadError}</p>}
            {uploadMsg && <p className="success-msg">{uploadMsg}</p>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={!uploadFile}>
              {data.roster.totalStudents ? 'تحديث القوائم' : 'رفع القوائم'}
            </button>
          </form>
        </div>
      )}

      <Link to="/" className="back-link">← الرئيسية</Link>
    </div>
  );
}
