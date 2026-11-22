import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, ErrorAlert, Empty, Button, inputClass } from '../components/ui.jsx';
import { bnDigits, money, monthLabel, monthOptions } from '../utils.js';

export default function Salaries() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    try { setRows(await api('/salaries?month=' + month)); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [month]);

  const pay = async (t) => {
    try {
      const res = await api('/salaries', {
        method: 'POST',
        body: { teacher_id: t.id, month, amount: t.monthly_salary },
      });
      load();
      navigate('/fees/receipt/' + res.salary.id + '?type=salary');
    } catch (e) { setError(e.message); }
  };

  const undo = async (t) => {
    if (!confirm(`${t.name} এর এই মাসের বেতন প্রদান বাতিল করবেন?`)) return;
    try { await api('/salaries/' + t.salary_id, { method: 'DELETE' }); load(); }
    catch (e) { setError(e.message); }
  };

  const paidTotal = (rows || []).filter(r => r.salary_id).reduce((a, r) => a + (r.paid || 0), 0);
  const dueTotal = (rows || []).filter(r => !r.salary_id).reduce((a, r) => a + (r.monthly_salary || 0), 0);

  return (
    <div>
      <PageHeader title="শিক্ষক বেতন প্রদান" subtitle="মাসিক বেতন পরিশোধ ও রেকর্ড">
        <select className={inputClass} value={month} onChange={(e) => setMonth(e.target.value)}>
          {monthOptions().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
      </PageHeader>
      <ErrorAlert message={error} />

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card><CardBody className="text-sm"><p className="text-slate-500">এমাসে প্রদত্ত</p><p className="text-xl font-bold text-emerald-700">৳{money(paidTotal)}</p></CardBody></Card>
        <Card><CardBody className="text-sm"><p className="text-slate-500">বকেয়া বেতন</p><p className="text-xl font-bold text-rose-600">৳{money(dueTotal)}</p></CardBody></Card>
      </div>

      <Card>
        {rows === null ? <Empty message="লোড হচ্ছে…" /> : rows.length === 0 ? <Empty message="কোনো শিক্ষক নেই" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">নাম</th>
                  <th className="px-4 py-3">পদবি</th>
                  <th className="px-4 py-3">বেতন</th>
                  <th className="px-4 py-3">অবস্থা</th>
                  <th className="px-4 py-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="px-4 py-3 font-medium">{t.name}</td>
                    <td className="px-4 py-3">{t.designation || '—'}</td>
                    <td className="px-4 py-3">৳{money(t.monthly_salary)}</td>
                    <td className="px-4 py-3">
                      {t.salary_id
                        ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">পরিশোধিত ({dateLabel(t.paid_date)})</span>
                        : <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs text-rose-700">বকেয়া</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.salary_id
                        ? <Button variant="ghost" className="px-2 py-1 text-rose-600" onClick={() => undo(t)}>বাতিল</Button>
                        : <Button className="px-3 py-1" onClick={() => pay(t)}>বেতন দিন</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
