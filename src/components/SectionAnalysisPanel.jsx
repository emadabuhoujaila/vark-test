import { analyzeClassResults, getProfileBreakdown, getCompletionStats } from '../utils/varkScoring';
import { STYLE_LABELS } from '../data/varkQuestions';
import { ScoreBars, StatCard } from './UI';
import { CompletionChart, ProfileBarChart, StyleCountChart } from './charts/AnalysisCharts';

export default function SectionAnalysisPanel({ group }) {
  const analysis = analyzeClassResults(group.submissions);
  const breakdown = getProfileBreakdown(group.submissions);
  const completion = getCompletionStats(group.totalStudents, group.completedCount);

  return (
    <div className="section-analysis">
      <div className="stats-row">
        <StatCard title="إجمالي الطلاب" value={group.totalStudents} />
        <StatCard title="أنجزوا" value={group.completedCount} color="#059669" />
        <StatCard title="نسبة الإنجاز" value={`${completion.rate}%`} color="#2563eb" />
        {analysis.totalStudents > 0 && (
          <StatCard
            title="النمط الأغلب"
            value={STYLE_LABELS[analysis.dominantClassStyle]?.name}
            subtitle="متوسط الشعبة"
          />
        )}
      </div>

      <div className="charts-grid">
        <CompletionChart
          completed={group.completedCount}
          pending={completion.pending}
          rate={completion.rate}
        />
        <StyleCountChart submissions={group.submissions} />
      </div>

      {group.submissions.length > 0 ? (
        <>
          <div className="charts-grid">
            <ProfileBarChart breakdown={breakdown} />
            <div className="chart-card">
              <h4>📉 متوسط درجات الشعبة</h4>
              <ScoreBars scores={analysis.averageScores} percentages={analysis.averagePercentages} />
            </div>
          </div>

          <div className="card table-card">
            <h4>👥 الطلاب حسب النمط</h4>
            <div className="table-wrap">
              <table className="results-table">
                <thead>
                  <tr>
                    <th>الاسم</th>
                    <th>النمط</th>
                    <th>V</th>
                    <th>A</th>
                    <th>R</th>
                    <th>K</th>
                  </tr>
                </thead>
                <tbody>
                  {group.students
                    .filter((s) => s.completed)
                    .map((s) => (
                      <tr key={s.studentNumber + s.nameAr}>
                        <td><strong>{s.nameAr}</strong></td>
                        <td>{s.profileLabel}</td>
                        <td>{s.submission.scores.V}</td>
                        <td>{s.submission.scores.A}</td>
                        <td>{s.submission.scores.R}</td>
                        <td>{s.submission.scores.K}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="empty-state compact">
          <p>لا توجد نتائج اختبار في هذه الشعبة بعد — ستظهر الرسوم عند إنجاز الطلاب للاختبار</p>
        </div>
      )}
    </div>
  );
}
