import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GRADE_LABELS } from '../../data/grades';
import {
  getTeacherDashboard,
  getTeacherOverview,
  teacherUploadRoster,
  downloadSectionExport,
  deleteSubmission,
  clearTeacherAuth,
  isTeacherLoggedIn,
} from '../../utils/api';
import { analyzeClassResults } from '../../utils/varkScoring';
import { StatCard, ScoreBars } from '../../components/UI';
import { STYLE_LABELS } from '../../data/varkQuestions';
import SectionAnalysisPanel from '../../components/SectionAnalysisPanel';
import StudentAnalysisModal from '../../components/StudentAnalysisModal';

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [overview, setOverview] = useState(null);
  const [tab, setTab] = useState('sections');
  const [activeGroup, setActiveGroup] = useState(0);
  const [view, setView] = useState('students');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');
  const [fileKey, setFileKey] = useState(0);
  const [exportError, setExportError] = useState('');

  function refresh() {
    setLoading(true);
    Promise.all([getTeacherDashboard(), getTeacherOverview()])
      .then(([dash, ov]) => {
        setGroups(dash.groups || []);
        setOverview(ov);
      })
      .catch(() => navigate('/teacher'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (!isTeacherLoggedIn()) {
      navigate('/teacher');
      return;
    }
    refresh();
  }, [navigate]);

  function logout() {
    clearTeacherAuth();
    navigate('/teacher');
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploadError('');
    setUploadMsg('');
    try {
      const r = await teacherUploadRoster(uploadFile);
      setUploadMsg(r.message);
      setUploadFile(null);
      setFileKey((k) => k + 1);
      refresh();
    } catch (err) {
      setUploadError(err.message);
    }
  }

  async function handleExport() {
    const g = groups[activeGroup];
    if (!g) return;
    setExportError('');
    try {
      await downloadSectionExport(g.grade, g.section);
    } catch (err) {
      setExportError(err.message);
    }
  }

  async function handleDeleteSubmission(id) {
    if (!window.confirm('حذف هذه النتيجة؟')) return;
    try {
      await deleteSubmission(id);
      refresh();
    } catch (err) {
      setExportError(err.message);
    }
  }

  if (loading || !overview) {
    return <div className="page"><div className="loading-state">جاري التحميل...</div></div>;
  }

  const g = groups[activeGroup];
  const schoolAnalysis = analyzeClassResults(overview.submissions);
  const totalStudents = overview.roster.totalStudents;

  return (
    <div className="page dashboard-page">
      <div className="dashboard-top">
        <div>
          <h1>👨‍🏫 لوحة المعلم</h1>
          <p className="muted">
            {totalStudents} طالب · {overview.totalSubmissions} نتيجة · {groups.length} شعبة
          </p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={logout}>خروج</button>
      </div>

      <div className="tabs">
        <button type="button" className={tab === 'sections' ? 'active' : ''} onClick={() => setTab('sections')}>الشعب</button>
        <button type="button" className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>تحليل عام</button>
        <button type="button" className={tab === 'roster' ? 'active' : ''} onClick={() => setTab('roster')}>رفع القوائم</button>
      </div>

      {tab === 'overview' && (
        <>
          <div className="stats-row">
            <StatCard title="👥 الطلاب" value={totalStudents} />
            <StatCard title="📋 النتائج" value={overview.totalSubmissions} />
            {overview.totalSubmissions > 0 && (
              <StatCard title="النمط الأغلب" value={STYLE_LABELS[schoolAnalysis.dominantClassStyle]?.name} />
            )}
          </div>
          {overview.totalSubmissions > 0 && (
            <div className="card">
              <h3>📊 تحليل عام — VARK</h3>
              <ScoreBars scores={schoolAnalysis.averageScores} percentages={schoolAnalysis.averagePercentages} />
            </div>
          )}
        </>
      )}

      {tab === 'roster' && (
        <div className="card form-card">
          <h3>⬆️ رفع / تحديث قوائم الطلاب</h3>
          <p className="muted">ملف Excel — سجل الأسماء.xlsx</p>
          {overview.roster.totalStudents > 0 && (
            <div className="success-box">
              <p><strong>{overview.roster.totalStudents}</strong> اسم مسجل</p>
              {overview.roster.uploadedAt && (
                <p className="muted">آخر تحديث: {new Date(overview.roster.uploadedAt).toLocaleString('ar-SA')}</p>
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
              {overview.roster.totalStudents ? 'تحديث القوائم' : 'رفع القوائم'}
            </button>
          </form>
        </div>
      )}

      {tab === 'sections' && (
        <>
          {!groups.length ? (
            <div className="empty-state">
              <p>لا توجد قوائم طلاب. ارفع ملف Excel من تبويب «رفع القوائم».</p>
            </div>
          ) : (
            <>
              <div className="group-tabs">
                {groups.map((gr, i) => (
                  <button
                    key={`${gr.grade}-${gr.section}`}
                    type="button"
                    className={activeGroup === i ? 'active' : ''}
                    onClick={() => { setActiveGroup(i); setSelectedStudent(null); }}
                  >
                    {GRADE_LABELS[gr.grade]} · ش{gr.section}
                  </button>
                ))}
              </div>

              {g && (
                <>
                  <div className="dashboard-actions section-actions">
                    <button type="button" className="btn btn-primary" onClick={handleExport}>
                      ⬇️ تنزيل ملف الشعبة (CSV)
                    </button>
                  </div>
                  {exportError && <p className="error-msg">{exportError}</p>}

                  <div className="sub-tabs">
                    <button type="button" className={view === 'students' ? 'active' : ''} onClick={() => setView('students')}>👥 الطلاب</button>
                    <button type="button" className={view === 'analysis' ? 'active' : ''} onClick={() => setView('analysis')}>📊 التحليل</button>
                  </div>

                  <div className="stats-row">
                    <StatCard title="الطلاب" value={g.totalStudents} />
                    <StatCard title="✅ أنجزوا" value={g.completedCount} color="#059669" />
                    <StatCard title="⏳ لم ينجزوا" value={g.totalStudents - g.completedCount} color="#d97706" />
                  </div>

                  {view === 'students' && (
                    <div className="card table-card">
                      <h3>{g.className}</h3>
                      <p className="muted hint-click">اضغط على طالب لعرض تحليله</p>
                      <div className="table-wrap">
                        <table className="results-table roster-status-table clickable-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>الاسم</th>
                              <th>رقم الطالب</th>
                              <th>الحالة</th>
                              <th>النمط</th>
                              <th>حذف</th>
                            </tr>
                          </thead>
                          <tbody>
                            {g.students.map((s, i) => (
                              <tr
                                key={s.studentNumber + s.nameAr}
                                className={`${s.completed ? 'completed-row' : ''} clickable-row`}
                              >
                                <td onClick={() => setSelectedStudent(s)}>{i + 1}</td>
                                <td onClick={() => setSelectedStudent(s)}><strong>{s.nameAr}</strong></td>
                                <td onClick={() => setSelectedStudent(s)}>{s.studentNumber || '—'}</td>
                                <td onClick={() => setSelectedStudent(s)}>
                                  {s.completed
                                    ? <span className="status-done">✅ أنجز</span>
                                    : <span className="status-pending">⏳ لم ينجز</span>}
                                </td>
                                <td onClick={() => setSelectedStudent(s)}>{s.profileLabel || '—'}</td>
                                <td>
                                  {s.submissionId && (
                                    <button
                                      type="button"
                                      className="btn btn-danger btn-sm"
                                      onClick={() => handleDeleteSubmission(s.submissionId)}
                                    >
                                      حذف
                                    </button>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {view === 'analysis' && <SectionAnalysisPanel group={g} />}
                </>
              )}
            </>
          )}
        </>
      )}

      {selectedStudent && (
        <StudentAnalysisModal
          student={selectedStudent}
          className={g?.className}
          onClose={() => setSelectedStudent(null)}
        />
      )}

      <Link to="/" className="back-link">← الرئيسية</Link>
    </div>
  );
}
