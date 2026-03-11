'use client';

import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';

interface Sortie {
  id: number;
  date: string;
  immatriculation: string;
  code_sap: string | null;
  quantite: number;
  description: string | null;
  created_at: string;
}

type Tab = 'form' | 'history' | 'dashboard';
type Toast = { id: number; type: 'success' | 'error'; text: string };

export default function Home() {
  const [sorties, setSorties] = useState<Sortie[]>([]);
  const [tab, setTab] = useState<Tab>('form');
  const [form, setForm] = useState({ date: new Date().toISOString().split('T')[0], immatriculation: '', code_sap: '', quantite: '', description: '' });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterImmat, setFilterImmat] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ date: '', immatriculation: '', code_sap: '', quantite: '', description: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchSorties = async () => {
    const res = await fetch('/api/sorties');
    setSorties(await res.json());
  };

  useEffect(() => { fetchSorties(); }, []);

  const addToast = (type: 'success' | 'error', text: string) => {
    const id = Date.now();
    setToasts(t => [...t, { id, type, text }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/sorties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, immatriculation: form.immatriculation.toUpperCase(), quantite: parseInt(form.quantite) }),
      });
      if (!res.ok) throw new Error();
      setForm({ date: new Date().toISOString().split('T')[0], immatriculation: '', code_sap: '', quantite: '', description: '' });
      addToast('success', '✅ Sortie enregistrée avec succès !');
      fetchSorties();
    } catch { addToast('error', '❌ Erreur lors de l\'enregistrement'); }
    setLoading(false);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer cette sortie ?')) return;
    await fetch(`/api/sorties/${id}`, { method: 'DELETE' });
    addToast('success', '🗑️ Sortie supprimée');
    fetchSorties();
  };

  const openEdit = (s: Sortie) => {
    setEditId(s.id);
    setEditForm({ date: s.date, immatriculation: s.immatriculation, code_sap: s.code_sap || '', quantite: String(s.quantite), description: s.description || '' });
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editId) return;
    try {
      const res = await fetch(`/api/sorties/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...editForm, immatriculation: editForm.immatriculation.toUpperCase(), quantite: parseInt(editForm.quantite) }),
      });
      if (!res.ok) throw new Error();
      setEditId(null);
      addToast('success', '✏️ Sortie modifiée !');
      fetchSorties();
    } catch { addToast('error', '❌ Erreur lors de la modification'); }
  };

  const formatDate = (d: string) => { const [y, m, dd] = d.split('-'); return `${dd}/${m}/${y}`; };

  // Filtres
  const filtered = sorties.filter(s => {
    const q = search.toLowerCase();
    const matchSearch = !q || s.immatriculation.toLowerCase().includes(q) || (s.code_sap||'').toLowerCase().includes(q) || (s.description||'').toLowerCase().includes(q) || formatDate(s.date).includes(q);
    const matchImmat = !filterImmat || s.immatriculation === filterImmat;
    const matchFrom = !filterDateFrom || s.date >= filterDateFrom;
    const matchTo = !filterDateTo || s.date <= filterDateTo;
    return matchSearch && matchImmat && matchFrom && matchTo;
  });

  const uniqueImmats = [...new Set(sorties.map(s => s.immatriculation))].sort();
  const totalPneus = sorties.reduce((acc, s) => acc + s.quantite, 0);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthQty = sorties.filter(s => s.date.startsWith(thisMonth)).reduce((acc, s) => acc + s.quantite, 0);

  // Stats par immat (top 5)
  const statsByImmat = Object.entries(
    sorties.reduce((acc: Record<string, number>, s) => { acc[s.immatriculation] = (acc[s.immatriculation] || 0) + s.quantite; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([immat, total]) => ({ immat, total }));

  // Stats par mois (6 derniers mois)
  const last6Months: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    last6Months[key] = 0;
  }
  sorties.forEach(s => {
    const m = s.date.slice(0, 7);
    if (m in last6Months) last6Months[m] += s.quantite;
  });
  const chartData = Object.entries(last6Months).map(([month, total]) => ({ month: month.slice(5) + '/' + month.slice(2, 4), total }));

  // Export CSV
  const exportCSV = () => {
    const rows = sorties.map(s => [formatDate(s.date), s.immatriculation, s.code_sap || '', s.quantite, (s.description || '').replace(/"/g, '""')]);
    const csv = [['Date','Immatriculation','Code SAP','Quantité','Description'], ...rows].map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    download('\uFEFF' + csv, `sorties-pneus-${new Date().toISOString().split('T')[0]}.csv`, 'text/csv;charset=utf-8;');
  };

  // Export Excel
  const exportExcel = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Date', 'Immatriculation', 'Code SAP', 'Quantité', 'Description'],
      ...sorties.map(s => [formatDate(s.date), s.immatriculation, s.code_sap || '', s.quantite, s.description || '']),
    ]);
    ws['!cols'] = [{ wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 10 }, { wch: 40 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sorties');
    XLSX.writeFile(wb, `sorties-pneus-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const download = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Import CSV
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.replace(/^\uFEFF/, '').split('\n').filter(Boolean);
      const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
      const dateIdx = headers.findIndex(h => h === 'date');
      const immatIdx = headers.findIndex(h => h.includes('immat'));
      const sapIdx = headers.findIndex(h => h.includes('sap'));
      const qteIdx = headers.findIndex(h => h.includes('qté') || h.includes('quantite') || h.includes('quantité'));
      const descIdx = headers.findIndex(h => h.includes('desc'));
      let imported = 0;
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(',').map(c => c.replace(/^"|"$/g, '').trim());
        const dateRaw = cols[dateIdx] || '';
        // Convert DD/MM/YYYY -> YYYY-MM-DD
        const dateParsed = dateRaw.includes('/') ? dateRaw.split('/').reverse().join('-') : dateRaw;
        const immat = cols[immatIdx] || '';
        const qte = parseInt(cols[qteIdx] || '0');
        if (!dateParsed || !immat || !qte) continue;
        await fetch('/api/sorties', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ date: dateParsed, immatriculation: immat.toUpperCase(), code_sap: cols[sapIdx] || '', quantite: qte, description: cols[descIdx] || '' }),
        });
        imported++;
      }
      fetchSorties();
      addToast('success', `📥 ${imported} sortie(s) importée(s) !`);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map(t => (
          <div key={t.id} className={`px-4 py-3 rounded-lg shadow-lg text-sm font-medium text-white animate-in slide-in-from-right ${t.type === 'success' ? 'bg-green-500' : 'bg-red-500'}`}>
            {t.text}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏎️ Suivi Sorties Pneus</h1>
          <p className="text-gray-500 text-sm mt-0.5">{sorties.length} sortie{sorties.length !== 1 ? 's' : ''} · {totalPneus} pneus total</p>
        </div>
        {/* Stats rapides */}
        <div className="flex gap-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center">
            <div className="text-xl font-bold text-blue-700">{thisMonthQty}</div>
            <div className="text-xs text-blue-500">ce mois</div>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center">
            <div className="text-xl font-bold text-green-700">{totalPneus}</div>
            <div className="text-xs text-green-500">total</div>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-lg px-3 py-2 text-center">
            <div className="text-xl font-bold text-purple-700">{uniqueImmats.length}</div>
            <div className="text-xs text-purple-500">véhicules</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-lg w-fit">
        {([['form','📝 Saisie'],['history','📋 Historique'],['dashboard','📊 Dashboard']] as [Tab,string][]).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ===== TAB SAISIE ===== */}
      {tab === 'form' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Nouvelle sortie</h2>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation *</label>
              <input type="text" value={form.immatriculation} onChange={e => setForm({...form, immatriculation: e.target.value.toUpperCase()})} placeholder="AB-123-CD" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Code SAP <span className="text-gray-400">(optionnel)</span></label>
              <input type="text" value={form.code_sap} onChange={e => setForm({...form, code_sap: e.target.value})} placeholder="Ex: 1234567" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
              <input type="number" value={form.quantite} onChange={e => setForm({...form, quantite: e.target.value})} min="1" placeholder="4" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Ex: Pneus été 205/55 R16..." rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="sm:col-span-2">
              <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
                {loading ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ===== TAB HISTORIQUE ===== */}
      {tab === 'history' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          {/* Toolbar */}
          <div className="flex flex-col gap-3 mb-4">
            <div className="flex flex-wrap items-center gap-2">
              <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher..." className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44" />
              <select value={filterImmat} onChange={e => setFilterImmat(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">Toutes les immat.</option>
                {uniqueImmats.map(i => <option key={i} value={i}>{i}</option>)}
              </select>
              <input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" title="Du" />
              <input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" title="Au" />
              {(search||filterImmat||filterDateFrom||filterDateTo) && (
                <button onClick={() => { setSearch(''); setFilterImmat(''); setFilterDateFrom(''); setFilterDateTo(''); }} className="text-gray-400 hover:text-gray-600 text-sm">✕ Reset</button>
              )}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm text-gray-500">{filtered.length}{search||filterImmat||filterDateFrom||filterDateTo ? ` / ${sorties.length}` : ''} sortie{sorties.length !== 1 ? 's' : ''}</span>
              <div className="flex gap-2 flex-wrap">
                {/* Import CSV */}
                <label className="cursor-pointer text-sm text-indigo-700 border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-medium transition-colors">
                  📥 Import CSV
                  <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCSV} className="hidden" />
                </label>
                {sorties.length > 0 && <>
                  <button onClick={exportCSV} className="text-sm text-green-700 border border-green-300 bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-lg font-medium transition-colors">⬇️ CSV</button>
                  <button onClick={exportExcel} className="text-sm text-emerald-700 border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg font-medium transition-colors">⬇️ Excel</button>
                </>}
              </div>
            </div>
          </div>

          {/* Table desktop */}
          {filtered.length === 0 ? (
            <p className="text-center text-gray-400 py-8">{sorties.length === 0 ? 'Aucune sortie enregistrée' : 'Aucun résultat'}</p>
          ) : (
            <>
              {/* Vue tableau (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Date</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Immat.</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Code SAP</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Qté</th>
                      <th className="text-left py-2 px-3 text-gray-500 font-medium">Description</th>
                      <th className="py-2 px-3"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(s => (
                      <tr key={s.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="py-2.5 px-3 text-gray-700 whitespace-nowrap">{formatDate(s.date)}</td>
                        <td className="py-2.5 px-3 font-mono font-medium text-gray-900">{s.immatriculation}</td>
                        <td className="py-2.5 px-3 text-gray-500">{s.code_sap || '—'}</td>
                        <td className="py-2.5 px-3 text-center font-semibold text-blue-700">{s.quantite}</td>
                        <td className="py-2.5 px-3 text-gray-600 max-w-xs truncate">{s.description || '—'}</td>
                        <td className="py-2.5 px-3 flex gap-1">
                          <button onClick={() => { openEdit(s); }} className="text-blue-400 hover:text-blue-600 text-xs px-2 py-1 rounded hover:bg-blue-50 transition-colors">✏️</button>
                          <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 text-xs px-2 py-1 rounded hover:bg-red-50 transition-colors">🗑️</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Vue cartes mobile */}
              <div className="md:hidden flex flex-col gap-3">
                {filtered.map(s => (
                  <div key={s.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-mono font-bold text-gray-900">{s.immatriculation}</span>
                        <span className="ml-2 text-xs text-gray-400">{formatDate(s.date)}</span>
                      </div>
                      <span className="bg-blue-100 text-blue-800 text-sm font-bold px-2 py-0.5 rounded-full">{s.quantite} pneus</span>
                    </div>
                    {s.code_sap && <p className="text-xs text-gray-500 mt-1">SAP : {s.code_sap}</p>}
                    {s.description && <p className="text-sm text-gray-600 mt-1">{s.description}</p>}
                    <div className="flex gap-2 mt-3">
                      <button onClick={() => openEdit(s)} className="text-xs text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded transition-colors">✏️ Modifier</button>
                      <button onClick={() => handleDelete(s.id)} className="text-xs text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition-colors">🗑️ Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== TAB DASHBOARD ===== */}
      {tab === 'dashboard' && (
        <div className="flex flex-col gap-6">
          {sorties.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">Aucune donnée à afficher</div>
          ) : (
            <>
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Pneus sortis par mois (6 derniers mois)</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`${v} pneus`, 'Quantité']} />
                    <Bar dataKey="total" fill="#3b82f6" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Top 5 véhicules (pneus totaux)</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={statsByImmat} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis dataKey="immat" type="category" tick={{ fontSize: 11, fontFamily: 'monospace' }} width={90} />
                    <Tooltip formatter={(v) => [`${v} pneus`, 'Total']} />
                    <Bar dataKey="total" fill="#10b981" radius={[0,4,4,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Évolution cumulative</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`${v} pneus`, 'Mois']} />
                    <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </>
          )}
        </div>
      )}

      {/* ===== MODAL EDITION ===== */}
      {editId && (
        <div className="fixed inset-0 bg-black/40 z-40 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setEditId(null); }}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">✏️ Modifier la sortie</h2>
            <form onSubmit={handleEdit} className="flex flex-col gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" value={editForm.date} onChange={e => setEditForm({...editForm, date: e.target.value})} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Immatriculation *</label>
                <input type="text" value={editForm.immatriculation} onChange={e => setEditForm({...editForm, immatriculation: e.target.value.toUpperCase()})} required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code SAP</label>
                <input type="text" value={editForm.code_sap} onChange={e => setEditForm({...editForm, code_sap: e.target.value})} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantité *</label>
                <input type="number" value={editForm.quantite} onChange={e => setEditForm({...editForm, quantite: e.target.value})} min="1" required className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors">Enregistrer</button>
                <button type="button" onClick={() => setEditId(null)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2 rounded-lg transition-colors">Annuler</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
