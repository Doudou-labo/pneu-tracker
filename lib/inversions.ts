import db from './db';
import { InversionInput } from './types';

export type InversionFilters = {
  search?: string;
  immatriculation?: string;
  dateFrom?: string;
  dateTo?: string;
  hasInvoice?: 'all' | 'with_invoice' | 'without_invoice';
  limit?: number;
  offset?: number;
};

export type InversionCandidateFilters = {
  search?: string;
  limit?: number;
};

function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, '\\$&');
}

function toSearchPattern(term: string) {
  const normalized = term.trim().replace(/\*+/g, '*');
  if (normalized.includes('*')) {
    return escapeLike(normalized).replace(/\*/g, '%');
  }
  return `%${normalized}%`;
}

export function buildInversionsWhere(filters: InversionFilters) {
  const conditions = ['i.deleted_at IS NULL', 's.deleted_at IS NULL'];
  const params: unknown[] = [];

  if (filters.hasInvoice === 'with_invoice') {
    conditions.push("COALESCE(i.facture_reference, '') <> ''");
  } else if (filters.hasInvoice === 'without_invoice') {
    conditions.push("COALESCE(i.facture_reference, '') = ''");
  }

  const search = (filters.search || '').trim();
  if (search) {
    const like = toSearchPattern(search);
    conditions.push(`(
      s.immatriculation LIKE ? ESCAPE '\\'
      OR COALESCE(s.code_sap, '') LIKE ? ESCAPE '\\'
      OR COALESCE(s.manufacturer_ref, '') LIKE ? ESCAPE '\\'
      OR COALESCE(s.search_label, '') LIKE ? ESCAPE '\\'
      OR COALESCE(s.description, '') LIKE ? ESCAPE '\\'
      OR COALESCE(i.billed_code_sap, '') LIKE ? ESCAPE '\\'
      OR COALESCE(i.billed_manufacturer_ref, '') LIKE ? ESCAPE '\\'
      OR COALESCE(i.billed_search_label, '') LIKE ? ESCAPE '\\'
      OR COALESCE(i.billed_description, '') LIKE ? ESCAPE '\\'
      OR COALESCE(i.facture_reference, '') LIKE ? ESCAPE '\\'
    )`);
    params.push(like, like, like, like, like, like, like, like, like, like);
  }

  const immatriculation = (filters.immatriculation || '').trim().toUpperCase();
  if (immatriculation) {
    conditions.push('s.immatriculation = ?');
    params.push(immatriculation);
  }

  if (filters.dateFrom) {
    conditions.push('i.date >= ?');
    params.push(filters.dateFrom);
  }

  if (filters.dateTo) {
    conditions.push('i.date <= ?');
    params.push(filters.dateTo);
  }

  return { where: `WHERE ${conditions.join(' AND ')}`, params };
}

export const inversionSelect = `
  SELECT
    i.id,
    i.sortie_id,
    i.date,
    i.immatriculation,
    i.quantite,
    i.mounted_code_sap,
    i.mounted_manufacturer_ref,
    i.mounted_search_label,
    i.mounted_description,
    i.mounted_tyre_catalog_id,
    i.billed_code_sap,
    i.billed_manufacturer_ref,
    i.billed_search_label,
    i.billed_description,
    i.billed_tyre_catalog_id,
    i.facture_reference,
    i.done_at,
    i.created_at,
    i.updated_at,
    i.deleted_at
  FROM inversions i
  JOIN sorties s ON s.id = i.sortie_id
`;

export function listInversions(filters: InversionFilters) {
  const limit = Math.min(Math.max(Number(filters.limit || 50), 1), 200);
  const offset = Math.max(Number(filters.offset || 0), 0);
  const { where, params } = buildInversionsWhere(filters);

  const totalRow = db.prepare(`SELECT COUNT(*) as count FROM inversions i JOIN sorties s ON s.id = i.sortie_id ${where}`).get(...params) as { count: number };
  const total = Number(totalRow?.count ?? 0);
  const items = db.prepare(`${inversionSelect} ${where} ORDER BY i.date DESC, i.created_at DESC LIMIT ? OFFSET ?`).all(...params, limit, offset);

  return { items, total, limit, offset };
}

export function listInversionsForExport(filters: InversionFilters) {
  const { where, params } = buildInversionsWhere(filters);
  return db.prepare(`${inversionSelect} ${where} ORDER BY i.date DESC, i.created_at DESC`).all(...params);
}

export function listInversionCandidates(filters: InversionCandidateFilters) {
  const limit = Math.min(Math.max(Number(filters.limit || 20), 1), 100);
  const conditions = ['s.deleted_at IS NULL', 'i.id IS NULL'];
  const params: unknown[] = [];
  const search = (filters.search || '').trim();

  if (search) {
    const like = toSearchPattern(search);
    conditions.push(`(
      s.immatriculation LIKE ? ESCAPE '\\'
      OR COALESCE(s.code_sap, '') LIKE ? ESCAPE '\\'
      OR COALESCE(s.manufacturer_ref, '') LIKE ? ESCAPE '\\'
      OR COALESCE(s.search_label, '') LIKE ? ESCAPE '\\'
      OR COALESCE(s.description, '') LIKE ? ESCAPE '\\'
    )`);
    params.push(like, like, like, like, like);
  }

  return db.prepare(`
    SELECT
      s.id,
      s.date,
      s.immatriculation,
      s.quantite,
      s.code_sap,
      s.manufacturer_ref,
      s.search_label,
      s.description,
      s.tyre_catalog_id
    FROM sorties s
    LEFT JOIN inversions i ON i.sortie_id = s.id AND i.deleted_at IS NULL
    WHERE ${conditions.join(' AND ')}
    ORDER BY s.date DESC, s.created_at DESC
    LIMIT ?
  `).all(...params, limit);
}

function buildSignature(values: unknown[]) {
  return values.map((value) => String(value ?? '').trim().toUpperCase()).join('|');
}

export function createInversionRecord(input: InversionInput) {
  const sortie = db.prepare(`
    SELECT id, date, immatriculation, quantite, code_sap, manufacturer_ref, search_label, description, tyre_catalog_id
    FROM sorties
    WHERE id = ? AND deleted_at IS NULL
  `).get(input.sortie_id) as Record<string, unknown> | undefined;

  if (!sortie) {
    return { error: { status: 404, code: 'SORTIE_NOT_FOUND', message: 'Sortie source introuvable' } };
  }

  if (String(sortie.immatriculation) !== input.immatriculation || Number(sortie.quantite) !== Number(input.quantite)) {
    return { error: { status: 409, code: 'SOURCE_MISMATCH', message: 'L’immatriculation et la quantité doivent rester identiques à la sortie source' } };
  }

  const existing = db.prepare('SELECT id FROM inversions WHERE sortie_id = ? AND deleted_at IS NULL').get(input.sortie_id) as { id: number } | undefined;
  if (existing) {
    return { error: { status: 409, code: 'DUPLICATE', message: 'Une inversion existe déjà pour cette sortie.' } };
  }

  const mountedSignature = buildSignature([sortie.code_sap, sortie.manufacturer_ref, sortie.search_label, sortie.description, sortie.tyre_catalog_id]);
  const billedSignature = buildSignature([input.billed_code_sap, input.billed_manufacturer_ref, input.billed_search_label, input.billed_description, input.billed_tyre_catalog_id]);
  if (mountedSignature === billedSignature) {
    return { error: { status: 422, code: 'SAME_REFERENCE', message: 'La référence facturée doit être différente de la référence montée.' } };
  }

  const result = db.prepare(`
    INSERT INTO inversions (
      sortie_id, date, immatriculation, quantite,
      mounted_code_sap, mounted_manufacturer_ref, mounted_search_label, mounted_description, mounted_tyre_catalog_id,
      billed_code_sap, billed_manufacturer_ref, billed_search_label, billed_description, billed_tyre_catalog_id,
      facture_reference, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).run(
    input.sortie_id,
    input.date,
    input.immatriculation,
    input.quantite,
    sortie.code_sap ?? input.mounted_code_sap ?? null,
    sortie.manufacturer_ref ?? input.mounted_manufacturer_ref ?? null,
    sortie.search_label ?? input.mounted_search_label ?? null,
    sortie.description ?? input.mounted_description ?? null,
    sortie.tyre_catalog_id ?? input.mounted_tyre_catalog_id ?? null,
    input.billed_code_sap ?? null,
    input.billed_manufacturer_ref ?? null,
    input.billed_search_label ?? null,
    input.billed_description ?? null,
    input.billed_tyre_catalog_id ?? null,
    input.facture_reference ?? null,
  );

  const created = db.prepare(`${inversionSelect} WHERE i.id = ?`).get(result.lastInsertRowid);
  return { created, sortie };
}
