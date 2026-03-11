import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { errorResponse } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get('q') || '').trim();
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 8), 1), 20);

    if (q.length < 2) {
      return NextResponse.json({ items: [] });
    }

    const exact = q.toUpperCase();
    const prefix = `${exact}%`;
    const like = `%${q}%`;

    const items = db.prepare(`
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

    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}
