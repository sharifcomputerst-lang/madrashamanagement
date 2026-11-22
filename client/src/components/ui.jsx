import { Link } from 'react-router-dom';

export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}

export function Card({ children, className = '' }) {
  return <div className={`rounded-xl border border-slate-200 bg-white shadow-sm ${className}`}>{children}</div>;
}

export function CardBody({ children, className = '' }) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>;
}

export function Button({ children, variant = 'primary', className = '', ...props }) {
  const styles = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700 disabled:bg-emerald-300',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-emerald-700 hover:bg-emerald-50',
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function LinkButton({ to, children, variant = 'primary', className = '' }) {
  const styles = {
    primary: 'bg-emerald-600 text-white hover:bg-emerald-700',
    secondary: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
    ghost: 'text-emerald-700 hover:bg-emerald-50',
  };
  return (
    <Link
      to={to}
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition ${styles[variant]} ${className}`}
    >
      {children}
    </Link>
  );
}

export function Field({ label, required, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-rose-500">*</span>}
      </span>
      {children}
    </label>
  );
}

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100';

export function ErrorAlert({ message }) {
  if (!message) return null;
  return <div className="mb-4 rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">{message}</div>;
}

export function Empty({ message = 'কোনো তথ্য নেই' }) {
  return <div className="py-10 text-center text-sm text-slate-400">{message}</div>;
}

export function Modal({ open, title, onClose, children }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="rounded p-1 text-slate-400 hover:bg-slate-100">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function PrintHeader({ title, subtitle }) {
  return (
    <div className="mb-6 border-b-2 border-emerald-700 pb-4 text-center">
      <h1 className="text-2xl font-bold text-emerald-800">মাদরাসা</h1>
      <p className="text-sm text-slate-600">ঠিকানা: রামপাল, ঢাকা · ফোন: ০১৭১০-০০০০০০</p>
      {title && <h2 className="mt-3 text-xl font-semibold text-slate-800">{title}</h2>}
      {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
    </div>
  );
}

export function PrintButton() {
  return (
    <Button variant="secondary" className="no-print" onClick={() => window.print()}>
      🖨️ পিডিএফ ডাউনলোড (প্রিন্ট)
    </Button>
  );
}
