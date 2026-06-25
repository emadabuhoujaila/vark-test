const CLASS_KEY = 'vark-teacher-class';

export function getTeacherClass() {
  try {
    const raw = sessionStorage.getItem(CLASS_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function setTeacherClass({ subject, grade, section }) {
  sessionStorage.setItem(
    CLASS_KEY,
    JSON.stringify({ subject, grade: Number(grade), section: Number(section) })
  );
}

export function clearTeacherClass() {
  sessionStorage.removeItem(CLASS_KEY);
}

export function isTeacherAuthed() {
  return sessionStorage.getItem('vark-teacher-auth') === '1';
}
