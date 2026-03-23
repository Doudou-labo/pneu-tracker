import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { errorResponse } from '@/lib/validators';

export async function GET() {
  try {
    const summary = db.prepare(`
      SELECT
        COUNT(*) as totalLines,
        COALESCE(SUM(quantite), 0) as totalQuantity,
        COUNT(DISTINCT COALESCE(code_sap, manufacturer_ref, search_label, description)) as distinctRefs
      FROM sorties
      WHERE deleted_at IS NULL
    `).get() as { totalLines: number; totalQuantity: number; distinctRefs: number };

    const topBrands = db.prepare(`
      SELECT COALESCE(tc.brand, 'Non renseignée') as label, COUNT(*) as lines, COALESCE(SUM(s.quantite), 0) as quantity
      FROM sorties s
      LEFT JOIN tyre_catalog tc ON tc.id = s.tyre_catalog_id
      WHERE s.deleted_at IS NULL
      GROUP BY COALESCE(tc.brand, 'Non renseignée')
      ORDER BY quantity DESC, lines DESC
      LIMIT 8
    `).all() as Array<{ label: string; lines: number; quantity: number }>;

    const seasonStats = db.prepare(`
      SELECT COALESCE(tc.season, 'Non renseignée') as label, COUNT(*) as lines, COALESCE(SUM(s.quantite), 0) as quantity
      FROM sorties s
      LEFT JOIN tyre_catalog tc ON tc.id = s.tyre_catalog_id
      WHERE s.deleted_at IS NULL
      GROUP BY COALESCE(tc.season, 'Non renseignée')
      ORDER BY quantity DESC, lines DESC
    `).all() as Array<{ label: string; lines: number; quantity: number }>;

    const topSapCodes = db.prepare(`
      SELECT COALESCE(s.code_sap, 'Sans SAP') as sapCode,
             COALESCE(MAX(s.description), '—') as description,
             COUNT(*) as lines,
             COALESCE(SUM(s.quantite), 0) as quantity
      FROM sorties s
      LEFT JOIN tyre_catalog tc ON tc.id = s.tyre_catalog_id
      WHERE s.deleted_at IS NULL
      GROUP BY COALESCE(s.code_sap, 'Sans SAP')
      ORDER BY quantity DESC, lines DESC
      LIMIT 10
    `).all() as Array<{ sapCode: string; description: string; lines: number; quantity: number }>;

    const diameterStats = db.prepare(`
      SELECT COALESCE(tc.diameter, 'Non renseigné') as label, COUNT(*) as lines, COALESCE(SUM(s.quantite), 0) as quantity
      FROM sorties s
      LEFT JOIN tyre_catalog tc ON tc.id = s.tyre_catalog_id
      WHERE s.deleted_at IS NULL
      GROUP BY COALESCE(tc.diameter, 'Non renseigné')
      ORDER BY quantity DESC, lines DESC
      LIMIT 8
    `).all() as Array<{ label: string; lines: number; quantity: number }>;

    const topBrand = topBrands[0]?.label || '—';

    return NextResponse.json({
      summary: { ...summary, topBrand },
      topBrands,
      seasonStats,
      topSapCodes,
      diameterStats,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
