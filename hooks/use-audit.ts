'use client';

import { useState, useCallback } from 'react';
import { fetchAuditLogs } from '@/lib/api';
import { AuditLog } from '@/lib/types';

export function useAudit() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  const refreshAudit = useCallback(async () => {
    try {
      const data = await fetchAuditLogs(12);
      setAuditLogs(data.items);
    } catch {
      // audit non bloquant pour l'UI
    }
  }, []);

  return { auditLogs, refreshAudit };
}
