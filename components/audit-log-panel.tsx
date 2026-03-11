'use client';

import { AuditLog } from '@/lib/types';
import { formatDateTimeFr } from '@/lib/formatters';

function labelForAction(action: string) {
  switch (action) {
    case 'create': return 'Création';
    case 'update': return 'Modification';
    case 'delete': return 'Suppression';
    case 'import_csv': return 'Import CSV';
    case 'export_csv': return 'Export CSV';
    default: return action;
  }
}

export function AuditLogPanel({ logs }: { logs: AuditLog[] }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-600">Journal d'activité</h3>
          <p className="text-sm text-gray-500">Qui a fait quoi et quand — dernieres actions.</p>
        </div>
      </div>
      {logs.length === 0 ? (
        <p className="text-sm text-gray-400">Aucun événement d’audit pour le moment.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-sm text-gray-700">
                  <span className="font-semibold">{labelForAction(log.action)}</span>
                  <span className="mx-2 text-gray-300">•</span>
                  <span>{log.actor}</span>
                  {log.entity_id ? <><span className="mx-2 text-gray-300">•</span><span>ID {log.entity_id}</span></> : null}
                </div>
                <div className="text-xs text-gray-400">{formatDateTimeFr(log.created_at)}</div>
              </div>
              {log.details_json ? <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs text-gray-500">{log.details_json}</pre> : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
