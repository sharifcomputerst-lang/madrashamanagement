import bcrypt from 'bcryptjs';
import db from './db.js';

export function seedIfEmpty() {
  const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
  if (userCount === 0) {
    db.prepare('INSERT INTO users (username, password_hash, name, role) VALUES (?, ?, ?, ?)')
      .run('admin', bcrypt.hashSync('admin123', 10), 'মুহতামিম', 'admin');
  }

  const classCount = db.prepare('SELECT COUNT(*) AS c FROM classes').get().c;
  if (classCount === 0) {
    const ins = db.prepare('INSERT INTO classes (name, sort_order) VALUES (?, ?)');
    ['হিফজ', 'নাজেরা', 'ইবতিদাইয়্যাহ', 'মুতাওয়াসসিতা', 'দাখিল'].forEach((name, i) => ins.run(name, i));
  }

  const studentCount = db.prepare('SELECT COUNT(*) AS c FROM students').get().c;
  if (studentCount === 0) {
    const classIds = db.prepare('SELECT id FROM classes ORDER BY sort_order').all().map(r => r.id);
    const names = ['মুহাম্মদ আব্দুল্লাহ', 'আহমাদ হাসান', 'ইউসুফ আলী', 'মুহাম্মদ ইব্রাহিম', 'আবু বকর সিদ্দিক', 'উমর ফারুক', 'উসমান গনি', 'তালহা বিন উবাইদিল্লাহ', 'যুবায়ের বিন আওয়াম', 'সালমান ফারসি'];
    const ins = db.prepare(`INSERT INTO students (name, father_name, mother_name, dob, birth_reg_no, address, class_id, roll, phone, monthly_fee, admission_date, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`);
    names.forEach((name, i) => {
      ins.run(name, 'মুহাম্মদ ' + name.split(' ').slice(-1)[0] + ' উদ্দিন', 'আমিনা খাতুন',
        '20' + (10 + i) + '-0' + ((i % 12) + 1) + '-15', '20' + (10 + i) + '0' + ((i % 12) + 1) + '5678' + i,
        'গ্রাম: বাগমারা, পোস্ট: রামপাল, জেলা: ঢাকা', classIds[i % classIds.length], (i % 5) + 1,
        '01710000' + (100 + i), 500 + (i % 3) * 100, '2025-01-05');
    });

    const teacherIns = db.prepare(`INSERT INTO teachers (name, designation, phone, address, monthly_salary, join_date, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')`);
    teacherIns.run('মাওলানা আব্দুর রহমান', 'মুহতামিম', '01711000001', 'মাদরাসা কোয়ার্টার', 25000, '2020-01-01');
    teacherIns.run('হাফেজ মাহমুদুল হাসান', 'হিফজ বিভাগ', '01711000002', 'মাদরাসা কোয়ার্টার', 15000, '2021-03-01');
    teacherIns.run('মুফতি সাইফুল ইসলাম', 'সহকারী শিক্ষক', '01711000003', 'বাগমারা', 12000, '2022-06-15');

    const now = new Date();
    const year = now.getFullYear();
    const examIns = db.prepare('INSERT INTO exams (name, class_id, year, subjects) VALUES (?, ?, ?, ?)');
    const subjectJson = JSON.stringify([
      { name: 'কুরআন মাজীদ', full: 100 },
      { name: 'আরবি ১ম পত্র', full: 100 },
      { name: 'আরবি ২য় পত্র', full: 100 },
      { name: 'ফিকহ', full: 100 },
      { name: 'বাংলা', full: 100 },
      { name: 'গণিত', full: 100 },
    ]);
    classIds.forEach(cid => examIns.run('বার্ষিক পরীক্ষা ' + year, cid, year, subjectJson));

    const examIds = db.prepare('SELECT id, class_id FROM exams').all();
    const markIns = db.prepare('INSERT OR IGNORE INTO marks (exam_id, student_id, subject, marks) VALUES (?, ?, ?, ?)');
    const students = db.prepare('SELECT id, class_id FROM students').all();
    for (const s of students) {
      const exam = examIds.find(e => e.class_id === s.class_id);
      if (!exam) continue;
      const subjects = JSON.parse(db.prepare('SELECT subjects FROM exams WHERE id = ?').get(exam.id).subjects);
      for (const sub of subjects) {
        markIns.run(exam.id, s.id, sub.name, Math.round(45 + Math.random() * 53));
      }
    }

    const month = now.toISOString().slice(0, 7);
    const feeIns = db.prepare('INSERT OR IGNORE INTO fees (student_id, month, amount, paid_date, method) VALUES (?, ?, ?, ?, ?)');
    const allStudents = db.prepare('SELECT id, monthly_fee, admission_date FROM students').all();
    for (const s of allStudents) {
      const startMonth = (s.admission_date || '2025-01-01').slice(0, 7);
      let m = startMonth;
      const cur = now.toISOString().slice(0, 7);
      while (m <= cur) {
        if (Math.random() > 0.25) {
          feeIns.run(s.id, m, s.monthly_fee, m + '-08', Math.random() > 0.8 ? 'bkash' : 'cash');
        }
        const [y, mo] = m.split('-').map(Number);
        const next = mo === 12 ? (y + 1) + '-01' : y + '-' + String(mo + 1).padStart(2, '0');
        m = next;
      }
    }
  }
  console.log('ডেমো ডেটা প্রস্তুত।');
}
