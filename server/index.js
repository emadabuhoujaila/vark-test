import 'dotenv/config';
import express from 'express';
import cors from 'cors';
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
} from './db.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

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
    const { studentName, className, answers, scores, percentages, dominantStyles, profileLabel, profileType } = req.body;
    if (!studentName?.trim() || !answers?.length) {
      return res.status(400).json({ error: 'بيانات غير مكتملة' });
    }
    const entry = await createSubmission({
      studentName: studentName.trim(),
      className: className?.trim() || '',
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
  app.get('*', (_req, res) => {
    res.sendFile(join(distPath, 'index.html'));
  });
}

await initDb();

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
