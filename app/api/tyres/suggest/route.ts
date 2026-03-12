import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { errorResponse } from '@/lib/validators';

function hasEnoughMeaningfulChars(term: string) {
  return term.replace(/\*/g, '').trim().length >= 2;
}

function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, '\\$&');
}

function toWildcardPattern(term: string) {
  return escapeLike(term.trim().replace(/\*+/g, '*')).replace(/\*/g, '%');
}

function ftsSearch(term: string, limit: number) {
  const ftsQuery = `"${term.replace(/"/g, '""')}"*`;
  return db.prepare(`
    SELECT tc.id, tc.sap_code, tc.description, tc.manufacturer_ref, tc.search_label, tc.brand, tc.diameter, tc.season
    FROM tyre_catalog_fts fts
    JOIN tyre_catalog tc ON fts.rowid = tc.id
    WHERE tyre_catalog_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(ftsQuery, limit);
}

function likeSearch(term: string, limit: number) {
  const like = `%${term}%`;
  const exact = term.toUpperCase();
  const prefix = `${exact}%`;
  return db.prepare(`
    SELECT id, sap_code, description, manufacturer_ref, search_label, brand, diameter, season
    FROM tyre_catalog
    WHERE sap_code LIKE ?
       OR description LIKE ?
       OR manufacturer_ref LIKE ?
       OR search_label LIKE ?
       OR brand LIKE ?
    ORDER BY CASE
      WHEN upper(COALESCE(sap_code, '')) = ? THEN 1
      WHEN upper(COALESCE(sap_code, '')) LIKE ? THEN 2
      WHEN upper(COALESCE(manufacturer_ref, '')) = ? THEN 3
      WHEN upper(COALESCE(manufacturer_ref, '')) LIKE ? THEN 4
      WHEN upper(COALESCE(search_label, '')) LIKE ? THEN 5
      WHEN upper(COALESCE(description, '')) LIKE ? THEN 6
      ELSE 7
    END,
    description ASC
    LIMIT ?
  `).all(like, like, like, like, like, exact, prefix, exact, prefix, prefix, prefix, limit);
}

function wildcardSearch(term: string, limit: number) {
  const normalized = term.trim().replace(/\*+/g, '*');
  const pattern = toWildcardPattern(normalized);
  const exact = normalized.toUpperCase();
  const prefix = `${exact.replace(/\*/g, '%')}%`;

  return db.prepare(`
    SELECT id, sap_code, description, manufacturer_ref, search_label, brand, diameter, season
    FROM tyre_catalog
    WHERE upper(COALESCE(search_label, '')) LIKE upper(?) ESCAPE '\\'
       OR upper(COALESCE(sap_code, '')) LIKE upper(?) ESCAPE '\\'
       OR upper(COALESCE(manufacturer_ref, '')) LIKE upper(?) ESCAPE '\\'
       OR upper(COALESCE(description, '')) LIKE upper(?) ESCAPE '\\'
       OR upper(COALESCE(brand, '')) LIKE upper(?) ESCAPE '\\'
    ORDER BY CASE
      WHEN upper(COALESCE(search_label, '')) = ? THEN 1
      WHEN upper(COALESCE(search_label, '')) LIKE upper(?) ESCAPE '\\' THEN 2
      WHEN upper(COALESCE(sap_code, '')) = ? THEN 3
      WHEN upper(COALESCE(sap_code, '')) LIKE upper(?) ESCAPE '\\' THEN 4
      WHEN upper(COALESCE(manufacturer_ref, '')) = ? THEN 5
      WHEN upper(COALESCE(manufacturer_ref, '')) LIKE upper(?) ESCAPE '\\' THEN 6
      WHEN upper(COALESCE(description, '')) LIKE upper(?) ESCAPE '\\' THEN 7
      WHEN upper(COALESCE(brand, '')) LIKE upper(?) ESCAPE '\\' THEN 8
      ELSE 9
    END,
    description ASC
    LIMIT ?
  `).all(pattern, pattern, pattern, pattern, pattern, exact, prefix, exact, prefix, exact, prefix, pattern, pattern, limit);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 8), 1), 20);

    if (q.length < 2 || (q.includes('*') && !hasEnoughMeaningfulChars(q))) {
      return NextResponse.json({ items: [] });
    }

    let items;
    if (q.includes('*')) {
      items = wildcardSearch(q, limit);
    } else {
      try {
        items = ftsSearch(q, limit);
      } catch {
        items = likeSearch(q, limit);
      }
    }

    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}
