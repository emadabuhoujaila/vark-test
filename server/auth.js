import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'vark-dev-secret-change-in-production';

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signTeacherToken(teacher) {
  return jwt.sign(
    { type: 'teacher', id: teacher.id, email: teacher.email },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function signAdminToken(email) {
  return jwt.sign({ type: 'admin', email }, JWT_SECRET, { expiresIn: '8h' });
}

export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

export function getBearerToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}
