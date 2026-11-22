import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { PageHeader, Card, CardBody, Button, Modal, Field, ErrorAlert, Empty, inputClass } from '../components/ui.jsx';
import { bnDigits } from '../utils.js';

export default function Classes() {
  const [classes, setClasses] = useState([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState('');
  const [order, setOrder] = useState('0');

  const load = () => api('/classes').then(setClasses).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing(null); setName(''); setOrder('0'); setModal(true); };
  const openEdit = (c) => { setEditing(c); setName(c.name); setOrder(String(c.sort_order || 0)); setModal(true); };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editing) await api('/classes/' + editing.id, { method: 'PUT', body: { name, sort_order: Number(order) } });
      else await api('/classes', { method: 'POST', body: { name, sort_order: Number(order) } });
      setModal(false);
      load();
    } catch (err) { setError(err.message); }
  };

  const remove = async (c) => {
    if (!confirm(`"${c.name}" শ্রেণি মুছে ফেলতে চান?`)) return;
    try { await api('/classes/' + c.id, { method: 'DELETE' }); load(); }
    catch (err) { setError(err.message); }
  };

  return (
    <div>
      <PageHeader title="শ্রেণি ব্যবস্থাপনা" subtitle="মাদরাসার শ্রেণিসমূহ">
        <Button onClick={openNew}>➕ নতুন শ্রেণি</Button>
      </PageHeader>
      <ErrorAlert message={error} />
      <Card>
        {classes.length === 0 ? <Empty message="কোনো শ্রেণি নেই" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase text-slate-500">
                  <th className="px-4 py-3">ক্রম</th>
                  <th className="px-4 py-3">শ্রেণির নাম</th>
                  <th className="px-4 py-3">শিক্ষার্থী</th>
                  <th className="px-4 py-3 text-right">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((c) => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="px-4 py-3">{bnDigits(c.sort_order)}</td>
                    <td className="px-4 py-3 font-medium">{c.name}</td>
                    <td className="px-4 py-3">{bnDigits(c.student_count)} জন</td>
                    <td className="px-4 py-3 text-right">
                      <Button variant="ghost" className="px-2 py-1" onClick={() => openEdit(c)}>✏️</Button>
                      <Button variant="ghost" className="px-2 py-1 text-rose-600" onClick={() => remove(c)}>🗑️</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal open={modal} title={editing ? 'শ্রেণি সম্পাদনা' : 'নতুন শ্রেণি'} onClose={() => setModal(false)}>
        <form onSubmit={save} className="space-y-4">
          <Field label="শ্রেণির নাম" required>
            <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
          </Field>
          <Field label="প্রদর্শনের ক্রম">
            <input type="number" className={inputClass} value={order} onChange={(e) => setOrder(e.target.value)} />
          </Field>
          <Button type="submit">💾 সংরক্ষণ</Button>
        </form>
      </Modal>
    </div>
  );
}
