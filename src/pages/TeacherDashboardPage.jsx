import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  getSubmissions,
  deleteSubmission,
  clearAllSubmissions,
  getTeacherPin,
  setTeacherPin,
  clearTeacherSession,
  getRosterMeta,
  uploadRoster,
} from '../utils/api';
import { GRADE_LABELS } from '../data/grades';
import {
  analyzeClassResults,
  sortSubmissions,
  exportToCsv,
  getDominantStyles,
  getProfileLabel,
} from '../utils/varkScoring';
import { STYLE_LABELS, STYLE_DESCRIPTIONS, TEACHING_TIPS } from '../data/varkQuestions';
import { StyleBadge, StatCard, ScoreBars, EmptyState } from '../components/UI';

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [sortBy, setSortBy] = useState('style');
  const [filterStyle, setFilterStyle] = useState('all');
  const [newPin, setNewPin] = useState('');
  const [currentPinDisplay, setCurrentPinDisplay] = useState('');
  const [tab, setTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rosterMeta, setRosterMeta] = useState(null);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    if (sessionStorage.getItem('vark-teacher-auth') !== '1') {
      navigate('/teacher');
      return;
    }
    refresh();
  }, [navigate]);

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      const data = await getSubmissions();
      setSubmissions(data);
      if (data.length && !selectedId) setSelectedId(data[0].id);
    } catch (err) {
      setError(err.message || 'فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tab === 'settings' && sessionStorage.getItem('vark-teacher-auth') === '1') {
      getTeacherPin()
        .then((pin) => setCurrentPinDisplay(pin))
        .catch(() => setCurrentPinDisplay(''));
    }
    if (tab === 'roster') {
      loadRosterMeta();
    }
  }, [tab]);

  async function loadRosterMeta() {
    try {
      setRosterMeta(await getRosterMeta());
    } catch {
      setRosterMeta(null);
    }
  }

  async function handleUploadRoster(e) {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    setUploadMsg('');
    setUploadError('');
    try {
      const result = await uploadRoster(uploadFile);
      setUploadMsg(result.message || `تم رفع ${result.totalStudents} اسمًا`);
      setUploadFile(null);
      e.currentTarget.reset();
      await loadRosterMeta();
    } catch (err) {
      setUploadError(err.message || 'فشل رفع الملف');
    } finally {
      setUploading(false);
    }
  }

  const analysis = useMemo(() => analyzeClassResults(submissions), [submissions]);

  const sorted = useMemo(
    () => sortSubmissions(submissions, sortBy),
    [submissions, sortBy]
  );

  const filtered = useMemo(() => {
    if (filterStyle === 'all') return sorted;
    return sorted.filter((s) => s.profileType === filterStyle);
  }, [sorted, filterStyle]);

  const selected = submissions.find((s) => s.id === selectedId);

  function handleExport() {
    const csv = exportToCsv(submissions);
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vark-results-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleDelete(id) {
    if (!window.confirm('حذف نتيجة هذا الطالب؟')) return;
    try {
      await deleteSubmission(id);
      if (selectedId === id) setSelectedId(null);
      await refresh();
    } catch (err) {
      alert(err.message || 'فشل الحذف');
    }
  }

  async function handleClearAll() {
    if (!window.confirm('حذف جميع النتائج؟ لا يمكن التراجع.')) return;
    try {
      await clearAllSubmissions();
      setSelectedId(null);
      await refresh();
    } catch (err) {
      alert(err.message || 'فشل مسح النتائج');
    }
  }

  async function handleChangePin(e) {
    e.preventDefault();
    if (newPin.length < 4) return;
    const currentPin = sessionStorage.getItem('vark-teacher-pin') || '';
    try {
      await setTeacherPin(newPin, currentPin);
      sessionStorage.setItem('vark-teacher-pin', newPin);
      setCurrentPinDisplay(newPin);
      setNewPin('');
      alert('تم تحديث رمز الدخول');
    } catch (err) {
      alert(err.message || 'فشل تحديث الرمز');
    }
  }

  function logout() {
    clearTeacherSession();
    navigate('/teacher');
  }

  if (loading) {
    return (
      <div className="page">
        <div className="loading-state">جاري تحميل بيانات الصف...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page">
        <div className="card form-card">
          <p className="error-msg">{error}</p>
          <p className="hint">تأكد أن الخادم يعمل: <code>npm run dev</code></p>
          <button type="button" className="btn btn-primary" onClick={refresh}>إعادة المحاولة</button>
        </div>
      </div>
    );
  }

  const styleDistribution = submissions.length
    ? Object.entries(analysis.profileCounts)
        .filter(([, count]) => count > 0)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => {
          let label = key;
          let color = '#64748b';
          if (key === 'MULTI') label = 'متعدد الأنماط';
          else if (key.length === 1) {
            label = STYLE_LABELS[key]?.name || key;
            color = STYLE_LABELS[key]?.color;
          } else if (key.length === 2) {
            label = key.split('').map((s) => STYLE_LABELS[s]?.name).join(' + ');
            color = STYLE_LABELS[key[0]]?.color;
          }
          return { key, count, label, color };
        })
    : [];

  return (
    <div className="page dashboard-page">
      <div className="dashboard-top">
        <div>
          <h1>لوحة المعلم — تحليل أنماط التعلم</h1>
          <p className="muted">{analysis.totalStudents} طالب/طالبة — {submissions[0]?.className || 'الصف السابع'}</p>
        </div>
        <div className="dashboard-actions">
          <button type="button" className="btn btn-secondary" onClick={handleExport}>تصدير CSV</button>
          <button type="button" className="btn btn-danger" onClick={handleClearAll}>مسح الكل</button>
          <button type="button" className="btn btn-secondary" onClick={logout}>خروج</button>
        </div>
      </div>

      <div className="tabs">
        <button type="button" className={tab === 'overview' ? 'active' : ''} onClick={() => setTab('overview')}>
          التحليل العام
        </button>
        <button type="button" className={tab === 'table' ? 'active' : ''} onClick={() => setTab('table')}>
          جدول التصنيف
        </button>
        <button type="button" className={tab === 'individual' ? 'active' : ''} onClick={() => setTab('individual')}>
          التحليل الفردي
        </button>
        <button type="button" className={tab === 'roster' ? 'active' : ''} onClick={() => setTab('roster')}>
          رفع القوائم
        </button>
        <button type="button" className={tab === 'settings' ? 'active' : ''} onClick={() => setTab('settings')}>
          الإعدادات
        </button>
      </div>

      {tab === 'overview' && !submissions.length && (
        <EmptyState
          message="لا توجد نتائج بعد. ارفع قائمة الأسماء من تبويب «رفع القوائم» ثم اطلب من الطلاب إجراء الاختبار."
        />
      )}

      {tab === 'overview' && submissions.length > 0 && (
        <>
          <div className="stats-row">
            <StatCard title="عدد الطلاب" value={analysis.totalStudents} />
            <StatCard
              title="النمط الأغلب في الصف"
              value={STYLE_LABELS[analysis.dominantClassStyle]?.name}
              subtitle={`متوسط ${analysis.averageScores[analysis.dominantClassStyle]}/16`}
              color={STYLE_LABELS[analysis.dominantClassStyle]?.color}
            />
            <StatCard
              title="أعلى متوسط"
              value={`${Math.max(...Object.values(analysis.averagePercentages))}%`}
              subtitle="نسبة أعلى نمط في الصف"
            />
          </div>

          <div className="dashboard-grid">
            <div className="card">
              <h3>توزيع الأنماط السائدة في الصف</h3>
              <div className="distribution-chart">
                {styleDistribution.map(({ key, count, label, color }) => {
                  const pct = Math.round((count / analysis.totalStudents) * 100);
                  return (
                    <div key={key} className="dist-row">
                      <div className="dist-label">
                        <span style={{ color }}>{label}</span>
                        <span>{count} ({pct}%)</span>
                      </div>
                      <div className="dist-track">
                        <div className="dist-fill" style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="card">
              <h3>متوسط درجات الصف (من 16)</h3>
              <ScoreBars
                scores={analysis.averageScores}
                percentages={analysis.averagePercentages}
              />
            </div>
          </div>

          <div className="card insight-card">
            <h3>📊 ملخص تحليلي للصف</h3>
            <p>
              يضم صفك <strong>{analysis.totalStudents}</strong> نتيجة. النمط الأكثر شيوعًا
              هو <strong>{STYLE_LABELS[analysis.dominantClassStyle]?.name}</strong> بمتوسط{' '}
              <strong>{analysis.averageScores[analysis.dominantClassStyle]}</strong> من 16.
            </p>
            <ul className="insight-list">
              {['V', 'A', 'R', 'K'].map((s) => (
                <li key={s}>
                  <StyleBadge style={s} />
                  {analysis.profileCounts[s] || 0} طالب/طالبة — متوسط {analysis.averageScores[s]}/16
                </li>
              ))}
              {(analysis.profileCounts.MULTI || 0) > 0 && (
                <li>🔄 {analysis.profileCounts.MULTI} طالب/طالبة متعددو الأنماط</li>
              )}
            </ul>
            <h4>توصيات عامة للتدريس:</h4>
            <ul>
              <li>نوّع طرائق العرض: صور + شرح شفهي + نشاط عملي + ملخص مكتوب.</li>
              <li>كوّن مجموعات متنوعة تجمع أنماطًا مختلفة في المشاريع العلمية.</li>
              <li>راجع التحليل الفردي لتخصيص الدعم لكل طالب.</li>
            </ul>
          </div>
        </>
      )}

      {tab === 'table' && !submissions.length && (
        <EmptyState message="لا توجد نتائج لعرضها في الجدول بعد." />
      )}

      {tab === 'table' && submissions.length > 0 && (
        <div className="card table-card">
          <div className="table-controls">
            <label>
              ترتيب حسب:
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="style">نمط التعلم</option>
                <option value="name">الاسم</option>
              </select>
            </label>
            <label>
              تصفية:
              <select value={filterStyle} onChange={(e) => setFilterStyle(e.target.value)}>
                <option value="all">جميع الأنماط</option>
                <option value="V">بصري</option>
                <option value="A">سمعي</option>
                <option value="R">قرائي/كتابي</option>
                <option value="K">حركي/عملي</option>
                <option value="MULTI">متعدد الأنماط</option>
                <option value="VA">بصري + سمعي</option>
                <option value="VR">بصري + قرائي</option>
                <option value="VK">بصري + حركي</option>
                <option value="AR">سمعي + قرائي</option>
                <option value="AK">سمعي + حركي</option>
                <option value="RK">قرائي + حركي</option>
              </select>
            </label>
          </div>

          <div className="table-wrap">
            <table className="results-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>الاسم</th>
                  <th>الصف</th>
                  <th>النمط السائد</th>
                  <th>V</th>
                  <th>A</th>
                  <th>R</th>
                  <th>K</th>
                  <th>التاريخ</th>
                  <th>إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const dom = s.dominantStyles || getDominantStyles(s.scores);
                  return (
                    <tr
                      key={s.id}
                      className={selectedId === s.id ? 'selected-row' : ''}
                      onClick={() => { setSelectedId(s.id); setTab('individual'); }}
                    >
                      <td>{i + 1}</td>
                      <td><strong>{s.studentName}</strong></td>
                      <td>{s.className}</td>
                      <td>
                        <div className="table-badges">
                          {dom.map((st) => <StyleBadge key={st} style={st} />)}
                        </div>
                      </td>
                      <td>{s.scores.V}</td>
                      <td>{s.scores.A}</td>
                      <td>{s.scores.R}</td>
                      <td>{s.scores.K}</td>
                      <td>{new Date(s.submittedAt).toLocaleDateString('ar-SA')}</td>
                      <td>
                        <button
                          type="button"
                          className="btn-icon"
                          onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                          title="حذف"
                        >
                          🗑️
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="classification-summary">
            <h4>ملخص التصنيف التلقائي</h4>
            <div className="class-pills">
              {styleDistribution.map(({ key, count, label, color }) => (
                count > 0 && (
                  <span key={key} className="class-pill" style={{ borderColor: color, color }}>
                    {label}: {count}
                  </span>
                )
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'individual' && !submissions.length && (
        <EmptyState message="لا توجد نتائج للتحليل الفردي بعد." />
      )}

      {tab === 'individual' && submissions.length > 0 && (
        <div className="individual-layout">
          <div className="card student-picker">
            <h3>اختر طالبًا</h3>
            <div className="student-list">
              {sorted.map((s) => {
                const dom = s.dominantStyles || getDominantStyles(s.scores);
                return (
                  <button
                    key={s.id}
                    type="button"
                    className={`student-item ${selectedId === s.id ? 'active' : ''}`}
                    onClick={() => setSelectedId(s.id)}
                  >
                    <strong>{s.studentName}</strong>
                    <span>{getProfileLabel(dom)}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {selected && (
            <div className="individual-detail">
              <div className="card">
                <h2>{selected.studentName}</h2>
                <p className="muted">{selected.className} — {new Date(selected.submittedAt).toLocaleString('ar-SA')}</p>
                <div className="dominant-badges">
                  {(selected.dominantStyles || getDominantStyles(selected.scores)).map((s) => (
                    <StyleBadge key={s} style={s} large />
                  ))}
                </div>
                <h3>{selected.profileLabel || getProfileLabel(getDominantStyles(selected.scores))}</h3>
              </div>

              <div className="card">
                <h3>درجات الطالب</h3>
                <ScoreBars scores={selected.scores} percentages={selected.percentages} />
              </div>

              {(selected.dominantStyles || getDominantStyles(selected.scores)).map((style) => (
                <div key={style} className="card tip-card">
                  <StyleBadge style={style} large />
                  <p>{STYLE_DESCRIPTIONS[style]}</p>
                  <h4>توصيات للمعلم:</h4>
                  <ul>
                    {TEACHING_TIPS[style].map((tip, i) => (
                      <li key={i}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ))}

              <Link to={`/result/${selected.id}`} className="btn btn-secondary">
                عرض صفحة نتيجة الطالب
              </Link>
            </div>
          )}
        </div>
      )}

      {tab === 'roster' && (
        <div className="card form-card roster-upload">
          <h3>رفع قوائم الأسماء</h3>
          <p className="muted">
            ارفع ملف Excel مطابقًا لنموذج <strong>سجل الأسماء.xlsx</strong>.
            كل ورقة باسم الصف والشعبة (مثل 7-1). عند الرفع مجددًا تُحدَّث الأسماء بالكامل.
          </p>

          {rosterMeta?.totalStudents > 0 && (
            <div className="roster-status success-box">
              <p><strong>{rosterMeta.totalStudents}</strong> اسمًا مسجّلًا</p>
              <p className="muted">
                آخر رفع: {new Date(rosterMeta.uploadedAt).toLocaleString('ar-SA')}
              </p>
              <p className="muted">
                الصفوف: {rosterMeta.grades.map((g) => GRADE_LABELS[g] || g).join(' · ')}
              </p>
            </div>
          )}

          <form onSubmit={handleUploadRoster} className="student-form">
            <label>
              ملف Excel (.xlsx)
              <input
                type="file"
                accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                required
              />
            </label>
            {uploadError && <p className="error-msg">{uploadError}</p>}
            {uploadMsg && <p className="success-msg">{uploadMsg}</p>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={uploading || !uploadFile}>
              {uploading ? 'جاري الرفع...' : rosterMeta?.totalStudents ? 'تحديث القوائم' : 'رفع القوائم'}
            </button>
          </form>

          <div className="hint">
            <strong>أعمدة الملف المطلوبة:</strong>
            <ul>
              <li>م · الصف · الشعبة · رقم الطالب · اسم الطالب بالعربية · اسم الطالب بالإنجليزية</li>
              <li>ورقة لكل شعبة: 5-1، 5-2، ... 7-1، 7-2، إلخ</li>
            </ul>
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="card form-card">
          <h3>إعدادات المعلم</h3>
          <p className="muted">الرمز الحالي: <code>{currentPinDisplay || '...'}</code></p>
          <form onSubmit={handleChangePin} className="student-form">
            <label>
              رمز دخول جديد (4 أحرف على الأقل)
              <input
                type="password"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                minLength={4}
              />
            </label>
            <button type="submit" className="btn btn-primary">حفظ الرمز</button>
          </form>
          <p className="hint">
            النتائج تُحفظ الآن في قاعدة بيانات مركزية. جميع الطلاب على نفس الشبكة/الخادم
            يرون نفس البيانات في لوحة المعلم.
          </p>
        </div>
      )}
    </div>
  );
}
