import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, Button, ErrorAlert, Empty, Modal, Field, inputClass } from '../components/ui.jsx';
import { bnDigits, money, monthLabel, monthOptions, dateLabel } from '../utils.js';

export default function Fees() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [collect, setCollect] = useState(null);
  const [form, setForm] = useState({ amount: '', method: 'cash', note: '' });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api('/classes').then((cs) => {
      setClasses(cs);
      if (cs.length) setClassId(String(cs[0].id));
    }).catch((e) => setError(e.message));
  }, []);

  const load = async () => {
    if (!classId) return;
    try { setRows(await api(`/fees/status?class_id=${classId}&month=${month}`)); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [classId, month]);

  const openCollect = (r) => {
    setCollect(r);
    setForm({ amount: String(r.monthly_fee || ''), method: 'cash', note: '' });
  };

  const saveCollect = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api('/fees', {
        method: 'POST',
        body: { student_id: collect.id, month, amount: Number(form.amount), method: form.method, note: form.note },
      });
      setCollect(null);
      await load();
      navigate('/fees/receipt/' + res.fee.id);
    } catch (err) { setError(err.message); }
    setBusy(false);
  };

  const undo = async (r) => {
    if (!confirm(`${r.name} এর ${monthLabel(month)} মাসের আদায় বাতিল করবেন?`)) return;
    try { await api('/fees/' + r.fee_id, { method: 'DELETE' }); load(); }
    catch (e) { setError(e.message); }
  };

  const paid = (rows || []).filter((r) => r.fee_id);
  const unpaid = (rows || []).filter((r) => !r.fee_id);
  const collected = paid.reduce((a, r) => a + (r.paid || 0), 0);

  return (
    <div>
      <PageHeader title="মাসিক বেতন আদায়" subtitle="শ্রেণি ও মাস অনুযায়ী আদায় এন্ট্রি">
        <select className={inputClass} value={month} onChange={(e) => setMonth(e.target.value)}>
          {monthOptions().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </PageHeader>
      <ErrorAlert message={error} />

      <Card className="no-print mb-4">
        <CardBody className="flex flex-wrap items-center gap-3">
          <select className={`${inputClass} max-w-xs`} value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex gap-4 text-sm">
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-800">আদায়: {bnDigits(paid.length)} জন · ৳{money(collected)}</span>
            <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700">বাকি: {bnDigits(unpaid.length)} জন</span>
          </div>
        </CardBody>
      </Card>

      <Card>
        {rows === null ? <Empty message="লোড হচ্ছে…" /> : rows.length === 0 ? <Empty message="কোনো শিক্ষার্থী নেই" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">রোল</th>
                  <th className="px-4 py-3">নাম</th>
                  <th className="px-4 py-3">নির্ধারিত</th>
                  <th className="px-4 py-3">প্রদত্ত</th>
                  <th className="px-4 py-3">মাধ্যম</th>
                  <th className="px-4 py-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={`border-b border-slate-100 ${r.fee_id ? 'bg-emerald-50/40' : ''}`}>
                    <td className="px-4 py-3">{bnDigits(r.roll || '—')}</td>
                    <td className="px-4 py-3 font-medium">{r.name}</td>
                    <td className="px-4 py-3">৳{money(r.monthly_fee)}</td>
                    {r.fee_id ? (
                      <>
                        <td className="px-4 py-3 text-emerald-700">৳{money(r.paid)}</td>
                        <td className="px-4 py-3 text-xs text-slate-500">
                          {({ cash: 'নগদ', bkash: 'বিকাশ', nagad: 'নগদ অ্যাপ' }[r.method] || r.method)} · {dateLabel(r.paid_date)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <a href={`/fees/receipt/${r.fee_id}`} className="mr-2 text-xs text-emerald-700 underline">রশিদ</a>
                          <Button variant="ghost" className="px-2 py-1 text-rose-600" onClick={() => undo(r)}>বাতিল</Button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 text-rose-600">বকেয়া</td>
                        <td className="px-4 py-3">—</td>
                        <td className="px-4 py-3 text-right">
                          <Button className="px-3 py-1" onClick={() => openCollect(r)}>আদায় করুন</Button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={Boolean(collect)} title="বেতন আদায়" onClose={() => setCollect(null)}>
        {collect && (
          <form onSubmit={saveCollect} className="space-y-4">
            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {collect.name} · {monthLabel(month)}
            </div>
            <Field label="পরিমাণ (টাকা)" required>
              <input type="number" className={inputClass} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required autoFocus />
            </Field>
            <Field label="মাধ্যম">
              <select className={inputClass} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                <option value="cash">নগদ (ক্যাশ)</option>
                <option value="bkash">বিকাশ</option>
                <option value="nagad">নগদ (অ্যাপ)</option>
              </select>
            </Field>
            <Field label="নোট">
              <input className={inputClass} value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </Field>
            <Button type="submit" disabled={busy}>{busy ? 'সংরক্ষণ হচ্ছে…' : '✅ আদায় সম্পন্ন করুন'}</Button>
          </form>
        )}
      </Modal>
    </div>
  );
}
