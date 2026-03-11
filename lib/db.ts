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

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_sorties_date_created ON sorties(date DESC, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_sorties_immat_date ON sorties(immatriculation, date DESC);
  CREATE INDEX IF NOT EXISTS idx_sorties_deleted_at ON sorties(deleted_at);
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

export default db;
