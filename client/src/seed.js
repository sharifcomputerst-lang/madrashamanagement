import bcrypt from 'bcryptjs';

const SUBJ = [
  { name: 'কুরআন মাজীদ', full: 100 },
  { name: 'আরবি ১ম পত্র', full: 100 },
  { name: 'আরবি ২য় পত্র', full: 100 },
  { name: 'ফিকহ', full: 100 },
  { name: 'বাংলা', full: 100 },
  { name: 'গণিত', full: 100 },
];

const nextMonth = (ym) => {
  let [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
};

export async function seedDemoData(db) {
  await db.users.add({ username: 'admin', password_hash: bcrypt.hashSync('admin123', 10), name: 'মুহতামিম', role: 'admin' });

  const classNames = ['হিফজ', 'নাজেরা', 'ইবতিদাইয়্যাহ', 'মুতাওয়াসসিতা', 'দাখিল'];
  const classIds = [];
  for (let i = 0; i < classNames.length; i++) {
    classIds.push(await db.classes.add({ name: classNames[i], sort_order: i }));
  }

  const names = ['মুহাম্মদ আব্দুল্লাহ', 'আহমাদ হাসান', 'ইউসুফ আলী', 'মুহাম্মদ ইব্রাহিম', 'আবু বকর সিদ্দিক', 'উমর ফারুক', 'উসমান গনি', 'তালহা বিন উবাইদিল্লাহ', 'যুবায়ের বিন আওয়াম', 'সালমান ফারসি'];
  const now = new Date();
  const cur = now.toISOString().slice(0, 7);
  const studentIds = [];
  for (let i = 0; i < names.length; i++) {
    const admission = '2025-01-05';
    studentIds.push(await db.students.add({
      name: names[i],
      father_name: 'মুহাম্মদ ' + names[i].split(' ').slice(-1)[0] + ' উদ্দিন',
      mother_name: 'আমিনা খাতুন',
      dob: `20${10 + i}-0${(i % 12) + 1}-15`,
      birth_reg_no: `20${10 + i}0${(i % 12) + 1}5678${i}`,
      address: 'গ্রাম: বাগমারা, পোস্ট: রামপাল, জেলা: ঢাকা',
      class_id: classIds[i % classIds.length],
      roll: (i % 5) + 1,
      phone: '01710000' + (100 + i),
      photo: null,
      monthly_fee: 500 + (i % 3) * 100,
      admission_date: admission,
      status: 'active',
    }));
  }

  await db.teachers.bulkAdd([
    { name: 'মাওলানা আব্দুর রহমান', designation: 'মুহতামিম', phone: '01711000001', address: 'মাদরাসা কোয়ার্টার', monthly_salary: 25000, join_date: '2020-01-01', status: 'active' },
    { name: 'হাফেজ মাহমুদুল হাসান', designation: 'হিফজ বিভাগ', phone: '01711000002', address: 'মাদরাসা কোয়ার্টার', monthly_salary: 15000, join_date: '2021-03-01', status: 'active' },
    { name: 'মুফতি সাইফুল ইসলাম', designation: 'সহকারী শিক্ষক', phone: '01711000003', address: 'বাগমারা', monthly_salary: 12000, join_date: '2022-06-15', status: 'active' },
  ]);

  const year = now.getFullYear();
  for (const cid of classIds) {
    const examId = await db.exams.add({ name: `বার্ষিক পরীক্ষা ${year}`, class_id: cid, year, subjects: JSON.stringify(SUBJ) });
    const classStudents = studentIds.filter((_, i) => i % classIds.length === classIds.indexOf(cid));
    const rows = [];
    for (const sid of classStudents) {
      for (const sub of SUBJ) {
        rows.push({ exam_id: examId, student_id: sid, subject: sub.name, marks: Math.round(45 + Math.random() * 53) });
      }
    }
    await db.marks.bulkAdd(rows);
  }

  const feeRows = [];
  for (let i = 0; i < studentIds.length; i++) {
    const admissionMonth = '2025-01';
    const monthlyFee = 500 + (i % 3) * 100;
    let m = admissionMonth;
    while (m <= cur) {
      if (Math.random() > 0.25) {
        feeRows.push({ student_id: studentIds[i], month: m, amount: monthlyFee, paid_date: m + '-08', method: Math.random() > 0.8 ? 'bkash' : 'cash', note: '' });
      }
      m = nextMonth(m);
    }
  }
  await db.fees.bulkAdd(feeRows);
}
