'use client';

import { SortieInput } from '@/lib/types';

export function SortieForm({
  form,
  errors,
  loading,
  onChange,
  onQuickQty,
  onSubmit,
  recentHint,
}: {
  form: { date: string; immatriculation: string; code_sap: string; quantite: string; description: string };
  errors: Partial<Record<keyof SortieInput | 'global', string>>;
  loading: boolean;
  onChange: (key: string, value: string) => void;
  onQuickQty: (qty: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  recentHint?: string;
}) {
  const qtyButtons = [1, 2, 4, 10];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Nouvelle sortie</h2>
          <p className="text-sm text-gray-500">Saisie rapide atelier : immat → quantité → description → date → SAP</p>
        </div>
        {recentHint ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Dernière sortie : {recentHint}</span> : null}
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Immatriculation *</label>
          <input autoFocus type="text" value={form.immatriculation} onChange={(e) => onChange('immatriculation', e.target.value)} placeholder="AB-123-CD" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.immatriculation ? <p className="mt-1 text-xs text-red-600">{errors.immatriculation}</p> : <p className="mt-1 text-xs text-gray-400">Format libre mais normalisé automatiquement.</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Quantité *</label>
          <input type="number" value={form.quantite} onChange={(e) => onChange('quantite', e.target.value)} min="1" max="20" placeholder="4" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="mt-2 flex flex-wrap gap-2">
            {qtyButtons.map((qty) => (
              <button key={qty} type="button" onClick={() => onQuickQty(qty)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">
                +{qty}
              </button>
            ))}
          </div>
          {errors.quantite ? <p className="mt-1 text-xs text-red-600">{errors.quantite}</p> : null}
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
          <textarea value={form.description} onChange={(e) => onChange('description', e.target.value)} placeholder="Ex: Pneus été 205/55 R16..." rows={2} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : <p className="mt-1 text-xs text-gray-400">Max 240 caractères.</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
          <input type="date" value={form.date} onChange={(e) => onChange('date', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.date ? <p className="mt-1 text-xs text-red-600">{errors.date}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Code SAP <span className="text-gray-400">(optionnel)</span></label>
          <input type="text" value={form.code_sap} onChange={(e) => onChange('code_sap', e.target.value)} placeholder="Ex: 1234567" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.code_sap ? <p className="mt-1 text-xs text-red-600">{errors.code_sap}</p> : null}
        </div>
        {errors.global ? <p className="sm:col-span-2 text-sm text-red-600">{errors.global}</p> : null}
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <span className="text-xs text-gray-400">Entrée rapide, validation inline, anti-doublon côté serveur.</span>
        </div>
      </form>
    </div>
  );
}
