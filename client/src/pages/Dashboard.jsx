import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, ErrorAlert, Empty } from '../components/ui.jsx';
import { bnDigits, money, dateLabel } from '../utils.js';

function StatCard({ icon, label, value, sub, to }) {
  const inner = (
    <CardBody className="flex items-center gap-4 transition hover:shadow-md">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-2xl">{icon}</div>
      <div>
        <p className="text-sm text-slate-500">{label}</p>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        {sub && <p className="text-xs text-slate-400">{sub}</p>}
      </div>
    </CardBody>
  );
  return to ? <Link to={to}>{inner}</Link> : <Card>{inner}</Card>;
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/dashboard')
      .then(setData)
      .catch((e) => setError(e.message));
  }, []);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <Empty message="লোড হচ্ছে…" />;

  const todayAtt = data.attendance;
  const attRate =
    todayAtt && (todayAtt.present || todayAtt.absent || todayAtt.leave)
      ? Math.round((todayAtt.present / (todayAtt.present + todayAtt.absent + todayAtt.leave)) * 100)
      : null;

  return (
    <div>
      <PageHeader title="ড্যাশবোর্ড" subtitle="মাদরাসার সামগ্রিক পরিস্থিতি এক নজরে" />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard icon="👨‍🎓" label="মোট শিক্ষার্থী" value={bnDigits(data.counts.students)} to="/students" />
        <StatCard icon="👨‍🏫" label="মোট শিক্ষক" value={bnDigits(data.counts.teachers)} to="/teachers" />
        <StatCard icon="🏫" label="শ্রেণি" value={bnDigits(data.counts.classes)} to="/classes" />
        <StatCard icon="💰" label="এমাসের আদায়" value={`৳${money(data.feeMonth.collected)}`} sub={`${bnDigits(data.feeMonth.payments)} টি পেমেন্ট`} to="/fees" />
        <StatCard icon="⚠️" label="শিক্ষক বেতন" value={`৳${money(data.salaryMonth.paid)}`} sub="এমাসে প্রদত্ত" to="/salaries" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-800">🗓️ আজকের হাজিরা</h2>
            {attRate == null ? (
              <p className="text-sm text-slate-400">
                আজ এখনো হাজিরা নেওয়া হয়নি।{' '}
                <Link className="text-emerald-700 underline" to="/attendance/students">
                  হাজিরা নিন
                </Link>
              </p>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">উপস্থিতির হার</span>
                  <span className="font-bold text-emerald-700">{bnDigits(attRate)}%</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: attRate + '%' }} />
                </div>
                <div className="flex gap-4 pt-1 text-xs text-slate-600">
                  <span>✅ উপস্থিত: {bnDigits(todayAtt.present || 0)}</span>
                  <span>❌ অনুপস্থিত: {bnDigits(todayAtt.absent || 0)}</span>
                  <span>🏖️ ছুটি: {bnDigits(todayAtt.leave || 0)}</span>
                </div>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-800">🆕 সাম্প্রতিক ভর্তি</h2>
            {data.recentAdmissions.length === 0 ? (
              <Empty message="কোনো শিক্ষার্থী নেই" />
            ) : (
              <ul className="divide-y divide-slate-100">
                {data.recentAdmissions.map((s) => (
                  <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                    <Link to={`/students/${s.id}`} className="font-medium text-slate-700 hover:text-emerald-700">
                      {s.name}
                    </Link>
                    <span className="text-xs text-slate-400">
                      {s.class_name} · {dateLabel(s.admission_date)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
