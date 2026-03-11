import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pneus.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('busy_timeout = 5000');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS sorties (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    immatriculation TEXT NOT NULL,
    code_sap TEXT,
    quantite INTEGER NOT NULL,
    description TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

const columns = db.prepare(`PRAGMA table_info(sorties)`).all() as Array<{ name: string }>;
const hasColumn = (name: string) => columns.some((column) => column.name === name);

if (!hasColumn('updated_at')) {
  db.exec(`ALTER TABLE sorties ADD COLUMN updated_at TEXT`);
  db.exec(`UPDATE sorties SET updated_at = COALESCE(updated_at, created_at, datetime('now'))`);
}

if (!hasColumn('deleted_at')) {
  db.exec(`ALTER TABLE sorties ADD COLUMN deleted_at TEXT`);
}

if (!hasColumn('manufacturer_ref')) {
  db.exec(`ALTER TABLE sorties ADD COLUMN manufacturer_ref TEXT`);
}

if (!hasColumn('search_label')) {
  db.exec(`ALTER TABLE sorties ADD COLUMN search_label TEXT`);
}

if (!hasColumn('tyre_catalog_id')) {
  db.exec(`ALTER TABLE sorties ADD COLUMN tyre_catalog_id INTEGER`);
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sorties_date_created ON sorties(date DESC, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sorties_immat_date ON sorties(immatriculation, date DESC);
  CREATE INDEX IF NOT EXISTS idx_sorties_deleted_at ON sorties(deleted_at);
  CREATE INDEX IF NOT EXISTS idx_sorties_tyre_catalog_id ON sorties(tyre_catalog_id);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id INTEGER,
    details_json TEXT
  )
`);

db.exec(`
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
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_tyre_catalog_sap_code ON tyre_catalog(sap_code);
  CREATE INDEX IF NOT EXISTS idx_tyre_catalog_manufacturer_ref ON tyre_catalog(manufacturer_ref);
  CREATE INDEX IF NOT EXISTS idx_tyre_catalog_search_label ON tyre_catalog(search_label);
  CREATE INDEX IF NOT EXISTS idx_tyre_catalog_description ON tyre_catalog(description);
  CREATE INDEX IF NOT EXISTS idx_tyre_catalog_brand ON tyre_catalog(brand);
`);

export default db;
