import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, Button, Field, ErrorAlert, inputClass } from '../components/ui.jsx';

const blank = {
  name: '', father_name: '', mother_name: '', dob: '', birth_reg_no: '', address: '',
  class_id: '', roll: '', phone: '', monthly_fee: '', admission_date: new Date().toISOString().slice(0, 10), status: 'active',
};

export default function StudentForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState(isEdit ? null : { ...blank });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api('/classes').then(setClasses).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (isEdit) {
      api('/students/' + id)
        .then((s) => setForm({ ...blank, ...s, class_id: String(s.class_id) }))
        .catch((e) => setError(e.message));
    }
  }, [id]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body = { ...form, class_id: Number(form.class_id), roll: form.roll || null, monthly_fee: Number(form.monthly_fee || 0) };
      if (isEdit) await api('/students/' + id, { method: 'PUT', body });
      else await api('/students', { method: 'POST', body });
      navigate('/students');
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  if (!form) return <p className="text-sm text-slate-500">লোড হচ্ছে…</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={isEdit ? 'শিক্ষার্থীর তথ্য সম্পাদনা' : 'নতুন ভর্তি ফর্ম'} />

      <Card>
        <CardBody>
          <ErrorAlert message={error} />
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="পূর্ণ নাম" required>
              <input className={inputClass} value={form.name} onChange={set('name')} required />
            </Field>
            <Field label="শ্রেণি" required>
              <select className={inputClass} value={form.class_id} onChange={set('class_id')} required>
                <option value="">— নির্বাচন করুন —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="পিতার নাম">
              <input className={inputClass} value={form.father_name} onChange={set('father_name')} />
            </Field>
            <Field label="মাতার নাম">
              <input className={inputClass} value={form.mother_name} onChange={set('mother_name')} />
            </Field>
            <Field label="জন্ম তারিখ">
              <input type="date" className={inputClass} value={form.dob || ''} onChange={set('dob')} />
            </Field>
            <Field label="জন্মনিবন্ধন নম্বর">
              <input className={inputClass} value={form.birth_reg_no} onChange={set('birth_reg_no')} />
            </Field>
            <Field label="রোল নম্বর">
              <input type="number" className={inputClass} value={form.roll || ''} onChange={set('roll')} />
            </Field>
            <Field label="অভিভাবকের ফোন">
              <input className={inputClass} value={form.phone} onChange={set('phone')} />
            </Field>
            <Field label="মাসিক বেতন (টাকা)">
              <input type="number" className={inputClass} value={form.monthly_fee || ''} onChange={set('monthly_fee')} />
            </Field>
            <Field label="ভর্তির তারিখ" required>
              <input type="date" className={inputClass} value={form.admission_date || ''} onChange={set('admission_date')} required />
            </Field>
            {isEdit && (
              <Field label="অবস্থা">
                <select className={inputClass} value={form.status} onChange={set('status')}>
                  <option value="active">চলমান</option>
                  <option value="left">ছেড়ে দেওয়া হয়েছে</option>
                </select>
              </Field>
            )}
            <Field label="ঠিকানা" className="sm:col-span-2">
              <textarea className={inputClass} rows={2} value={form.address} onChange={set('address')} />
            </Field>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit" disabled={busy}>{busy ? 'সংরক্ষণ হচ্ছে…' : '💾 সংরক্ষণ করুন'}</Button>
              <Button type="button" variant="secondary" onClick={() => navigate(-1)}>বাতিল</Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
