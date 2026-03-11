'use client';

import { Sortie } from '@/lib/types';
import { formatDateFr } from '@/lib/formatters';

export function DeleteDialog({
  sortie,
  loading,
  onConfirm,
  onClose,
}: {
  sortie: Sortie | null;
  loading: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  if (!sortie) return null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-labelledby="delete-sortie-title" className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <h2 id="delete-sortie-title" className="mb-3 text-lg font-semibold text-gray-800">🗑️ Supprimer la sortie</h2>
        <p className="text-sm text-gray-600">
          Supprimer la sortie du <strong>{formatDateFr(sortie.date)}</strong> pour <strong>{sortie.immatriculation}</strong> ({sortie.quantite} pneus) ?
        </p>
        <p className="mt-2 text-xs text-gray-400">Suppression logique uniquement : la donnée reste traçable côté base.</p>
        <div className="mt-5 flex gap-2">
          <button onClick={onClose} className="flex-1 rounded-lg bg-gray-100 py-2 font-semibold text-gray-700 hover:bg-gray-200">Annuler</button>
          <button disabled={loading} onClick={onConfirm} className="flex-1 rounded-lg bg-red-600 py-2 font-semibold text-white hover:bg-red-700 disabled:opacity-50">{loading ? 'Suppression…' : 'Confirmer'}</button>
        </div>
      </div>
    </div>
  );
}
