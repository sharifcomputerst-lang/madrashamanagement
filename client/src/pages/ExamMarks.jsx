import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, Button, ErrorAlert, Empty, inputClass } from '../components/ui.jsx';
import { bnDigits } from '../utils.js';

export default function ExamMarks() {
  const { id } = useParams();
  const [exam, setExam] = useState(null);
  const [subject, setSubject] = useState('');
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    api('/exams/' + id).then((ex) => {
      setExam(ex);
      if (ex.subjects.length) setSubject(ex.subjects[0].name);
    }).catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => {
    if (!exam || !subject) return;
    setRows(null);
    api(`/exams/${id}/marks?subject=${encodeURIComponent(subject)}`).then(setRows).catch((e) => setError(e.message));
  }, [exam, subject]);

  const setMark = (sid, val) => {
    if (val === '' || (Number(val) >= 0 && Number(val) <= (exam.subjects.find((s) => s.name === subject)?.full || 100))) {
      setRows(rows.map((r) => (r.student_id === sid ? { ...r, marks: val === '' ? null : Number(val) } : r)));
    }
  };

  const save = async () => {
    try {
      await api(`/exams/${id}/marks`, {
        method: 'POST',
        body: { subject, entries: rows.map((r) => ({ student_id: r.student_id, marks: r.marks })) },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); }
  };

  if (!exam) return <>{error ? <ErrorAlert message={error} /> : <p className="text-sm text-slate-500">লোড হচ্ছে…</p>}</>;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="নম্বর এন্ট্রি" subtitle={`${exam.name} · ${exam.class_name}`}>
        <select className={inputClass} value={subject} onChange={(e) => setSubject(e.target.value)}>
          {exam.subjects.map((s) => (
            <option key={s.name} value={s.name}>{s.name} (মোট {bnDigits(s.full)})</option>
          ))}
        </select>
      </PageHeader>
      <ErrorAlert message={error} />
      {saved && <div className="mb-4 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">✅ নম্বর সংরক্ষিত হয়েছে</div>}

      <Card>
        {rows === null ? <Empty message="লোড হচ্ছে…" /> : rows.length === 0 ? <Empty message="কোনো শিক্ষার্থী নেই" /> : (
          <>
            <CardBody className="border-b border-slate-100 flex justify-end">
              <Button onClick={save}>💾 সংরক্ষণ করুন</Button>
            </CardBody>
            <CardBody className="grid gap-2 sm:grid-cols-2">
              {rows.map((r, i) => (
                <div key={r.student_id} className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2">
                  <div className="text-sm">
                    <span className="mr-2 text-xs text-slate-400">{bnDigits(i + 1)}</span>
                    <span className="font-medium text-slate-800">{r.name}</span>
                    <span className="ml-1 text-xs text-slate-400">রোল {bnDigits(r.roll || '—')}</span>
                  </div>
                  <input
                    type="number"
                    min="0"
                    max={exam.subjects.find((s) => s.name === subject)?.full || 100}
                    className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-right text-sm outline-none focus:border-emerald-500"
                    value={r.marks ?? ''}
                    onChange={(e) => setMark(r.student_id, e.target.value)}
                    placeholder="নম্বর"
                  />
                </div>
              ))}
            </CardBody>
            <CardBody className="border-t border-slate-100 flex justify-end">
              <Button onClick={() => navigate(`/exams/${id}/results`)}>রেজাল্ট দেখুন →</Button>
            </CardBody>
          </>
        )}
      </Card>
    </div>
  );
}
