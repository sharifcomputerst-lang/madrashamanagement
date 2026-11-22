import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';

export const navItems = [
  { to: '/', label: 'ড্যাশবোর্ড', icon: '📊', end: true },
  { to: '/students', label: 'শিক্ষার্থী', icon: '👨‍🎓' },
  { to: '/classes', label: 'শ্রেণি', icon: '🏫' },
  { to: '/teachers', label: 'শিক্ষক', icon: '👨‍🏫' },
  { to: '/attendance/students', label: 'শিক্ষার্থী হাজিরা', icon: '🗓️' },
  { to: '/attendance/teachers', label: 'শিক্ষক হাজিরা', icon: '📋' },
  { to: '/attendance/report', label: 'মাসিক পাঠদান রিপোর্ট', icon: '📈' },
  { to: '/fees', label: 'বেতন আদায়', icon: '💰' },
  { to: '/fees/dues', label: 'বকেয়া বেতন', icon: '⚠️' },
  { to: '/salaries', label: 'শিক্ষক বেতন', icon: '🧾' },
  { to: '/exams', label: 'পরীক্ষা ও রেজাল্ট', icon: '📝' },
];

function Sidebar({ onLogout, user, open, setOpen }) {
  return (
    <aside
      className={`fixed inset-y-0 right-0 z-40 w-64 transform overflow-y-auto bg-emerald-800 text-emerald-50 transition-transform lg:sticky lg:top-0 lg:right-auto lg:h-screen lg:translate-x-0 ${
        open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
      }`}
    >
      <div className="border-b border-emerald-700 px-4 py-5">
        <p className="text-lg font-bold">🕌 মাদরাসা ম্যানেজমেন্ট</p>
        <p className="mt-0.5 text-xs text-emerald-300">{user?.name}</p>
      </div>
      <nav className="px-2 py-3">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition ${
                isActive ? 'bg-emerald-600 font-semibold text-white' : 'hover:bg-emerald-700'
              }`
            }
          >
            <span>{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
        <button
          onClick={onLogout}
          className="mt-3 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-emerald-200 transition hover:bg-emerald-700"
        >
          <span>🚪</span> লগআউট
        </button>
      </nav>
    </aside>
  );
}

export default function Layout({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-full bg-slate-100">
      <Sidebar onLogout={onLogout} user={user} open={open} setOpen={setOpen} />
      <div className="lg:pr-64">
        <header className="no-print flex items-center justify-between bg-white px-4 py-3 shadow-sm lg:hidden">
          <span className="font-bold text-emerald-800">🕌 মাদরাসা ম্যানেজমেন্ট</span>
          <button onClick={() => setOpen(!open)} className="rounded p-2 text-slate-600 hover:bg-slate-100">
            ☰
          </button>
        </header>
        <main className="mx-auto max-w-6xl p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
