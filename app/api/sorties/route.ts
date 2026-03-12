import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActor, logAudit } from '@/lib/audit';
import { errorResponse, validateSortieInput } from '@/lib/validators';

function hasEnoughMeaningfulChars(term: string) {
  return term.replace(/\*/g, '').trim().length >= 2;
}

function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, '\\$&');
}

function toSearchPattern(term: string) {
  const normalized = term.trim().replace(/\*+/g, '*');
  if (normalized.includes('*')) {
    return escapeLike(normalized).replace(/\*/g, '%');
  }
  return `%${normalized}%`;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const immatriculation = (searchParams.get('immatriculation') || '').trim().toUpperCase();
    const dateFrom = (searchParams.get('dateFrom') || '').trim();
    const dateTo = (searchParams.get('dateTo') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 50), 1), 200);
    const offset = Math.max(Number(searchParams.get('offset') || 0), 0);

    const conditions = ['deleted_at IS NULL'];
    const params: unknown[] = [];

    if (search && (!search.includes('*') || hasEnoughMeaningfulChars(search))) {
      conditions.push('(immatriculation LIKE ? ESCAPE \'\\\' OR COALESCE(code_sap,\'\') LIKE ? ESCAPE \'\\\' OR COALESCE(manufacturer_ref,\'\') LIKE ? ESCAPE \'\\\' OR COALESCE(search_label,\'\') LIKE ? ESCAPE \'\\\' OR COALESCE(description,\'\') LIKE ? ESCAPE \'\\\')');
      const like = toSearchPattern(search);
      params.push(like, like, like, like, like);
    }

    if (immatriculation) {
      conditions.push('immatriculation = ?');
      params.push(immatriculation);
    }

    if (dateFrom) {
      conditions.push('date >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push('date <= ?');
      params.push(dateTo);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const totalRow = db.prepare(`SELECT COUNT(*) as count FROM sorties ${where}`).get(...params) as { count: number };
    const total = Number(totalRow?.count ?? 0);
    const items = db
      .prepare(`SELECT * FROM sorties ${where} ORDER BY date DESC, created_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset);

    return NextResponse.json({ items, total, limit, offset });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = validateSortieInput(body);

    const duplicate = db.prepare(`
      SELECT id FROM sorties
      WHERE deleted_at IS NULL
        AND date = ?
        AND immatriculation = ?
        AND COALESCE(code_sap, '') = COALESCE(?, '')
        AND COALESCE(manufacturer_ref, '') = COALESCE(?, '')
        AND quantite = ?
        AND COALESCE(description, '') = COALESCE(?, '')
      LIMIT 1
    `).get(input.date, input.immatriculation, input.code_sap, input.manufacturer_ref, input.quantite, input.description);

    if (duplicate) {
      return NextResponse.json({ code: 'DUPLICATE', message: 'Une sortie identique existe déjà.' }, { status: 409 });
    }

    const result = db.prepare(`
      INSERT INTO sorties (date, immatriculation, code_sap, manufacturer_ref, search_label, quantite, description, tyre_catalog_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).run(input.date, input.immatriculation, input.code_sap ?? null, input.manufacturer_ref ?? null, input.search_label ?? null, input.quantite, input.description ?? null, input.tyre_catalog_id ?? null);

    const newSortie = db.prepare('SELECT * FROM sorties WHERE id = ?').get(result.lastInsertRowid);
    logAudit({
      actor: getActor(request),
      action: 'create',
      entityType: 'sortie',
      entityId: Number(result.lastInsertRowid),
      details: { immatriculation: input.immatriculation, quantite: input.quantite, date: input.date, code_sap: input.code_sap, manufacturer_ref: input.manufacturer_ref },
    });
    return NextResponse.json(newSortie, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
