import { useState } from 'react';
import { api } from '../api.js';
import { Button, Field, ErrorAlert, inputClass } from '../components/ui.jsx';

export default function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('/login', { method: 'POST', body: form });
      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full items-center justify-center bg-gradient-to-br from-emerald-800 to-emerald-950 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-3xl">
            🕌
          </div>
          <h1 className="text-xl font-bold text-slate-800">মাদরাসা ম্যানেজমেন্ট সিস্টেম</h1>
          <p className="mt-1 text-sm text-slate-500">অ্যাডমিন প্যানেলে প্রবেশ করুন</p>
        </div>
        <ErrorAlert message={error} />
        <form onSubmit={submit} className="space-y-4">
          <Field label="ইউজারনেম" required>
            <input
              className={inputClass}
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoFocus
            />
          </Field>
          <Field label="পাসওয়ার্ড" required>
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </Field>
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'অপেক্ষা করুন…' : 'লগইন'}
          </Button>
        </form>
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-center text-xs text-slate-500">
          ডেমো লগইন — ইউজারনেম: <b>admin</b> · পাসওয়ার্ড: <b>admin123</b>
          <br />
          <span className="text-[11px]">🔒 সম্পূর্ণ অফলাইন — সব ডেটা এই ডিভাইসের ব্রাউজারেই সংরক্ষিত হবে</span>
        </p>
      </div>
    </div>
  );
}
