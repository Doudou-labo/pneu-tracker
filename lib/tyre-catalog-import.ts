import * as XLSX from 'xlsx';
import { parseCsvLine } from './csv';
import { ValidationError } from './validators';

export type TyreCatalogImportRow = {
  sap_code: string | null;
  description: string;
  manufacturer_ref: string | null;
  brand: string | null;
  search_label: string | null;
  diameter: string | null;
  season: string | null;
  raw_row_json: string;
};

export type TyreCatalogImportPreview = {
  fileName: string;
  fileType: 'csv' | 'xlsx';
  rows: TyreCatalogImportRow[];
};

const HEADER_ALIASES: Record<string, keyof Omit<TyreCatalogImportRow, 'raw_row_json'>> = {
  'code sap': 'sap_code',
  'codesap': 'sap_code',
  'sap': 'sap_code',
  'sap code': 'sap_code',
  description: 'description',
  designation: 'description',
  'référence fabricant': 'manufacturer_ref',
  'reference fabricant': 'manufacturer_ref',
  'manufacturer ref': 'manufacturer_ref',
  'manufacturer_ref': 'manufacturer_ref',
  marque: 'brand',
  brand: 'brand',
  'libellé de recherche': 'search_label',
  'libelle de recherche': 'search_label',
  'search label': 'search_label',
  search_label: 'search_label',
  'diamètre': 'diameter',
  diametre: 'diameter',
  diameter: 'diameter',
  saison: 'season',
  season: 'season',
};

function normalizeText(value: unknown, maxLength: number) {
  if (value == null) return null;
  const normalized = String(value).replace(/\u00a0/g, ' ').trim();
  if (!normalized) return null;
  return normalized.slice(0, maxLength);
}

function normalizeSap(value: unknown) {
  const normalized = normalizeText(value, 32);
  return normalized ? normalized.toUpperCase() : null;
}

function normalizeHeader(value: unknown) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLowerCase();
}

function toObjectRows(matrix: unknown[][]) {
  if (!matrix.length) throw new ValidationError('Fichier vide');

  const headers = matrix[0].map(normalizeHeader);
  const mappedHeaders = headers.map((header) => HEADER_ALIASES[header] || null);

  if (!mappedHeaders.includes('description')) {
    throw new ValidationError('Colonne description introuvable dans le fichier catalogue');
  }

  return matrix.slice(1).map((row) => {
    const entry: Record<string, unknown> = {};
    mappedHeaders.forEach((key, index) => {
      if (!key) return;
      entry[key] = row[index];
    });
    return entry;
  });
}

function finalizeRows(fileName: string, fileType: 'csv' | 'xlsx', records: Array<Record<string, unknown>>): TyreCatalogImportPreview {
  const rows: TyreCatalogImportRow[] = [];

  records.forEach((record) => {
    const description = normalizeText(record.description, 240);
    if (!description) return;

    const normalized: TyreCatalogImportRow = {
      sap_code: normalizeSap(record.sap_code),
      description,
      manufacturer_ref: normalizeText(record.manufacturer_ref, 64),
      brand: normalizeText(record.brand, 80),
      search_label: normalizeText(record.search_label, 160),
      diameter: normalizeText(record.diameter, 32),
      season: normalizeText(record.season, 32),
      raw_row_json: '',
    };

    normalized.raw_row_json = JSON.stringify(normalized);
    rows.push(normalized);
  });

  if (!rows.length) {
    throw new ValidationError('Aucune ligne exploitable trouvée dans le fichier catalogue');
  }

  if (rows.length > 20000) {
    throw new ValidationError('Import limité à 20 000 lignes');
  }

  return { fileName, fileType, rows };
}

function parseCsv(content: string) {
  const lines = content.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim().length > 0);
  return lines.map((line) => parseCsvLine(line));
}

function parseXlsx(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new ValidationError('Aucune feuille trouvée dans le fichier XLSX');
  const sheet = workbook.Sheets[firstSheetName];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as unknown[][];
}

export async function parseTyreCatalogFile(file: File): Promise<TyreCatalogImportPreview> {
  const fileName = file.name || 'catalogue';
  const lowerName = fileName.toLowerCase();

  if (file.size === 0) throw new ValidationError('Le fichier est vide');
  if (file.size > 5 * 1024 * 1024) throw new ValidationError('Fichier trop volumineux (max 5 Mo)');

  if (lowerName.endsWith('.csv')) {
    const text = await file.text();
    return finalizeRows(fileName, 'csv', toObjectRows(parseCsv(text)));
  }

  if (lowerName.endsWith('.xlsx')) {
    const buffer = await file.arrayBuffer();
    return finalizeRows(fileName, 'xlsx', toObjectRows(parseXlsx(buffer)));
  }

  throw new ValidationError('Format non supporté. Utilise un fichier CSV ou XLSX');
}
