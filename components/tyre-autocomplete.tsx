'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { fetchTyreSuggestions } from '@/lib/api';
import { TyreCatalogItem } from '@/lib/types';

function highlightMatch(text: string, term: string) {
  if (!term || !text || term.includes('*')) return text;
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  if (parts.length === 1) return text;
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="rounded-sm bg-yellow-200 px-0.5 text-inherit">{part}</mark>
    ) : (
      part
    ),
  );
}

function extractDimension(item: TyreCatalogItem) {
  const descriptionMatch = item.description.match(/\b\d{3}\/\d{2}R\d{2}\b/i);
  if (descriptionMatch) return descriptionMatch[0].toUpperCase();
  return item.diameter ? `R${item.diameter}` : null;
}

function getPrimaryValue(item: TyreCatalogItem) {
  return item.sap_code || item.manufacturer_ref || item.search_label || item.description;
}

export function TyreAutocomplete({
  value,
  onChange,
  onSelect,
  label = 'Recherche pneu',
  placeholder = 'Code SAP, réf fabricant, dimension ou mot-clé',
  helperText = 'Recherche prédictive multi-critères. Astuce : utilise * pour remplacer une partie inconnue (ex. S2055516*MICPCY).',
  compact = false,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  onSelect: (item: TyreCatalogItem) => void;
  label?: string;
  placeholder?: string;
  helperText?: string;
  compact?: boolean;
  autoFocus?: boolean;
}) {
  const [items, setItems] = useState<TyreCatalogItem[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const requestIdRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, []);

  useEffect(() => {
    if (autoFocus) {
      inputRef.current?.focus();
    }
  }, [autoFocus]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (value.trim().length < 2) {
      setItems([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    const requestId = ++requestIdRef.current;
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchTyreSuggestions(value, 8);
        if (requestId !== requestIdRef.current) return;
        setItems(data.items);
        setOpen(true);
        setActiveIndex(data.items.length > 0 ? 0 : -1);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 140);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  const selectItem = useCallback((item: TyreCatalogItem) => {
    onSelect(item);
    setItems([]);
    setOpen(false);
    setActiveIndex(-1);
  }, [onSelect]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open || items.length === 0) {
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, items.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
    } else if (e.key === 'Enter') {
      if (activeIndex >= 0 && activeIndex < items.length) {
        e.preventDefault();
        selectItem(items[activeIndex]);
      }
    } else if (e.key === 'Tab') {
      setOpen(false);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      inputRef.current?.focus();
    }
  };

  const liveMessage = loading
    ? 'Chargement...'
    : open && items.length > 0
      ? `${items.length} résultat${items.length > 1 ? 's' : ''} disponible${items.length > 1 ? 's' : ''}`
      : open && items.length === 0
        ? 'Aucune référence trouvée'
        : '';

  const searchTerm = value.trim();

  return (
    <div ref={containerRef} className={`relative ${compact ? '' : 'sm:col-span-2'}`}>
      <label id="tyre-autocomplete-label" className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls="tyre-listbox"
        aria-activedescendant={activeIndex >= 0 ? `tyre-opt-${activeIndex}` : undefined}
        aria-labelledby="tyre-autocomplete-label"
        aria-autocomplete="list"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => value.trim().length >= 2 && (items.length > 0 || loading) && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {helperText ? <p className="mt-1 text-xs text-gray-400">{helperText}</p> : null}
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      {open ? (
        <div id="tyre-listbox" role="listbox" className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {loading ? <div className="px-4 py-3 text-sm text-gray-500">Recherche…</div> : null}
          {!loading && items.length === 0 ? <div className="px-4 py-3 text-sm text-gray-500">Aucune référence trouvée.</div> : null}
          {!loading && items.map((item, index) => {
            const dimension = extractDimension(item);
            const primaryValue = getPrimaryValue(item);

            return (
              <button
                key={item.id}
                id={`tyre-opt-${index}`}
                role="option"
                aria-selected={index === activeIndex}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => selectItem(item)}
                className={`block w-full border-b border-gray-100 px-4 py-3 text-left last:border-b-0 ${index === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">SAP {highlightMatch(item.sap_code || '—', searchTerm)}</span>
                  {item.brand ? <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">{highlightMatch(item.brand, searchTerm)}</span> : null}
                  {dimension ? <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700">{highlightMatch(dimension, searchTerm)}</span> : null}
                  {item.season ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">{highlightMatch(item.season, searchTerm)}</span> : null}
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-900">{highlightMatch(primaryValue, searchTerm)}</div>
                <div className="mt-1 text-sm text-gray-700">{highlightMatch(item.description, searchTerm)}</div>
                <div className="mt-1 text-xs text-gray-500">
                  Réf fabricant: {highlightMatch(item.manufacturer_ref || '—', searchTerm)} · Libellé: {highlightMatch(item.search_label || '—', searchTerm)}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
