import Dexie from 'dexie';
import bcrypt from 'bcryptjs';
import { seedDemoData } from './seed.js';

const TOKEN_KEY = 'mms_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t) => (t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY));

export const db = new Dexie('madrasa_offline');
db.version(1).stores({
  users: '++id, &username',
  classes: '++id, &name',
  students: '++id, class_id',
  teachers: '++id',
  attendanceStudents: '++id, date, [student_id+date]',
  attendanceTeachers: '++id, date, [teacher_id+date]',
  fees: '++id, student_id, month, [student_id+month]',
  salaries: '++id, teacher_id, month, [teacher_id+month]',
  exams: '++id, class_id',
  marks: '++id, exam_id, student_id, [exam_id+student_id+subject]',
});

let readyPromise = null;
const ready = () => {
  if (!readyPromise) {
    readyPromise = db.open().then(async () => {
      if ((await db.users.count()) === 0) await seedDemoData(db);
    });
  }
  return readyPromise;
};

const fail = (status, message) => ({ status, message });
const monthNow = () => new Date().toISOString().slice(0, 7);
const dayNow = () => new Date().toISOString().slice(0, 10);
const gradeOf = (p) => (p >= 80 ? 'A+' : p >= 70 ? 'A' : p >= 60 ? 'A-' : p >= 50 ? 'B' : p >= 40 ? 'C' : p >= 33 ? 'D' : 'F');
const parseSubjects = (exam) => {
  try {
    const s = JSON.parse(exam.subjects);
    return Array.isArray(s) ? s : [];
  } catch {
    return [];
  }
};
const nextMonth = (ym) => {
  let [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};
const byClassOrder = (a, b) => a.class_id - b.class_id || (a.roll || 0) - (b.roll || 0) || a.name.localeCompare(b.name);

const classOf = async (s) => {
  if (s.class_id == null) return { ...s, class_name: null };
  const c = await db.classes.get(s.class_id);
  return { ...s, class_name: c ? c.name : null };
};

async function buildResult(exam) {
  const subjects = parseSubjects(exam);
  const students = (await db.students.toArray())
    .filter((s) => s.class_id === exam.class_id && s.status === 'active' && (s.admission_date || '') <= monthNow() + '-99')
    .sort((a, b) => (a.roll || 0) - (b.roll || 0) || a.name.localeCompare(b.name));
  const allMarks = await db.marks.where('exam_id').equals(exam.id).toArray();
  const rows = students.map((s) => {
    const mine = allMarks.filter((m) => m.student_id === s.id);
    const got = {};
    let total = 0, totalFull = 0, failed = false;
    for (const sub of subjects) {
      const m = mine.find((r) => r.subject === sub.name);
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
    r.rank = r.percent == null || r.failed ? null : i + 1;
    if (r.failed) r.grade = 'F';
  });
  return rows;
}

export async function api(path, { method = 'GET', body } = {}) {
  await ready();
  const [route, qs] = path.split('?');
  const params = Object.fromEntries(new URLSearchParams(qs || ''));
  const seg = route.split('/').filter(Boolean);

  try {
    /* ---------- Auth ---------- */
    if (route === '/login') {
      const user = await db.users.where('username').equals(body?.username || '').first();
      if (!user || !bcrypt.compareSync(body?.password || '', user.password_hash)) throw fail(401, 'ভুল ইউজারনেম বা পাসওয়ার্ড');
      const payload = JSON.stringify({ id: user.id, name: user.name, role: user.role });
      return { token: btoa(String.fromCharCode(...new TextEncoder().encode(payload))), user: { id: user.id, name: user.name, role: user.role } };
    }

    if (!getToken()) throw fail(401, 'লগইন প্রয়োজন');

    /* ---------- Classes ---------- */
    if (route === '/classes' && method === 'GET') {
      const [classes, students] = await Promise.all([db.classes.toArray(), db.students.toArray()]);
      return classes
        .sort((a, b) => a.sort_order - b.sort_order || a.id - b.id)
        .map((c) => ({ ...c, student_count: students.filter((s) => s.class_id === c.id && s.status === 'active').length }));
    }
    if (route === '/classes' && method === 'POST') {
      if (!body?.name) throw fail(400, 'শ্রেণির নাম দিন');
      if (await db.classes.where('name').equals(body.name).first()) throw fail(400, 'এই নামে শ্রেণি আগেই আছে');
      const id = await db.classes.add({ name: body.name, sort_order: body.sort_order ?? 0 });
      return db.classes.get(id);
    }
    if (seg[0] === 'classes' && seg[1] && method === 'PUT') {
      const cls = await db.classes.get(+seg[1]);
      if (!cls) throw fail(404, 'শ্রেণি পাওয়া যায়নি');
      const updated = { ...cls, name: body.name ?? cls.name, sort_order: body.sort_order ?? cls.sort_order };
      await db.classes.put(updated);
      return updated;
    }
    if (seg[0] === 'classes' && seg[1] && method === 'DELETE') {
      const count = (await db.students.where('class_id').equals(+seg[1]).toArray()).length;
      if (count > 0) throw fail(400, 'এই শ্রেণিতে শিক্ষার্থী আছে, ডিলিট করা যাবে না');
      await db.classes.delete(+seg[1]);
      return { ok: true };
    }

    /* ---------- Students ---------- */
    if (route === '/students' && method === 'GET') {
      let list = await db.students.toArray();
      if (params.class_id) list = list.filter((s) => s.class_id === +params.class_id);
      if (params.status && params.status !== 'all') list = list.filter((s) => s.status === params.status);
      if (params.q) {
        const q = params.q.toLowerCase();
        list = list.filter((s) => [s.name, s.father_name, s.phone, s.birth_reg_no].some((f) => (f || '').toLowerCase().includes(q)));
      }
      list.sort(byClassOrder);
      return Promise.all(list.map(classOf));
    }
    if (route === '/students' && method === 'POST') {
      if (!body?.name || !body?.class_id) throw fail(400, 'নাম ও শ্রেণি আবশ্যক');
      const id = await db.students.add({
        name: body.name,
        father_name: body.father_name || '',
        mother_name: body.mother_name || '',
        dob: body.dob || null,
        birth_reg_no: body.birth_reg_no || '',
        address: body.address || '',
        class_id: body.class_id,
        roll: body.roll || null,
        phone: body.phone || '',
        photo: body.photo || null,
        monthly_fee: body.monthly_fee || 0,
        admission_date: body.admission_date || dayNow(),
        status: 'active',
      });
      return db.students.get(id);
    }
    if (seg[0] === 'students' && seg[1] && method === 'GET') {
      const s = await db.students.get(+seg[1]);
      if (!s) throw fail(404, 'শিক্ষার্থী পাওয়া যায়নি');
      const withClass = await classOf(s);
      const fees = await db.fees.where('student_id').equals(s.id).toArray();
      fees.sort((a, b) => a.month.localeCompare(b.month));
      return { ...withClass, fees };
    }
    if (seg[0] === 'students' && seg[1] && method === 'PUT') {
      const s = await db.students.get(+seg[1]);
      if (!s) throw fail(404, 'শিক্ষার্থী পাওয়া যায়নি');
      const merged = { ...s, ...body, id: s.id };
      await db.students.put(merged);
      return merged;
    }
    if (seg[0] === 'students' && seg[1] && method === 'DELETE') {
      const sid = +seg[1];
      await db.transaction('rw', db.students, db.attendanceStudents, db.fees, db.marks, async () => {
        await db.students.delete(sid);
        await db.attendanceStudents.where('student_id').equals(sid).delete();
        await db.fees.where('student_id').equals(sid).delete();
        await db.marks.where('student_id').equals(sid).delete();
      });
      return { ok: true };
    }

    /* ---------- Teachers ---------- */
    if (route === '/teachers' && method === 'GET') {
      let list = await db.teachers.toArray();
      if (params.status !== 'all') list = list.filter((t) => t.status === 'active');
      return list.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (route === '/teachers' && method === 'POST') {
      if (!body?.name) throw fail(400, 'নাম আবশ্যক');
      const id = await db.teachers.add({
        name: body.name,
        designation: body.designation || '',
        phone: body.phone || '',
        address: body.address || '',
        monthly_salary: body.monthly_salary || 0,
        join_date: body.join_date || dayNow(),
        status: 'active',
      });
      return db.teachers.get(id);
    }
    if (seg[0] === 'teachers' && seg[1] && method === 'PUT') {
      const t = await db.teachers.get(+seg[1]);
      if (!t) throw fail(404, 'শিক্ষক পাওয়া যায়নি');
      const merged = { ...t, ...body, id: t.id };
      await db.teachers.put(merged);
      return merged;
    }
    if (seg[0] === 'teachers' && seg[1] && method === 'DELETE') {
      const tid = +seg[1];
      await db.transaction('rw', db.teachers, db.attendanceTeachers, db.salaries, async () => {
        await db.teachers.delete(tid);
        await db.attendanceTeachers.where('teacher_id').equals(tid).delete();
        await db.salaries.where('teacher_id').equals(tid).delete();
      });
      return { ok: true };
    }

    /* ---------- Attendance ---------- */
    if (route === '/attendance/students' && method === 'GET') {
      const date = params.date || dayNow();
      const students = (await db.students.where('class_id').equals(+params.class_id).toArray())
        .filter((s) => s.status === 'active')
        .sort((a, b) => (a.roll || 0) - (b.roll || 0) || a.name.localeCompare(b.name));
      return Promise.all(students.map(async (s) => {
        const a = await db.attendanceStudents.where('[student_id+date]').equals([s.id, date]).first();
        return { id: s.id, name: s.name, roll: s.roll, status: a ? a.status : null };
      }));
    }
    if (route === '/attendance/students' && method === 'POST') {
      for (const e of body?.entries || []) {
        const existing = await db.attendanceStudents.where('[student_id+date]').equals([e.student_id, body.date]).first();
        if (existing) await db.attendanceStudents.put({ ...existing, status: e.status });
        else await db.attendanceStudents.add({ student_id: e.student_id, date: body.date, status: e.status });
      }
      return { ok: true, saved: (body?.entries || []).length };
    }
    if (route === '/attendance/teachers' && method === 'GET') {
      const date = params.date || dayNow();
      const teachers = (await db.teachers.toArray()).filter((t) => t.status === 'active');
      return Promise.all(teachers.map(async (t) => {
        const a = await db.attendanceTeachers.where('[teacher_id+date]').equals([t.id, date]).first();
        return { id: t.id, name: t.name, designation: t.designation, status: a ? a.status : null };
      }));
    }
    if (route === '/attendance/teachers' && method === 'POST') {
      for (const e of body?.entries || []) {
        const existing = await db.attendanceTeachers.where('[teacher_id+date]').equals([e.teacher_id, body.date]).first();
        if (existing) await db.attendanceTeachers.put({ ...existing, status: e.status });
        else await db.attendanceTeachers.add({ teacher_id: e.teacher_id, date: body.date, status: e.status });
      }
      return { ok: true, saved: (body?.entries || []).length };
    }
    if (route === '/attendance/report' && method === 'GET') {
      const students = (await db.students.where('class_id').equals(+params.class_id).toArray()).filter((s) => s.status === 'active');
      const rows = await Promise.all(students.map(async (s) => {
        const att = (await db.attendanceStudents.where('student_id').equals(s.id).toArray()).filter((a) => a.date.slice(0, 7) === params.month);
        const present = att.filter((r) => r.status === 'present').length;
        const absent = att.filter((r) => r.status === 'absent').length;
        const leave = att.filter((r) => r.status === 'leave').length;
        return { id: s.id, name: s.name, roll: s.roll, admission_date: s.admission_date, present, absent, leave, total: att.length, rate: att.length ? Math.round((present / att.length) * 100) : null };
      }));
      return rows.sort((a, b) => (a.roll || 0) - (b.roll || 0) || a.name.localeCompare(b.name));
    }

    /* ---------- Fees ---------- */
    if (route === '/fees/dues' && method === 'GET') {
      const cur = monthNow();
      let students = (await db.students.toArray()).filter((s) => s.status === 'active' && (s.admission_date || cur).slice(0, 7) <= cur);
      if (params.class_id) students = students.filter((s) => s.class_id === +params.class_id);
      students.sort(byClassOrder);
      const result = [];
      for (const s of students) {
        const paid = new Set((await db.fees.where('student_id').equals(s.id).toArray()).map((f) => f.month));
        const dueMonths = [];
        let m = (s.admission_date || cur).slice(0, 7);
        while (m <= cur) {
          if (!paid.has(m)) dueMonths.push(m);
          m = nextMonth(m);
        }
        if (dueMonths.length > 0) {
          const withClass = await classOf(s);
          result.push({ ...withClass, due_months: dueMonths, due_amount: dueMonths.length * s.monthly_fee });
        }
      }
      return result;
    }

    if (route === '/fees/status' && method === 'GET') {
      const students = (await db.students.where('class_id').equals(+params.class_id).toArray())
        .filter((s) => s.status === 'active' && (s.admission_date || '') <= params.month + '-99')
        .sort((a, b) => (a.roll || 0) - (b.roll || 0) || a.name.localeCompare(b.name));
      return Promise.all(students.map(async (s) => {
        const f = await db.fees.where('[student_id+month]').equals([s.id, params.month]).first();
        return { id: s.id, name: s.name, roll: s.roll, monthly_fee: s.monthly_fee, fee_id: f ? f.id : null, paid: f ? f.amount : null, paid_date: f ? f.paid_date : null, method: f ? f.method : null, note: f ? f.note : null };
      }));
    }
    if (route === '/fees/history' && method === 'GET') {
      const rows = await db.fees.where('student_id').equals(+params.student_id).toArray();
      rows.sort((a, b) => a.month.localeCompare(b.month));
      return Promise.all(rows.map(async (f) => {
        const s = await db.students.get(f.student_id);
        const withClass = await classOf(s || {});
        return { ...f, student_name: withClass.name, class_name: withClass.class_name };
      }));
    }
    if (route === '/fees' && method === 'POST') {
      const student = await db.students.get(body?.student_id);
      if (!student) throw fail(404, 'শিক্ষার্থী পাওয়া যায়নি');
      const fee = {
        student_id: student.id,
        month: body.month,
        amount: body.amount ?? student.monthly_fee,
        paid_date: dayNow(),
        method: body.method || 'cash',
        note: body.note || '',
      };
      const existing = await db.fees.where('[student_id+month]').equals([student.id, body.month]).first();
      const feeId = existing ? await db.fees.put({ ...existing, ...fee }) : await db.fees.add(fee);
      return { fee: await db.fees.get(feeId), student: { id: student.id, name: student.name }, madrasa: 'মাদরাসা' };
    }
    if (seg[0] === 'fees' && seg[1] && method === 'GET') {
      const fee = await db.fees.get(+seg[1]);
      if (!fee) throw fail(404, 'রশিদ পাওয়া যায়নি');
      const s = await db.students.get(fee.student_id);
      const withClass = await classOf(s);
      return { fee, student: { id: withClass.id, name: withClass.name, roll: withClass.roll, class_name: withClass.class_name } };
    }
    if (seg[0] === 'fees' && seg[1] && method === 'DELETE') {
      await db.fees.delete(+seg[1]);
      return { ok: true };
    }
    /* ---------- Salaries ---------- */
    if (route === '/salaries' && method === 'GET') {
      const teachers = (await db.teachers.toArray()).filter((t) => t.status === 'active');
      const rows = await Promise.all(teachers.map(async (t) => {
        const sa = await db.salaries.where('[teacher_id+month]').equals([t.id, params.month]).first();
        return { id: t.id, name: t.name, designation: t.designation, monthly_salary: t.monthly_salary, salary_id: sa ? sa.id : null, paid: sa ? sa.amount : null, paid_date: sa ? sa.paid_date : null, note: sa ? sa.note : null };
      }));
      return rows.sort((a, b) => a.name.localeCompare(b.name));
    }
    if (route === '/salaries' && method === 'POST') {
      const t = await db.teachers.get(body?.teacher_id);
      if (!t) throw fail(404, 'শিক্ষক পাওয়া যায়নি');
      const salary = { teacher_id: t.id, month: body.month, amount: body.amount ?? t.monthly_salary, paid_date: dayNow(), note: body.note || '' };
      const existing = await db.salaries.where('[teacher_id+month]').equals([t.id, body.month]).first();
      const salaryId = existing ? await db.salaries.put({ ...existing, ...salary }) : await db.salaries.add(salary);
      return { salary: await db.salaries.get(salaryId), teacher: { id: t.id, name: t.name, designation: t.designation } };
    }
    if (seg[0] === 'salaries' && seg[1] && method === 'GET') {
      const salary = await db.salaries.get(+seg[1]);
      if (!salary) throw fail(404, 'রশিদ পাওয়া যায়নি');
      const t = await db.teachers.get(salary.teacher_id);
      return { salary, teacher: { id: salary.teacher_id, name: t.name, designation: t.designation } };
    }
    if (seg[0] === 'salaries' && seg[1] && method === 'DELETE') {
      await db.salaries.delete(+seg[1]);
      return { ok: true };
    }

    /* ---------- Exams & Results ---------- */
    if (route === '/exams' && method === 'GET') {
      const [exams, classes] = await Promise.all([db.exams.toArray(), db.classes.toArray()]);
      return exams
        .sort((a, b) => b.year - a.year || b.id - a.id)
        .map((e) => ({ ...e, subjects: parseSubjects(e), class_name: classes.find((c) => c.id === e.class_id)?.name }));
    }
    if (route === '/exams' && method === 'POST') {
      if (!body?.name || !body?.class_id || !Array.isArray(body?.subjects) || body.subjects.length === 0) {
        throw fail(400, 'পরীক্ষার নাম, শ্রেণি ও অন্তত একটি বিষয় আবশ্যক');
      }
      const id = await db.exams.add({
        name: body.name,
        class_id: body.class_id,
        year: body.year || new Date().getFullYear(),
        subjects: JSON.stringify(body.subjects),
      });
      return db.exams.get(id);
    }
    if (seg[0] === 'exams' && seg[1] && method === 'DELETE') {
      await db.transaction('rw', db.exams, db.marks, async () => {
        await db.marks.where('exam_id').equals(+seg[1]).delete();
        await db.exams.delete(+seg[1]);
      });
      return { ok: true };
    }
    if (seg[0] === 'exams' && seg[1] && seg[2] === 'marks' && method === 'GET') {
      const exam = await db.exams.get(+seg[1]);
      if (!exam) throw fail(404, 'পরীক্ষা পাওয়া যায়নি');
      const students = (await db.students.where('class_id').equals(exam.class_id).toArray())
        .filter((s) => s.status === 'active' && (s.admission_date || '') <= monthNow() + '-99')
        .sort((a, b) => (a.roll || 0) - (b.roll || 0) || a.name.localeCompare(b.name));
      return Promise.all(students.map(async (s) => {
        const m = await db.marks.where('[exam_id+student_id+subject]').equals([exam.id, s.id, params.subject]).first();
        return { student_id: s.id, name: s.name, roll: s.roll, marks: m ? m.marks : null };
      }));
    }
    if (seg[0] === 'exams' && seg[1] && seg[2] === 'marks' && method === 'POST') {
      const exam = await db.exams.get(+seg[1]);
      if (!exam) throw fail(404, 'পরীক্ষা পাওয়া যায়নি');
      for (const e of body?.entries || []) {
        const existing = await db.marks.where('[exam_id+student_id+subject]').equals([exam.id, e.student_id, body.subject]).first();
        if (existing) await db.marks.put({ ...existing, marks: e.marks ?? null });
        else await db.marks.add({ exam_id: exam.id, student_id: e.student_id, subject: body.subject, marks: e.marks ?? null });
      }
      return { ok: true, saved: (body?.entries || []).length };
    }
    if (seg[0] === 'exams' && seg[1] && seg[2] === 'results' && method === 'GET') {
      const exam = await db.exams.get(+seg[1]);
      if (!exam) throw fail(404, 'পরীক্ষা পাওয়া যায়নি');
      const c = await db.classes.get(exam.class_id);
      return { exam: { ...exam, subjects: parseSubjects(exam), class_name: c ? c.name : null }, results: await buildResult(exam) };
    }
    if (seg[0] === 'exams' && seg[1] && seg[2] === 'marksheet' && seg[3] && method === 'GET') {
      const exam = await db.exams.get(+seg[1]);
      if (!exam) throw fail(404, 'পরীক্ষা পাওয়া যায়নি');
      const student = await db.students.get(+seg[3]);
      if (!student) throw fail(404, 'শিক্ষার্থী পাওয়া যায়নি');
      const withClass = await classOf(student);
      const rows = await buildResult(exam);
      return {
        exam: { id: exam.id, name: exam.name, year: exam.year, subjects: parseSubjects(exam), class_name: withClass.class_name },
        student: withClass,
        result: rows.find((r) => r.student_id === student.id),
      };
    }

    /* ---------- Dashboard ---------- */
    if (route === '/dashboard' && method === 'GET') {
      const today = dayNow();
      const month = monthNow();
      const [students, teachers, classes, exams] = await Promise.all([
        db.students.toArray(), db.teachers.toArray(), db.classes.toArray(), db.exams.toArray(),
      ]);
      const todayAtt = (await db.attendanceStudents.where('date').equals(today).toArray())
        .reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {});
      const monthFees = await db.fees.where('month').equals(month).toArray();
      const monthSalaries = await db.salaries.where('month').equals(month).toArray();
      const recent = students
        .filter((s) => s.status === 'active')
        .sort((a, b) => (b.admission_date || '').localeCompare(a.admission_date || '') || b.id - a.id)
        .slice(0, 5);
      const recentNamed = await Promise.all(recent.map(classOf));
      return {
        counts: { students: students.filter((s) => s.status === 'active').length, teachers: teachers.filter((t) => t.status === 'active').length, classes: classes.length, exams: exams.length },
        attendance: { present: todayAtt.present || 0, absent: todayAtt.absent || 0, leave: todayAtt.leave || 0 },
        feeMonth: { collected: monthFees.reduce((a, f) => a + f.amount, 0), payments: monthFees.length },
        salaryMonth: { paid: monthSalaries.reduce((a, s) => a + s.amount, 0) },
        recentAdmissions: recentNamed.map((s) => ({ id: s.id, name: s.name, admission_date: s.admission_date, class_name: s.class_name })),
      };
    }

    throw fail(404, 'রুট পাওয়া যায়নি');
  } catch (e) {
    if (e && e.status) throw e;
    throw fail(500, 'সমস্যা হয়েছে');
  }
}
