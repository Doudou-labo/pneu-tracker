import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getActor, logAudit } from '@/lib/audit';
import { parseTyreCatalogFile } from '@/lib/tyre-catalog-import';
import { errorResponse, ValidationError } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      throw new ValidationError('Fichier catalogue manquant');
    }

    const parsed = await parseTyreCatalogFile(file);

    const findBySap = db.prepare(`
      SELECT id FROM tyre_catalog
      WHERE sap_code = ?
      LIMIT 1
    `);

    const findByManufacturerRef = db.prepare(`
      SELECT id FROM tyre_catalog
      WHERE manufacturer_ref = ?
      LIMIT 1
    `);

    const findBySearchLabel = db.prepare(`
      SELECT id FROM tyre_catalog
      WHERE search_label = ?
      LIMIT 1
    `);

    const findByDescription = db.prepare(`
      SELECT id FROM tyre_catalog
      WHERE lower(description) = lower(?)
      LIMIT 1
    `);

    const updateCatalog = db.prepare(`
      UPDATE tyre_catalog
      SET sap_code = ?,
          description = ?,
          manufacturer_ref = ?,
          brand = ?,
          search_label = ?,
          diameter = ?,
          season = ?,
          raw_row_json = ?,
          updated_at = datetime('now')
      WHERE id = ?
    `);

    const insertCatalog = db.prepare(`
      INSERT INTO tyre_catalog (sap_code, description, manufacturer_ref, brand, search_label, diameter, season, raw_row_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `);

    const insertRun = db.prepare(`
      INSERT INTO tyre_catalog_import_runs (
        file_name, file_type, total_rows, inserted_count, updated_count, ignored_count, error_count, report_json, status, imported_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    `);

    const reportErrors: Array<{ row: number; message: string }> = [];
    const seenFingerprints = new Set<string>();
    let inserted = 0;
    let updated = 0;
    let ignored = 0;

    const tx = db.transaction(() => {
      parsed.rows.forEach((row, index) => {
        const fingerprint = row.sap_code || row.manufacturer_ref || row.search_label || row.description.trim().toLowerCase();
        if (seenFingerprints.has(fingerprint)) {
          ignored += 1;
          return;
        }
        seenFingerprints.add(fingerprint);

        const existing = ((row.sap_code ? findBySap.get(row.sap_code) : undefined)
          || (row.manufacturer_ref ? findByManufacturerRef.get(row.manufacturer_ref) : undefined)
          || (row.search_label ? findBySearchLabel.get(row.search_label) : undefined)
          || findByDescription.get(row.description)) as { id: number } | undefined;
        if (existing) {
          updateCatalog.run(
            row.sap_code,
            row.description,
            row.manufacturer_ref,
            row.brand,
            row.search_label,
            row.diameter,
            row.season,
            row.raw_row_json,
            existing.id,
          );
          updated += 1;
          return;
        }

        insertCatalog.run(
          row.sap_code,
          row.description,
          row.manufacturer_ref,
          row.brand,
          row.search_label,
          row.diameter,
          row.season,
          row.raw_row_json,
        );
        inserted += 1;
      });

      const report = {
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        inserted,
        updated,
        ignored,
        errors: reportErrors,
      };

      insertRun.run(
        parsed.fileName,
        parsed.fileType,
        parsed.rows.length,
        inserted,
        updated,
        ignored,
        reportErrors.length,
        JSON.stringify(report),
        'success',
      );
    });

    tx();

    const totalCatalogReferences = Number((db.prepare('SELECT COUNT(*) as count FROM tyre_catalog').get() as { count: number }).count ?? 0);
    const lastImportedAt = (db.prepare(`SELECT imported_at FROM tyre_catalog_import_runs ORDER BY id DESC LIMIT 1`).get() as { imported_at: string } | undefined)?.imported_at ?? null;

    logAudit({
      actor: getActor(request),
      action: 'import_catalog',
      entityType: 'tyre_catalog',
      details: {
        fileName: parsed.fileName,
        fileType: parsed.fileType,
        totalRows: parsed.rows.length,
        inserted,
        updated,
        ignored,
      },
    });

    return NextResponse.json({
      ok: true,
      inserted,
      updated,
      ignored,
      errors: reportErrors,
      totalRows: parsed.rows.length,
      totalCatalogReferences,
      lastImportedAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
