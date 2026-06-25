import { STYLE_LABELS } from '../data/varkQuestions';

const STYLES = ['V', 'A', 'R', 'K'];

export function calculateScores(answers) {
  const scores = { V: 0, A: 0, R: 0, K: 0 };
  answers.forEach((style) => {
    if (scores[style] !== undefined) scores[style] += 1;
  });
  return scores;
}

export function getPercentages(scores, total = 16) {
  return Object.fromEntries(
    STYLES.map((s) => [s, Math.round((scores[s] / total) * 100)])
  );
}

export function getDominantStyles(scores) {
  const max = Math.max(...STYLES.map((s) => scores[s]));
  return STYLES.filter((s) => scores[s] === max);
}

export function getProfileLabel(dominantStyles) {
  if (dominantStyles.length === 1) {
    return STYLE_LABELS[dominantStyles[0]].name;
  }
  if (dominantStyles.length === 2) {
    return dominantStyles.map((s) => STYLE_LABELS[s].name).join(' + ');
  }
  return 'متعدد الأنماط';
}

export function getProfileType(dominantStyles) {
  if (dominantStyles.length === 1) return dominantStyles[0];
  if (dominantStyles.length === 2) return dominantStyles.sort().join('');
  return 'MULTI';
}

export function analyzeClassResults(submissions) {
  const styleCounts = { V: 0, A: 0, R: 0, K: 0, MULTI: 0 };
  const profileCounts = {};
  const styleTotals = { V: 0, A: 0, R: 0, K: 0 };

  submissions.forEach((sub) => {
    const profile = sub.profileType || getProfileType(getDominantStyles(sub.scores));
    styleCounts[profile] = (styleCounts[profile] || 0) + 1;
    profileCounts[profile] = (profileCounts[profile] || 0) + 1;
    STYLES.forEach((s) => {
      styleTotals[s] += sub.scores[s];
    });
  });

  const total = submissions.length || 1;
  const averageScores = Object.fromEntries(
    STYLES.map((s) => [s, +(styleTotals[s] / total).toFixed(1)])
  );
  const averagePercentages = Object.fromEntries(
    STYLES.map((s) => [s, Math.round((averageScores[s] / 16) * 100)])
  );

  const dominantClassStyle = STYLES.reduce((a, b) =>
    averageScores[a] >= averageScores[b] ? a : b
  );

  return {
    totalStudents: submissions.length,
    styleCounts,
    profileCounts,
    averageScores,
    averagePercentages,
    dominantClassStyle,
  };
}

export function sortSubmissions(submissions, sortBy = 'name') {
  const order = { V: 0, A: 1, R: 2, K: 3, MULTI: 4 };
  return [...submissions].sort((a, b) => {
    if (sortBy === 'style') {
      const pa = order[a.profileType] ?? 5;
      const pb = order[b.profileType] ?? 5;
      if (pa !== pb) return pa - pb;
    }
    return a.studentName.localeCompare(b.studentName, 'ar');
  });
}

export function exportToCsv(submissions) {
  const header = 'الاسم,الصف,النمط السائد,V,A,R,K,التاريخ\n';
  const rows = submissions.map((s) => {
    const dom = getProfileLabel(getDominantStyles(s.scores));
    return `"${s.studentName}","${s.className || ''}","${dom}",${s.scores.V},${s.scores.A},${s.scores.R},${s.scores.K},"${new Date(s.submittedAt).toLocaleString('ar-SA')}"`;
  });
  return header + rows.join('\n');
}
