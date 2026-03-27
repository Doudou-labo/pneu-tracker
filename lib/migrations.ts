import type Database from 'better-sqlite3';

export interface Migration {
  version: number;
  description: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    version: 1,
    description: 'Create sorties table with base columns',
    sql: `
      CREATE TABLE IF NOT EXISTS sorties (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT NOT NULL,
        immatriculation TEXT NOT NULL,
        code_sap TEXT,
        quantite INTEGER NOT NULL,
        description TEXT,
        created_at TEXT DEFAULT (datetime('now'))
      );
    `,
  },
  {
    version: 2,
    description: 'Add updated_at and deleted_at columns to sorties',
    sql: `
      ALTER TABLE sorties ADD COLUMN updated_at TEXT;
      UPDATE sorties SET updated_at = COALESCE(updated_at, created_at, datetime('now'));
      ALTER TABLE sorties ADD COLUMN deleted_at TEXT;
    `,
  },
  {
    version: 3,
    description: 'Add manufacturer_ref, search_label, tyre_catalog_id to sorties',
    sql: `
      ALTER TABLE sorties ADD COLUMN manufacturer_ref TEXT;
      ALTER TABLE sorties ADD COLUMN search_label TEXT;
      ALTER TABLE sorties ADD COLUMN tyre_catalog_id INTEGER;
    `,
  },
  {
    version: 4,
    description: 'Create indexes on sorties',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_sorties_date_created ON sorties(date DESC, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_sorties_immat_date ON sorties(immatriculation, date DESC);
      CREATE INDEX IF NOT EXISTS idx_sorties_deleted_at ON sorties(deleted_at);
      CREATE INDEX IF NOT EXISTS idx_sorties_tyre_catalog_id ON sorties(tyre_catalog_id);
    `,
  },
  {
    version: 5,
    description: 'Create audit_log table',
    sql: `
      CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        actor TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id INTEGER,
        details_json TEXT
      );
    `,
  },
  {
    version: 6,
    description: 'Create tyre_catalog table with indexes',
    sql: `
      CREATE TABLE IF NOT EXISTS tyre_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sap_code TEXT,
        description TEXT NOT NULL,
        manufacturer_ref TEXT,
        brand TEXT,
        search_label TEXT,
        diameter TEXT,
        season TEXT,
        raw_row_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_tyre_catalog_sap_code ON tyre_catalog(sap_code);
      CREATE INDEX IF NOT EXISTS idx_tyre_catalog_manufacturer_ref ON tyre_catalog(manufacturer_ref);
      CREATE INDEX IF NOT EXISTS idx_tyre_catalog_search_label ON tyre_catalog(search_label);
      CREATE INDEX IF NOT EXISTS idx_tyre_catalog_description ON tyre_catalog(description);
      CREATE INDEX IF NOT EXISTS idx_tyre_catalog_brand ON tyre_catalog(brand);
    `,
  },
  {
    version: 7,
    description: 'Add FTS5 virtual table for tyre_catalog search',
    sql: `
      CREATE VIRTUAL TABLE IF NOT EXISTS tyre_catalog_fts USING fts5(
        sap_code, manufacturer_ref, search_label, description, brand,
        content="tyre_catalog", content_rowid="id"
      );

      CREATE TRIGGER IF NOT EXISTS tyre_catalog_ai AFTER INSERT ON tyre_catalog BEGIN
        INSERT INTO tyre_catalog_fts(rowid, sap_code, manufacturer_ref, search_label, description, brand)
        VALUES (new.id, new.sap_code, new.manufacturer_ref, new.search_label, new.description, new.brand);
      END;

      CREATE TRIGGER IF NOT EXISTS tyre_catalog_ad AFTER DELETE ON tyre_catalog BEGIN
        INSERT INTO tyre_catalog_fts(tyre_catalog_fts, rowid, sap_code, manufacturer_ref, search_label, description, brand)
        VALUES ('delete', old.id, old.sap_code, old.manufacturer_ref, old.search_label, old.description, old.brand);
      END;

      CREATE TRIGGER IF NOT EXISTS tyre_catalog_au AFTER UPDATE ON tyre_catalog BEGIN
        INSERT INTO tyre_catalog_fts(tyre_catalog_fts, rowid, sap_code, manufacturer_ref, search_label, description, brand)
        VALUES ('delete', old.id, old.sap_code, old.manufacturer_ref, old.search_label, old.description, old.brand);
        INSERT INTO tyre_catalog_fts(rowid, sap_code, manufacturer_ref, search_label, description, brand)
        VALUES (new.id, new.sap_code, new.manufacturer_ref, new.search_label, new.description, new.brand);
      END;

      INSERT INTO tyre_catalog_fts(tyre_catalog_fts) VALUES('rebuild');
    `,
  },
  {
    version: 8,
    description: 'Add facture_at column to sorties for billing tracking',
    sql: `
      ALTER TABLE sorties ADD COLUMN facture_at TEXT;
      CREATE INDEX IF NOT EXISTS idx_sorties_facture_at ON sorties(facture_at);
    `,
  },
  {
    version: 9,
    description: 'Create inversions table',
    sql: `
      CREATE TABLE IF NOT EXISTS inversions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sortie_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        immatriculation TEXT NOT NULL,
        quantite INTEGER NOT NULL,
        mounted_code_sap TEXT,
        mounted_manufacturer_ref TEXT,
        mounted_search_label TEXT,
        mounted_description TEXT,
        mounted_tyre_catalog_id INTEGER,
        billed_code_sap TEXT,
        billed_manufacturer_ref TEXT,
        billed_search_label TEXT,
        billed_description TEXT,
        billed_tyre_catalog_id INTEGER,
        facture_reference TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        FOREIGN KEY (sortie_id) REFERENCES sorties(id)
      );
      CREATE INDEX IF NOT EXISTS idx_inversions_sortie_id ON inversions(sortie_id);
      CREATE INDEX IF NOT EXISTS idx_inversions_date_created ON inversions(date DESC, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_inversions_immat_date ON inversions(immatriculation, date DESC);
      CREATE INDEX IF NOT EXISTS idx_inversions_facture_reference ON inversions(facture_reference);
    `,
  },
  {
    version: 10,
    description: 'Add soft delete and uniqueness to inversions',
    sql: `
      ALTER TABLE inversions ADD COLUMN deleted_at TEXT;
      CREATE INDEX IF NOT EXISTS idx_inversions_deleted_at ON inversions(deleted_at);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_inversions_unique_sortie_active ON inversions(sortie_id) WHERE deleted_at IS NULL;
    `,
  },
  {
    version: 11,
    description: 'Add done_at column to inversions for processing tracking',
    sql: `
      ALTER TABLE inversions ADD COLUMN done_at TEXT;
      CREATE INDEX IF NOT EXISTS idx_inversions_done_at ON inversions(done_at);
    `,
  },
  {
    version: 12,
    description: 'Create tyre_catalog_import_runs table',
    sql: `
      CREATE TABLE IF NOT EXISTS tyre_catalog_import_runs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT,
        file_type TEXT,
        total_rows INTEGER NOT NULL DEFAULT 0,
        inserted_count INTEGER NOT NULL DEFAULT 0,
        updated_count INTEGER NOT NULL DEFAULT 0,
        ignored_count INTEGER NOT NULL DEFAULT 0,
        error_count INTEGER NOT NULL DEFAULT 0,
        report_json TEXT,
        status TEXT NOT NULL DEFAULT 'success',
        imported_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
      CREATE INDEX IF NOT EXISTS idx_tyre_catalog_import_runs_imported_at ON tyre_catalog_import_runs(imported_at DESC);
    `,
  },
];

export function runMigrations(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    )
  `);

  const applied = new Set(
    (db.prepare('SELECT version FROM schema_migrations').all() as Array<{ version: number }>).map((r) => r.version),
  );

  const hasOldSchema = db.prepare("SELECT 1 FROM pragma_table_info('sorties') WHERE name = 'updated_at'").get();
  if (hasOldSchema && applied.size === 0) {
    const bootstrap = db.transaction(() => {
      for (const m of migrations) {
        if (m.version < 7) {
          db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, datetime(\'now\'))').run(m.version);
        }
      }
    });
    bootstrap();
  }

  const pending = migrations.filter((m) => !applied.has(m.version)).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    const run = db.transaction(() => {
      try {
        db.exec(migration.sql);
      } catch (err: any) {
        if (err.message?.includes('duplicate column name')) {
          console.warn(`Migration ${migration.version}: Column already exists, skipping: ${err.message}`);
        } else {
          throw err;
        }
      }
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, datetime(\'now\'))').run(migration.version);
    });
    run();
  }
}

export { migrations };
