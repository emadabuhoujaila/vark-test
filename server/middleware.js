import { verifyToken, getBearerToken } from './auth.js';

export function requireTeacher(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'يرجى تسجيل الدخول' });
    const payload = verifyToken(token);
    if (payload.type !== 'teacher') return res.status(403).json({ error: 'غير مصرح' });
    req.teacher = payload;
    next();
  } catch {
    res.status(401).json({ error: 'انتهت الجلسة، سجّل الدخول مجددًا' });
  }
}

export function requireAdmin(req, res, next) {
  try {
    const token = getBearerToken(req);
    if (!token) return res.status(401).json({ error: 'يرجى تسجيل الدخول' });
    const payload = verifyToken(token);
    if (payload.type !== 'admin') return res.status(403).json({ error: 'غير مصرح' });
    req.admin = payload;
    next();
  } catch {
    res.status(401).json({ error: 'انتهت الجلسة' });
  }
}
