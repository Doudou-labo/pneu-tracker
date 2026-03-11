'use client';

import { Sortie } from '@/lib/types';
import { formatDateFr, formatDateTimeFr } from '@/lib/formatters';

export function SortiesList({
  items,
  total,
  loading,
  onEdit,
  onDelete,
}: {
  items: Sortie[];
  total: number;
  loading: boolean;
  onEdit: (sortie: Sortie) => void;
  onDelete: (sortie: Sortie) => void;
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

      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-3 py-2 text-left font-medium text-gray-500">Date</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Immat.</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Code SAP</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Qté</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Description</th>
              <th className="px-3 py-2 text-left font-medium text-gray-500">Maj</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                <td className="whitespace-nowrap px-3 py-2.5 text-gray-700">{formatDateFr(item.date)}</td>
                <td className="px-3 py-2.5 font-mono font-medium text-gray-900">{item.immatriculation}</td>
                <td className="px-3 py-2.5 text-gray-500">{item.code_sap || '—'}</td>
                <td className="px-3 py-2.5 text-center font-semibold text-blue-700">{item.quantite}</td>
                <td className="max-w-xs truncate px-3 py-2.5 text-gray-600">{item.description || '—'}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-xs text-gray-400">{formatDateTimeFr(item.updated_at || item.created_at)}</td>
                <td className="flex gap-1 px-3 py-2.5">
                  <button onClick={() => onEdit(item)} className="rounded px-2 py-1 text-xs text-blue-500 transition-colors hover:bg-blue-50 hover:text-blue-700">✏️</button>
                  <button onClick={() => onDelete(item)} className="rounded px-2 py-1 text-xs text-red-500 transition-colors hover:bg-red-50 hover:text-red-700">🗑️</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col gap-3 md:hidden">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="font-mono font-bold text-gray-900">{item.immatriculation}</span>
                <span className="ml-2 text-xs text-gray-400">{formatDateFr(item.date)}</span>
              </div>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-sm font-bold text-blue-800">{item.quantite} pneus</span>
            </div>
            {item.code_sap ? <p className="mt-1 text-xs text-gray-500">SAP : {item.code_sap}</p> : null}
            {item.description ? <p className="mt-1 text-sm text-gray-600">{item.description}</p> : null}
            <p className="mt-2 text-xs text-gray-400">Mise à jour : {formatDateTimeFr(item.updated_at || item.created_at)}</p>
            <div className="mt-3 flex gap-2">
              <button onClick={() => onEdit(item)} className="rounded border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-600 hover:bg-blue-100">✏️ Modifier</button>
              <button onClick={() => onDelete(item)} className="rounded border border-red-200 bg-red-50 px-3 py-1 text-xs text-red-600 hover:bg-red-100">🗑️ Supprimer</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
