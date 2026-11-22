import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, ErrorAlert, Empty, PrintHeader, PrintButton, inputClass } from '../components/ui.jsx';
import { bnDigits, monthLabel, monthOptions } from '../utils.js';

export default function AttendanceReport() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/classes').then((cs) => {
      setClasses(cs);
      if (cs.length) setClassId(String(cs[0].id));
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!classId) return;
    setRows(null);
    api(`/attendance/report?class_id=${classId}&month=${month}`).then(setRows).catch((e) => setError(e.message));
  }, [classId, month]);

  const className = classes.find((c) => String(c.id) === classId)?.name || '';

  return (
    <div>
      <PageHeader title="মাসিক পাঠদানের রিপোর্ট" subtitle="শ্রেণি ও মাস ভিত্তিক উপস্থিতি"><PrintButton /></PageHeader>
      <div className="no-print">
        <ErrorAlert message={error} />
        <Card className="mb-4">
          <CardBody className="grid gap-3 sm:grid-cols-2">
            <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
              {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className={inputClass} value={month} onChange={(e) => setMonth(e.target.value)}>
              {monthOptions().map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}
            </select>
          </CardBody>
        </Card>
      </div>

      <div className="print-area rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <PrintHeader title="মাসিক পাঠদানের রিপোর্ট" subtitle={`শ্রেণি: ${className} · মাস: ${monthLabel(month)}`} />
        {rows === null ? <Empty message="লোড হচ্ছে…" /> : rows.length === 0 ? <Empty message="কোনো তথ্য নেই" /> : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-xs uppercase text-slate-600">
                <th className="px-3 py-2">রোল</th>
                <th className="px-3 py-2">নাম</th>
                <th className="px-3 py-2">উপস্থিত</th>
                <th className="px-3 py-2">অনুপস্থিত</th>
                <th className="px-3 py-2">ছুটি</th>
                <th className="px-3 py-2">হার</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-slate-100">
                  <td className="px-3 py-2">{bnDigits(r.roll || '—')}</td>
                  <td className="px-3 py-2 font-medium">{r.name}</td>
                  <td className="px-3 py-2 text-emerald-700">{bnDigits(r.present || 0)}</td>
                  <td className="px-3 py-2 text-rose-600">{bnDigits(r.absent || 0)}</td>
                  <td className="px-3 py-2 text-amber-600">{bnDigits(r.leave || 0)}</td>
                  <td className="px-3 py-2 font-semibold">{r.rate != null ? bnDigits(r.rate) + '%' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
