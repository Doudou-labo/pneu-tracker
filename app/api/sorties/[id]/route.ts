import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { errorResponse, validateId, validateSortieInput } from '@/lib/validators';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = validateId(rawId);

    const result = db.prepare(`
      UPDATE sorties
      SET deleted_at = datetime('now'), updated_at = datetime('now')
      WHERE id = ? AND deleted_at IS NULL
    `).run(id);

    if (result.changes === 0) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Sortie non trouvée' }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await params;
    const id = validateId(rawId);
    const body = await request.json();
    const input = validateSortieInput(body);

    const result = db.prepare(`
      UPDATE sorties
      SET date = ?, immatriculation = ?, code_sap = ?, quantite = ?, description = ?, updated_at = datetime('now')
      WHERE id = ? AND deleted_at IS NULL
    `).run(input.date, input.immatriculation, input.code_sap ?? null, input.quantite, input.description ?? null, id);

    if (result.changes === 0) {
      return NextResponse.json({ code: 'NOT_FOUND', message: 'Sortie non trouvée' }, { status: 404 });
    }

    const updated = db.prepare('SELECT * FROM sorties WHERE id = ?').get(id);
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
