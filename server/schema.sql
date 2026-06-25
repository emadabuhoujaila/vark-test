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
  submitted_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  grade INTEGER NOT NULL,
  section INTEGER NOT NULL,
  student_number TEXT,
  name_ar TEXT NOT NULL,
  name_en TEXT
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_submissions_submitted_at ON submissions(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_submissions_profile_type ON submissions(profile_type);
CREATE INDEX IF NOT EXISTS idx_students_grade_section ON students(grade, section);
