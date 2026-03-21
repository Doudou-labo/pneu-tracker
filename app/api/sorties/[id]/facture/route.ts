import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActor, logAudit } from '@/lib/audit';
import { errorResponse } from '@/lib/validators';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const numId = Number(id);
    if (!numId || isNaN(numId)) {
      return NextResponse.json({ error: 'ID invalide' }, { status: 400 });
    }

    const sortie = db.prepare('SELECT * FROM sorties WHERE id = ? AND deleted_at IS NULL').get(numId) as { facture_at: string | null } | undefined;
    if (!sortie) {
      return NextResponse.json({ error: 'Sortie introuvable' }, { status: 404 });
    }

    const actor = getActor(request);

    if (sortie.facture_at === null) {
      // Marquer comme facturé
      db.prepare("UPDATE sorties SET facture_at = datetime('now'), updated_at = datetime('now') WHERE id = ?").run(numId);
      logAudit({
        actor,
        action: 'update',
        entityType: 'sortie',
        entityId: numId,
        details: { action: 'MARQUER_FACTURE' },
      });
    } else {
      // Retirer le marquage
      db.prepare("UPDATE sorties SET facture_at = NULL, updated_at = datetime('now') WHERE id = ?").run(numId);
      logAudit({
        actor,
        action: 'update',
        entityType: 'sortie',
        entityId: numId,
        details: { action: 'DEMARQUER_FACTURE', was: sortie.facture_at },
      });
    }

    const updated = db.prepare('SELECT * FROM sorties WHERE id = ?').get(numId);
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
