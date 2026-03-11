'use client';

export function FiltersBar({
  search,
  immatriculation,
  dateFrom,
  dateTo,
  uniqueImmats,
  onChange,
  onReset,
}: {
  search: string;
  immatriculation: string;
  dateFrom: string;
  dateTo: string;
  uniqueImmats: string[];
  onChange: (key: string, value: string) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input type="text" value={search} onChange={(e) => onChange('search', e.target.value)} placeholder="🔍 Rechercher…" className="w-44 rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <select value={immatriculation} onChange={(e) => onChange('immatriculation', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="">Toutes les immat.</option>
        {uniqueImmats.map((item) => (
          <option key={item} value={item}>{item}</option>
        ))}
      </select>
      <input type="date" value={dateFrom} onChange={(e) => onChange('dateFrom', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" title="Du" />
      <input type="date" value={dateTo} onChange={(e) => onChange('dateTo', e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" title="Au" />
      {(search || immatriculation || dateFrom || dateTo) ? <button onClick={onReset} className="text-sm text-gray-500 hover:text-gray-700">✕ Reset</button> : null}
    </div>
  );
}
