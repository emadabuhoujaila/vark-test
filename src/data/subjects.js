export const SUBJECTS = [
  { id: 'science', name: 'علوم', icon: '🧬' },
  { id: 'math', name: 'رياضيات', icon: '📐' },
  { id: 'arabic', name: 'لغة عربية', icon: '📖' },
  { id: 'english', name: 'لغة إنجليزية', icon: '🔤' },
  { id: 'islamic', name: 'دراسات إسلامية', icon: '🕌' },
  { id: 'social', name: 'دراسات اجتماعية', icon: '🌍' },
];

export function getSubjectName(id) {
  return SUBJECTS.find((s) => s.id === id)?.name || id;
}

export function getSubjectIcon(id) {
  return SUBJECTS.find((s) => s.id === id)?.icon || '📚';
}

/** CSS class suffix per subject for colored badges */
export function getSubjectClass(id) {
  return SUBJECTS.some((s) => s.id === id) ? `subject-${id}` : 'subject-default';
}
