import db from './db';

export type AuditAction = 'create' | 'update' | 'delete' | 'import_csv' | 'export_csv' | 'export_pdf';

export function getActor(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Basic ')) return 'anonymous';

  try {
    const decoded = Buffer.from(auth.slice(6), 'base64').toString('utf8');
    const index = decoded.indexOf(':');
    if (index < 0) return 'anonymous';
    return decoded.slice(0, index) || 'anonymous';
  } catch {
    return 'anonymous';
  }
}

export function logAudit(params: {
  actor: string;
  action: AuditAction;
  entityType: string;
  entityId?: number | null;
  details?: unknown;
}) {
  db.prepare(`
    INSERT INTO audit_log (actor, action, entity_type, entity_id, details_json)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    params.actor,
    params.action,
    params.entityType,
    params.entityId ?? null,
    params.details ? JSON.stringify(params.details) : null,
  );
}
