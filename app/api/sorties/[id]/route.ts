import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const result = db.prepare('DELETE FROM sorties WHERE id = ?').run(Number(id));
  if (result.changes === 0) return NextResponse.json({ error: 'Sortie non trouvée' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { date, immatriculation, code_sap, quantite, description } = body;
  if (!date || !immatriculation || !quantite) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
  }
  db.prepare(`
    UPDATE sorties SET date=?, immatriculation=?, code_sap=?, quantite=?, description=? WHERE id=?
  `).run(date, immatriculation.toUpperCase(), code_sap || null, quantite, description || null, Number(id));
  const updated = db.prepare('SELECT * FROM sorties WHERE id = ?').get(Number(id));
  return NextResponse.json(updated);
}
