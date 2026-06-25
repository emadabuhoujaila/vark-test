# اختبار VARK — الصف السابع (علوم)

تطبيق ويب لاختبار أنماط التعلم VARK مع **قاعدة بيانات مركزية** ولوحة معلم للتحليل والتصنيف.

## المتطلبات

- Node.js 18+
- npm

## التشغيل المحلي

```bash
# 1. نسخ إعدادات البيئة
copy .env.example .env

# 2. تثبيت الحزم
npm install

# 3. تشغيل الواجهة + الخادم معًا
npm run dev
```

- **الواجهة:** http://localhost:5173
- **الخادم (API):** http://localhost:3001

## قاعدة البيانات

| الوضع | الإعداد |
|--------|---------|
| **محلي (افتراضي)** | SQLite — يُنشأ تلقائيًا في `data/vark.db` |
| **إنتاج / سحابة** | PostgreSQL عبر `DATABASE_URL` في `.env` |

### PostgreSQL (Neon / Supabase / Railway)

```env
DATABASE_URL=postgresql://user:password@host:5432/vark_test
PGSSL=true
TEACHER_PIN=teacher2024
PORT=3001
NODE_ENV=production
```

## GitHub

### 1. إنشاء مستودع على GitHub

1. افتح https://github.com/new
2. اسم المستودع: `vark-test`
3. اختر **Private** أو **Public**
4. **لا** تضف README (موجود محليًا)

### 2. رفع المشروع

```bash
cd C:\Users\Emada\vark-test
git add .
git commit -m "Add VARK test with database API and teacher dashboard"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/vark-test.git
git push -u origin main
```

استبدل `YOUR_USERNAME` باسم حسابك على GitHub.

### 3. CI تلقائي

ملف `.github/workflows/ci.yml` يبني المشروع ويختبر الخادم عند كل push.

## النشر (Production)

```bash
npm run build
npm start
```

الخادم يقدّم الواجهة من `dist/` وواجهة API من `/api`.

## الاستخدام

| الدور | الرابط | ملاحظات |
|-------|--------|---------|
| الطالب | `/test` | 16 سؤالًا → النتيجة تُحفظ في قاعدة البيانات |
| المعلم | `/teacher` | الرمز الافتراضي: `teacher2024` |

## API

| Method | Path | الوصف |
|--------|------|--------|
| GET | `/api/health` | فحص الخادم |
| GET | `/api/submissions` | جميع النتائج |
| POST | `/api/submissions` | حفظ نتيجة طالب |
| DELETE | `/api/submissions/:id` | حذف (يتطلب `X-Teacher-Pin`) |
| POST | `/api/auth/verify` | التحقق من رمز المعلم |

## البنية

```
vark-test/
├── server/          # Express + SQLite/PostgreSQL
│   ├── index.js
│   ├── db.js
│   └── schema.sql
├── src/             # React (Vite)
├── data/            # SQLite (محلي — غير مرفوع لـ Git)
└── .github/         # CI
```
