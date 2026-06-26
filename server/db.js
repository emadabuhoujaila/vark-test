import Database from 'better-sqlite3';
import pg from 'pg';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';

const __dirname = dirname(fileURLToPath(import.meta.url));
const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
const DEFAULT_PIN = process.env.TEACHER_PIN || 'teacher2024';

const usePostgres = Boolean(process.env.DATABASE_URL);
let sqlite;
let pool;

function rowToSubmission(row) {
  return {
    id: row.id,
    studentName: row.student_name,
    className: row.class_name || '',
    answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
    scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores,
    percentages: typeof row.percentages === 'string' ? JSON.parse(row.percentages) : row.percentages,
    dominantStyles: typeof row.dominant_styles === 'string'
      ? JSON.parse(row.dominant_styles)
      : row.dominant_styles,
    profileLabel: row.profile_label,
    profileType: row.profile_type,
    submittedAt: row.submitted_at,
  };
}

export async function initDb() {
  if (usePostgres) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    await pool.query(schema.replace(/IF NOT EXISTS/gi, 'IF NOT EXISTS'));
    const pinRow = await pool.query('SELECT value FROM settings WHERE key = $1', ['teacher_pin']);
    if (pinRow.rowCount === 0) {
      await pool.query('INSERT INTO settings (key, value) VALUES ($1, $2)', ['teacher_pin', DEFAULT_PIN]);
    }
    await runMigrations();
    console.log('Connected to PostgreSQL');
    return;
  }

  const dataDir = join(__dirname, '..', 'data');
  if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
  sqlite = new Database(join(dataDir, 'vark.db'));
  sqlite.pragma('journal_mode = WAL');
  sqlite.exec(schema);
  const pinRow = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get('teacher_pin');
  if (!pinRow) {
    sqlite.prepare('INSERT INTO settings (key, value) VALUES (?, ?)').run('teacher_pin', DEFAULT_PIN);
  }
  await runMigrations();
  console.log('Using SQLite database at data/vark.db');
}

export async function getAllSubmissions() {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM submissions ORDER BY submitted_at DESC');
    return rows.map(rowToSubmission);
  }
  const rows = sqlite.prepare('SELECT * FROM submissions ORDER BY submitted_at DESC').all();
  return rows.map(rowToSubmission);
}

export async function getSubmissionById(id) {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM submissions WHERE id = $1', [id]);
    return rows[0] ? rowToSubmission(rows[0]) : null;
  }
  const row = sqlite.prepare('SELECT * FROM submissions WHERE id = ?').get(id);
  return row ? rowToSubmission(row) : null;
}

export async function createSubmission(data) {
  const id = randomUUID();
  const submittedAt = new Date().toISOString();
  const payload = [
    id,
    data.studentName,
    data.className || '',
    data.studentNumber || '',
    JSON.stringify(data.answers),
    JSON.stringify(data.scores),
    JSON.stringify(data.percentages),
    JSON.stringify(data.dominantStyles),
    data.profileLabel,
    data.profileType,
    submittedAt,
  ];

  if (usePostgres) {
    await pool.query(
      `INSERT INTO submissions
       (id, student_name, class_name, student_number, answers, scores, percentages, dominant_styles, profile_label, profile_type, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      payload
    );
  } else {
    sqlite.prepare(
      `INSERT INTO submissions
       (id, student_name, class_name, student_number, answers, scores, percentages, dominant_styles, profile_label, profile_type, submitted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    ).run(...payload);
  }

  return {
    id,
    submittedAt,
    ...data,
  };
}

export async function deleteSubmissionById(id) {
  if (usePostgres) {
    await pool.query('DELETE FROM submissions WHERE id = $1', [id]);
    return;
  }
  sqlite.prepare('DELETE FROM submissions WHERE id = ?').run(id);
}

export async function clearAllSubmissions() {
  if (usePostgres) {
    await pool.query('DELETE FROM submissions');
    return;
  }
  sqlite.prepare('DELETE FROM submissions').run();
}

export async function getTeacherPin() {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT value FROM settings WHERE key = $1', ['teacher_pin']);
    return rows[0]?.value || DEFAULT_PIN;
  }
  const row = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get('teacher_pin');
  return row?.value || DEFAULT_PIN;
}

export async function setTeacherPin(newPin, currentPin) {
  const existing = await getTeacherPin();
  if (existing !== currentPin) {
    throw new Error('INVALID_CURRENT_PIN');
  }
  if (usePostgres) {
    await pool.query(
      'INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = $2',
      ['teacher_pin', newPin]
    );
  } else {
    sqlite.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('teacher_pin', newPin);
  }
}

export async function verifyTeacherPin(pin) {
  const stored = await getTeacherPin();
  return stored === pin;
}

async function runMigrations() {
  const teacherTables = `
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
  `;

  if (usePostgres) {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS students (
        id TEXT PRIMARY KEY,
        grade INTEGER NOT NULL,
        section INTEGER NOT NULL,
        student_number TEXT,
        name_ar TEXT NOT NULL,
        name_en TEXT
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_students_grade_section ON students(grade, section)`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS student_number TEXT`);
    await pool.query(teacherTables.replace(/TEXT PRIMARY KEY/g, 'TEXT PRIMARY KEY').replace(/UNIQUE\(teacher_id/g, 'UNIQUE(teacher_id'));
    // PostgreSQL needs separate statements
    await pool.query(`CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      full_name TEXT, created_at TEXT NOT NULL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS teacher_assignments (
      id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, subject TEXT NOT NULL,
      grade INTEGER NOT NULL, section INTEGER NOT NULL,
      UNIQUE(teacher_id, subject, grade, section))`);
    return;
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY, grade INTEGER NOT NULL, section INTEGER NOT NULL,
      student_number TEXT, name_ar TEXT NOT NULL, name_en TEXT
    )
  `);
  try { sqlite.exec('ALTER TABLE submissions ADD COLUMN student_number TEXT'); } catch { /* ok */ }
  sqlite.exec(teacherTables);
}

export async function getRosterMeta() {
  if (usePostgres) {
    const countRes = await pool.query('SELECT COUNT(*)::int AS count FROM students');
    const settingRes = await pool.query(
      'SELECT value FROM settings WHERE key = $1',
      ['roster_uploaded_at']
    );
    const gradesRes = await pool.query(
      'SELECT DISTINCT grade FROM students ORDER BY grade'
    );
    return {
      totalStudents: countRes.rows[0]?.count || 0,
      uploadedAt: settingRes.rows[0]?.value || null,
      grades: gradesRes.rows.map((r) => r.grade),
    };
  }

  const countRow = sqlite.prepare('SELECT COUNT(*) AS count FROM students').get();
  const settingRow = sqlite.prepare('SELECT value FROM settings WHERE key = ?').get('roster_uploaded_at');
  const gradeRows = sqlite.prepare('SELECT DISTINCT grade FROM students ORDER BY grade').all();
  return {
    totalStudents: countRow?.count || 0,
    uploadedAt: settingRow?.value || null,
    grades: gradeRows.map((r) => r.grade),
  };
}

export async function getRosterGrades() {
  const meta = await getRosterMeta();
  return meta.grades;
}

export async function getRosterSections(grade) {
  const g = parseInt(grade, 10);
  if (usePostgres) {
    const { rows } = await pool.query(
      'SELECT DISTINCT section FROM students WHERE grade = $1 ORDER BY section',
      [g]
    );
    return rows.map((r) => r.section);
  }
  return sqlite
    .prepare('SELECT DISTINCT section FROM students WHERE grade = ? ORDER BY section')
    .all(g)
    .map((r) => r.section);
}

export async function getRosterStudents(grade, section) {
  const g = parseInt(grade, 10);
  const s = parseInt(section, 10);
  if (usePostgres) {
    const { rows } = await pool.query(
      `SELECT student_number, name_ar, name_en
       FROM students WHERE grade = $1 AND section = $2
       ORDER BY name_ar`,
      [g, s]
    );
    return rows.map((r) => ({
      studentNumber: r.student_number || '',
      nameAr: r.name_ar,
      nameEn: r.name_en || '',
    }));
  }
  const rows = sqlite
    .prepare(
      `SELECT student_number, name_ar, name_en
       FROM students WHERE grade = ? AND section = ?
       ORDER BY name_ar`
    )
    .all(g, s);
  return rows.map((r) => ({
    studentNumber: r.student_number || '',
    nameAr: r.name_ar,
    nameEn: r.name_en || '',
  }));
}

export async function getRosterSummary() {
  const query = `
    SELECT grade, section, COUNT(*) AS count
    FROM students
    GROUP BY grade, section
    ORDER BY grade, section
  `;

  let rows;
  if (usePostgres) {
    const result = await pool.query(query);
    rows = result.rows;
  } else {
    rows = sqlite.prepare(query).all();
  }

  const byGrade = {};
  for (const row of rows) {
    const grade = Number(row.grade);
    const section = Number(row.section);
    const count = Number(row.count);
    if (!byGrade[grade]) byGrade[grade] = { grade, sections: [], total: 0 };
    byGrade[grade].sections.push({ section, count });
    byGrade[grade].total += count;
  }

  return {
    totalStudents: rows.reduce((sum, r) => sum + Number(r.count), 0),
    grades: Object.values(byGrade).sort((a, b) => a.grade - b.grade),
  };
}

export async function replaceRoster(students) {
  const uploadedAt = new Date().toISOString();

  if (usePostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM students');
      for (const st of students) {
        await client.query(
          `INSERT INTO students (id, grade, section, student_number, name_ar, name_en)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [randomUUID(), st.grade, st.section, st.studentNumber, st.nameAr, st.nameEn]
        );
      }
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = $2`,
        ['roster_uploaded_at', uploadedAt]
      );
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    return { totalStudents: students.length, uploadedAt };
  }

  const insert = sqlite.prepare(
    `INSERT INTO students (id, grade, section, student_number, name_ar, name_en)
     VALUES (?, ?, ?, ?, ?, ?)`
  );
  const replaceAll = sqlite.transaction((list) => {
    sqlite.prepare('DELETE FROM students').run();
    for (const st of list) {
      insert.run(randomUUID(), st.grade, st.section, st.studentNumber, st.nameAr, st.nameEn);
    }
    sqlite.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(
      'roster_uploaded_at',
      uploadedAt
    );
  });
  replaceAll(students);
  return { totalStudents: students.length, uploadedAt };
}

// ─── Teachers ───

export async function createTeacher({ email, passwordHash, fullName }) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const normalizedEmail = email.trim().toLowerCase();

  if (usePostgres) {
    await pool.query(
      `INSERT INTO teachers (id, email, password_hash, full_name, created_at) VALUES ($1,$2,$3,$4,$5)`,
      [id, normalizedEmail, passwordHash, fullName || '', createdAt]
    );
  } else {
    sqlite.prepare(
      `INSERT INTO teachers (id, email, password_hash, full_name, created_at) VALUES (?,?,?,?,?)`
    ).run(id, normalizedEmail, passwordHash, fullName || '', createdAt);
  }
  return { id, email: normalizedEmail, fullName: fullName || '', createdAt };
}

export async function findTeacherByEmail(email) {
  const normalizedEmail = email.trim().toLowerCase();
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM teachers WHERE email = $1', [normalizedEmail]);
    return rows[0] || null;
  }
  return sqlite.prepare('SELECT * FROM teachers WHERE email = ?').get(normalizedEmail) || null;
}

export async function findTeacherById(id) {
  if (usePostgres) {
    const { rows } = await pool.query('SELECT id, email, full_name, created_at FROM teachers WHERE id = $1', [id]);
    return rows[0] || null;
  }
  return sqlite.prepare('SELECT id, email, full_name, created_at FROM teachers WHERE id = ?').get(id) || null;
}

export async function setTeacherAssignments(teacherId, assignments) {
  if (usePostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM teacher_assignments WHERE teacher_id = $1', [teacherId]);
      for (const a of assignments) {
        await client.query(
          `INSERT INTO teacher_assignments (id, teacher_id, subject, grade, section) VALUES ($1,$2,$3,$4,$5)`,
          [randomUUID(), teacherId, a.subject, a.grade, a.section]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return;
  }
  const tx = sqlite.transaction((list) => {
    sqlite.prepare('DELETE FROM teacher_assignments WHERE teacher_id = ?').run(teacherId);
    const ins = sqlite.prepare(
      'INSERT INTO teacher_assignments (id, teacher_id, subject, grade, section) VALUES (?,?,?,?,?)'
    );
    for (const a of list) {
      ins.run(randomUUID(), teacherId, a.subject, a.grade, a.section);
    }
  });
  tx(assignments);
}

export async function getTeacherAssignments(teacherId) {
  const query = 'SELECT subject, grade, section FROM teacher_assignments WHERE teacher_id = ? ORDER BY subject, grade, section';
  if (usePostgres) {
    const { rows } = await pool.query(
      'SELECT subject, grade, section FROM teacher_assignments WHERE teacher_id = $1 ORDER BY subject, grade, section',
      [teacherId]
    );
    return rows.map((r) => ({ subject: r.subject, grade: Number(r.grade), section: Number(r.section) }));
  }
  return sqlite.prepare(query.replace('?', '?')).all(teacherId)
    .map((r) => ({ subject: r.subject, grade: r.grade, section: r.section }));
}

export async function getAllTeachersWithAssignments() {
  let teachers;
  if (usePostgres) {
    const { rows } = await pool.query('SELECT id, email, full_name, created_at FROM teachers ORDER BY created_at DESC');
    teachers = rows;
  } else {
    teachers = sqlite.prepare('SELECT id, email, full_name, created_at FROM teachers ORDER BY created_at DESC').all();
  }
  const result = [];
  for (const t of teachers) {
    const assignments = await getTeacherAssignments(t.id);
    result.push({
      id: t.id,
      email: t.email,
      fullName: t.full_name || '',
      createdAt: t.created_at,
      assignments,
    });
  }
  return result;
}

function matchSubmission(student, submission, className) {
  if (submission.className !== className) return false;
  if (student.studentNumber && submission.studentNumber === student.studentNumber) return true;
  return submission.studentName === student.nameAr;
}

export async function getTeacherDashboard(teacherId) {
  const { formatClassName } = await import('./constants.js');
  const assignments = await getTeacherAssignments(teacherId);
  const allSubmissions = await getAllSubmissions();
  const groups = [];

  for (const a of assignments) {
    const students = await getRosterStudents(a.grade, a.section);
    const className = formatClassName(a.grade, a.section);
    const studentsWithStatus = students.map((st) => {
      const sub = allSubmissions.find((s) => matchSubmission(st, s, className));
      return {
        ...st,
        completed: Boolean(sub),
        submissionId: sub?.id || null,
        profileLabel: sub?.profileLabel || null,
      };
    });
    const sectionSubmissions = allSubmissions.filter((s) => s.className === className);
    groups.push({
      subject: a.subject,
      grade: a.grade,
      section: a.section,
      className,
      totalStudents: studentsWithStatus.length,
      completedCount: studentsWithStatus.filter((s) => s.completed).length,
      students: studentsWithStatus,
      submissions: sectionSubmissions,
    });
  }
  return { groups };
}

export async function getAdminOverview() {
  const { SUBJECT_IDS } = await import('./constants.js');
  const meta = await getRosterMeta();
  const summary = await getRosterSummary();
  const teachers = await getAllTeachersWithAssignments();
  const submissions = await getAllSubmissions();

  const registeredSubjects = new Set();
  for (const t of teachers) {
    for (const a of t.assignments) registeredSubjects.add(a.subject);
  }

  const subjectStatus = SUBJECT_IDS.map((id) => ({
    id,
    registered: registeredSubjects.has(id),
    teacherCount: teachers.filter((t) => t.assignments.some((a) => a.subject === id)).length,
  }));

  return {
    roster: meta,
    summary,
    totalTeachers: teachers.length,
    totalSubmissions: submissions.length,
    teachers,
    subjectStatus,
    submissions,
  };
}
