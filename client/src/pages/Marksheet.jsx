import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorAlert, Empty, PrintHeader, PrintButton, Button } from '../components/ui.jsx';
import { bnDigits, money, dateLabel, gradeBadge } from '../utils.js';

export default function Marksheet() {
  const { id, studentId } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/exams/${id}/marksheet/${studentId}`).then(setData).catch((e) => setError(e.message));
  }, [id, studentId]);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <Empty message="লোড হচ্ছে…" />;

  const { exam, student, result } = data;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="no-print mb-4 flex flex-wrap gap-2">
        <PrintButton />
        <Button variant="secondary" onClick={() => window.history.back()}>← ফিরে যান</Button>
      </div>

      <div className="print-area rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <PrintHeader title="একক মার্কশিট" subtitle={`${exam.name} (${bnDigits(exam.year)}) · শ্রেণি: ${exam.class_name}`} />

        <div className="mb-4 grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
          <p><span className="text-slate-500">নাম:</span> <b>{student.name}</b></p>
          <p><span className="text-slate-500">রোল:</span> <b>{bnDigits(student.roll || '—')}</b></p>
          <p><span className="text-slate-500">পিতার নাম:</span> {student.father_name || '—'}</p>
          <p><span className="text-slate-500">জন্মনিবন্ধন:</span> {student.birth_reg_no ? bnDigits(student.birth_reg_no) : '—'}</p>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-y-2 border-slate-300 text-left text-xs uppercase text-slate-600">
              <th className="py-2">বিষয়</th>
              <th className="py-2 text-right">পূর্ণমান</th>
              <th className="py-2 text-right">প্রাপ্ত নম্বর</th>
              <th className="py-2 text-right">গ্রেড</th>
            </tr>
          </thead>
          <tbody>
            {exam.subjects.map((s) => {
              const m = result?.marks?.[s.name];
              const g = (m != null && (s.full || 100) > 0) ? (m >= (s.full || 100) * 0.33 ? 'পাস' : 'ফেল') : '—';
              return (
                <tr key={s.name} className="border-b border-slate-100">
                  <td className="py-2 font-medium">{s.name}</td>
                  <td className="py-2 text-right">{bnDigits(s.full)}</td>
                  <td className="py-2 text-right font-semibold">{m == null ? '—' : bnDigits(m)}</td>
                  <td className={`py-2 text-right ${g === 'ফেল' ? 'text-rose-600' : 'text-emerald-700'}`}>{g}</td>
                </tr>
              );
            })}
            <tr className="border-t-2 border-slate-300 font-bold">
              <td className="py-3">মোট</td>
              <td className="py-3 text-right">{bnDigits(result?.totalFull || 0)}</td>
              <td className="py-3 text-right">{bnDigits(result?.total ?? 0)}</td>
              <td className="py-3 text-right">
                <span className={`rounded-full px-2 py-0.5 ${gradeBadge(result?.grade)}`}>{result?.grade || '—'}</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex justify-between text-sm">
          <p><span className="text-slate-500">প্রাপ্ত নম্বরের শতকরা:</span> <b>{result?.percent != null ? bnDigits(result.percent) + '%' : '—'}</b></p>
          <p><span className="text-slate-500">মেধাস্থান:</span> <b>{result?.rank != null ? bnDigits(result.rank) : '—'}</b></p>
        </div>

        <div className="mt-10 flex justify-between text-sm text-slate-500">
          <span>শ্রেণি শিক্ষকের স্বাক্ষর</span>
          <span>মুহতামিমের স্বাক্ষর</span>
        </div>
      </div>
    </div>
  );
}
