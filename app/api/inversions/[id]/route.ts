import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActor, logAudit } from '@/lib/audit';
import { createInversionRecord, inversionSelect } from '@/lib/inversions';
import { errorResponse, validateId, validateInversionInput } from '@/lib/validators';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = validateId(rawId);
    const body = await request.json();
    const input = validateInversionInput(body);

    const current = db.prepare('SELECT sortie_id FROM inversions WHERE id = ? AND deleted_at IS NULL').get(id) as { sortie_id: number } | undefined;
    if (!current) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Inversion introuvable' }, { status: 404 });
    }

    db.prepare('UPDATE inversions SET deleted_at = datetime(\'now\'), updated_at = datetime(\'now\') WHERE id = ? AND deleted_at IS NULL').run(id);
    const recreated = createInversionRecord(input);

    if ('error' in recreated) {
      db.prepare('UPDATE inversions SET deleted_at = NULL, updated_at = datetime(\'now\') WHERE id = ?').run(id);
      const failure = recreated.error;
      return NextResponse.json({ code: failure?.code || 'INVERSION_ERROR', message: failure?.message || 'Erreur inversion' }, { status: failure?.status || 500 });
    }

    db.prepare('DELETE FROM inversions WHERE id = ?').run(id);

    const updated = db.prepare(`${inversionSelect} WHERE i.id = ?`).get((recreated.created as { id: number }).id);
    logAudit({ actor: getActor(request), action: 'update', entityType: 'inversion', entityId: id, details: { previous_sortie_id: current.sortie_id, next_sortie_id: input.sortie_id, facture_reference: input.facture_reference } });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: rawId } = await params;
    const id = validateId(rawId);

    const result = db.prepare(`
      UPDATE inversions
      SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND deleted_at IS NULL
    `).run(id);

    if (result.changes === 0) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Inversion introuvable' }, { status: 404 });
    }

    logAudit({ actor: getActor(request), action: 'delete', entityType: 'inversion', entityId: id, details: { deleted_at: new Date().toISOString() } });
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return errorResponse(error);
  }
}
