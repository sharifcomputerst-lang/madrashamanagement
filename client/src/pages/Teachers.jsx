import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageHeader, Card, ErrorAlert, Empty, Button, Modal, Field, inputClass } from '../components/ui.jsx';
import { bnDigits, money, dateLabel } from '../utils.js';

const blank = { name: '', designation: '', phone: '', address: '', monthly_salary: '', join_date: new Date().toISOString().slice(0, 10) };

export default function Teachers() {
  const [teachers, setTeachers] = useState(null);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...blank });

  const load = () => api('/teachers').then(setTeachers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setForm({ ...blank }); setModal(true); };
  const openEdit = (t) => { setEditing(t); setForm({ ...blank, ...t, join_date: t.join_date || '' }); setModal(true); };

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    try {
      const body = { ...form, monthly_salary: Number(form.monthly_salary || 0) };
      if (editing) await api('/teachers/' + editing.id, { method: 'PUT', body });
      else await api('/teachers', { method: 'POST', body });
      setModal(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (t) => {
    if (!confirm(`"${t.name}" কে মুছে ফেলতে চান?`)) return;
    try { await api('/teachers/' + t.id, { method: 'DELETE' }); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div>
      <PageHeader title="শিক্ষক ব্যবস্থাপনা" subtitle="শিক্ষকদের তথ্য ও বেতন">
        <Button onClick={openNew}>➕ নতুন শিক্ষক</Button>
      </PageHeader>
      <ErrorAlert message={error} />
      <Card>
        {teachers === null ? <Empty message="লোড হচ্ছে…" /> : teachers.length === 0 ? <Empty message="কোনো শিক্ষক নেই" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">নাম</th>
                  <th className="px-4 py-3">পদবি</th>
                  <th className="px-4 py-3">ফোন</th>
                  <th className="px-4 py-3">মাসিক বেতন</th>
                  <th className="px-4 py-3">যোগদান</th>
                  <th className="px-4 py-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100 hover:bg-emerald-50/40">
                    <td className="px-4 py-3 font-medium text-slate-800">{t.name}</td>
                    <td className="px-4 py-3">{t.designation || '—'}</td>
                    <td className="px-4 py-3">{t.phone ? bnDigits(t.phone) : '—'}</td>
                    <td className="px-4 py-3">৳{money(t.monthly_salary)}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{dateLabel(t.join_date)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" className="px-2 py-1" onClick={() => openEdit(t)}>✏️</Button>
                      <Button variant="ghost" className="px-2 py-1 text-rose-600" onClick={() => remove(t)}>🗑️</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modal} title={editing ? 'শিক্ষক সম্পাদনা' : 'নতুন শিক্ষক'} onClose={() => setModal(false)}>
        <form onSubmit={save} className="grid gap-4">
          <Field label="পূর্ণ নাম" required>
            <input className={inputClass} value={form.name} onChange={set('name')} required autoFocus />
          </Field>
          <Field label="পদবি">
            <input className={inputClass} value={form.designation} onChange={set('designation')} placeholder="যেমন: হিফজ বিভাগ" />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="ফোন">
              <input className={inputClass} value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="মাসিক বেতন">
              <input type="number" className={inputClass} value={form.monthly_salary} onChange={set('monthly_salary')} />
            </Field>
          </div>
          <Field label="ঠিকানা">
            <input className={inputClass} value={form.address} onChange={set('address')} />
          </Field>
          <Field label="যোগদানের তারিখ">
            <input type="date" className={inputClass} value={form.join_date || ''} onChange={set('join_date')} />
          </Field>
          <Button type="submit">💾 সংরক্ষণ</Button>
        </form>
      </Modal>
    </div>
  );
}
