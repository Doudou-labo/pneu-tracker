import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActor, logAudit } from '@/lib/audit';
import { errorResponse, validateBulkRows } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const rows = validateBulkRows(body);

    const insert = db.prepare(`
      INSERT INTO sorties (date, immatriculation, code_sap, quantite, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const existing = db.prepare(`
      SELECT id FROM sorties
      WHERE deleted_at IS NULL
        AND date = ?
        AND immatriculation = ?
        AND COALESCE(code_sap, '') = COALESCE(?, '')
        AND quantite = ?
        AND COALESCE(description, '') = COALESCE(?, '')
      LIMIT 1
    `);

    const errors: Array<{ row: number; message: string }> = [];
    let inserted = 0;
    let skipped = 0;

    const tx = db.transaction(() => {
      rows.forEach((row, index) => {
        const duplicate = existing.get(row.date, row.immatriculation, row.code_sap ?? null, row.quantite, row.description ?? null);
        if (duplicate) {
          skipped++;
          errors.push({ row: index + 1, message: 'Doublon détecté' });
          return;
        }

        insert.run(row.date, row.immatriculation, row.code_sap ?? null, row.quantite, row.description ?? null);
        inserted++;
      });
    });

    tx();

    logAudit({ actor: getActor(request), action: 'import_csv', entityType: 'sortie', details: { inserted, skipped, errorsCount: errors.length } });
    return NextResponse.json({ inserted, skipped, errors });
  } catch (error) {
    return errorResponse(error);
  }
}
