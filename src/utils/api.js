const API = import.meta.env.VITE_API_URL || '/api';

function getToken(key) {
  return localStorage.getItem(key);
}

async function request(path, options = {}, tokenKey = null) {
  const headers = { ...(options.headers || {}) };
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  if (!isFormData && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
  if (tokenKey) {
    const token = getToken(tokenKey);
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

// Teacher
export const teacherRegister = (data) =>
  request('/auth/teacher/register', { method: 'POST', body: JSON.stringify(data) });
export const teacherLogin = (data) =>
  request('/auth/teacher/login', { method: 'POST', body: JSON.stringify(data) });
export const getTeacherMe = () => request('/auth/teacher/me', {}, 'teacherToken');
export const saveTeacherAssignments = (assignments) =>
  request('/auth/teacher/assignments', {
    method: 'PUT',
    body: JSON.stringify({ assignments }),
  }, 'teacherToken');
export const getTeacherDashboard = () => request('/teacher/dashboard', {}, 'teacherToken');

export function saveTeacherToken(token) {
  localStorage.setItem('teacherToken', token);
}
export function clearTeacherAuth() {
  localStorage.removeItem('teacherToken');
}
export function isTeacherLoggedIn() {
  return Boolean(getToken('teacherToken'));
}

// Admin
export const adminLogin = (data) =>
  request('/auth/admin/login', { method: 'POST', body: JSON.stringify(data) });
export const getAdminOverview = () => request('/admin/overview', {}, 'adminToken');
export async function adminUploadRoster(file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API}/admin/roster/upload`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${getToken('adminToken')}` },
    body: form,
  });
  if (!res.ok) {
    let msg = 'فشل الرفع';
    try { msg = (await res.json()).error || msg; } catch { /* ok */ }
    throw new Error(msg);
  }
  return res.json();
}

export function saveAdminToken(token) {
  localStorage.setItem('adminToken', token);
}
export function clearAdminAuth() {
  localStorage.removeItem('adminToken');
}
export function isAdminLoggedIn() {
  return Boolean(getToken('adminToken'));
}
