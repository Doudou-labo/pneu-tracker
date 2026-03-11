'use client';

import { TyreCatalogItem } from '@/lib/types';
import { TyreAutocomplete } from './tyre-autocomplete';

export function FiltersBar({
  search,
  immatriculation,
  dateFrom,
  dateTo,
  uniqueImmats,
  onChange,
  onReset,
  onSearchSelect,
}: {
  search: string;
  immatriculation: string;
  dateFrom: string;
  dateTo: string;
  uniqueImmats: string[];
  onChange: (key: string, value: string) => void;
  onReset: () => void;
  onSearchSelect: (item: TyreCatalogItem) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-[minmax(0,2fr)_auto_auto_auto_auto] md:items-start">
        <TyreAutocomplete
          value={search}
          onChange={(value) => onChange('search', value)}
          onSelect={onSearchSelect}
          label="Recherche historique"
          placeholder="SAP, réf fabricant, libellé ou description"
          helperText="La suggestion choisie remplit la recherche historique immédiatement."
          compact
        />
        <select value={immatriculation} onChange={(e) => onChange('immatriculation', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Toutes les immat.</option>
          {uniqueImmats.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <input type="date" value={dateFrom} onChange={(e) => onChange('dateFrom', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" title="Du" />
        <input type="date" value={dateTo} onChange={(e) => onChange('dateTo', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" title="Au" />
        {(search || immatriculation || dateFrom || dateTo) ? <button onClick={onReset} className="rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-100 hover:text-gray-700">✕ Reset</button> : <div />}
      </div>
    </div>
  );
}
