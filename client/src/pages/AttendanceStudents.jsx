import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, Button, ErrorAlert, Empty, inputClass } from '../components/ui.jsx';
import { bnDigits, statusBadge, statusLabel } from '../utils.js';

const STATUSES = ['present', 'absent', 'leave'];

export default function AttendanceStudents() {
  const [classes, setClasses] = useState([]);
  const [classId, setClassId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api('/classes').then((cs) => {
      setClasses(cs);
      if (cs.length) setClassId(String(cs[0].id));
    }).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!classId) return;
    setRows(null);
    api(`/attendance/students?class_id=${classId}&date=${date}`)
      .then((list) => setRows(list.map((r) => ({ ...r, status: r.status || 'present' }))))
      .catch((e) => setError(e.message));
  }, [classId, date]);

  const mark = (id, status) => setRows(rows.map((r) => (r.id === id ? { ...r, status } : r)));

  const markAll = (status) => setRows(rows.map((r) => ({ ...r, status })));

  const save = async () => {
    try {
      const entries = rows.map((r) => ({ student_id: r.id, status: r.status }));
      await api('/attendance/students', { method: 'POST', body: { date, entries } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
  };

  const counts = rows ? STATUSES.map((s) => rows.filter((r) => r.status === s).length) : [0, 0, 0];

  return (
    <div>
      <PageHeader title="শিক্ষার্থী হাজিরা" subtitle="তারিখ ও শ্রেণি অনুযায়ী হাজিরা নিন" />

      <ErrorAlert message={error} />
      {saved && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✅ হাজিরা সংরক্ষিত হয়েছে</div>}

      <Card className="mb-4">
        <CardBody className="grid gap-3 sm:grid-cols-2">
          <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
        </CardBody>
      </Card>

      {rows == null ? <Empty message="লোড হচ্ছে…" /> : rows.length === 0 ? <Empty message="এই শ্রেণিতে কোনো শিক্ষার্থী নেই" /> : (
        <Card>
          <CardBody className="border-b border-slate-100">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap gap-3 text-xs">
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-emerald-800">উপস্থিত: {bnDigits(counts[0])}</span>
                <span className="rounded-full bg-rose-100 px-2 py-1 text-rose-700">অনুপস্থিত: {bnDigits(counts[1])}</span>
                <span className="rounded-full bg-amber-100 px-2 py-1 text-amber-800">ছুটি: {bnDigits(counts[2])}</span>
              </div>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => markAll('present')}>সবাইকে উপস্থিত করুন</Button>
                <Button onClick={save}>💾 সংরক্ষণ</Button>
              </div>
            </div>
          </CardBody>
          <CardBody className="grid gap-2 sm:grid-cols-2">
            {rows.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                <div className="text-sm">
                  <span className="mr-2 text-xs text-slate-400">{bnDigits(i + 1)}</span>
                  <span className="font-medium text-slate-800">{r.name}</span>
                  <span className="ml-1 text-xs text-slate-400">রোল {bnDigits(r.roll || '—')}</span>
                </div>
                <div className="flex gap-1">
                  {STATUSES.map((s) => (
                    <button
                      key={s}
                      onClick={() => mark(r.id, s)}
                      className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                        r.status === s ? statusBadge(s) + ' ring-2 ring-offset-1 ring-slate-300' : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                      }`}
                    >
                      {statusLabel(s)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
