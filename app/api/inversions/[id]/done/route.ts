import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActor, logAudit } from '@/lib/audit';
import { inversionSelect } from '@/lib/inversions';
import { errorResponse, validateId } from '@/lib/validators';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = validateId(rawId);

    const inversion = db.prepare('SELECT done_at FROM inversions WHERE id = ? AND deleted_at IS NULL').get(id) as { done_at: string | null } | undefined;
    if (!inversion) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Inversion introuvable' }, { status: 404 });
    }

    const nextDoneAt = inversion.done_at ? null : new Date().toISOString();
    db.prepare('UPDATE inversions SET done_at = ?, updated_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL').run(nextDoneAt, id);

    const updated = db.prepare(`${inversionSelect} WHERE i.id = ?`).get(id);

    logAudit({
      actor: getActor(request),
      action: 'update',
      entityType: 'inversion',
      entityId: id,
      details: { action: inversion.done_at ? 'DEMARQUER_INVERSION_FAITE' : 'MARQUER_INVERSION_FAITE', done_at: nextDoneAt },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
