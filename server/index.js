import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  hashPassword,
  comparePassword,
  signTeacherToken,
  signAdminToken,
} from './auth.js';
import { requireTeacher, requireAdmin } from './middleware.js';
import {
  initDb,
  getSubmissionById,
  createSubmission,
  createTeacher,
  findTeacherByEmail,
  findTeacherById,
  updateTeacher,
  updateTeacherPassword,
  deleteTeacher,
  setTeacherAssignments,
  getTeacherAssignments,
  getTeacherDashboard,
  getAdminOverview,
  getRosterMeta,
  getRosterGrades,
  getRosterSections,
  getRosterStudents,
  replaceRoster,
  deleteSubmissionById,
  getSubjectAvailability,
  createMessage,
  getMessageById,
  getThreadMessages,
  listAdminInbox,
  listAdminOutbox,
  listTeacherInbox,
  listTeacherOutbox,
  markMessageReadByAdmin,
  markMessageReadByTeacher,
  deleteMessageForAdmin,
  deleteMessageForTeacher,
  createPasswordResetRequest,
} from './db.js';
import { parseRosterExcel } from './rosterParser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@school.ae').toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin2024';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/\.xlsx$/i.test(file.originalname)) cb(null, true);
    else cb(new Error('INVALID_FILE_TYPE'));
  },
});

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, db: process.env.DATABASE_URL ? 'postgresql' : 'sqlite' });
});

// ─── Student (public) ───
app.get('/api/submissions/:id', async (req, res) => {
  try {
    const submission = await getSubmissionById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'النتيجة غير موجودة' });
    res.json(submission);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل النتيجة' });
  }
});

app.post('/api/submissions', async (req, res) => {
  try {
    const body = req.body;
    if (!body.studentName?.trim() || !body.answers?.length) {
      return res.status(400).json({ error: 'بيانات غير مكتملة' });
    }
    const entry = await createSubmission({
      studentName: body.studentName.trim(),
      className: body.className?.trim() || '',
      studentNumber: body.studentNumber?.trim() || '',
      subject: body.subject?.trim() || 'science',
      answers: body.answers,
      scores: body.scores,
      percentages: body.percentages,
      dominantStyles: body.dominantStyles,
      profileLabel: body.profileLabel,
      profileType: body.profileType,
    });
    res.status(201).json(entry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل حفظ النتيجة' });
  }
});

app.get('/api/roster/meta', async (_req, res) => {
  try {
    res.json(await getRosterMeta());
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل البيانات' });
  }
});

app.get('/api/roster/grades', async (_req, res) => {
  try {
    res.json(await getRosterGrades());
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الصفوف' });
  }
});

app.get('/api/roster/sections', async (req, res) => {
  try {
    const { grade } = req.query;
    if (!grade) return res.status(400).json({ error: 'حدد الصف' });
    res.json(await getRosterSections(grade));
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الشعب' });
  }
});

app.get('/api/roster/students', async (req, res) => {
  try {
    const { grade, section } = req.query;
    if (!grade || !section) return res.status(400).json({ error: 'حدد الصف والشعبة' });
    res.json(await getRosterStudents(grade, section));
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الأسماء' });
  }
});

app.get('/api/subjects/availability', async (req, res) => {
  try {
    const { grade, section, studentNumber, studentName } = req.query;
    if (!grade || !section) return res.status(400).json({ error: 'حدد الصف والشعبة' });
    res.json(await getSubjectAvailability(grade, section, studentNumber, studentName));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل المواد' });
  }
});

// ─── Teacher auth ───
app.post('/api/auth/teacher/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email?.trim()) {
      return res.status(400).json({ error: 'أدخل البريد الإلكتروني' });
    }
    await createPasswordResetRequest(email);
    res.json({
      ok: true,
      message: 'تم إرسال طلبك إلى التنظيم. سيتواصل معك قريبًا.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل إرسال الطلب' });
  }
});

app.post('/api/auth/teacher/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const teacher = await findTeacherByEmail(email);
    if (!teacher) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });

    const valid = await comparePassword(password, teacher.password_hash);
    if (!valid) return res.status(401).json({ error: 'البريد أو كلمة المرور غير صحيحة' });

    const token = signTeacherToken({ id: teacher.id, email: teacher.email });
    res.json({
      token,
      teacher: { id: teacher.id, email: teacher.email, fullName: teacher.full_name || '' },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تسجيل الدخول' });
  }
});

app.get('/api/auth/teacher/me', requireTeacher, async (req, res) => {
  try {
    const teacher = await findTeacherById(req.teacher.id);
    const assignments = await getTeacherAssignments(req.teacher.id);
    res.json({ teacher, assignments });
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل البيانات' });
  }
});

app.get('/api/teacher/dashboard', requireTeacher, async (req, res) => {
  try {
    res.json(await getTeacherDashboard(req.teacher.id));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل لوحة المعلم' });
  }
});

// ─── Teacher messages ───
app.get('/api/teacher/messages/inbox', requireTeacher, async (req, res) => {
  try {
    res.json(await listTeacherInbox(req.teacher.id));
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الوارد' });
  }
});

app.get('/api/teacher/messages/outbox', requireTeacher, async (req, res) => {
  try {
    res.json(await listTeacherOutbox(req.teacher.id));
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الصادر' });
  }
});

app.get('/api/teacher/messages/:id', requireTeacher, async (req, res) => {
  try {
    const msg = await getMessageById(req.params.id);
    if (!msg || msg.teacherId !== req.teacher.id) {
      return res.status(404).json({ error: 'الرسالة غير موجودة' });
    }
    await markMessageReadByTeacher(req.params.id, req.teacher.id);
    const thread = await getThreadMessages(msg.threadId);
    res.json({ message: msg, thread });
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الرسالة' });
  }
});

app.post('/api/teacher/messages', requireTeacher, async (req, res) => {
  try {
    const { subject, body } = req.body;
    if (!subject?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'الموضوع والنص مطلوبان' });
    }
    const msg = await createMessage({
      senderType: 'teacher',
      teacherId: req.teacher.id,
      subject: subject.trim(),
      body: body.trim(),
    });
    res.status(201).json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل إرسال الرسالة' });
  }
});

app.post('/api/teacher/messages/:id/reply', requireTeacher, async (req, res) => {
  try {
    const parent = await getMessageById(req.params.id);
    if (!parent || parent.teacherId !== req.teacher.id) {
      return res.status(404).json({ error: 'الرسالة غير موجودة' });
    }
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'نص الرد مطلوب' });
    const msg = await createMessage({
      threadId: parent.threadId,
      parentId: parent.id,
      senderType: 'teacher',
      teacherId: req.teacher.id,
      subject: `رد: ${parent.subject}`,
      body: body.trim(),
    });
    res.status(201).json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل إرسال الرد' });
  }
});

app.delete('/api/teacher/messages/:id', requireTeacher, async (req, res) => {
  try {
    const ok = await deleteMessageForTeacher(req.params.id, req.teacher.id);
    if (!ok) return res.status(404).json({ error: 'الرسالة غير موجودة' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'فشل حذف الرسالة' });
  }
});

// ─── Admin ───
app.post('/api/auth/admin/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (email?.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
    }
    const token = signAdminToken(ADMIN_EMAIL);
    res.json({ token, email: ADMIN_EMAIL });
  } catch (err) {
    res.status(500).json({ error: 'فشل تسجيل الدخول' });
  }
});

app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
  try {
    res.json(await getAdminOverview());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل البيانات' });
  }
});

app.post('/api/admin/roster/upload', requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'اختر ملف Excel' });
    const students = parseRosterExcel(req.file.buffer);
    const result = await replaceRoster(students);
    res.json({ ok: true, message: `تم رفع ${result.totalStudents} اسمًا`, ...result });
  } catch (err) {
    if (err.message === 'NO_STUDENTS') {
      return res.status(400).json({ error: 'لم يُعثر على أسماء في الملف' });
    }
    console.error(err);
    res.status(500).json({ error: 'فشل رفع الملف' });
  }
});

app.post('/api/admin/teachers', requireAdmin, async (req, res) => {
  try {
    const { email, password, fullName, assignments } = req.body;
    if (!email?.trim() || !password || password.length < 6) {
      return res.status(400).json({ error: 'البريد وكلمة المرور (6 أحرف+) مطلوبان' });
    }
    const existing = await findTeacherByEmail(email);
    if (existing) return res.status(409).json({ error: 'البريد مسجل مسبقًا' });

    const passwordHash = await hashPassword(password);
    const teacher = await createTeacher({ email, passwordHash, fullName });
    if (Array.isArray(assignments) && assignments.length) {
      await setTeacherAssignments(teacher.id, assignments.map((a) => ({
        subject: a.subject,
        grade: Number(a.grade),
        section: Number(a.section),
      })));
    }
    const saved = await findTeacherById(teacher.id);
    const teacherAssignments = await getTeacherAssignments(teacher.id);
    res.status(201).json({
      teacher: {
        id: saved.id,
        email: saved.email,
        fullName: saved.full_name || '',
        createdAt: saved.created_at,
        assignments: teacherAssignments,
      },
      password,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل إضافة المعلم' });
  }
});

app.put('/api/admin/teachers/:id', requireAdmin, async (req, res) => {
  try {
    const teacher = await findTeacherById(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'المعلم غير موجود' });

    const { email, fullName, assignments } = req.body;
    if (email) {
      const existing = await findTeacherByEmail(email);
      if (existing && existing.id !== req.params.id) {
        return res.status(409).json({ error: 'البريد مستخدم من معلم آخر' });
      }
    }

    const updated = await updateTeacher(req.params.id, {
      email: email || teacher.email,
      fullName: fullName ?? teacher.full_name,
    });

    if (Array.isArray(assignments)) {
      await setTeacherAssignments(req.params.id, assignments.map((a) => ({
        subject: a.subject,
        grade: Number(a.grade),
        section: Number(a.section),
      })));
    }

    const teacherAssignments = await getTeacherAssignments(req.params.id);
    res.json({
      teacher: {
        id: updated.id,
        email: updated.email,
        fullName: updated.full_name || '',
        createdAt: updated.created_at,
        assignments: teacherAssignments,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحديث المعلم' });
  }
});

app.put('/api/admin/teachers/:id/password', requireAdmin, async (req, res) => {
  try {
    const teacher = await findTeacherById(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'المعلم غير موجود' });

    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'كلمة المرور 6 أحرف على الأقل' });
    }

    await updateTeacherPassword(req.params.id, await hashPassword(password));
    res.json({ ok: true, password, message: 'تم تعيين كلمة المرور الجديدة' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تعيين كلمة المرور' });
  }
});

app.delete('/api/admin/teachers/:id', requireAdmin, async (req, res) => {
  try {
    const teacher = await findTeacherById(req.params.id);
    if (!teacher) return res.status(404).json({ error: 'المعلم غير موجود' });
    await deleteTeacher(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل حذف المعلم' });
  }
});

app.delete('/api/admin/submissions/:id', requireAdmin, async (req, res) => {
  try {
    const submission = await getSubmissionById(req.params.id);
    if (!submission) return res.status(404).json({ error: 'النتيجة غير موجودة' });
    await deleteSubmissionById(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل حذف النتيجة' });
  }
});

// ─── Admin messages ───
app.get('/api/admin/messages/inbox', requireAdmin, async (_req, res) => {
  try {
    res.json(await listAdminInbox());
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الوارد' });
  }
});

app.get('/api/admin/messages/outbox', requireAdmin, async (_req, res) => {
  try {
    res.json(await listAdminOutbox());
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الصادر' });
  }
});

app.get('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    const msg = await getMessageById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'الرسالة غير موجودة' });
    await markMessageReadByAdmin(req.params.id);
    const thread = await getThreadMessages(msg.threadId);
    res.json({ message: msg, thread });
  } catch (err) {
    res.status(500).json({ error: 'فشل تحميل الرسالة' });
  }
});

app.post('/api/admin/messages', requireAdmin, async (req, res) => {
  try {
    const { teacherId, subject, body } = req.body;
    if (!teacherId || !subject?.trim() || !body?.trim()) {
      return res.status(400).json({ error: 'المعلم والموضوع والنص مطلوبان' });
    }
    const teacher = await findTeacherById(teacherId);
    if (!teacher) return res.status(404).json({ error: 'المعلم غير موجود' });
    const msg = await createMessage({
      senderType: 'admin',
      teacherId,
      subject: subject.trim(),
      body: body.trim(),
    });
    res.status(201).json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل إرسال الرسالة' });
  }
});

app.post('/api/admin/messages/:id/reply', requireAdmin, async (req, res) => {
  try {
    const parent = await getMessageById(req.params.id);
    if (!parent) return res.status(404).json({ error: 'الرسالة غير موجودة' });
    const { body } = req.body;
    if (!body?.trim()) return res.status(400).json({ error: 'نص الرد مطلوب' });
    const msg = await createMessage({
      threadId: parent.threadId,
      parentId: parent.id,
      senderType: 'admin',
      teacherId: parent.teacherId,
      subject: `رد: ${parent.subject}`,
      body: body.trim(),
    });
    res.status(201).json(msg);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل إرسال الرد' });
  }
});

app.delete('/api/admin/messages/:id', requireAdmin, async (req, res) => {
  try {
    const msg = await getMessageById(req.params.id);
    if (!msg) return res.status(404).json({ error: 'الرسالة غير موجودة' });
    await deleteMessageForAdmin(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'فشل حذف الرسالة' });
  }
});

if (isProd) {
  const distPath = join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

await initDb();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
