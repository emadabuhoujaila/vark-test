import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { signTeacherToken } from './auth.js';
import { requireTeacher } from './middleware.js';
import {
  initDb,
  getSubmissionById,
  createSubmission,
  verifyTeacherPin,
  getSchoolOverview,
  getTeacherFullDashboard,
  getSectionExportCsv,
  getRosterMeta,
  getRosterGrades,
  getRosterSections,
  getRosterStudents,
  replaceRoster,
  deleteSubmissionById,
} from './db.js';
import { parseRosterExcel } from './rosterParser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

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

// ─── Teacher (PIN) ───
app.post('/api/auth/teacher/login', async (req, res) => {
  try {
    const { pin } = req.body;
    if (!pin || !(await verifyTeacherPin(pin))) {
      return res.status(401).json({ error: 'كلمة السر غير صحيحة' });
    }
    const token = signTeacherToken();
    res.json({ token, ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تسجيل الدخول' });
  }
});

app.get('/api/teacher/overview', requireTeacher, async (_req, res) => {
  try {
    res.json(await getSchoolOverview());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل البيانات' });
  }
});

app.get('/api/teacher/dashboard', requireTeacher, async (_req, res) => {
  try {
    res.json(await getTeacherFullDashboard());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل لوحة المعلم' });
  }
});

app.get('/api/teacher/export', requireTeacher, async (req, res) => {
  try {
    const { grade, section } = req.query;
    if (!grade || !section) return res.status(400).json({ error: 'حدد الصف والشعبة' });
    const { csv, filename } = await getSectionExportCsv(Number(grade), Number(section));
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تصدير الملف' });
  }
});

app.post('/api/teacher/roster/upload', requireTeacher, upload.single('file'), async (req, res) => {
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

app.delete('/api/teacher/submissions/:id', requireTeacher, async (req, res) => {
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
