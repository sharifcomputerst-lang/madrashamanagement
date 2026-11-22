export const bnDigits = (v) =>
  String(v ?? '').replace(/\d/g, (d) => '০১২৩৪৫৬৭৮৯'[d]);

export const bnMonths = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর',
];

export const monthLabel = (ym) => {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${bnMonths[Number(m) - 1]} ${bnDigits(y)}`;
};

export const dateLabel = (d) => {
  if (!d) return '';
  return bnDigits(d);
};

export const money = (n) => bnDigits(Number(n ?? 0).toLocaleString('en-US'));

export const monthOptions = (count = 14) => {
  const out = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    out.push(ym);
  }
  return out;
};

export const gradeBadge = (grade) => {
  switch (grade) {
    case 'A+': return 'bg-emerald-100 text-emerald-800';
    case 'A': return 'bg-green-100 text-green-800';
    case 'A-': return 'bg-lime-100 text-lime-800';
    case 'B': return 'bg-sky-100 text-sky-800';
    case 'C': return 'bg-amber-100 text-amber-800';
    case 'D': return 'bg-orange-100 text-orange-800';
    case 'F': return 'bg-rose-100 text-rose-800';
    default: return 'bg-slate-100 text-slate-700';
  }
};

export const statusBadge = (s) => {
  switch (s) {
    case 'present': return 'bg-emerald-100 text-emerald-800';
    case 'absent': return 'bg-rose-100 text-rose-800';
    case 'leave': return 'bg-amber-100 text-amber-800';
    default: return 'bg-slate-100 text-slate-600';
  }
};

export const statusLabel = (s) =>
  ({ present: 'উপস্থিত', absent: 'অনুপস্থিত', leave: 'ছুটি' }[s] || '—');
