const STYLES = ['V', 'A', 'R', 'K'];

const STYLE_NAMES = {
  V: 'بصري',
  A: 'سمعي',
  R: 'قرائي/كتابي',
  K: 'حركي',
};

export const QUESTION_COUNT = 16;

export function calculateScores(answers) {
  const scores = { V: 0, A: 0, R: 0, K: 0 };
  for (const style of answers) {
    if (scores[style] !== undefined) scores[style] += 1;
  }
  return scores;
}

export function getPercentages(scores, total) {
  const divisor = total > 0 ? total : 1;
  return Object.fromEntries(
    STYLES.map((s) => [s, Math.round((scores[s] / divisor) * 100)])
  );
}

export function getDominantStyles(scores) {
  const max = Math.max(...STYLES.map((s) => scores[s]));
  return STYLES.filter((s) => scores[s] === max);
}

export function getProfileLabel(dominantStyles) {
  if (dominantStyles.length === 1) return STYLE_NAMES[dominantStyles[0]];
  if (dominantStyles.length === 2) {
    return dominantStyles.map((s) => STYLE_NAMES[s]).join(' + ');
  }
  return 'متعدد الأنماط';
}

export function getProfileType(dominantStyles) {
  if (dominantStyles.length === 1) return dominantStyles[0];
  if (dominantStyles.length === 2) return dominantStyles.sort().join('');
  return 'MULTI';
}

export function buildSubmissionResult(answers, { timedOut = false } = {}) {
  const answeredCount = answers.length;
  const total = timedOut ? answeredCount : QUESTION_COUNT;
  const scores = calculateScores(answers);
  const percentages = getPercentages(scores, total);
  const dominantStyles = getDominantStyles(scores);
  return {
    scores,
    percentages,
    dominantStyles,
    profileLabel: getProfileLabel(dominantStyles),
    profileType: getProfileType(dominantStyles),
    answeredCount,
    timedOut: Boolean(timedOut),
  };
}

export function isValidAnswerStyle(style) {
  return STYLES.includes(style);
}
