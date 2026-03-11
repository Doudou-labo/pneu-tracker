'use client';

import { useCallback } from 'react';
import { createSortie, updateSortie, deleteSortie, importSorties } from '@/lib/api';
import { Sortie, SortieInput } from '@/lib/types';

export function useSortieActions({
  onSuccess,
}: {
  onSuccess?: () => void;
} = {}) {
  const handleCreate = useCallback(async (input: SortieInput): Promise<Sortie> => {
    const result = await createSortie(input);
    onSuccess?.();
    return result;
  }, [onSuccess]);

  const handleUpdate = useCallback(async (id: number, input: SortieInput): Promise<Sortie> => {
    const result = await updateSortie(id, input);
    onSuccess?.();
    return result;
  }, [onSuccess]);

  const handleDelete = useCallback(async (id: number): Promise<{ success: true; id: number }> => {
    const result = await deleteSortie(id);
    onSuccess?.();
    return result;
  }, [onSuccess]);

  const handleImport = useCallback(async (rows: SortieInput[]) => {
    const result = await importSorties(rows);
    onSuccess?.();
    return result;
  }, [onSuccess]);

  return { handleCreate, handleUpdate, handleDelete, handleImport };
}
