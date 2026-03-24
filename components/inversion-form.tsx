'use client';

import { InversionInput, Sortie, TyreCatalogItem } from '@/lib/types';
import { TyreAutocomplete } from './tyre-autocomplete';

export type InversionFormState = {
  sortie_id: string;
  date: string;
  immatriculation: string;
  quantite: string;
  mounted_code_sap: string;
  mounted_manufacturer_ref: string;
  mounted_search_label: string;
  mounted_description: string;
  mounted_tyre_catalog_id: string;
  billed_code_sap: string;
  billed_manufacturer_ref: string;
  billed_search_label: string;
  billed_description: string;
  billed_tyre_catalog_id: string;
  billed_tyre_search: string;
  facture_reference: string;
};

export function buildInversionPrefill(sortie: Sortie): InversionFormState {
  return {
    sortie_id: String(sortie.id),
    date: sortie.date,
    immatriculation: sortie.immatriculation,
    quantite: String(sortie.quantite),
    mounted_code_sap: sortie.code_sap || '',
    mounted_manufacturer_ref: sortie.manufacturer_ref || '',
    mounted_search_label: sortie.search_label || '',
    mounted_description: sortie.description || '',
    mounted_tyre_catalog_id: sortie.tyre_catalog_id ? String(sortie.tyre_catalog_id) : '',
    billed_code_sap: '',
    billed_manufacturer_ref: '',
    billed_search_label: '',
    billed_description: '',
    billed_tyre_catalog_id: '',
    billed_tyre_search: '',
    facture_reference: '',
  };
}

export function toInversionPayload(form: InversionFormState): InversionInput {
  return {
    sortie_id: Number(form.sortie_id),
    date: form.date,
    immatriculation: form.immatriculation,
    quantite: Number(form.quantite),
    mounted_code_sap: form.mounted_code_sap || null,
    mounted_manufacturer_ref: form.mounted_manufacturer_ref || null,
    mounted_search_label: form.mounted_search_label || null,
    mounted_description: form.mounted_description || null,
    mounted_tyre_catalog_id: form.mounted_tyre_catalog_id ? Number(form.mounted_tyre_catalog_id) : null,
    billed_code_sap: form.billed_code_sap || null,
    billed_manufacturer_ref: form.billed_manufacturer_ref || null,
    billed_search_label: form.billed_search_label || null,
    billed_description: form.billed_description || null,
    billed_tyre_catalog_id: form.billed_tyre_catalog_id ? Number(form.billed_tyre_catalog_id) : null,
    facture_reference: form.facture_reference || null,
  };
}

export function InversionForm({
  form,
  errors,
  loading,
  sourceSortieLabel,
  onChange,
  onSubmit,
  onBilledTyreSearchChange,
  onBilledTyreSelect,
}: {
  form: InversionFormState;
  errors: Partial<Record<keyof InversionInput | 'global', string>>;
  loading: boolean;
  sourceSortieLabel?: string | null;
  onChange: (key: keyof InversionFormState, value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBilledTyreSearchChange: (value: string) => void;
  onBilledTyreSelect: (item: TyreCatalogItem) => void;
}) {
  return (
    <div className="rounded-xl border border-amber-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">↔️ Nouvelle inversion</h2>
          <p className="text-sm text-gray-500">La sortie d'origine fixe l'immatriculation et la quantité. Tu ne saisis que la référence facturée.</p>
        </div>
        {sourceSortieLabel ? <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">Depuis : {sourceSortieLabel}</span> : null}
      </div>

      <form onSubmit={onSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
          <input type="date" value={form.date} onChange={(e) => onChange('date', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Référence facture (optionnel)</label>
          <input type="text" value={form.facture_reference} onChange={(e) => onChange('facture_reference', e.target.value)} placeholder="Ex: FAC-2026-001" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Immatriculation</label>
          <input type="text" value={form.immatriculation} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Quantité</label>
          <input type="number" value={form.quantite} readOnly className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600" />
        </div>

        <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-700">Référence montée / sortie existante</div>
          <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
            <div>SAP : <strong>{form.mounted_code_sap || '—'}</strong></div>
            <div>Réf fabricant : <strong>{form.mounted_manufacturer_ref || '—'}</strong></div>
            <div>Libellé : <strong>{form.mounted_search_label || '—'}</strong></div>
            <div>Description : <strong>{form.mounted_description || '—'}</strong></div>
          </div>
        </div>

        <div className="sm:col-span-2">
          <TyreAutocomplete
            value={form.billed_tyre_search}
            onChange={onBilledTyreSearchChange}
            onSelect={onBilledTyreSelect}
            label="Référence facturée *"
            placeholder="Chercher dans le catalogue pneus"
            helperText="Utilise le catalogue pour fiabiliser la référence facturée."
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Code SAP facturé</label>
          <input type="text" value={form.billed_code_sap} onChange={(e) => onChange('billed_code_sap', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Réf fabricant facturée</label>
          <input type="text" value={form.billed_manufacturer_ref} onChange={(e) => onChange('billed_manufacturer_ref', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Libellé facturé</label>
          <input type="text" value={form.billed_search_label} onChange={(e) => onChange('billed_search_label', e.target.value)} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1 block text-sm font-medium text-gray-700">Description facturée</label>
          <textarea value={form.billed_description} onChange={(e) => onChange('billed_description', e.target.value)} rows={2} className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500" />
        </div>

        {errors.global ? <p className="sm:col-span-2 text-sm text-red-600">{errors.global}</p> : null}
        <div className="sm:col-span-2 flex items-center gap-3">
          <button type="submit" disabled={loading || !form.sortie_id} className="rounded-lg bg-amber-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-amber-700 disabled:opacity-50">
            {loading ? 'Enregistrement…' : 'Enregistrer l’inversion'}
          </button>
          <span className="text-xs text-gray-400">Quantité et immatriculation verrouillées depuis la sortie.</span>
        </div>
      </form>
    </div>
  );
}
