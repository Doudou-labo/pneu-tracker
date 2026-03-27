import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { errorResponse } from '@/lib/validators';

export async function GET() {
  try {
    const summary = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM tyre_catalog) AS total,
        (SELECT MAX(imported_at) FROM tyre_catalog_import_runs WHERE status = 'success') AS last_imported_at
    `).get() as { total: number; last_imported_at: string | null };

    const lastRun = db.prepare(`
      SELECT id, imported_at, file_name, file_type, inserted_count, updated_count, ignored_count, error_count, total_rows, status
      FROM tyre_catalog_import_runs
      ORDER BY id DESC
      LIMIT 1
    `).get() as {
      id: number;
      imported_at: string;
      file_name: string | null;
      file_type: string | null;
      inserted_count: number;
      updated_count: number;
      ignored_count: number;
      error_count: number;
      total_rows: number;
      status: string;
    } | undefined;

    return NextResponse.json({
      totalCatalogReferences: Number(summary?.total ?? 0),
      lastImportedAt: summary?.last_imported_at ?? null,
      lastRun: lastRun ?? null,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
