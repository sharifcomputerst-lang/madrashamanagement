import { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorAlert, Empty, PrintHeader, PrintButton, Button } from '../components/ui.jsx';
import { bnDigits, money, monthLabel, dateLabel } from '../utils.js';

export default function Receipt() {
  const { feeId } = useParams();
  const query = new URLSearchParams(useLocation().search);
  const type = query.get('type') || 'fee';
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/${type === 'salary' ? 'salaries' : 'fees'}/` + feeId).then(setData).catch((e) => setError(e.message));
  }, [feeId, type]);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <Empty message="লোড হচ্ছে…" />;

  const isSalary = type === 'salary';
  const info = isSalary ? data.salary : data.fee;
  const person = isSalary ? data.teacher : data.student;
  const title = isSalary ? 'বেতন প্রদানের রশিদ (শিক্ষক)' : 'বেতন আদায়ের রশিদ (শিক্ষার্থী)';

  return (
    <div className="mx-auto max-w-xl">
      <div className="no-print mb-4 flex justify-between">
        <PrintButton />
        <Button variant="secondary" onClick={() => window.history.back()}>← ফিরে যান</Button>
      </div>
      <div className="print-area rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <PrintHeader title={title} />
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-500">{isSalary ? 'শিক্ষকের নাম' : 'শিক্ষার্থীর নাম'}</td>
              <td className="py-2 text-right font-semibold">{person.name}</td>
            </tr>
            {!isSalary && person.class_name && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">শ্রেণি</td>
                <td className="py-2 text-right">{person.class_name}</td>
              </tr>
            )}
            {!isSalary && person.roll != null && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">রোল</td>
                <td className="py-2 text-right">{bnDigits(person.roll)}</td>
              </tr>
            )}
            {isSalary && person.designation && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">পদবি</td>
                <td className="py-2 text-right">{person.designation}</td>
              </tr>
            )}
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-500">{isSalary ? 'বেতনের মাস' : 'মাস'}</td>
              <td className="py-2 text-right font-semibold">{monthLabel(info.month)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-500">{isSalary ? 'প্রদত্ত বেতন' : 'আদায়কৃত বেতন'}</td>
              <td className="py-2 text-right text-lg font-bold text-emerald-700">৳{money(info.amount)}</td>
            </tr>
            <tr className="border-b border-slate-100">
              <td className="py-2 text-slate-500">{isSalary ? 'প্রদানের তারিখ' : 'আদায়ের তারিখ'}</td>
              <td className="py-2 text-right">{dateLabel(info.paid_date)}</td>
            </tr>
            {!isSalary && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">মাধ্যম</td>
                <td className="py-2 text-right">{({ cash: 'নগদ', bkash: 'বিকাশ', nagad: 'নগদ অ্যাপ' }[info.method] || info.method)}</td>
              </tr>
            )}
            {info.note && (
              <tr className="border-b border-slate-100">
                <td className="py-2 text-slate-500">নোট</td>
                <td className="py-2 text-right">{info.note}</td>
              </tr>
            )}
          </tbody>
        </table>
        <div className="mt-10 flex justify-between text-sm text-slate-500">
          <span>প্রাপকের স্বাক্ষর</span>
          <span>মুহতামিমের স্বাক্ষর</span>
        </div>
      </div>
    </div>
  );
}
