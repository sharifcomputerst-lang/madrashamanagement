import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, Button, ErrorAlert, Empty, inputClass } from '../components/ui.jsx';
import { bnDigits, statusBadge, statusLabel } from '../utils.js';

const STATUSES = ['present', 'absent', 'leave'];

export default function AttendanceTeachers() {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const load = async () => {
    try {
      const list = await api('/attendance/teachers?date=' + date);
      setRows(list.map((r) => ({ ...r, status: r.status || 'present' })));
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, [date]);

  const mark = (id, status) => setRows(rows.map((r) => (r.id === id ? { ...r, status } : r)));

  const save = async () => {
    try {
      await api('/attendance/teachers', { method: 'POST', body: { date, entries: rows.map((r) => ({ teacher_id: r.id, status: r.status })) } });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <PageHeader title="শিক্ষক হাজিরা" subtitle="দৈনিক শিক্ষক হাজিরা রেকর্ড">
        <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
      </PageHeader>
      <ErrorAlert message={error} />
      {saved && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✅ সংরক্ষিত হয়েছে</div>}

      {rows == null ? <Empty message="লোড হচ্ছে…" /> : rows.length === 0 ? <Empty message="কোনো শিক্ষক নেই" /> : (
        <Card>
          <CardBody>
            <div className="mb-4 flex justify-end">
              <Button onClick={save}>💾 সংরক্ষণ</Button>
            </div>
            <div className="grid gap-2">
              {rows.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-sm">
                    <span className="font-medium text-slate-800">{r.name}</span>
                    {r.designation && <span className="ml-2 text-xs text-slate-400">{r.designation}</span>}
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
            </div>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
