'use client';

import { useState } from 'react';
import { Sortie } from '@/lib/types';
import { formatDateFr, formatDateTimeFr } from '@/lib/formatters';
import { DeleteDialog } from './delete-dialog';

export function SortiesList({
  items,
  total,
  loading,
  onEdit,
  onDelete,
  onToggleFacture,
  onCreateInversion,
}: {
  items: Sortie[];
  total: number;
  loading: boolean;
  onEdit: (sortie: Sortie) => void;
  onDelete: (sortie: Sortie) => void;
  onToggleFacture: (sortie: Sortie) => void;
  onCreateInversion: (sortie: Sortie) => void;
}) {
  const [deleteTarget, setDeleteTarget] = useState<Sortie | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  if (loading) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Chargement de l'historique…</div>;
  }

  if (items.length === 0) {
    return <div className="rounded-xl border border-gray-200 bg-white p-8 text-center text-gray-400">Aucune sortie trouvée.</div>;
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 text-sm text-gray-500">{items.length} sortie(s) affichée(s) · {total} au total</div>
      <div className="flex flex-col gap-3">
        {items.map((item) => (
          <div key={item.id} className={`rounded-lg border border-gray-200 p-4 ${item.facture_at ? 'bg-green-50 opacity-70' : 'bg-gray-50'}`}>
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
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => onToggleFacture(item)}
                aria-label={item.facture_at ? `Retirer le statut facturé pour ${item.immatriculation}` : `Marquer comme facturé pour ${item.immatriculation}`}
                className={`rounded border px-3 py-2 text-sm ${item.facture_at ? 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'}`}
              >
                {item.facture_at ? '✅ Facturé' : '⬜ Non facturé'}
              </button>
              <button onClick={() => onCreateInversion(item)} className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 hover:bg-amber-100">↔️ Inversion</button>
              <button onClick={() => onEdit(item)} aria-label="Modifier" className="rounded border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-600 hover:bg-blue-100">✏️ Modifier</button>
              <button onClick={() => setDeleteTarget(item)} aria-label="Supprimer" className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100">🗑️ Supprimer</button>
            </div>
          </div>
        ))}
      </div>

      <DeleteDialog
        sortie={deleteTarget}
        loading={deleteLoading}
        onConfirm={async () => {
          if (!deleteTarget) return;
          setDeleteLoading(true);
          try {
            await onDelete(deleteTarget);
          } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
          }
        }}
        onClose={() => setDeleteTarget(null)}
      />
    </div>
  );
}
