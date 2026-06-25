const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const DEFAULT_TEACHER_PIN = 'teacher2024';

function getTeacherPinHeader() {
  return sessionStorage.getItem('vark-teacher-pin') || '';
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = 'حدث خطأ في الاتصال بالخادم';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (res.status === 204) return null;
  return res.json();
}

export async function getSubmissions() {
  return request('/submissions');
}

export async function getSubmission(id) {
  return request(`/submissions/${id}`);
}

export async function saveSubmission(submission) {
  return request('/submissions', {
    method: 'POST',
    body: JSON.stringify(submission),
  });
}

export async function deleteSubmission(id) {
  return request(`/submissions/${id}`, {
    method: 'DELETE',
    headers: { 'X-Teacher-Pin': getTeacherPinHeader() },
  });
}

export async function clearAllSubmissions() {
  return request('/submissions', {
    method: 'DELETE',
    headers: { 'X-Teacher-Pin': getTeacherPinHeader() },
  });
}

export async function verifyTeacherPin(pin) {
  const data = await request('/auth/verify', {
    method: 'POST',
    body: JSON.stringify({ pin }),
  });
  if (data.valid) {
    sessionStorage.setItem('vark-teacher-pin', pin);
  }
  return data.valid;
}

export async function getTeacherPin() {
  return request('/settings/teacher-pin', {
    headers: { 'X-Teacher-Pin': getTeacherPinHeader() },
  }).then((d) => d.pin);
}

export async function setTeacherPin(newPin, currentPin) {
  return request('/settings/teacher-pin', {
    method: 'PUT',
    body: JSON.stringify({ pin: newPin, currentPin }),
  });
}

export function clearTeacherSession() {
  sessionStorage.removeItem('vark-teacher-auth');
  sessionStorage.removeItem('vark-teacher-pin');
}

export async function getRosterMeta() {
  return request('/roster/meta');
}

export async function getRosterGrades() {
  return request('/roster/grades');
}

export async function getRosterSections(grade) {
  return request(`/roster/sections?grade=${grade}`);
}

export async function getRosterStudents(grade, section) {
  return request(`/roster/students?grade=${grade}&section=${section}`);
}

export async function uploadRoster(file) {
  const formData = new FormData();
  formData.append('file', file);
  const res = await fetch(`${API_BASE}/roster/upload`, {
    method: 'POST',
    headers: { 'X-Teacher-Pin': getTeacherPinHeader() },
    body: formData,
  });
  if (!res.ok) {
    let message = 'فشل رفع الملف';
    try {
      const data = await res.json();
      message = data.error || message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  return res.json();
}
