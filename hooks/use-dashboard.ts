'use client';

import { useState, useCallback } from 'react';
import { fetchDashboard } from '@/lib/api';
import { DashboardPayload } from '@/lib/types';

export function useDashboard() {
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(false);
  const [period, setPeriod] = useState('month');

  const refreshDashboard = useCallback(async (p?: string) => {
    setLoadingDashboard(true);
    try {
      const data = await fetchDashboard(p);
      setDashboard(data);
    } catch {
      // dashboard non bloquant
    } finally {
      setLoadingDashboard(false);
    }
  }, []);

  const handlePeriodChange = useCallback((p: string) => {
    setPeriod(p);
    void refreshDashboard(p);
  }, [refreshDashboard]);

  return { dashboard, loadingDashboard, refreshDashboard, period, handlePeriodChange };
}
