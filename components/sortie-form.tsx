'use client';

import { useEffect, useRef, useState } from 'react';
import { Sortie, SortieInput, TyreCatalogItem } from '@/lib/types';
import { TyreAutocomplete } from './tyre-autocomplete';

export function SortieForm({
  form,
  errors,
  loading,
  onChange,
  onQuickQty,
  onSubmit,
  onTyreSearchChange,
  onTyreSelect,
  recentHint,
  lastSortie,
  selectedTyre,
}: {
  form: { date: string; immatriculation: string; code_sap: string; manufacturer_ref: string; search_label: string; tyre_search: string; tyre_catalog_id: string; quantite: string; description: string };
  errors: Partial<Record<keyof SortieInput | 'global', string>>;
  loading: boolean;
  onChange: (key: string, value: string) => void;
  onQuickQty: (qty: number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onTyreSearchChange: (value: string) => void;
  onTyreSelect: (item: TyreCatalogItem) => void;
  recentHint?: string;
  lastSortie?: Sortie | null;
  selectedTyre?: TyreCatalogItem | null;
}) {
  const qtyButtons = [1, 2, 4, 6, 10];
  const immatRef = useRef<HTMLInputElement>(null);
  const quantiteRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [keepTyre, setKeepTyre] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pneu-tracker-keep-tyre') === 'true';
    }
    return false;
  });

  const [showAdvanced, setShowAdvanced] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('pneu-tracker-show-advanced') === 'true';
    }
    return false;
  });

  useEffect(() => {
    localStorage.setItem('pneu-tracker-keep-tyre', String(keepTyre));
  }, [keepTyre]);

  useEffect(() => {
    localStorage.setItem('pneu-tracker-show-advanced', String(showAdvanced));
  }, [showAdvanced]);

  const handleTyreSelect = (item: TyreCatalogItem) => {
    onTyreSelect(item);
    immatRef.current?.focus();
  };

  const handleImmatKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      quantiteRef.current?.focus();
    }
  };

  const handleQuantiteKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  const handleRestoreLast = () => {
    if (!lastSortie) return;
    if (lastSortie.code_sap) onChange('code_sap', lastSortie.code_sap);
    if (lastSortie.manufacturer_ref) onChange('manufacturer_ref', lastSortie.manufacturer_ref);
    if (lastSortie.search_label) onChange('search_label', lastSortie.search_label);
    if (lastSortie.description) onChange('description', lastSortie.description);
    if (lastSortie.tyre_catalog_id) onChange('tyre_catalog_id', String(lastSortie.tyre_catalog_id));
    onTyreSearchChange(lastSortie.code_sap || lastSortie.manufacturer_ref || lastSortie.search_label || lastSortie.description || '');
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Nouvelle sortie</h2>
          <p className="text-sm text-gray-500">Recherche pneu intelligente : SAP, réf fabricant, libellé ou description.</p>
        </div>
        <div className="flex items-center gap-2">
          {lastSortie ? (
            <button type="button" onClick={handleRestoreLast} className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-medium text-amber-700 hover:bg-amber-100 transition-colors">
              ↩ Refaire le même pneu
            </button>
          ) : null}
          {recentHint ? <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">Dernière sortie : {recentHint}</span> : null}
        </div>
      </div>

      <form ref={formRef} onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {/* CHAMPS STANDARD */}
        <TyreAutocomplete value={form.tyre_search} onChange={onTyreSearchChange} onSelect={handleTyreSelect} />

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Immatriculation *</label>
          <input ref={immatRef} type="text" value={form.immatriculation} onChange={(e) => onChange('immatriculation', e.target.value)} onKeyDown={handleImmatKeyDown} placeholder="AB-123-CD" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm uppercase focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.immatriculation ? <p className="mt-1 text-xs text-red-600">{errors.immatriculation}</p> : <p className="mt-1 text-xs text-gray-400">Format libre mais normalisé automatiquement.</p>}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Quantité *</label>
          <input ref={quantiteRef} type="number" value={form.quantite} onChange={(e) => onChange('quantite', e.target.value)} onKeyDown={handleQuantiteKeyDown} min="1" max="20" placeholder="4" required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <div className="mt-2 flex flex-wrap gap-2">
            {qtyButtons.map((qty) => (
              <button key={qty} type="button" onClick={() => onQuickQty(qty)} className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100">
                +{qty}
              </button>
            ))}
          </div>
          {errors.quantite ? <p className="mt-1 text-xs text-red-600">{errors.quantite}</p> : null}
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date *</label>
          <input type="date" value={form.date} onChange={(e) => onChange('date', e.target.value)} required className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.date ? <p className="mt-1 text-xs text-red-600">{errors.date}</p> : null}
        </div>

        {/* BLOC RÉSUMÉ PNEU SÉLECTIONNÉ */}
        {selectedTyre ? (
          <div className="sm:col-span-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2 text-sm text-emerald-800">
            ✅ <span className="font-semibold">{selectedTyre.brand || 'Sans marque'}</span> — {selectedTyre.description || '—'} — SAP: {selectedTyre.sap_code || '—'}
          </div>
        ) : null}

        {/* TOGGLE AVANCÉS */}
        <div className="sm:col-span-2">
          <button type="button" onClick={() => setShowAdvanced(!showAdvanced)} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">
            {showAdvanced ? '▴ Masquer les détails' : '▾ Détails avancés'}
          </button>
        </div>

        {/* CHAMPS AVANCÉS */}
        {showAdvanced ? (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Code SAP</label>
              <input type="text" value={form.code_sap} onChange={(e) => onChange('code_sap', e.target.value)} placeholder="Ex: 1234567" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.code_sap ? <p className="mt-1 text-xs text-red-600">{errors.code_sap}</p> : null}
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Référence fabricant</label>
              <input type="text" value={form.manufacturer_ref} onChange={(e) => onChange('manufacturer_ref', e.target.value)} placeholder="Ex: AP1951H1" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Libellé de recherche</label>
              <input type="text" value={form.search_label} onChange={(e) => onChange('search_label', e.target.value)} placeholder="Ex: S1458013TAPL609" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Description</label>
              <textarea value={form.description} onChange={(e) => onChange('description', e.target.value)} placeholder="Ex: PNEU MICHELIN 205/55 R16..." rows={2} className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              {errors.description ? <p className="mt-1 text-xs text-red-600">{errors.description}</p> : <p className="mt-1 text-xs text-gray-400">Max 240 caractères.</p>}
            </div>
          </>
        ) : null}

        <div className="hidden">
          <input type="hidden" value={form.tyre_catalog_id} readOnly />
        </div>
        {errors.global ? <p className="sm:col-span-2 text-sm text-red-600">{errors.global}</p> : null}
        <div className="sm:col-span-2 flex items-center gap-3 flex-wrap">
          <button type="submit" disabled={loading} className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50">
            {loading ? 'Enregistrement…' : 'Enregistrer'}
          </button>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input type="checkbox" checked={keepTyre} onChange={(e) => setKeepTyre(e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            Conserver le pneu
          </label>
          <span className="text-xs text-gray-400">Sélection recommandée via la recherche pneu, mais saisie libre toujours possible.</span>
        </div>
      </form>
    </div>
  );
}

