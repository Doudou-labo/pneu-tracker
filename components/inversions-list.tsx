'use client';

import { Inversion } from '@/lib/types';
import { formatDateFr, formatDateTimeFr } from '@/lib/formatters';

export function InversionsList({ items, total, loading, onEdit, onToggleDone }: { items: Inversion[]; total: number; loading: boolean; onEdit: (item: Inversion) => void; onToggleDone: (item: Inversion) => void }) {
  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Chargement des inversions…</div>;
  }

  if (!items.length) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Aucune inversion trouvée.</div>;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 text-sm text-gray-500">{items.length} inversion(s) affichée(s) · {total} au total</div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className={`rounded-lg border p-4 ${item.done_at ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/40'}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono font-bold text-gray-900">{item.immatriculation}</span>
                  <span className="text-xs text-gray-400">{formatDateFr(item.date)}</span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-800">{item.quantite} pneus</span>
                  {item.facture_reference ? <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">Facture {item.facture_reference}</span> : <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">Sans facture</span>}
                  {item.done_at ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">✅ Inversion faite</span> : <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">⏳ À faire</span>}
                </div>
                <p className="mt-2 text-xs text-gray-500">Sortie source #{item.sortie_id}</p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <p className="text-xs text-gray-400">Maj : {formatDateTimeFr(item.updated_at || item.created_at)}</p>
                <div className="flex flex-wrap items-center gap-2">
                  <label className={`flex cursor-pointer items-center gap-2 rounded border px-3 py-1.5 text-sm transition-colors ${item.done_at ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'}`}>
                    <input type="checkbox" checked={Boolean(item.done_at)} onChange={() => onToggleDone(item)} className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
                    <span>{item.done_at ? 'Inversion faite' : 'À faire'}</span>
                  </label>
                  <button onClick={() => onEdit(item)} className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 transition-colors hover:bg-blue-100">✏️ Modifier</button>
                </div>
              </div>
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Monté / enregistré</div>
                <div className="mt-2 space-y-1 text-sm text-slate-700">
                  <p>SAP : <strong>{item.mounted_code_sap || '—'}</strong></p>
                  <p>Réf fabricant : <strong>{item.mounted_manufacturer_ref || '—'}</strong></p>
                  <p>Libellé : <strong>{item.mounted_search_label || '—'}</strong></p>
                  <p>Description : <strong>{item.mounted_description || '—'}</strong></p>
                </div>
              </div>
              <div className="rounded-lg border border-amber-200 bg-white p-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-amber-600">Facturé</div>
                <div className="mt-2 space-y-1 text-sm text-gray-700">
                  <p>SAP : <strong>{item.billed_code_sap || '—'}</strong></p>
                  <p>Réf fabricant : <strong>{item.billed_manufacturer_ref || '—'}</strong></p>
                  <p>Libellé : <strong>{item.billed_search_label || '—'}</strong></p>
                  <p>Description : <strong>{item.billed_description || '—'}</strong></p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
