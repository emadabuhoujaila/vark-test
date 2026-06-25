import XLSX from 'xlsx';

export function parseRosterExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const students = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

    let defaultGrade;
    let defaultSection;
    const match = sheetName.match(/^(\d+)-(\d+)$/);
    if (match) {
      defaultGrade = parseInt(match[1], 10);
      defaultSection = parseInt(match[2], 10);
    }

    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 5) continue;

      const joined = row.map((c) => String(c)).join(' ');
      if (joined.includes('اسم الطالب') || joined === 'م') continue;

      const nameAr = String(row[4] ?? '').trim();
      if (!nameAr) continue;

      const grade = parseInt(row[1], 10) || defaultGrade;
      const section = parseInt(row[2], 10) || defaultSection;
      if (!grade || !section) continue;

      students.push({
        grade,
        section,
        studentNumber: String(row[3] ?? '').trim(),
        nameAr,
        nameEn: String(row[5] ?? '').trim(),
      });
    }
  }

  if (students.length === 0) {
    throw new Error('NO_STUDENTS');
  }

  return students;
}
