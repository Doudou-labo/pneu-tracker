import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  const sorties = db.prepare('SELECT * FROM sorties ORDER BY date DESC, created_at DESC').all();
  return NextResponse.json(sorties);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { date, immatriculation, code_sap, quantite, description } = body;

  if (!date || !immatriculation || !quantite) {
    return NextResponse.json({ error: 'Champs obligatoires manquants' }, { status: 400 });
  }

  const stmt = db.prepare(`
    INSERT INTO sorties (date, immatriculation, code_sap, quantite, description)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(date, immatriculation.toUpperCase(), code_sap || null, quantite, description || null);
  
  const newSortie = db.prepare('SELECT * FROM sorties WHERE id = ?').get(result.lastInsertRowid);
  return NextResponse.json(newSortie, { status: 201 });
}
