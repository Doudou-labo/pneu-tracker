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

  const pending = migrations.filter((m) => !applied.has(m.version)).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    const run = db.transaction(() => {
      db.exec(migration.sql);
      db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, datetime(\'now\'))').run(migration.version);
    });
    run();
  }
}

export { migrations };
