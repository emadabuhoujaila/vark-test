CREATE TABLE IF NOT EXISTS submissions (
  id TEXT PRIMARY KEY,
  student_name TEXT NOT NULL,
  class_name TEXT,
  student_number TEXT,
  answers TEXT NOT NULL,
  scores TEXT NOT NULL,
  percentages TEXT NOT NULL,
  dominant_styles TEXT NOT NULL,
  profile_label TEXT,
  profile_type TEXT,
  submitted_at TEXT NOT NULL,
  subject TEXT
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  grade INTEGER NOT NULL,
  section INTEGER NOT NULL,
  student_number TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT
);

CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS teacher_assignments (
  id TEXT PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  grade INTEGER NOT NULL,
  section INTEGER NOT NULL,
  UNIQUE(teacher_id, subject, grade, section)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_profile_type ON submissions(profile_type);
CREATE INDEX IF NOT EXISTS idx_students_grade_section ON students(grade, section);
CREATE INDEX IF NOT EXISTS idx_teacher_assignments_teacher ON teacher_assignments(teacher_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  parent_id TEXT,
  sender_type TEXT NOT NULL,
  teacher_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  read_by_admin_at TEXT,
  read_by_teacher_at TEXT,
  admin_deleted_at TEXT,
  teacher_deleted_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_teacher ON messages(teacher_id);
CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
