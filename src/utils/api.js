const API = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('teacherToken');
}

async function request(path, options = {}, auth = false) {
  const headers = { ...(options.headers || {}) };
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API}${path}`, { ...options, headers });
  if (!res.ok) {
    let message = 'حدث خطأ';
    try { message = (await res.json()).error || message; } catch { /* ok */ }
    throw new Error(message);
  }
  if (res.status === 204) return null;
  return res.json();
}

// Student / public
export const getRosterMeta = () => request('/roster/meta');
export const getRosterGrades = () => request('/roster/grades');
export const getRosterSections = (grade) => request(`/roster/sections?grade=${grade}`);
export const getRosterStudents = (grade, section) =>
  request(`/roster/students?grade=${grade}&section=${section}`);
export const getSubmission = (id) => request(`/submissions/${id}`);
export const saveSubmission = (data) =>
  request('/submissions', { method: 'POST', body: JSON.stringify(data) });

// Teacher (PIN)
export const teacherLogin = (pin) =>
  request('/auth/teacher/login', { method: 'POST', body: JSON.stringify({ pin }) });
export const getTeacherOverview = () => request('/teacher/overview', {}, true);
export const getTeacherDashboard = () => request('/teacher/dashboard', {}, true);
export const deleteSubmission = (id) =>
  request(`/teacher/submissions/${id}`, { method: 'DELETE' }, true);

export async function teacherUploadRoster(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}/teacher/roster/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken()}` },
    body: form,
  });
  if (!res.ok) {
    let msg = 'فشل الرفع';
    try { msg = (await res.json()).error || msg; } catch { /* ok */ }
    throw new Error(msg);
  }
  return res.json();
}

export async function downloadSectionExport(grade, section) {
  const res = await fetch(`${API}/teacher/export?grade=${grade}&section=${section}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) {
    let msg = 'فشل التصدير';
    try { msg = (await res.json()).error || msg; } catch { /* ok */ }
    throw new Error(msg);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `vark-${grade}-${section}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function saveTeacherToken(token) {
  localStorage.setItem('teacherToken', token);
}
export function clearTeacherAuth() {
  localStorage.removeItem('teacherToken');
}
export function isTeacherLoggedIn() {
  return Boolean(getToken());
}
