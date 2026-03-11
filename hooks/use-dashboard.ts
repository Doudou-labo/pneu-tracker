'use client';

import { useState, useCallback } from 'react';
import { fetchDashboard } from '@/lib/api';
import { DashboardPayload } from '@/lib/types';

export function useDashboard() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const refreshDashboard = useCallback(async () => {
    setLoadingDashboard(true);
    try {
      const data = await fetchDashboard();
      setDashboard(data);
    } catch {
      // dashboard non bloquant
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  return { dashboard, loadingDashboard, refreshDashboard };
}
