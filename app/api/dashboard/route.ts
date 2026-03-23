import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { errorResponse } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    let dateFilter = '';
    const now = new Date();
    if (period === 'today') {
      const d = now.toISOString().slice(0, 10);
      dateFilter = `AND s.date = '${d}'`;
    } else if (period === 'week') {
      const day = now.getDay() || 7;
      const mon = new Date(now);
      mon.setDate(now.getDate() - day + 1);
      dateFilter = `AND s.date >= '${mon.toISOString().slice(0, 10)}'`;
    } else if (period === 'month') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      dateFilter = `AND s.date >= '${first.toISOString().slice(0, 10)}'`;
    }
    // 'all' => no filter

    const summary = db.prepare(`
      SELECT
        COUNT(*) as totalLines,
        COALESCE(SUM(quantite), 0) as totalQuantity,
        COUNT(DISTINCT COALESCE(code_sap, manufacturer_ref, search_label, description)) as distinctRefs
      FROM sorties s
      WHERE s.deleted_at IS NULL ${dateFilter}
    `).get() as { totalLines: number; totalQuantity: number; distinctRefs: number };

    const topBrands = db.prepare(`
      SELECT COALESCE(tc.brand, 'Non renseignée') as label, COUNT(*) as lines, COALESCE(SUM(s.quantite), 0) as quantity
      FROM sorties s
      LEFT JOIN tyre_catalog tc ON tc.id = s.tyre_catalog_id
      WHERE s.deleted_at IS NULL ${dateFilter}
      GROUP BY COALESCE(tc.brand, 'Non renseignée')
      ORDER BY quantity DESC, lines DESC
      LIMIT 8
    `).all() as Array<{ label: string; lines: number; quantity: number }>;

    const seasonStats = db.prepare(`
      SELECT COALESCE(tc.season, 'Non renseignée') as label, COUNT(*) as lines, COALESCE(SUM(s.quantite), 0) as quantity
      FROM sorties s
      LEFT JOIN tyre_catalog tc ON tc.id = s.tyre_catalog_id
      WHERE s.deleted_at IS NULL ${dateFilter}
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
      WHERE s.deleted_at IS NULL ${dateFilter}
      GROUP BY COALESCE(s.code_sap, 'Sans SAP')
      ORDER BY quantity DESC, lines DESC
      LIMIT 10
    `).all() as Array<{ sapCode: string; description: string; lines: number; quantity: number }>;

    const diameterStats = db.prepare(`
      SELECT COALESCE(tc.diameter, 'Non renseigné') as label, COUNT(*) as lines, COALESCE(SUM(s.quantite), 0) as quantity
      FROM sorties s
      LEFT JOIN tyre_catalog tc ON tc.id = s.tyre_catalog_id
      WHERE s.deleted_at IS NULL ${dateFilter}
      GROUP BY COALESCE(tc.diameter, 'Non renseigné')
      ORDER BY quantity DESC, lines DESC
      LIMIT 8
    `).all() as Array<{ label: string; lines: number; quantity: number }>;

    const trend = db.prepare(`
      SELECT s.date as label, COUNT(*) as lines, COALESCE(SUM(s.quantite), 0) as quantity
      FROM sorties s
      WHERE s.deleted_at IS NULL AND s.date >= date('now', '-29 days')
      GROUP BY s.date
      ORDER BY s.date ASC
    `).all() as Array<{ label: string; lines: number; quantity: number }>;

    const topBrand = topBrands[0]?.label || '—';

    return NextResponse.json({
      summary: { ...summary, topBrand },
      topBrands,
      seasonStats,
      topSapCodes,
      diameterStats,
      trend,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
