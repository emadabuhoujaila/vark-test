export const GRADE_LABELS = {
  5: 'الصف الخامس',
  6: 'الصف السادس',
  7: 'الصف السابع',
  8: 'الصف الثامن',
};

export function formatClassName(grade, section) {
  const label = GRADE_LABELS[grade] || `الصف ${grade}`;
  return `${label} - الشعبة ${section}`;
}
