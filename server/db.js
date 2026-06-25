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
       (id, student_name, class_name, answers, scores, percentages, dominant_styles, profile_label, profile_type, submitted_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      payload
    );
  } else {
    sqlite.prepare(
      `INSERT INTO submissions
       (id, student_name, class_name, answers, scores, percentages, dominant_styles, profile_label, profile_type, submitted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?)`
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
