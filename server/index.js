import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import db from './db.js';
import { seedIfEmpty } from './seed.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;
const SECRET = process.env.JWT_SECRET || 'madrasa-secret-change-me';

seedIfEmpty();

app.use(cors());
app.use(express.json({ limit: '5mb' }));

const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'অননুমোদিত — লগইন করুন' });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'সেশন শেষ — আবার লগইন করুন' });
  }
};

const gradeOf = (p) => {
  if (p >= 80) return 'A+';
  if (p >= 70) return 'A';
  if (p >= 60) return 'A-';
  if (p >= 50) return 'B';
  if (p >= 40) return 'C';
  if (p >= 33) return 'D';
  return 'F';
};

const currentMonth = () => new Date().toISOString().slice(0, 7);

/* ---------- Auth ---------- */
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password || '', user.password_hash)) {
    return res.status(401).json({ error: 'ভুল ইউজারনেম বা পাসওয়ার্ড' });
  }
  const token = jwt.sign({ id: user.id, name: user.name, role: user.role }, SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
});

app.use('/api', auth);

/* ---------- Classes ---------- */
app.get('/api/classes', (req, res) => {
  res.json(db.prepare(`
    SELECT c.*, (SELECT COUNT(*) FROM students s WHERE s.class_id = c.id AND s.status = 'active') AS student_count
    FROM classes c ORDER BY c.sort_order, c.id
  `).all());
});

app.post('/api/classes', (req, res) => {
  const { name, sort_order = 0 } = req.body;
  if (!name) return res.status(400).json({ error: 'শ্রেণির নাম দিন' });
  try {
    const info = db.prepare('INSERT INTO classes (name, sort_order) VALUES (?, ?)').run(name, sort_order);
    res.json(db.prepare('SELECT * FROM classes WHERE id = ?').get(info.lastInsertRowid));
  } catch {
    res.status(400).json({ error: 'এই নামে শ্রেণি আগেই আছে' });
  }
});

app.put('/api/classes/:id', (req, res) => {
  const { name, sort_order } = req.body;
  const cls = db.prepare('SELECT * FROM classes WHERE id = ?').get(req.params.id);
  if (!cls) return res.status(404).json({ error: 'শ্রেণি পাওয়া যায়নি' });
  db.prepare('UPDATE classes SET name = ?, sort_order = ? WHERE id = ?')
    .run(name ?? cls.name, sort_order ?? cls.sort_order, cls.id);
  res.json(db.prepare('SELECT * FROM classes WHERE id = ?').get(cls.id));
});

app.delete('/api/classes/:id', (req, res) => {
  const count = db.prepare("SELECT COUNT(*) AS c FROM students WHERE class_id = ?").get(req.params.id).c;
  if (count > 0) return res.status(400).json({ error: 'এই শ্রেণিতে শিক্ষার্থী আছে, ডিলিট করা যাবে না' });
  db.prepare('DELETE FROM classes WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------- Students ---------- */
app.get('/api/students', (req, res) => {
  const { class_id, q, status = 'active' } = req.query;
  let sql = `SELECT s.*, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE 1=1`;
  const args = [];
  if (class_id) { sql += ' AND s.class_id = ?'; args.push(class_id); }
  if (status && status !== 'all') { sql += ' AND s.status = ?'; args.push(status); }
  if (q) { sql += ' AND (s.name LIKE ? OR s.father_name LIKE ? OR s.phone LIKE ? OR s.birth_reg_no LIKE ?)'; const like = `%${q}%`; args.push(like, like, like, like); }
  sql += ' ORDER BY s.class_id, s.roll, s.name';
  res.json(db.prepare(sql).all(...args));
});

app.post('/api/students', (req, res) => {
  const b = req.body;
  if (!b.name || !b.class_id) return res.status(400).json({ error: 'নাম ও শ্রেণি আবশ্যক' });
  const info = db.prepare(`
    INSERT INTO students (name, father_name, mother_name, dob, birth_reg_no, address, class_id, roll, phone, photo, monthly_fee, admission_date, status)
    VALUES (@name, @father_name, @mother_name, @dob, @birth_reg_no, @address, @class_id, @roll, @phone, @photo, @monthly_fee, @admission_date, 'active')
  `).run({
    name: b.name, father_name: b.father_name || '', mother_name: b.mother_name || '',
    dob: b.dob || null, birth_reg_no: b.birth_reg_no || '', address: b.address || '',
    class_id: b.class_id, roll: b.roll || null, phone: b.phone || '',
    photo: b.photo || null, monthly_fee: b.monthly_fee || 0,
    admission_date: b.admission_date || new Date().toISOString().slice(0, 10),
  });
  res.json(db.prepare('SELECT * FROM students WHERE id = ?').get(info.lastInsertRowid));
});

app.get('/api/students/:id', (req, res) => {
  const s = db.prepare(`
    SELECT s.*, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ?
  `).get(req.params.id);
  if (!s) return res.status(404).json({ error: 'শিক্ষার্থী পাওয়া যায়নি' });
  s.fees = db.prepare('SELECT * FROM fees WHERE student_id = ? ORDER BY month').all(s.id);
  res.json(s);
});

app.put('/api/students/:id', (req, res) => {
  const b = req.body;
  const s = db.prepare('SELECT * FROM students WHERE id = ?').get(req.params.id);
  if (!s) return res.status(404).json({ error: 'শিক্ষার্থী পাওয়া যায়নি' });
  db.prepare(`
    UPDATE students SET name=@name, father_name=@father_name, mother_name=@mother_name, dob=@dob,
      birth_reg_no=@birth_reg_no, address=@address, class_id=@class_id, roll=@roll, phone=@phone,
      photo=@photo, monthly_fee=@monthly_fee, admission_date=@admission_date, status=@status
    WHERE id=@id
  `).run({
    name: b.name ?? s.name, father_name: b.father_name ?? s.father_name, mother_name: b.mother_name ?? s.mother_name,
    dob: b.dob ?? s.dob, birth_reg_no: b.birth_reg_no ?? s.birth_reg_no, address: b.address ?? s.address,
    class_id: b.class_id ?? s.class_id, roll: b.roll ?? s.roll, phone: b.phone ?? s.phone,
    photo: b.photo !== undefined ? b.photo : s.photo, monthly_fee: b.monthly_fee ?? s.monthly_fee,
    admission_date: b.admission_date ?? s.admission_date, status: b.status ?? s.status, id: s.id,
  });
  res.json(db.prepare('SELECT * FROM students WHERE id = ?').get(s.id));
});

app.delete('/api/students/:id', (req, res) => {
  db.prepare('DELETE FROM students WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------- Teachers ---------- */
app.get('/api/teachers', (req, res) => {
  const { status = 'active' } = req.query;
  let sql = 'SELECT * FROM teachers WHERE 1=1';
  const args = [];
  if (status !== 'all') { sql += ' AND status = ?'; args.push(status); }
  res.json(db.prepare(sql + ' ORDER BY name').all(...args));
});

app.post('/api/teachers', (req, res) => {
  const b = req.body;
  if (!b.name) return res.status(400).json({ error: 'নাম আবশ্যক' });
  const info = db.prepare(`
    INSERT INTO teachers (name, designation, phone, address, monthly_salary, join_date, status)
    VALUES (@name, @designation, @phone, @address, @monthly_salary, @join_date, 'active')
  `).run({
    name: b.name, designation: b.designation || '', phone: b.phone || '', address: b.address || '',
    monthly_salary: b.monthly_salary || 0, join_date: b.join_date || new Date().toISOString().slice(0, 10),
  });
  res.json(db.prepare('SELECT * FROM teachers WHERE id = ?').get(info.lastInsertRowid));
});

app.put('/api/teachers/:id', (req, res) => {
  const b = req.body;
  const t = db.prepare('SELECT * FROM teachers WHERE id = ?').get(req.params.id);
  if (!t) return res.status(404).json({ error: 'শিক্ষক পাওয়া যায়নি' });
  db.prepare(`
    UPDATE teachers SET name=@name, designation=@designation, phone=@phone, address=@address,
      monthly_salary=@monthly_salary, join_date=@join_date, status=@status WHERE id=@id
  `).run({
    name: b.name ?? t.name, designation: b.designation ?? t.designation, phone: b.phone ?? t.phone,
    address: b.address ?? t.address, monthly_salary: b.monthly_salary ?? t.monthly_salary,
    join_date: b.join_date ?? t.join_date, status: b.status ?? t.status, id: t.id,
  });
  res.json(db.prepare('SELECT * FROM teachers WHERE id = ?').get(t.id));
});

app.delete('/api/teachers/:id', (req, res) => {
  db.prepare('DELETE FROM teachers WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------- Attendance ---------- */
app.get('/api/attendance/students', (req, res) => {
  const { class_id, date } = req.query;
  const students = db.prepare(`
    SELECT s.id, s.name, s.roll, a.status FROM students s
    LEFT JOIN attendance_students a ON a.student_id = s.id AND a.date = ?
    WHERE s.class_id = ? AND s.status = 'active' ORDER BY s.roll, s.name
  `).all(date, class_id);
  res.json(students);
});

const upsertAttendance = (table, col) => db.prepare(`
  INSERT INTO ${table} (${col}, date, status) VALUES (?, ?, ?)
  ON CONFLICT(${col}, date) DO UPDATE SET status = excluded.status
`);

app.post('/api/attendance/students', (req, res) => {
  const { date, entries } = req.body;
  if (!date || !Array.isArray(entries)) return res.status(400).json({ error: 'তারিখ ও এন্ট্রি আবশ্যক' });
  const up = upsertAttendance('attendance_students', 'student_id');
  const tx = db.transaction(() => {
    for (const e of entries) up.run(e.student_id, date, e.status);
  });
  tx();
  res.json({ ok: true, saved: entries.length });
});

app.get('/api/attendance/teachers', (req, res) => {
  const { date } = req.query;
  res.json(db.prepare(`
    SELECT t.id, t.name, t.designation, a.status FROM teachers t
    LEFT JOIN attendance_teachers a ON a.teacher_id = t.id AND a.date = ?
    WHERE t.status = 'active' ORDER BY t.name
  `).all(date));
});

app.post('/api/attendance/teachers', (req, res) => {
  const { date, entries } = req.body;
  const up = upsertAttendance('attendance_teachers', 'teacher_id');
  const tx = db.transaction(() => {
    for (const e of entries) up.run(e.teacher_id, date, e.status);
  });
  tx();
  res.json({ ok: true, saved: entries.length });
});

app.get('/api/attendance/report', (req, res) => {
  const { class_id, month } = req.query;
  const students = db.prepare(`
    SELECT s.id, s.name, s.roll, s.admission_date,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) AS absent,
      SUM(CASE WHEN a.status = 'leave' THEN 1 ELSE 0 END) AS leave,
      COUNT(a.status) AS total
    FROM students s
    LEFT JOIN attendance_students a ON a.student_id = s.id AND substr(a.date, 1, 7) = ?
    WHERE s.class_id = ? AND s.status = 'active'
    GROUP BY s.id ORDER BY s.roll, s.name
  `).all(month, class_id);
  res.json(students.map(s => ({
    ...s,
    rate: s.total ? Math.round((s.present / s.total) * 100) : null,
  })));
});

/* ---------- Fees ---------- */
app.get('/api/fees/status', (req, res) => {
  const { class_id, month } = req.query;
  const students = db.prepare(`
    SELECT s.id, s.name, s.roll, s.monthly_fee, f.id AS fee_id, f.amount AS paid, f.paid_date, f.method, f.note
    FROM students s
    LEFT JOIN fees f ON f.student_id = s.id AND f.month = ?
    WHERE s.class_id = ? AND s.status = 'active' AND s.admission_date <= ?
    ORDER BY s.roll, s.name
  `).all(month, class_id, month + '-99');
  res.json(students);
});

app.get('/api/fees/history', (req, res) => {
  const { student_id } = req.query;
  res.json(db.prepare(`
    SELECT f.*, s.name AS student_name, c.name AS class_name FROM fees f
    JOIN students s ON s.id = f.student_id LEFT JOIN classes c ON c.id = s.class_id
    WHERE f.student_id = ? ORDER BY f.month
  `).all(student_id));
});

app.post('/api/fees', (req, res) => {
  const { student_id, month, amount, method = 'cash', note = '' } = req.body;
  if (!student_id || !month) return res.status(400).json({ error: 'শিক্ষার্থী ও মাস আবশ্যক' });
  const student = db.prepare('SELECT * FROM students WHERE id = ?').get(student_id);
  if (!student) return res.status(404).json({ error: 'শিক্ষার্থী পাওয়া যায়নি' });
  const a = db.prepare(`
    INSERT INTO fees (student_id, month, amount, paid_date, method, note)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(student_id, month) DO UPDATE SET amount = excluded.amount, paid_date = excluded.paid_date, method = excluded.method, note = excluded.note
  `).run(student_id, month, amount ?? student.monthly_fee, new Date().toISOString().slice(0, 10), method, note);
  const fee = db.prepare('SELECT * FROM fees WHERE id = ?').get(a.lastInsertRowid);
  res.json({ fee, student: { id: student.id, name: student.name }, madrasa: 'মাদরাসা' });
});

app.delete('/api/fees/:id', (req, res) => {
  db.prepare('DELETE FROM fees WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/fees/dues', (req, res) => {
  const { class_id } = req.query;
  const cur = currentMonth();
  const students = db.prepare(`
    SELECT s.id, s.name, s.roll, s.monthly_fee, s.admission_date, c.name AS class_name
    FROM students s LEFT JOIN classes c ON c.id = s.class_id
    WHERE s.status = 'active' AND s.admission_date <= ? ${class_id ? 'AND s.class_id = ?' : ''}
    ORDER BY s.class_id, s.roll, s.name
  `).all(...(class_id ? [cur, class_id] : [cur]));
  const paidStmt = db.prepare('SELECT month FROM fees WHERE student_id = ?');
  const startMonth = (d) => (d || cur).slice(0, 7);
  const result = students.map(s => {
    const paid = new Set(paidStmt.all(s.id).map(r => r.month));
    const dueMonths = [];
    let [y, m] = startMonth(s.admission_date).split('-').map(Number);
    while (`${y}-${String(m).padStart(2, '0')}` <= cur) {
      const mo = `${y}-${String(m).padStart(2, '0')}`;
      if (!paid.has(mo)) dueMonths.push(mo);
      const next = m === 12 ? [y + 1, 1] : [y, m + 1];
      [y, m] = next;
    }
    return { ...s, due_months: dueMonths, due_amount: dueMonths.length * s.monthly_fee };
  }).filter(s => s.due_months.length > 0);
  res.json(result);
});

/* ---------- Salaries ---------- */
app.get('/api/salaries', (req, res) => {
  const { month } = req.query;
  res.json(db.prepare(`
    SELECT t.id, t.name, t.designation, t.monthly_salary, sa.id AS salary_id, sa.amount AS paid, sa.paid_date, sa.note
    FROM teachers t
    LEFT JOIN salaries sa ON sa.teacher_id = t.id AND sa.month = ?
    WHERE t.status = 'active' ORDER BY t.name
  `).all(month));
});

app.post('/api/salaries', (req, res) => {
  const { teacher_id, month, amount, note = '' } = req.body;
  const t = db.prepare('SELECT * FROM teachers WHERE id = ?').get(teacher_id);
  if (!t) return res.status(404).json({ error: 'শিক্ষক পাওয়া যায়নি' });
  const a = db.prepare(`
    INSERT INTO salaries (teacher_id, month, amount, paid_date, note)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(teacher_id, month) DO UPDATE SET amount = excluded.amount, paid_date = excluded.paid_date, note = excluded.note
  `).run(teacher_id, month, amount ?? t.monthly_salary, new Date().toISOString().slice(0, 10), note);
  res.json({ salary: db.prepare('SELECT * FROM salaries WHERE id = ?').get(a.lastInsertRowid), teacher: { id: t.id, name: t.name, designation: t.designation } });
});

app.delete('/api/salaries/:id', (req, res) => {
  db.prepare('DELETE FROM salaries WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

/* ---------- Exams & Results ---------- */
const parseSubjects = (exam) => {
  let subjects;
  try { subjects = JSON.parse(exam.subjects); } catch { subjects = []; }
  return Array.isArray(subjects) ? subjects : [];
};

app.get('/api/exams', (req, res) => {
  res.json(db.prepare(`
    SELECT e.*, c.name AS class_name FROM exams e LEFT JOIN classes c ON c.id = e.class_id ORDER BY e.year DESC, e.id DESC
  `).all().map(e => ({ ...e, subjects: parseSubjects(e) })));
});

app.post('/api/exams', (req, res) => {
  const { name, class_id, year, subjects } = req.body;
  if (!name || !class_id || !Array.isArray(subjects) || subjects.length === 0) {
    return res.status(400).json({ error: 'পরীক্ষার নাম, শ্রেণি ও অন্তত একটি বিষয় আবশ্যক' });
  }
  const info = db.prepare('INSERT INTO exams (name, class_id, year, subjects) VALUES (?, ?, ?, ?)')
    .run(name, class_id, year || new Date().getFullYear(), JSON.stringify(subjects));
  res.json(db.prepare('SELECT * FROM exams WHERE id = ?').get(info.lastInsertRowid));
});

app.delete('/api/exams/:id', (req, res) => {
  db.prepare('DELETE FROM exams WHERE id = ?').run(req.params.id);
  res.json({ ok: true });
});

app.get('/api/exams/:id', (req, res) => {
  const exam = db.prepare(`
    SELECT e.*, c.name AS class_name FROM exams e LEFT JOIN classes c ON c.id = e.class_id WHERE e.id = ?
  `).get(req.params.id);
  if (!exam) return res.status(404).json({ error: 'পরীক্ষা পাওয়া যায়নি' });
  exam.subjects = parseSubjects(exam);
  res.json(exam);
});

app.get('/api/exams/:id/marks', (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: 'পরীক্ষা পাওয়া যায়নি' });
  const { subject } = req.query;
  const students = db.prepare(`
    SELECT s.id, s.name, s.roll, m.marks FROM students s
    LEFT JOIN marks m ON m.student_id = s.id AND m.exam_id = ? AND m.subject = ?
    WHERE s.class_id = ? AND s.status = 'active' AND s.admission_date <= ? ORDER BY s.roll, s.name
  `).all(exam.id, subject, exam.class_id, currentMonth() + '-99');
  res.json(students);
});

app.post('/api/exams/:id/marks', (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: 'পরীক্ষা পাওয়া যায়নি' });
  const { subject, entries } = req.body;
  const up = db.prepare(`
    INSERT INTO marks (exam_id, student_id, subject, marks) VALUES (?, ?, ?, ?)
    ON CONFLICT(exam_id, student_id, subject) DO UPDATE SET marks = excluded.marks
  `);
  const tx = db.transaction(() => {
    for (const e of entries) up.run(exam.id, e.student_id, subject, e.marks ?? null);
  });
  tx();
  res.json({ ok: true, saved: entries.length });
});

const buildResult = (exam) => {
  const subjects = parseSubjects(exam);
  const students = db.prepare(`
    SELECT s.id, s.name, s.roll FROM students s
    WHERE s.class_id = ? AND s.status = 'active' AND s.admission_date <= ? ORDER BY s.roll, s.name
  `).all(exam.class_id, currentMonth() + '-99');
  const markStmt = db.prepare('SELECT subject, marks FROM marks WHERE exam_id = ? AND student_id = ?');
  const rows = students.map(s => {
    const got = {};
    let total = 0, totalFull = 0, failed = false;
    for (const sub of subjects) {
      const m = markStmt.all(exam.id, s.id).find(r => r.subject === sub.name);
      const val = m ? m.marks : null;
      got[sub.name] = val;
      if (val != null) {
        total += val;
        const full = sub.full || 100;
        totalFull += full;
        if (val < full * 0.33) failed = true;
      }
    }
    const percent = totalFull ? Math.round((total / totalFull) * 100) : null;
    return { student_id: s.id, name: s.name, roll: s.roll, marks: got, total, totalFull: totalFull || subjects.reduce((a, x) => a + (x.full || 100), 0), percent, grade: percent != null ? gradeOf(percent) : null, failed };
  });
  rows.sort((a, b) => (b.percent ?? -1) - (a.percent ?? -1));
  rows.forEach((r, i) => {
    r.rank = (r.percent == null || r.failed) ? null : i + 1;
    if (r.failed) r.grade = 'F';
  });
  return rows;
};

app.get('/api/exams/:id/results', (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: 'পরীক্ষা পাওয়া যায়নি' });
  const classRow = db.prepare('SELECT name FROM classes WHERE id = ?').get(exam.class_id);
  res.json({ exam: { ...exam, subjects: parseSubjects(exam), class_name: classRow?.name }, results: buildResult(exam) });
});

app.get('/api/exams/:id/marksheet/:studentId', (req, res) => {
  const exam = db.prepare('SELECT * FROM exams WHERE id = ?').get(req.params.id);
  if (!exam) return res.status(404).json({ error: 'পরীক্ষা পাওয়া যায়নি' });
  const student = db.prepare(`
    SELECT s.*, c.name AS class_name FROM students s LEFT JOIN classes c ON c.id = s.class_id WHERE s.id = ?
  `).get(req.params.studentId);
  if (!student) return res.status(404).json({ error: 'শিক্ষার্থী পাওয়া যায়নি' });
  const all = buildResult(exam);
  const row = all.find(r => r.student_id === student.id);
  res.json({
    exam: { id: exam.id, name: exam.name, year: exam.year, subjects: parseSubjects(exam), class_name: student.class_name },
    student,
    result: row,
  });
});

app.get('/api/fees/:id', (req, res) => {
  const fee = db.prepare(`
    SELECT f.*, s.name AS student_name, s.roll, c.name AS class_name FROM fees f
    JOIN students s ON s.id = f.student_id LEFT JOIN classes c ON c.id = s.class_id
    WHERE f.id = ?
  `).get(req.params.id);
  if (!fee) return res.status(404).json({ error: 'রশিদ পাওয়া যায়নি' });
  res.json({ fee, student: { id: fee.student_id, name: fee.student_name, roll: fee.roll, class_name: fee.class_name } });
});

app.get('/api/salaries/:id', (req, res) => {
  const salary = db.prepare(`
    SELECT sa.*, t.name AS teacher_name, t.designation FROM salaries sa
    JOIN teachers t ON t.id = sa.teacher_id WHERE sa.id = ?
  `).get(req.params.id);
  if (!salary) return res.status(404).json({ error: 'রশিদ পাওয়া যায়নি' });
  res.json({ salary, teacher: { id: salary.teacher_id, name: salary.teacher_name, designation: salary.designation } });
});

/* ---------- Dashboard ---------- */
app.get('/api/dashboard', (req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const month = currentMonth();
  const counts = {
    students: db.prepare("SELECT COUNT(*) AS c FROM students WHERE status = 'active'").get().c,
    teachers: db.prepare("SELECT COUNT(*) AS c FROM teachers WHERE status = 'active'").get().c,
    classes: db.prepare('SELECT COUNT(*) AS c FROM classes').get().c,
    exams: db.prepare('SELECT COUNT(*) AS c FROM exams').get().c,
  };
  const att = db.prepare(`
    SELECT SUM(s.present) AS present, SUM(s.absent) AS absent, SUM(s.leave) AS leave FROM (
      SELECT CASE status WHEN 'present' THEN 1 ELSE 0 END AS present, CASE status WHEN 'absent' THEN 1 ELSE 0 END AS absent, CASE status WHEN 'leave' THEN 1 ELSE 0 END AS leave
      FROM attendance_students WHERE date = ?
    ) s
  `).get(today);
  const feeMonth = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS collected, COUNT(*) AS payments FROM fees WHERE month = ?
  `).get(month);
  const salaryMonth = db.prepare('SELECT COALESCE(SUM(amount), 0) AS paid FROM salaries WHERE month = ?').get(month);
  const recentAdmissions = db.prepare(`
    SELECT s.id, s.name, s.admission_date, c.name AS class_name FROM students s
    LEFT JOIN classes c ON c.id = s.class_id WHERE s.status = 'active' ORDER BY s.admission_date DESC, s.id DESC LIMIT 5
  `).all();
  res.json({ counts, attendance: att, feeMonth, salaryMonth, recentAdmissions });
});

/* ---------- Static client ---------- */
const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get(/^(?!\/api).*/, (req, res) => res.sendFile(path.join(distDir, 'index.html')));
}

app.listen(PORT, () => console.log(`✅ সার্ভার চালু: http://localhost:${PORT}`));
