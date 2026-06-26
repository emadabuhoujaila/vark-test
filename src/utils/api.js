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
export const getSubjectAvailability = (grade, section, studentNumber, studentName) => {
  const params = new URLSearchParams({ grade, section });
  if (studentNumber) params.set('studentNumber', studentNumber);
  if (studentName) params.set('studentName', studentName);
  return request(`/subjects/availability?${params}`);
};
export const getSubmission = (id) => request(`/submissions/${id}`);
export const saveSubmission = (data) =>
  request('/submissions', { method: 'POST', body: JSON.stringify(data) });

export const verifyHomeGate = (password) =>
  request('/auth/home-gate', { method: 'POST', body: JSON.stringify({ password }) });

const HOME_ACCESS_KEY = 'homeAccessGranted';

export function saveHomeAccess() {
  sessionStorage.setItem(HOME_ACCESS_KEY, '1');
}

export function hasHomeAccess() {
  return sessionStorage.getItem(HOME_ACCESS_KEY) === '1';
}

export function clearHomeAccess() {
  sessionStorage.removeItem(HOME_ACCESS_KEY);
}

export function canAccessHome() {
  return hasHomeAccess() || Boolean(getToken('adminToken'));
}

// Teacher
export const teacherLogin = (data) =>
  request('/auth/teacher/login', { method: 'POST', body: JSON.stringify(data) });
export const teacherForgotPassword = (email) =>
  request('/auth/teacher/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
export const getTeacherMe = () => request('/auth/teacher/me', {}, 'teacherToken');
export const getTeacherDashboard = () => request('/teacher/dashboard', {}, 'teacherToken');

export const teacherGetMessagesInbox = () => request('/teacher/messages/inbox', {}, 'teacherToken');
export const teacherGetMessagesOutbox = () => request('/teacher/messages/outbox', {}, 'teacherToken');
export const teacherGetMessage = (id) => request(`/teacher/messages/${id}`, {}, 'teacherToken');
export const teacherSendMessage = (data) =>
  request('/teacher/messages', { method: 'POST', body: JSON.stringify(data) }, 'teacherToken');
export const teacherReplyMessage = (id, body) =>
  request(`/teacher/messages/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }) }, 'teacherToken');
export const teacherDeleteMessage = (id) =>
  request(`/teacher/messages/${id}`, { method: 'DELETE' }, 'teacherToken');

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

export const adminCreateTeacher = (data) =>
  request('/admin/teachers', { method: 'POST', body: JSON.stringify(data) }, 'adminToken');

export const adminUpdateTeacher = (id, data) =>
  request(`/admin/teachers/${id}`, { method: 'PUT', body: JSON.stringify(data) }, 'adminToken');

export const adminResetTeacherPassword = (id, password) =>
  request(`/admin/teachers/${id}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  }, 'adminToken');

export const adminDeleteTeacher = (id) =>
  request(`/admin/teachers/${id}`, { method: 'DELETE' }, 'adminToken');

export const adminDeleteSubmission = (id) =>
  request(`/admin/submissions/${id}`, { method: 'DELETE' }, 'adminToken');

export const adminGetMessagesInbox = () => request('/admin/messages/inbox', {}, 'adminToken');
export const adminGetMessagesOutbox = () => request('/admin/messages/outbox', {}, 'adminToken');
export const adminGetMessage = (id) => request(`/admin/messages/${id}`, {}, 'adminToken');
export const adminSendMessage = (data) =>
  request('/admin/messages', { method: 'POST', body: JSON.stringify(data) }, 'adminToken');
export const adminReplyMessage = (id, body) =>
  request(`/admin/messages/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }) }, 'adminToken');
export const adminDeleteMessage = (id) =>
  request(`/admin/messages/${id}`, { method: 'DELETE' }, 'adminToken');
