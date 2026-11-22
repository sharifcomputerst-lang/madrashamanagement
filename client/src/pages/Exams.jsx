import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, Button, ErrorAlert, Empty, Modal, Field, inputClass } from '../components/ui.jsx';
import { bnDigits } from '../utils.js';

const blank = { name: '', class_id: '', year: new Date().getFullYear(), subjects: [{ name: '', full: 100 }] };

export default function Exams() {
  const [exams, setExams] = useState(null);
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState({ ...blank });

  const load = () => api('/exams').then(setExams).catch((e) => setError(e.message));
  useEffect(() => {
    load();
    api('/classes').then(setClasses).catch((e) => setError(e.message));
  }, []);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const setSubject = (i, k, v) =>
    setForm({ ...form, subjects: form.subjects.map((s, idx) => (idx === i ? { ...s, [k]: v } : s)) });

  const save = async (e) => {
    e.preventDefault();
    try {
      await api('/exams', {
        method: 'POST',
        body: {
          name: form.name, class_id: Number(form.class_id), year: Number(form.year),
          subjects: form.subjects.filter((s) => s.name).map((s) => ({ name: s.name, full: Number(s.full || 100) })),
        },
      });
      setModal(false);
      setForm({ ...blank });
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (ex) => {
    if (!confirm(`"${ex.name}" পরীক্ষা ও সংশ্লিষ্ট সব নম্বর মুছে যাবে। নিশ্চিত?`)) return;
    try { await api('/exams/' + ex.id, { method: 'DELETE' }); load(); }
    catch (e) { setError(e.message); }
  };

  return (
    <div>
      <PageHeader title="পরীক্ষা ও রেজাল্ট" subtitle="পরীক্ষা তৈরি, নম্বর এন্ট্রি ও রেজাল্ট">
        <Button onClick={() => setModal(true)}>➕ নতুন পরীক্ষা</Button>
      </PageHeader>
      <ErrorAlert message={error} />

      <Card>
        {exams === null ? <Empty message="লোড হচ্ছে…" /> : exams.length === 0 ? <Empty message="কোনো পরীক্ষা নেই" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">পরীক্ষা</th>
                  <th className="px-4 py-3">শ্রেণি</th>
                  <th className="px-4 py-3">সাল</th>
                  <th className="px-4 py-3">বিষয়</th>
                  <th className="px-4 py-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {exams.map((ex) => (
                  <tr key={ex.id} className="border-b border-slate-100 hover:bg-emerald-50/40">
                    <td className="px-4 py-3 font-medium text-slate-800">{ex.name}</td>
                    <td className="px-4 py-3">{ex.class_name}</td>
                    <td className="px-4 py-3">{bnDigits(ex.year)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{bnDigits(ex.subjects.length)} টি বিষয়</td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <Link className="mr-3 text-xs font-medium text-emerald-700 underline" to={`/exams/${ex.id}/marks`}>নম্বর এন্ট্রি</Link>
                      <Link className="mr-3 text-xs font-medium text-emerald-700 underline" to={`/exams/${ex.id}/results`}>রেজাল্ট</Link>
                      <Button variant="ghost" className="px-2 py-1 text-rose-600" onClick={() => remove(ex)}>🗑️</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modal} title="নতুন পরীক্ষা তৈরি" onClose={() => setModal(false)}>
        <form onSubmit={save} className="space-y-4">
          <Field label="পরীক্ষার নাম" required>
            <input className={inputClass} value={form.name} onChange={set('name')} placeholder="যেমন: বার্ষিক পরীক্ষা ২০২৬" required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="শ্রেণি" required>
              <select className={inputClass} value={form.class_id} onChange={set('class_id')} required>
                <option value="">— নির্বাচন —</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="সাল" required>
              <input type="number" className={inputClass} value={form.year} onChange={set('year')} required />
            </Field>
          </div>
          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">বিষয় ও পূর্ণমান</p>
            <div className="space-y-2">
              {form.subjects.map((s, i) => (
                <div key={i} className="flex gap-2">
                  <input className={inputClass} placeholder="বিষয়ের নাম" value={s.name} onChange={(e) => setSubject(i, 'name', e.target.value)} />
                  <input type="number" className={`${inputClass} w-24`} placeholder="পূর্ণ" value={s.full} onChange={(e) => setSubject(i, 'full', e.target.value)} />
                  <Button type="button" variant="ghost" className="text-rose-600" onClick={() => setForm({ ...form, subjects: form.subjects.filter((_, idx) => idx !== i) })}>✕</Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="ghost" className="mt-2" onClick={() => setForm({ ...form, subjects: [...form.subjects, { name: '', full: 100 }] })}>
              ➕ বিষয় যোগ করুন
            </Button>
          </div>
          <Button type="submit">💾 তৈরি করুন</Button>
        </form>
      </Modal>
    </div>
  );
}
