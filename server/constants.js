export const SUBJECT_IDS = ['science', 'math', 'arabic', 'english', 'islamic', 'social'];

/** المواد التي لها بنك أسئلة جاهز — يُحدّث مع إضافة مواد جديدة */
export const SUBJECTS_WITH_QUESTIONS = ['science', 'math', 'arabic', 'english'];

export const SUBJECT_NAMES = {
  science: 'علوم',
  math: 'رياضيات',
  arabic: 'لغة عربية',
  english: 'لغة إنجليزية',
  islamic: 'دراسات إسلامية',
  social: 'دراسات اجتماعية',
};

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
