'use client';

import { useCallback, useEffect, useState } from 'react';
import { fetchTyreCatalogStatus, importTyreCatalog } from '@/lib/api';
import { TyreCatalogImportResult, TyreCatalogStatus } from '@/lib/types';

export function useTyreCatalog() {
  const [status, setStatus] = useState<TyreCatalogStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchTyreCatalogStatus();
      setStatus(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const importFile = useCallback(async (file: File): Promise<TyreCatalogImportResult> => {
    setImporting(true);
    try {
      const result = await importTyreCatalog(file);
      setStatus((current) => ({
        totalCatalogReferences: result.totalCatalogReferences,
        lastImportedAt: result.lastImportedAt,
        lastRun: current?.lastRun
          ? {
              ...current.lastRun,
              imported_at: result.lastImportedAt || current.lastRun.imported_at,
              inserted_count: result.inserted,
              updated_count: result.updated,
              ignored_count: result.ignored,
              error_count: result.errors.length,
              total_rows: result.totalRows,
              status: 'success',
            }
          : null,
      }));
      await refresh();
      return result;
    } finally {
      setImporting(false);
    }
  }, [refresh]);

  return {
    status,
    loading,
    importing,
    refresh,
    importFile,
  };
}
