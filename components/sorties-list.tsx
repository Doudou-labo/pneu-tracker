'use client';

import { Sortie } from '@/lib/types';
import { formatDateFr, formatDateTimeFr } from '@/lib/formatters';

export function SortiesList({
  items,
  total,
  loading,
  onEdit,
  onDelete,
  onToggleFacture,
}: {
  items: Sortie[];
  total: number;
  loading: boolean;
  onEdit: (sortie: Sortie) => void;
  onDelete: (sortie: Sortie) => void;
  onToggleFacture: (sortie: Sortie) => void;
}) {
  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Chargement de l'historique…</div>;
  }

  if (items.length === 0) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Aucune sortie trouvée.</div>;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 text-sm text-gray-500">{items.length} sortie(s) affichée(s) · {total} au total</div>

      {/* Desktop table — masqué, on utilise les cartes partout */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="w-8 px-2 py-2" title="Facturé">💶</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500 whitespace-nowrap">Immat.</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Code SAP</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Réf fabricant</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Libellé</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Qté</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Maj</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className={`border-b border-gray-50 transition-colors hover:bg-gray-50 ${item.facture_at ? 'opacity-60 bg-green-50' : ''}`}
              >
                <td className="px-2 py-2.5 text-center">
                  <button
                    onClick={() => onToggleFacture(item)}
                    title={item.facture_at ? `Facturé le ${formatDateTimeFr(item.facture_at)} — cliquer pour retirer` : 'Marquer comme facturé'}
                    className="text-lg leading-none transition-transform hover:scale-110 focus:outline-none"
                  >
                    {item.facture_at ? '✅' : '⬜'}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">{formatDateFr(item.date)}</td>
                <td className="px-3 py-2.5 font-mono font-medium text-gray-900 whitespace-nowrap">{item.immatriculation}</td>
                <td className="px-3 py-2.5 text-gray-500">{item.code_sap || '—'}</td>
                <td className="px-3 py-2.5 text-gray-500">{item.manufacturer_ref || '—'}</td>
                <td className="max-w-[160px] truncate px-3 py-2.5 text-gray-500">{item.search_label || '—'}</td>
                <td className="px-3 py-2.5 text-center font-semibold text-blue-700">{item.quantite}</td>
                <td className="max-w-xs truncate px-3 py-2.5 text-gray-600">{item.description || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-400">
                  {formatDateTimeFr(item.updated_at || item.created_at)}
                  {item.facture_at && (
                    <div className="text-green-600 font-medium">Fact. {formatDateTimeFr(item.facture_at)}</div>
                  )}
                </td>
                <td className="flex gap-1 px-3 py-2.5">
                  <button onClick={() => onEdit(item)} className="rounded px-2 py-1 text-xs text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700">✏️</button>
                  <button onClick={() => onDelete(item)} className="rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 hover:text-red-700">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Cards — vue universelle mobile + desktop */}
      <div className="flex flex-col gap-3 md:hidden">
        {items.map((item) => (
          <div
            key={item.id}
            className={`rounded-lg border border-gray-200 p-4 ${item.facture_at ? 'bg-green-50 opacity-70' : 'bg-gray-50'}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono font-bold text-gray-900">{item.immatriculation}</span>
                <span className="ml-2 text-xs text-gray-400">{formatDateFr(item.date)}</span>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-bold text-blue-800">{item.quantite} pneus</span>
            </div>
            <p className="mt-1 text-xs text-gray-500">SAP : {item.code_sap || '—'}</p>
            {item.manufacturer_ref ? <p className="mt-1 text-xs text-gray-500">Réf fabricant : {item.manufacturer_ref}</p> : null}
            {item.search_label ? <p className="mt-1 text-xs text-gray-500">Libellé : {item.search_label}</p> : null}
            {item.description ? <p className="mt-1 text-sm text-gray-600">{item.description}</p> : null}
            {item.facture_at && (
              <p className="mt-1 text-xs font-medium text-green-700">✅ Facturé le {formatDateTimeFr(item.facture_at)}</p>
            )}
            <p className="mt-2 text-xs text-gray-400">Mise à jour : {formatDateTimeFr(item.updated_at || item.created_at)}</p>
            <div className="mt-3 flex gap-2">
              <button
                onClick={() => onToggleFacture(item)}
                className={`rounded border px-3 py-1 text-xs ${item.facture_at ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                {item.facture_at ? '✅ Facturé' : '⬜ Non facturé'}
              </button>
              <button onClick={() => onEdit(item)} className="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-600 hover:bg-blue-100">✏️ Modifier</button>
              <button onClick={() => onDelete(item)} className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100">🗑️ Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
