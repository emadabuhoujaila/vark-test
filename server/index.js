import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import {
  initDb,
  getAllSubmissions,
  getSubmissionById,
  createSubmission,
  deleteSubmissionById,
  clearAllSubmissions,
  getTeacherPin,
  setTeacherPin,
  verifyTeacherPin,
  getRosterMeta,
  getRosterGrades,
  getRosterSections,
  getRosterStudents,
  replaceRoster,
  getRosterSummary,
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

app.get('/api/submissions', async (_req, res) => {
  try {
    const submissions = await getAllSubmissions();
    res.json(submissions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل النتائج' });
  }
});

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
    const {
      studentName,
      className,
      studentNumber,
      answers,
      scores,
      percentages,
      dominantStyles,
      profileLabel,
      profileType,
    } = req.body;
    if (!studentName?.trim() || !answers?.length) {
      return res.status(400).json({ error: 'بيانات غير مكتملة' });
    }
    const entry = await createSubmission({
      studentName: studentName.trim(),
      className: className?.trim() || '',
      studentNumber: studentNumber?.trim() || '',
      answers,
      scores,
      percentages,
      dominantStyles,
      profileLabel,
      profileType,
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
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل بيانات القائمة' });
  }
});

app.get('/api/roster/grades', async (_req, res) => {
  try {
    res.json(await getRosterGrades());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل الصفوف' });
  }
});

app.get('/api/roster/sections', async (req, res) => {
  try {
    const { grade } = req.query;
    if (!grade) return res.status(400).json({ error: 'حدد الصف' });
    res.json(await getRosterSections(grade));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل الشعب' });
  }
});

app.get('/api/roster/students', async (req, res) => {
  try {
    const { grade, section } = req.query;
    if (!grade || !section) return res.status(400).json({ error: 'حدد الصف والشعبة' });
    res.json(await getRosterStudents(grade, section));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل الأسماء' });
  }
});

app.get('/api/roster/summary', async (_req, res) => {
  try {
    res.json(await getRosterSummary());
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل تحميل ملخص القائمة' });
  }
});

app.post('/api/roster/upload', upload.single('file'), async (req, res) => {
  try {
    const pin = req.headers['x-teacher-pin'];
    if (!(await verifyTeacherPin(pin))) {
      return res.status(401).json({ error: 'رمز المعلم غير صحيح' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'يرجى اختيار ملف Excel (.xlsx)' });
    }
    const students = parseRosterExcel(req.file.buffer);
    const result = await replaceRoster(students);
    res.json({
      ok: true,
      message: `تم رفع ${result.totalStudents} اسمًا بنجاح`,
      ...result,
    });
  } catch (err) {
    if (err.message === 'NO_STUDENTS') {
      return res.status(400).json({ error: 'لم يُعثر على أسماء في الملف. تأكد من مطابقة نموذج سجل الأسماء.' });
    }
    if (err.message === 'INVALID_FILE_TYPE') {
      return res.status(400).json({ error: 'يجب أن يكون الملف بصيغة .xlsx' });
    }
    console.error(err);
    res.status(500).json({ error: 'فشل رفع الملف' });
  }
});

app.delete('/api/submissions/:id', async (req, res) => {
  try {
    const pin = req.headers['x-teacher-pin'];
    if (!(await verifyTeacherPin(pin))) {
      return res.status(401).json({ error: 'رمز المعلم غير صحيح' });
    }
    await deleteSubmissionById(req.params.id);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل الحذف' });
  }
});

app.delete('/api/submissions', async (req, res) => {
  try {
    const pin = req.headers['x-teacher-pin'];
    if (!(await verifyTeacherPin(pin))) {
      return res.status(401).json({ error: 'رمز المعلم غير صحيح' });
    }
    await clearAllSubmissions();
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل مسح النتائج' });
  }
});

app.post('/api/auth/verify', async (req, res) => {
  try {
    const valid = await verifyTeacherPin(req.body.pin);
    res.json({ valid });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل التحقق' });
  }
});

app.get('/api/settings/teacher-pin', async (req, res) => {
  try {
    const pin = req.headers['x-teacher-pin'];
    if (!(await verifyTeacherPin(pin))) {
      return res.status(401).json({ error: 'رمز المعلم غير صحيح' });
    }
    res.json({ pin: await getTeacherPin() });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'فشل قراءة الإعدادات' });
  }
});

app.put('/api/settings/teacher-pin', async (req, res) => {
  try {
    const { pin: newPin, currentPin } = req.body;
    if (!newPin || newPin.length < 4) {
      return res.status(400).json({ error: 'الرمز الجديد قصير جدًا' });
    }
    await setTeacherPin(newPin, currentPin);
    res.json({ ok: true, pin: newPin });
  } catch (err) {
    if (err.message === 'INVALID_CURRENT_PIN') {
      return res.status(401).json({ error: 'الرمز الحالي غير صحيح' });
    }
    console.error(err);
    res.status(500).json({ error: 'فشل تحديث الرمز' });
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
