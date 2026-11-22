import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { Link } from 'react-router-dom';
import { ErrorAlert, Empty, PrintHeader, PrintButton, Button } from '../components/ui.jsx';
import { bnDigits, gradeBadge } from '../utils.js';

export default function ClassResult() {
  const { id } = useParams();
  const query = new URLSearchParams(useLocation().search);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/exams/${id}/results`).then(setData).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <Empty message="লোড হচ্ছে…" />;

  const { exam, results } = data;
  const passed = results.filter((r) => !r.failed && r.percent != null).length;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <PrintButton />
        <Button variant="secondary" onClick={() => window.history.back()}>← ফিরে যান</Button>
      </div>

      <div className="print-area rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <PrintHeader
          title="সমন্বিত রেজাল্ট শিট"
          subtitle={`${exam.name} (${bnDigits(exam.year)}) · শ্রেণি: ${exam.class_name} · মোট শিক্ষার্থী: ${bnDigits(results.length)} · পাস: ${bnDigits(passed)}`}
        />

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b-2 border-slate-300 text-left text-xs uppercase text-slate-600">
                <th className="px-2 py-2">স্থান</th>
                <th className="px-2 py-2">রোল</th>
                <th className="px-2 py-2">নাম</th>
                {exam.subjects.map((s) => (
                  <th key={s.name} className="px-2 py-2 text-center">{s.name}<br /><span className="text-[10px] font-normal">({bnDigits(s.full)})</span></th>
                ))}
                <th className="px-2 py-2 text-right">মোট</th>
                <th className="px-2 py-2 text-center">শতকরা</th>
                <th className="px-2 py-2 text-center">গ্রেড</th>
                <th className="no-print px-2 py-2 text-center">মার্কশিট</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.student_id} className={`border-b border-slate-100 ${r.failed ? 'bg-rose-50/50' : ''}`}>
                  <td className="px-2 py-2 font-semibold">{r.rank != null ? bnDigits(r.rank) : '—'}</td>
                  <td className="px-2 py-2">{bnDigits(r.roll || '—')}</td>
                  <td className="px-2 py-2 font-medium whitespace-nowrap">{r.name}</td>
                  {exam.subjects.map((s) => {
                    const m = r.marks[s.name];
                    const full = s.full || 100;
                    return (
                      <td key={s.name} className={`px-2 py-2 text-center ${m != null && m < full * 0.33 ? 'font-semibold text-rose-600' : ''}`}>
                        {m == null ? '—' : bnDigits(m)}
                      </td>
                    );
                  })}
                  <td className="px-2 py-2 text-right font-bold">{bnDigits(r.total ?? 0)}</td>
                  <td className="px-2 py-2 text-center">{r.percent != null ? bnDigits(r.percent) + '%' : '—'}</td>
                  <td className="px-2 py-2 text-center">
                    <span className={`rounded-full px-2 py-0.5 ${gradeBadge(r.grade)}`}>{r.grade || '—'}</span>
                  </td>
                  <td className="no-print px-2 py-2 text-center">
                    <Link
                      className="text-xs text-emerald-700 underline"
                      to={`/exams/${id}/marksheet/${r.student_id}`}
                    >
                      দেখুন
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
