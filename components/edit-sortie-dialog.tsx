'use client';

import { SortieInput } from '@/lib/types';

export function EditSortieDialog({
  open,
  form,
  loading,
  error,
  onChange,
  onClose,
  onSubmit,
}: {
  open: boolean;
  form: { date: string; immatriculation: string; code_sap: string; quantite: string; description: string };
  loading: boolean;
  error?: string;
  onChange: (key: string, value: string) => void;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="edit-sortie-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="edit-sortie-title" className="mb-4 text-lg font-semibold text-gray-800">✏️ Modifier la sortie</h2>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
            <input type="date" value={form.date} onChange={(e) => onChange('date', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Immatriculation *</label>
            <input type="text" value={form.immatriculation} onChange={(e) => onChange('immatriculation', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Code SAP</label>
            <input type="text" value={form.code_sap} onChange={(e) => onChange('code_sap', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Quantité *</label>
            <input type="number" value={form.quantite} onChange={(e) => onChange('quantite', e.target.value)} min="1" max="20" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
            <textarea value={form.description} onChange={(e) => onChange('description', e.target.value)} rows={2} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <div className="flex gap-2 pt-1">
            <button disabled={loading} type="submit" className="flex-1 rounded-lg bg-blue-600 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
            <button type="button" onClick={onClose} className="flex-1 rounded-lg bg-gray-100 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-200">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  );
}
