import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'pneus.db');
const db = new Database(dbPath);

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

export default db;
