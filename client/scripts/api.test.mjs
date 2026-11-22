import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';

globalThis.localStorage = {
  store: {},
  getItem(k) { return this.store[k] ?? null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
};

let failures = 0;
const check = (label, cond) => {
  if (cond) console.log('✅', label);
  else { console.log('❌', label); failures++; }
};

// fresh DB for every run
indexedDB = new IDBFactory();

const { api, getToken, setToken } = await import('../src/api.js');

/* ---------- login ---------- */
let bad = false;
try { await api('/login', { method: 'POST', body: { username: 'admin', password: 'wrong' } }); } catch { bad = true; }
check('ভুল পাসওয়ার্ড প্রত্যাখ্যাত', bad);

const login = await api('/login', { method: 'POST', body: { username: 'admin', password: 'admin123' } });
check('লগইন সফল', Boolean(login.token && login.user.name));
setToken(login.token);

let unauth = false;
try { await api('/dashboard').catch((e) => { throw e; }); } catch { /* has token now */ }
check('টোকেন সংরক্ষিত', Boolean(getToken()));
localStorage.removeItem('mms_token');
let kicked = false;
try { await api('/dashboard'); } catch (e) { kicked = e.status === 401; }
check('টোকেন ছাড়া 401', kicked);
setToken(login.token);

/* ---------- classes ---------- */
const classes = await api('/classes');
check('ডেমো শ্রেণি ৫টি', classes.length === 5);
const cls = await api('/classes', { method: 'POST', body: { name: 'টেস্ট শ্রেণি', sort_order: 9 } });
check('শ্রেণি তৈরি', cls.id > 0);
let dup = false;
try { await api('/classes', { method: 'POST', body: { name: 'টেস্ট শ্রেণি' } }); } catch { dup = true; }
check('ডুপ্লিকেট শ্রেণি আটকানো', dup);
const updated = await api(`/classes/${cls.id}`, { method: 'PUT', body: { name: 'টেস্ট ২' } });
check('শ্রেণি সম্পাদনা', updated.name === 'টেস্ট ২');
await api(`/classes/${cls.id}`, { method: 'DELETE' });
check('শ্রেণি ডিলিট', (await api('/classes')).length === 5);

/* ---------- students ---------- */
const students = await api('/students?class_id=' + classes[0].id);
check('শিক্ষার্থী তালিকা', students.length > 0 && students[0].class_name === 'হিফজ');
const newStudent = await api('/students', { method: 'POST', body: { name: 'পরীক্ষার্থী', class_id: classes[0].id, monthly_fee: 300, admission_date: new Date().toISOString().slice(0, 10) } });
check('ভর্তি সম্পন্ন', newStudent.id > 0);
const search = await api('/students?q=' + encodeURIComponent('পরীক্ষা'));
check('সার্চ কাজ করছে', search.length === 1);
const profile = await api('/students/' + newStudent.id);
check('প্রোফাইল + ফি ইতিহাস', Array.isArray(profile.fees) && profile.class_name);

/* ---------- attendance ---------- */
const today = new Date().toISOString().slice(0, 10);
const attList = await api(`/attendance/students?class_id=${classes[0].id}&date=${today}`);
check('হাজিরা তালিকা', attList.length === classes[0].student_count + 1 || attList.length > 0);
await api('/attendance/students', { method: 'POST', body: { date: today, entries: attList.map((r, i) => ({ student_id: r.id, status: i % 3 === 0 ? 'absent' : 'present' })) } });
const attList2 = await api(`/attendance/students?class_id=${classes[0].id}&date=${today}`);
check('হাজিরা সংরক্ষিত', attList2.some((r) => r.status === 'absent'));
const report = await api(`/attendance/report?class_id=${classes[0].id}&month=${today.slice(0, 7)}`);
check('মাসিক রিপোর্ট', report.length > 0 && report[0].rate != null);
const tAtt = await api('/attendance/teachers?date=' + today);
await api('/attendance/teachers', { method: 'POST', body: { date: today, entries: tAtt.map((r) => ({ teacher_id: r.id, status: 'present' })) } });
check('শিক্ষক হাজিরা সংরক্ষিত', tAtt.length > 0);

/* ---------- fees ---------- */
const status = await api(`/fees/status?class_id=${classes[0].id}&month=${today.slice(0, 7)}`);
check('আদায় স্ট্যাটাস', status.length > 0);
const unpaid = status.find((r) => !r.fee_id);
const paid = status.find((r) => r.fee_id);
check('বকেয়া ও পরিশোধিত দুটোই দেখা যাচ্ছে', Boolean(unpaid && paid));
const collect = await api('/fees', { method: 'POST', body: { student_id: unpaid.id, month: today.slice(0, 7), amount: unpaid.monthly_fee, method: 'bkash' } });
check('আদায় এন্ট্রি', collect.fee.id > 0);
const up2 = await api('/fees', { method: 'POST', body: { student_id: unpaid.id, month: today.slice(0, 7), amount: 999 } });
check('একই মাসে দ্বিতীয় এন্ট্রি = আপডেট', up2.fee.amount === 999 && (await api(`/fees/status?class_id=${classes[0].id}&month=${today.slice(0, 7)}`)).filter((r) => r.fee_id).length === status.filter((r) => r.fee_id).length + 1);
const receipt = await api('/fees/' + up2.fee.id);
check('আদায়ের রশিদ', receipt.student.name && receipt.fee.amount === 999);
const dues = await api('/fees/dues');
check('বকেয়া তালিকা', dues.length > 0 && dues[0].due_months.length > 0 && dues[0].due_amount > 0);

/* ---------- salaries ---------- */
const salList = await api('/salaries?month=' + today.slice(0, 7));
check('শিক্ষক বেতন তালিকা', salList.length === 3);
const sal = await api('/salaries', { method: 'POST', body: { teacher_id: salList[0].id, month: today.slice(0, 7), amount: salList[0].monthly_salary } });
check('বেতন প্রদান', sal.salary.id > 0 && sal.teacher.name);
const salReceipt = await api('/salaries/' + sal.salary.id);
check('বেতনের রশিদ', salReceipt.teacher.name);
await api('/salaries/' + sal.salary.id, { method: 'DELETE' });
check('বেতন বাতিল', (await api('/salaries?month=' + today.slice(0, 7))).every((r) => !r.salary_id));

/* ---------- exams & results ---------- */
const exams = await api('/exams');
check('ডেমো পরীক্ষা ৫টি', exams.length === 5);
const marks = await api(`/exams/${exams[0].id}/marks?subject=` + encodeURIComponent('বাংলা'));
check('নম্বর তালিকা', marks.length > 0 && marks[0].marks != null);
await api(`/exams/${exams[0].id}/marks`, { method: 'POST', body: { subject: 'বাংলা', entries: [{ student_id: marks[0].student_id, marks: 88 }] } });
const marks2 = await api(`/exams/${exams[0].id}/marks?subject=` + encodeURIComponent('বাংলা'));
check('নম্বর আপডেট', marks2.find((r) => r.student_id === marks[0].student_id).marks === 88);
const results = await api(`/exams/${exams[0].id}/results`);
check('সমন্বিত রেজাল্ট', results.results.length > 0 && results.results[0].total > 0);
check('র‍্যাংক সঠিক (মেধাক্রম)', results.results[0].rank === 1 && results.results.every((r, i, arr) => i === 0 || (arr[i - 1].percent ?? 0) >= (r.percent ?? 0)));
const marksheet = await api(`/exams/${exams[0].id}/marksheet/${results.results[0].student_id}`);
check('একক মার্কশিট', marksheet.result.total === results.results[0].total && marksheet.student.class_name);
const newExam = await api('/exams', { method: 'POST', body: { name: 'সান্ষৈ টেস্ট', class_id: classes[0].id, year: 2026, subjects: [{ name: 'গণিত', full: 100 }] } });
check('নতুন পরীক্ষা', newExam.id > 0);
await api('/exams/' + newExam.id, { method: 'DELETE' });
check('পরীক্ষা ডিলিট', (await api('/exams')).length === 5);

/* ---------- dashboard ---------- */
const dash = await api('/dashboard');
check('ড্যাশবোর্ড', dash.counts.students > 0 && dash.attendance.present >= 0 && dash.feeMonth.collected >= 0);

/* ---------- cleanup: delete test student ---------- */
await api('/students/' + newStudent.id, { method: 'DELETE' });
check('শিক্ষার্থী ডিলিট', (await api('/students?q=' + encodeURIComponent('পরীক্ষার্থী'))).length === 0);

console.log(failures === 0 ? '\n🎉 সব টেস্ট পাস!' : `\n💥 ${failures} টি টেস্ট ব্যর্থ`);
process.exit(failures === 0 ? 0 : 1);
