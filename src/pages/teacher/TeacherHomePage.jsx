import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getSubjectName, getSubjectIcon } from '../../data/subjects';
import { GRADE_LABELS } from '../../data/grades';
import {
  getTeacherDashboard,
  getTeacherMe,
  clearTeacherAuth,
  isTeacherLoggedIn,
} from '../../utils/api';
import { StatCard } from '../../components/UI';
import SectionAnalysisPanel from '../../components/SectionAnalysisPanel';
import StudentAnalysisModal from '../../components/StudentAnalysisModal';

export default function TeacherHomePage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [teacher, setTeacher] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeGroup, setActiveGroup] = useState(0);
  const [view, setView] = useState('students');
  const [selectedStudent, setSelectedStudent] = useState(null);

  useEffect(() => {
    if (!isTeacherLoggedIn()) {
      navigate('/teacher');
      return;
    }
    Promise.all([getTeacherMe(), getTeacherDashboard()])
      .then(([me, dash]) => {
        if (!me.assignments?.length) {
          navigate('/teacher/setup');
          return;
        }
        setTeacher(me.teacher);
        setGroups(dash.groups || []);
      })
      .catch(() => navigate('/teacher'))
      .finally(() => setLoading(false));
  }, [navigate]);

  function logout() {
    clearTeacherAuth();
    navigate('/teacher');
  }

  if (loading) return <div className="page"><div className="loading-state">جاري التحميل...</div></div>;

  const g = groups[activeGroup];

  return (
    <div className="page dashboard-page">
      <div className="dashboard-top">
        <div>
          <h1>👨‍🏫 {teacher?.fullName || teacher?.email}</h1>
          <p className="muted">{groups.length} حصة مسجّلة · {groups.reduce((n, x) => n + x.totalStudents, 0)} طالب</p>
        </div>
        <div className="dashboard-actions">
          <Link to="/teacher/setup" className="btn btn-secondary">تعديل الصفوف</Link>
          <button type="button" className="btn btn-secondary" onClick={logout}>خروج</button>
        </div>
      </div>

      <div className="group-tabs">
        {groups.map((gr, i) => (
          <button
            key={`${gr.subject}-${gr.grade}-${gr.section}`}
            type="button"
            className={activeGroup === i ? 'active' : ''}
            onClick={() => { setActiveGroup(i); setSelectedStudent(null); }}
          >
            {getSubjectIcon(gr.subject)} {GRADE_LABELS[gr.grade]} · ش{gr.section}
          </button>
        ))}
      </div>

      {g && (
        <>
          <div className="sub-tabs">
            <button type="button" className={view === 'students' ? 'active' : ''} onClick={() => setView('students')}>
              👥 قائمة الطلاب
            </button>
            <button type="button" className={view === 'analysis' ? 'active' : ''} onClick={() => setView('analysis')}>
              📊 تحليل الشعبة
            </button>
          </div>

          <div className="stats-row">
            <StatCard title="الطلاب" value={g.totalStudents} />
            <StatCard title="✅ أنجزوا" value={g.completedCount} color="#059669" />
            <StatCard title="⏳ لم ينجزوا" value={g.totalStudents - g.completedCount} color="#d97706" />
          </div>

          {view === 'students' && (
            <div className="card table-card">
              <h3>
                {getSubjectIcon(g.subject)} {getSubjectName(g.subject)} — {g.className}
              </h3>
              <p className="muted hint-click">اضغط على أي طالب لعرض تحليله التفصيلي</p>
              <div className="table-wrap">
                <table className="results-table roster-status-table clickable-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>الاسم</th>
                      <th>رقم الطالب</th>
                      <th>حالة الاختبار</th>
                      <th>النمط</th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.students.map((s, i) => (
                      <tr
                        key={s.studentNumber + s.nameAr}
                        className={`${s.completed ? 'completed-row' : ''} clickable-row`}
                        onClick={() => setSelectedStudent(s)}
                      >
                        <td>{i + 1}</td>
                        <td><strong>{s.nameAr}</strong></td>
                        <td>{s.studentNumber || '—'}</td>
                        <td>
                          {s.completed
                            ? <span className="status-done">✅ أنجز</span>
                            : <span className="status-pending">⏳ لم ينجز</span>}
                        </td>
                        <td>
                          {s.profileLabel && s.completed
                            ? <span className="done-badge">{s.profileLabel}</span>
                            : '—'}
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

      {selectedStudent && (
        <StudentAnalysisModal
          student={selectedStudent}
          className={g?.className}
          onClose={() => setSelectedStudent(null)}
        />
      )}
    </div>
  );
}
