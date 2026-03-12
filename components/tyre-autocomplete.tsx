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
      <mark key={i} className="bg-yellow-200 text-inherit rounded-sm px-0.5">{part}</mark>
    ) : (
      part
    ),
  );
}

export function TyreAutocomplete({
  value,
  onChange,
  onSelect,
  label = 'Recherche pneu',
  placeholder = 'Code SAP, réf fabricant, dimension ou mot-clé',
  helperText = 'Recherche prédictive multi-critères. Astuce : utilise * pour remplacer une partie inconnue (ex. S2055516*MICPCY).',
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
  const [activeIndex, setActiveIndex] = useState(-1);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fermeture clic extérieur
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
        setActiveIndex(-1);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value]);

  const selectItem = useCallback((item: TyreCatalogItem) => {
    onSelect(item);
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
      // Laisser le focus passer naturellement au champ suivant
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
        onFocus={() => value.trim().length >= 2 && items.length > 0 && setOpen(true)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {helperText ? <p className="mt-1 text-xs text-gray-400">{helperText}</p> : null}
      <div aria-live="polite" className="sr-only">{liveMessage}</div>
      {open ? (
        <div id="tyre-listbox" role="listbox" className="absolute z-30 mt-2 max-h-80 w-full overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-xl">
          {loading ? <div className="px-4 py-3 text-sm text-gray-500">Recherche…</div> : null}
          {!loading && items.length === 0 ? <div className="px-4 py-3 text-sm text-gray-500">Aucune référence trouvée.</div> : null}
          {!loading && items.map((item, index) => (
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
              <div className="text-sm font-semibold text-gray-900">{highlightMatch(item.sap_code || 'Sans SAP', searchTerm)} {item.brand ? <span className="ml-2 font-normal text-gray-500">· {highlightMatch(item.brand, searchTerm)}</span> : null}</div>
              <div className="text-sm text-gray-700">{highlightMatch(item.description, searchTerm)}</div>
              <div className="text-xs text-gray-500">{highlightMatch(item.manufacturer_ref || '—', searchTerm)} · {highlightMatch(item.search_label || '—', searchTerm)}{item.season ? ` · ${item.season}` : ''}</div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
