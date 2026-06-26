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
    studentNumber: row.student_number || '',
    subject: row.subject || '',
    answers: typeof row.answers === 'string' ? JSON.parse(row.answers) : row.answers,
    scores: typeof row.scores === 'string' ? JSON.parse(row.scores) : row.scores,
    percentages: typeof row.percentages === 'string' ? JSON.parse(row.percentages) : row.percentages,
    dominantStyles: typeof row.dominant_styles === 'string'
      ? JSON.parse(row.dominant_styles)
      : row.dominant_styles,
    profileLabel: row.profile_label,
    profileType: row.profile_type,
    submittedAt: row.submitted_at,
    timedOut: Boolean(row.timed_out),
    answeredCount: row.answered_count ?? (typeof row.answers === 'string'
      ? JSON.parse(row.answers).length
      : row.answers?.length ?? 0),
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
  const answeredCount = data.answeredCount ?? data.answers?.length ?? 0;
  const payload = [
    id,
    data.studentName,
    data.className || '',
    data.studentNumber || '',
    data.subject || '',
    JSON.stringify(data.answers),
    JSON.stringify(data.scores),
    JSON.stringify(data.percentages),
    JSON.stringify(data.dominantStyles),
    data.profileLabel,
    data.profileType,
    submittedAt,
    data.timedOut ? 1 : 0,
    answeredCount,
  ];

  if (usePostgres) {
    await pool.query(
      `INSERT INTO submissions
       (id, student_name, class_name, student_number, subject, answers, scores, percentages, dominant_styles, profile_label, profile_type, submitted_at, timed_out, answered_count)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      payload
    );
  } else {
    sqlite.prepare(
      `INSERT INTO submissions
       (id, student_name, class_name, student_number, subject, answers, scores, percentages, dominant_styles, profile_label, profile_type, submitted_at, timed_out, answered_count)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`
    ).run(...payload);
  }

  return {
    id,
    submittedAt,
    ...data,
    answeredCount,
  };
}

export async function findExistingSubmission({ studentName, studentNumber, className, subject }) {
  const normalizedSubject = subject || 'science';
  const allSubs = await getAllSubmissions();
  return allSubs.find((s) => {
    if (s.className !== className) return false;
    const subSubject = s.subject || 'science';
    if (subSubject !== normalizedSubject) return false;
    if (studentNumber && s.studentNumber === studentNumber) return true;
    return s.studentName === studentName;
  }) || null;
}

export async function teacherCanDeleteSubmission(teacherId, submission) {
  const assignments = await getTeacherAssignments(teacherId);
  const { formatClassName } = await import('./constants.js');
  const subSubject = submission.subject || 'science';
  return assignments.some((a) => {
    const className = formatClassName(a.grade, a.section);
    return className === submission.className && a.subject === subSubject;
  });
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
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS subject TEXT`);
    await pool.query(teacherTables.replace(/TEXT PRIMARY KEY/g, 'TEXT PRIMARY KEY').replace(/UNIQUE\(teacher_id/g, 'UNIQUE(teacher_id'));
    // PostgreSQL needs separate statements
    await pool.query(`CREATE TABLE IF NOT EXISTS teachers (
      id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      full_name TEXT, created_at TEXT NOT NULL)`);
    await pool.query(`CREATE TABLE IF NOT EXISTS teacher_assignments (
      id TEXT PRIMARY KEY, teacher_id TEXT NOT NULL, subject TEXT NOT NULL,
      grade INTEGER NOT NULL, section INTEGER NOT NULL,
      UNIQUE(teacher_id, subject, grade, section))`);
    await pool.query(`CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, parent_id TEXT,
      sender_type TEXT NOT NULL, teacher_id TEXT NOT NULL,
      subject TEXT NOT NULL, body TEXT NOT NULL,
      read_by_admin_at TEXT, read_by_teacher_at TEXT,
      admin_deleted_at TEXT, teacher_deleted_at TEXT,
      created_at TEXT NOT NULL)`);
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_teacher ON messages(teacher_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id)');
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS timed_out INTEGER DEFAULT 0`);
    await pool.query(`ALTER TABLE submissions ADD COLUMN IF NOT EXISTS answered_count INTEGER`);
    return;
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS students (
      id TEXT PRIMARY KEY, grade INTEGER NOT NULL, section INTEGER NOT NULL,
      student_number TEXT, name_ar TEXT NOT NULL, name_en TEXT
    )
  `);
  try { sqlite.exec('ALTER TABLE submissions ADD COLUMN student_number TEXT'); } catch { /* ok */ }
  try { sqlite.exec('ALTER TABLE submissions ADD COLUMN subject TEXT'); } catch { /* ok */ }
  sqlite.exec(teacherTables);
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY, thread_id TEXT NOT NULL, parent_id TEXT,
      sender_type TEXT NOT NULL, teacher_id TEXT NOT NULL,
      subject TEXT NOT NULL, body TEXT NOT NULL,
      read_by_admin_at TEXT, read_by_teacher_at TEXT,
      admin_deleted_at TEXT, teacher_deleted_at TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_messages_teacher ON messages(teacher_id);
    CREATE INDEX IF NOT EXISTS idx_messages_thread ON messages(thread_id);
  `);
  try { sqlite.exec('ALTER TABLE submissions ADD COLUMN timed_out INTEGER DEFAULT 0'); } catch { /* ok */ }
  try { sqlite.exec('ALTER TABLE submissions ADD COLUMN answered_count INTEGER'); } catch { /* ok */ }
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

export async function updateTeacher(id, { email, fullName }) {
  const normalizedEmail = email?.trim().toLowerCase();
  if (usePostgres) {
    await pool.query(
      'UPDATE teachers SET email = $1, full_name = $2 WHERE id = $3',
      [normalizedEmail, fullName || '', id]
    );
  } else {
    sqlite.prepare('UPDATE teachers SET email = ?, full_name = ? WHERE id = ?')
      .run(normalizedEmail, fullName || '', id);
  }
  return findTeacherById(id);
}

export async function updateTeacherPassword(id, passwordHash) {
  if (usePostgres) {
    await pool.query('UPDATE teachers SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
  } else {
    sqlite.prepare('UPDATE teachers SET password_hash = ? WHERE id = ?').run(passwordHash, id);
  }
}

export async function deleteTeacher(id) {
  if (usePostgres) {
    await pool.query('DELETE FROM teacher_assignments WHERE teacher_id = $1', [id]);
    await pool.query('DELETE FROM teachers WHERE id = $1', [id]);
  } else {
    sqlite.prepare('DELETE FROM teacher_assignments WHERE teacher_id = ?').run(id);
    sqlite.prepare('DELETE FROM teachers WHERE id = ?').run(id);
  }
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

function matchSubmission(student, submission, className, subject) {
  if (submission.className !== className) return false;
  if (subject) {
    const subSubject = submission.subject || 'science';
    if (subSubject !== subject) return false;
  }
  if (student.studentNumber && submission.studentNumber === student.studentNumber) return true;
  return submission.studentName === student.nameAr;
}

export async function getSubjectAvailability(grade, section, studentNumber, studentName) {
  const { SUBJECT_IDS, SUBJECT_NAMES, SUBJECTS_WITH_QUESTIONS, formatClassName } = await import('./constants.js');
  const className = formatClassName(Number(grade), Number(section));

  let assigned;
  if (usePostgres) {
    const { rows } = await pool.query(
      'SELECT DISTINCT subject FROM teacher_assignments WHERE grade = $1 AND section = $2',
      [Number(grade), Number(section)]
    );
    assigned = new Set(rows.map((r) => r.subject));
  } else {
    assigned = new Set(
      sqlite.prepare(
        'SELECT DISTINCT subject FROM teacher_assignments WHERE grade = ? AND section = ?'
      ).all(Number(grade), Number(section)).map((r) => r.subject)
    );
  }

  const allSubs = await getAllSubmissions();
  const classSubs = allSubs.filter((s) => s.className === className);

  return SUBJECT_IDS.map((id) => {
    const hasTeacher = assigned.has(id);
    const hasQuestions = SUBJECTS_WITH_QUESTIONS.includes(id);
    let status = 'waiting';
    if (hasTeacher && hasQuestions) status = 'open';
    else if (hasTeacher && !hasQuestions) status = 'soon';
    else status = 'waiting';

    const existing = classSubs.find((s) => {
      const subSubject = s.subject || 'science';
      if (subSubject !== id) return false;
      if (studentNumber && s.studentNumber === studentNumber) return true;
      if (studentName && s.studentName === studentName) return true;
      return false;
    });

    if (existing) status = 'done';

    return {
      id,
      name: SUBJECT_NAMES[id],
      status,
      submissionId: existing?.id || null,
    };
  });
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
      const sub = allSubmissions.find((s) => matchSubmission(st, s, className, a.subject));
      return {
        ...st,
        completed: Boolean(sub),
        submissionId: sub?.id || null,
        profileLabel: sub?.profileLabel || null,
        submission: sub
          ? {
              id: sub.id,
              scores: sub.scores,
              percentages: sub.percentages,
              dominantStyles: sub.dominantStyles,
              profileLabel: sub.profileLabel,
              profileType: sub.profileType,
              submittedAt: sub.submittedAt,
            }
          : null,
      };
    });
    const sectionSubmissions = allSubmissions.filter(
      (s) => s.className === className && (s.subject || 'science') === a.subject
    );
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
  const assignmentKeys = new Set();
  for (const t of teachers) {
    for (const a of t.assignments) {
      registeredSubjects.add(a.subject);
      assignmentKeys.add(`${a.grade}-${a.section}-${a.subject}`);
    }
  }

  const subjectStatus = SUBJECT_IDS.map((id) => ({
    id,
    registered: registeredSubjects.has(id),
    teacherCount: teachers.filter((t) => t.assignments.some((a) => a.subject === id)).length,
  }));

  const subjectMatrix = summary.grades.map((g) => ({
    grade: g.grade,
    sections: g.sections.map(({ section, count }) => ({
      section,
      studentCount: count,
      subjects: SUBJECT_IDS.map((id) => ({
        id,
        registered: assignmentKeys.has(`${g.grade}-${section}-${id}`),
      })),
    })),
  }));

  return {
    roster: meta,
    summary,
    totalTeachers: teachers.length,
    totalSubmissions: submissions.length,
    teachers,
    subjectStatus,
    subjectMatrix,
    submissions,
  };
}

// ─── Messages (admin ↔ teacher) ───

function mapMessageRow(row, teacher = null) {
  if (!row) return null;
  return {
    id: row.id,
    threadId: row.thread_id,
    parentId: row.parent_id || null,
    senderType: row.sender_type,
    teacherId: row.teacher_id,
    teacherName: teacher?.full_name || teacher?.fullName || '',
    teacherEmail: teacher?.email || '',
    subject: row.subject,
    body: row.body,
    readByAdminAt: row.read_by_admin_at || null,
    readByTeacherAt: row.read_by_teacher_at || null,
    createdAt: row.created_at,
  };
}

async function enrichMessages(rows) {
  const cache = new Map();
  const out = [];
  for (const row of rows) {
    let teacher = cache.get(row.teacher_id);
    if (!teacher) {
      teacher = await findTeacherById(row.teacher_id);
      cache.set(row.teacher_id, teacher);
    }
    out.push(mapMessageRow(row, teacher));
  }
  return out;
}

export async function createMessage({ threadId, parentId, senderType, teacherId, subject, body }) {
  const id = randomUUID();
  const createdAt = new Date().toISOString();
  const actualThreadId = threadId || id;

  if (usePostgres) {
    await pool.query(
      `INSERT INTO messages
       (id, thread_id, parent_id, sender_type, teacher_id, subject, body, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [id, actualThreadId, parentId || null, senderType, teacherId, subject, body, createdAt]
    );
  } else {
    sqlite.prepare(
      `INSERT INTO messages
       (id, thread_id, parent_id, sender_type, teacher_id, subject, body, created_at)
       VALUES (?,?,?,?,?,?,?,?)`
    ).run(id, actualThreadId, parentId || null, senderType, teacherId, subject, body, createdAt);
  }
  return getMessageById(id);
}

export async function getMessageById(id) {
  let row;
  if (usePostgres) {
    const { rows } = await pool.query('SELECT * FROM messages WHERE id = $1', [id]);
    row = rows[0];
  } else {
    row = sqlite.prepare('SELECT * FROM messages WHERE id = ?').get(id);
  }
  if (!row) return null;
  const teacher = await findTeacherById(row.teacher_id);
  return mapMessageRow(row, teacher);
}

export async function getThreadMessages(threadId) {
  let rows;
  if (usePostgres) {
    const { rows: r } = await pool.query(
      'SELECT * FROM messages WHERE thread_id = $1 ORDER BY created_at ASC',
      [threadId]
    );
    rows = r;
  } else {
    rows = sqlite.prepare(
      'SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC'
    ).all(threadId);
  }
  return enrichMessages(rows);
}

export async function listAdminInbox() {
  const sql = `
    SELECT * FROM messages
    WHERE sender_type = 'teacher' AND admin_deleted_at IS NULL
    ORDER BY created_at DESC
  `;
  const rows = usePostgres
    ? (await pool.query(sql)).rows
    : sqlite.prepare(sql).all();
  return enrichMessages(rows);
}

export async function listAdminOutbox() {
  const sql = `
    SELECT * FROM messages
    WHERE sender_type = 'admin' AND admin_deleted_at IS NULL
    ORDER BY created_at DESC
  `;
  const rows = usePostgres
    ? (await pool.query(sql)).rows
    : sqlite.prepare(sql).all();
  return enrichMessages(rows);
}

export async function listTeacherInbox(teacherId) {
  if (usePostgres) {
    const { rows } = await pool.query(
      `SELECT * FROM messages
       WHERE sender_type = 'admin' AND teacher_id = $1 AND teacher_deleted_at IS NULL
       ORDER BY created_at DESC`,
      [teacherId]
    );
    return enrichMessages(rows);
  }
  const rows = sqlite.prepare(
    `SELECT * FROM messages
     WHERE sender_type = 'admin' AND teacher_id = ? AND teacher_deleted_at IS NULL
     ORDER BY created_at DESC`
  ).all(teacherId);
  return enrichMessages(rows);
}

export async function listTeacherOutbox(teacherId) {
  if (usePostgres) {
    const { rows } = await pool.query(
      `SELECT * FROM messages
       WHERE sender_type = 'teacher' AND teacher_id = $1 AND teacher_deleted_at IS NULL
       ORDER BY created_at DESC`,
      [teacherId]
    );
    return enrichMessages(rows);
  }
  const rows = sqlite.prepare(
    `SELECT * FROM messages
     WHERE sender_type = 'teacher' AND teacher_id = ? AND teacher_deleted_at IS NULL
     ORDER BY created_at DESC`
  ).all(teacherId);
  return enrichMessages(rows);
}

export async function markMessageReadByAdmin(id) {
  const now = new Date().toISOString();
  if (usePostgres) {
    await pool.query(
      'UPDATE messages SET read_by_admin_at = COALESCE(read_by_admin_at, $1) WHERE id = $2',
      [now, id]
    );
  } else {
    sqlite.prepare(
      'UPDATE messages SET read_by_admin_at = COALESCE(read_by_admin_at, ?) WHERE id = ?'
    ).run(now, id);
  }
}

export async function markMessageReadByTeacher(id, teacherId) {
  const now = new Date().toISOString();
  if (usePostgres) {
    await pool.query(
      `UPDATE messages SET read_by_teacher_at = COALESCE(read_by_teacher_at, $1)
       WHERE id = $2 AND teacher_id = $3`,
      [now, id, teacherId]
    );
  } else {
    sqlite.prepare(
      `UPDATE messages SET read_by_teacher_at = COALESCE(read_by_teacher_at, ?)
       WHERE id = ? AND teacher_id = ?`
    ).run(now, id, teacherId);
  }
}

export async function deleteMessageForAdmin(id) {
  const now = new Date().toISOString();
  if (usePostgres) {
    await pool.query(
      `UPDATE messages SET admin_deleted_at = $1, teacher_deleted_at = $1 WHERE id = $2`,
      [now, id]
    );
  } else {
    sqlite.prepare(
      'UPDATE messages SET admin_deleted_at = ?, teacher_deleted_at = ? WHERE id = ?'
    ).run(now, now, id);
  }
}

export async function deleteMessageForTeacher(id, teacherId) {
  const now = new Date().toISOString();
  if (usePostgres) {
    const { rowCount } = await pool.query(
      `UPDATE messages SET teacher_deleted_at = $1 WHERE id = $2 AND teacher_id = $3`,
      [now, id, teacherId]
    );
    return rowCount > 0;
  }
  const result = sqlite.prepare(
    'UPDATE messages SET teacher_deleted_at = ? WHERE id = ? AND teacher_id = ?'
  ).run(now, id, teacherId);
  return result.changes > 0;
}

export async function createPasswordResetRequest(email) {
  const teacher = await findTeacherByEmail(email);
  if (!teacher) return { ok: true, sent: false };

  const name = teacher.full_name || teacher.email;
  await createMessage({
    senderType: 'teacher',
    teacherId: teacher.id,
    subject: 'طلب استعادة كلمة المرور',
    body: `طلب المعلم/ة ${name} (${teacher.email}) استعادة كلمة المرور.\nيرجى تعيين كلمة مرور جديدة من لوحة المعلمين ثم إبلاغه/ها.`,
  });
  return { ok: true, sent: true };
}
