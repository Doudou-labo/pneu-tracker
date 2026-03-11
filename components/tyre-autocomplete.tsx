'use client';

import { useEffect, useRef, useState } from 'react';
import { fetchTyreSuggestions } from '@/lib/api';
import { TyreCatalogItem } from '@/lib/types';

export function TyreAutocomplete({
  value,
  onChange,
  onSelect,
  label = 'Recherche pneu',
  placeholder = 'Code SAP, réf fabricant, dimension ou mot-clé',
  helperText = 'Recherche prédictive multi-critères. Sélection = auto-remplissage doux.',
  compact = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: TyreCatalogItem) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  compact?: boolean;
}) {
  const [items, setItems] = useState<TyreCatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setItems([]);
      setOpen(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchTyreSuggestions(value, 8);
        setItems(data.items);
        setOpen(true);
        setActiveIndex(0);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  const selectItem = (item: TyreCatalogItem) => {
    onSelect(item);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, items.length - 1));
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    }
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      selectItem(items[activeIndex]);
    }
    if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div className={`relative ${compact ? '' : 'sm:col-span-2'}`}>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => value.trim().length >= 2 && items.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {helperText ? <p className="mt-1 text-xs text-gray-400">{helperText}</p> : null}
      {open ? (
        <div className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {loading ? <div className="px-4 py-3 text-sm text-gray-500">Recherche…</div> : null}
          {!loading && items.length === 0 ? <div className="px-4 py-3 text-sm text-gray-500">Aucune référence trouvée.</div> : null}
          {!loading && items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(item)}
              className={`block w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
            >
              <div className="text-sm font-semibold text-gray-900">{item.sap_code || 'Sans SAP'} {item.brand ? <span className="ml-2 font-normal text-gray-500">· {item.brand}</span> : null}</div>
              <div className="text-sm text-gray-700">{item.description}</div>
              <div className="text-xs text-gray-500">{item.manufacturer_ref || '—'} · {item.search_label || '—'}{item.season ? ` · ${item.season}` : ''}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
