import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, LinkButton, ErrorAlert, Empty } from '../components/ui.jsx';
import { bnDigits, money, monthLabel, dateLabel } from '../utils.js';

export default function StudentProfile() {
  const { id } = useParams();
  const [student, setStudent] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api('/students/' + id).then(setStudent).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorAlert message={error} />;
  if (!student) return <Empty message="লোড হচ্ছে…" />;

  const rows = [
    ['পিতার নাম', student.father_name],
    ['মাতার নাম', student.mother_name],
    ['জন্ম তারিখ', dateLabel(student.dob)],
    ['জন্মনিবন্ধন নম্বর', student.birth_reg_no ? bnDigits(student.birth_reg_no) : ''],
    ['শ্রেণি', student.class_name],
    ['রোল', bnDigits(student.roll || '—')],
    ['ফোন', student.phone ? bnDigits(student.phone) : ''],
    ['মাসিক বেতন', `৳${money(student.monthly_fee)}`],
    ['ভর্তির তারিখ', dateLabel(student.admission_date)],
    ['ঠিকানা', student.address],
  ];

  return (
    <div>
      <PageHeader title={student.name} subtitle={`${student.class_name || ''} · রোল ${bnDigits(student.roll || '—')}`}>
        <LinkButton to={`/students/${id}/edit`}>✏️ সম্পাদনা</LinkButton>
      </PageHeader>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-800">👤 ব্যক্তিগত তথ্য</h2>
            <dl className="text-sm">
              {rows.map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-slate-100 py-2">
                  <dt className="text-slate-500">{k}</dt>
                  <dd className="text-right font-medium text-slate-800">{v || '—'}</dd>
                </div>
              ))}
            </dl>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <h2 className="mb-3 font-semibold text-slate-800">💰 বেতন আদায়ের ইতিহাস</h2>
            {student.fees.length === 0 ? (
              <Empty message="কোনো আদায়ের রেকর্ড নেই" />
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2">মাস</th>
                    <th className="py-2">পরিমাণ</th>
                    <th className="py-2">তারিখ</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {student.fees.map((f) => (
                    <tr key={f.id} className="border-b border-slate-100">
                      <td className="py-2">{monthLabel(f.month)}</td>
                      <td className="py-2">৳{money(f.amount)}</td>
                      <td className="py-2 text-xs text-slate-500">{dateLabel(f.paid_date)}</td>
                      <td className="py-2 text-right">
                        <Link to={`/fees/receipt/${f.id}`} className="text-xs text-emerald-700 underline">
                          রশিদ
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
