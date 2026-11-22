import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, ErrorAlert, Empty, Button, LinkButton, inputClass } from '../components/ui.jsx';
import { bnDigits, money } from '../utils.js';

export default function Students() {
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState(null);
  const [classId, setClassId] = useState('');
  const [status, setStatus] = useState('active');
  const [q, setQ] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const load = async () => {
    const params = new URLSearchParams();
    if (classId) params.set('class_id', classId);
    if (q) params.set('q', q);
    params.set('status', status);
    try {
      const list = await api('/students?' + params.toString());
      setStudents(list);
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    api('/classes').then(setClasses).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [classId, status, q]);

  const remove = async (s) => {
    if (!confirm(`"${s.name}" কে মুছে ফেলতে চান? এই কাজ ফেরানো যাবে না।`)) return;
    try {
      await api('/students/' + s.id, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <div>
      <PageHeader title="শিক্ষার্থী তালিকা" subtitle="শ্রেণি ভিত্তিক শিক্ষার্থীর তথ্য">
        <LinkButton to="/students/new">➕ নতুন ভর্তি</LinkButton>
      </PageHeader>

      <ErrorAlert message={error} />

      <Card className="mb-4">
        <CardBody className="grid gap-3 sm:grid-cols-3">
          <select className={inputClass} value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">সব শ্রেণি</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({bnDigits(c.student_count)})
              </option>
            ))}
          </select>
          <select className={inputClass} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="active">চলমান শিক্ষার্থী</option>
            <option value="left">ছেড়ে দেওয়া</option>
            <option value="all">সব</option>
          </select>
          <input
            className={inputClass}
            placeholder="🔍 নাম, পিতার নাম, ফোন বা জন্মনিবন্ধন নম্বর দিয়ে খুঁজুন"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </CardBody>
      </Card>

      <Card>
        {students === null ? (
          <Empty message="লোড হচ্ছে…" />
        ) : students.length === 0 ? (
          <Empty message="কোনো শিক্ষার্থী পাওয়া যায়নি" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">রোল</th>
                  <th className="px-4 py-3">নাম</th>
                  <th className="px-4 py-3">শ্রেণি</th>
                  <th className="px-4 py-3">পিতার নাম</th>
                  <th className="px-4 py-3">ফোন</th>
                  <th className="px-4 py-3">মাসিক বেতন</th>
                  <th className="px-4 py-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => (
                  <tr key={s.id} className="border-b border-slate-100 hover:bg-emerald-50/40">
                    <td className="px-4 py-3">{bnDigits(s.roll || '—')}</td>
                    <td className="px-4 py-3">
                      <Link to={`/students/${s.id}`} className="font-medium text-emerald-800 hover:underline">
                        {s.name}
                      </Link>
                      {s.status !== 'active' && <span className="ml-2 text-xs text-rose-500">(ছেড়ে দিয়েছে)</span>}
                    </td>
                    <td className="px-4 py-3">{s.class_name || '—'}</td>
                    <td className="px-4 py-3">{s.father_name || '—'}</td>
                    <td className="px-4 py-3">{s.phone ? bnDigits(s.phone) : '—'}</td>
                    <td className="px-4 py-3">৳{money(s.monthly_fee)}</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" onClick={() => navigate(`/students/${s.id}/edit`)} className="px-2 py-1">
                        ✏️
                      </Button>
                      <Button variant="ghost" onClick={() => remove(s)} className="px-2 py-1 text-rose-600">
                        🗑️
                      </Button>
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
