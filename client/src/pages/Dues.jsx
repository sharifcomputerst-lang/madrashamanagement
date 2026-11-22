import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageHeader, Card, ErrorAlert, Empty, PrintHeader, PrintButton, inputClass } from '../components/ui.jsx';
import { bnDigits, money, monthLabel } from '../utils.js';

export default function Dues() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/classes').then(setClasses).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    setRows(null);
    api('/fees/dues' + (classId ? '?class_id=' + classId : '')).then(setRows).catch((e) => setError(e.message));
  }, [classId]);

  const total = (rows || []).reduce((a, r) => a + r.due_amount, 0);
  const className = classes.find((c) => String(c.id) === classId)?.name || 'সকল শ্রেণি';

  return (
    <div>
      <PageHeader title="বকেয়া বেতন হিসাব" subtitle="কোন শিক্ষার্থীর কোন মাসের বেতন বাকি"><PrintButton /></PageHeader>
      <div className="no-print">
        <ErrorAlert message={error} />
        <Card className="mb-4">
          <CardBody className="max-w-xs">
            <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
              <option value="">সব শ্রেণি</option>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </CardBody>
        </Card>
      </div>

      <div className="print-area rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <PrintHeader title="বকেয়া বেতনের তালিকা" subtitle={`শ্রেণি: ${className} · মোট বকেয়া: ৳${money(total)}`} />
        {rows === null ? <Empty message="লোড হচ্ছে…" /> : rows.length === 0 ? <Empty message="🎉 কোনো বকেয়া নেই" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-300 text-left text-xs uppercase text-slate-600">
                  <th className="px-3 py-2">শ্রেণি</th>
                  <th className="px-3 py-2">রোল</th>
                  <th className="px-3 py-2">নাম</th>
                  <th className="px-3 py-2">বকেয়া মাস</th>
                  <th className="px-3 py-2">বকেয়ার পরিমাণ</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-b border-slate-100">
                    <td className="px-3 py-2">{r.class_name}</td>
                    <td className="px-3 py-2">{bnDigits(r.roll || '—')}</td>
                    <td className="px-3 py-2 font-medium">{r.name}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {r.due_months.map((m) => (
                          <span key={m} className="rounded bg-rose-50 px-1.5 py-0.5 text-xs text-rose-700">{monthLabel(m)}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-3 py-2 font-semibold text-rose-700">৳{money(r.due_amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
