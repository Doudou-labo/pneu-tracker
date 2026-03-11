#!/usr/bin/env python3
import json
import sqlite3
import sys
import zipfile
import xml.etree.ElementTree as ET

NS = {
    'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main',
    'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships',
}


def read_xlsx_rows(path):
    with zipfile.ZipFile(path) as z:
        wb = ET.fromstring(z.read('xl/workbook.xml'))
        rels = ET.fromstring(z.read('xl/_rels/workbook.xml.rels'))
        relmap = {rel.attrib['Id']: rel.attrib['Target'] for rel in rels}
        shared = []
        if 'xl/sharedStrings.xml' in z.namelist():
            ss = ET.fromstring(z.read('xl/sharedStrings.xml'))
            for si in ss.findall('a:si', NS):
                shared.append(''.join((t.text or '') for t in si.iterfind('.//a:t', NS)))

        first_sheet = next(iter(wb.find('a:sheets', NS)))
        rid = first_sheet.attrib['{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id']
        target = 'xl/' + relmap[rid]
        root = ET.fromstring(z.read(target))

        rows = []
        for row in root.findall('.//a:sheetData/a:row', NS):
            values = []
            for c in row.findall('a:c', NS):
                t = c.attrib.get('t')
                v = c.find('a:v', NS)
                if v is None:
                    values.append('')
                    continue
                val = v.text or ''
                if t == 's':
                    try:
                        val = shared[int(val)]
                    except Exception:
                        pass
                values.append(val)
            rows.append(values)
        return rows


def norm(value):
    value = (value or '').strip()
    return value or None


def main():
    if len(sys.argv) != 3:
        print('Usage: import-tyre-catalog.py <xlsx> <sqlite-db>')
        return 1

    xlsx_path, db_path = sys.argv[1], sys.argv[2]
    rows = read_xlsx_rows(xlsx_path)
    if len(rows) < 2:
        print('No data rows found')
        return 1

    header = [str(x).strip().lower() for x in rows[0]]
    data = rows[1:]
    idx = {name: header.index(name) for name in header}

    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute('''CREATE TABLE IF NOT EXISTS tyre_catalog (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sap_code TEXT,
        description TEXT NOT NULL,
        manufacturer_ref TEXT,
        brand TEXT,
        search_label TEXT,
        diameter TEXT,
        season TEXT,
        raw_row_json TEXT,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    )''')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_tyre_catalog_sap_code ON tyre_catalog(sap_code)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_tyre_catalog_manufacturer_ref ON tyre_catalog(manufacturer_ref)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_tyre_catalog_search_label ON tyre_catalog(search_label)')
    cur.execute('CREATE INDEX IF NOT EXISTS idx_tyre_catalog_description ON tyre_catalog(description)')
    cur.execute('DELETE FROM tyre_catalog')

    inserted = 0
    for row in data:
        sap = norm(row[idx['code sap']] if 'code sap' in idx and idx['code sap'] < len(row) else '')
        description = norm(row[idx['description']] if 'description' in idx and idx['description'] < len(row) else '')
        manufacturer_ref = norm(row[idx['référence fabricant']] if 'référence fabricant' in idx and idx['référence fabricant'] < len(row) else '')
        brand = norm(row[idx['marque']] if 'marque' in idx and idx['marque'] < len(row) else '')
        search_label = norm(row[idx['libellé de recherche']] if 'libellé de recherche' in idx and idx['libellé de recherche'] < len(row) else '')
        diameter = norm(row[idx['diamètre']] if 'diamètre' in idx and idx['diamètre'] < len(row) else '')
        season = norm(row[idx['saison']] if 'saison' in idx and idx['saison'] < len(row) else '')
        if not description:
            continue
        raw = json.dumps({
            'sap_code': sap,
            'description': description,
            'manufacturer_ref': manufacturer_ref,
            'brand': brand,
            'search_label': search_label,
            'diameter': diameter,
            'season': season,
        }, ensure_ascii=False)
        cur.execute(
            '''INSERT INTO tyre_catalog
               (sap_code, description, manufacturer_ref, brand, search_label, diameter, season, raw_row_json, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))''',
            (sap.upper() if sap else None, description, manufacturer_ref, brand, search_label, diameter, season, raw)
        )
        inserted += 1

    conn.commit()
    print(f'Imported {inserted} catalogue rows')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
