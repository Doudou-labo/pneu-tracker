import { SortieInput } from './types';

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAP_RE = /^[A-Za-z0-9\-_/ ]{0,32}$/;
const IMMAT_ALLOWED_RE = /^[A-Z0-9 -]{2,15}$/;
const TEXT_RE = /^[^<>]{0,240}$/;

export class ValidationError extends Error {
  status = 422;
  details?: unknown;

  constructor(message: string, details?: unknown) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

export function normalizeImmatriculation(value: string) {
  return value.trim().toUpperCase().replace(/\s+/g, '-').replace(/-+/g, '-');
}

export function normalizeOptionalText(value: unknown, maxLength: number) {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength) {
    throw new ValidationError(`Le texte dépasse ${maxLength} caractères`);
  }
  if (!TEXT_RE.test(normalized)) {
    throw new ValidationError('Le texte contient des caractères non autorisés');
  }
  return normalized;
}

export function validateDate(value: unknown) {
  const date = String(value ?? '').trim();
  if (!ISO_DATE_RE.test(date)) throw new ValidationError('La date doit être au format YYYY-MM-DD');
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) throw new ValidationError('Date invalide');
  return date;
}

export function validateId(value: unknown) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new ValidationError('ID invalide');
  return id;
}

export function validateSortieInput(payload: unknown): SortieInput {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('Payload invalide');
  }

  const input = payload as Record<string, unknown>;
  const date = validateDate(input.date);
  const immatriculation = normalizeImmatriculation(String(input.immatriculation ?? ''));
  if (!immatriculation || !IMMAT_ALLOWED_RE.test(immatriculation)) {
    throw new ValidationError('Immatriculation invalide');
  }

  const quantite = Number(input.quantite);
  if (!Number.isInteger(quantite) || quantite <= 0 || quantite > 20) {
    throw new ValidationError('La quantité doit être un entier entre 1 et 20');
  }

  const code_sap = normalizeOptionalText(input.code_sap, 32);
  if (code_sap && !SAP_RE.test(code_sap)) {
    throw new ValidationError('Code SAP invalide');
  }

  const description = normalizeOptionalText(input.description, 240);
  const manufacturer_ref = normalizeOptionalText(input.manufacturer_ref, 64);
  const search_label = normalizeOptionalText(input.search_label, 120);
  const tyre_catalog_id = input.tyre_catalog_id == null || input.tyre_catalog_id === '' ? null : validateId(input.tyre_catalog_id);

  return {
    date,
    immatriculation,
    code_sap,
    manufacturer_ref,
    search_label,
    quantite,
    description,
    tyre_catalog_id,
  };
}

export function validateBulkRows(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { rows?: unknown[] }).rows)) {
    throw new ValidationError('Format d\'import invalide');
  }

  const rows = (payload as { rows: unknown[] }).rows;
  if (rows.length === 0) throw new ValidationError('Aucune ligne à importer');
  if (rows.length > 500) throw new ValidationError('Import limité à 500 lignes par lot');

  return rows.map((row, index) => {
    try {
      return validateSortieInput(row);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw new ValidationError(`Ligne ${index + 1}: ${error.message}`);
      }
      throw error;
    }
  });
}

export function errorResponse(error: unknown) {
  if (error instanceof ValidationError) {
    return Response.json({ code: 'VALIDATION_ERROR', message: error.message, details: error.details ?? null }, { status: error.status });
  }

  console.error(error);
  return Response.json({ code: 'INTERNAL_ERROR', message: 'Erreur interne serveur' }, { status: 500 });
}
