'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createInversion, fetchInversions, InversionsFilters, toggleInversionDone, updateInversion } from '@/lib/api';
import { Inversion, InversionInput } from '@/lib/types';

const defaultFilters: InversionsFilters = {
  search: '',
  immatriculation: '',
  dateFrom: '',
  dateTo: '',
  limit: 20,
  offset: 0,
  facture: 'all',
};

export function useInversions() {
  const [filters, setFilters] = useState<InversionsFilters>(defaultFilters);
  const [items, setItems] = useState<Inversion[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);

  const load = useCallback(async (nextFilters = filters) => {
    setLoading(true);
    try {
      const data = await fetchInversions(nextFilters);
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

  const create = useCallback(async (input: InversionInput) => {
    setSaving(true);
    try {
      const created = await createInversion(input);
      setItems((current) => [created, ...current].slice(0, filters.limit));
      setTotal((current) => current + 1);
      setLastSaved(new Date().toISOString());
      return created;
    } finally {
      setSaving(false);
    }
  }, [filters.limit]);

  const update = useCallback(async (id: number, input: InversionInput) => {
    setSaving(true);
    try {
      const updated = await updateInversion(id, input);
      setItems((current) => current.map((item) => item.id === id ? updated : item));
      setLastSaved(new Date().toISOString());
      return updated;
    } finally {
      setSaving(false);
    }
  }, []);

  const markDone = useCallback(async (id: number) => {
    const updated = await toggleInversionDone(id);
    setItems((current) => current.map((item) => item.id === id ? updated : item));
    setLastSaved(new Date().toISOString());
    return updated;
  }, []);

  const hasPrev = filters.offset > 0;
  const hasNext = filters.offset + filters.limit < total;
  const pageStart = total === 0 ? 0 : filters.offset + 1;
  const pageEnd = total === 0 ? 0 : Math.min(filters.offset + items.length, total);

  return {
    items,
    total,
    loading,
    saving,
    filters,
    setFilters,
    uniqueImmats,
    lastSaved,
    load,
    create,
    update,
    markDone,
    hasPrev,
    hasNext,
    pageStart,
    pageEnd,
    nextPage: () => hasNext && setFilters((current) => ({ ...current, offset: current.offset + current.limit })),
    prevPage: () => hasPrev && setFilters((current) => ({ ...current, offset: Math.max(current.offset - current.limit, 0) })),
    resetFilters: () => setFilters(defaultFilters),
  };
}
