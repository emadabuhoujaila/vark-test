const API_BASE = import.meta.env.VITE_API_URL || '/api';

export const DEFAULT_TEACHER_PIN = 'teacher2024';

function getTeacherPinHeader() {
  return sessionStorage.getItem('vark-teacher-pin') || '';
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
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
