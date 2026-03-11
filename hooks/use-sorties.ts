'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createSortie, deleteSortie, fetchSorties, importSorties, SortiesFilters, updateSortie } from '@/lib/api';
import { Sortie, SortieInput } from '@/lib/types';

const defaultFilters: SortiesFilters = {
  search: '',
  immatriculation: '',
  dateFrom: '',
  dateTo: '',
  limit: 50,
  offset: 0,
};

export function useSorties() {
  const [filters, setFilters] = useState<SortiesFilters>(defaultFilters);
  const [items, setItems] = useState<Sortie[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const load = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const data = await fetchSorties(nextFilters);
      setItems(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load(filters);
  }, [filters, load]);

  const uniqueImmats = useMemo(() => [...new Set(items.map((item) => item.immatriculation))].sort(), [items]);

  const create = useCallback(async (input: SortieInput) => {
    setSaving(true);
    try {
      const created = await createSortie(input);
      setItems((current) => [created, ...current].slice(0, filters.limit));
      setTotal((current) => current + 1);
      setLastSaved(new Date().toISOString());
      return created;
    } finally {
      setSaving(false);
    }
  }, [filters.limit]);

  const update = useCallback(async (id: number, input: SortieInput) => {
    setSaving(true);
    try {
      const updated = await updateSortie(id, input);
      setItems((current) => current.map((item) => item.id === id ? updated : item));
      setLastSaved(new Date().toISOString());
      return updated;
    } finally {
      setSaving(false);
    }
  }, []);

  const remove = useCallback(async (id: number) => {
    setDeleting(true);
    try {
      await deleteSortie(id);
      setItems((current) => current.filter((item) => item.id !== id));
      setTotal((current) => Math.max(current - 1, 0));
      setLastSaved(new Date().toISOString());
    } finally {
      setDeleting(false);
    }
  }, []);

  const bulkImport = useCallback(async (rows: SortieInput[]) => {
    setImporting(true);
    try {
      const result = await importSorties(rows);
      await load(filters);
      setLastSaved(new Date().toISOString());
      return result;
    } finally {
      setImporting(false);
    }
  }, [filters, load]);

  return {
    items,
    total,
    loading,
    saving,
    deleting,
    importing,
    filters,
    setFilters,
    uniqueImmats,
    lastSaved,
    load,
    create,
    update,
    remove,
    bulkImport,
    resetFilters: () => setFilters(defaultFilters),
  };
}
