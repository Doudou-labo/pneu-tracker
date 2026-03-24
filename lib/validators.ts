import { InversionInput, SortieInput } from './types';

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
  const clean = value.trim().toUpperCase().replace(/[\s\-]+/g, '');
  const match = clean.match(/^([A-Z]{1,2})(\d{3})([A-Z]{1,2})$/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
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

function validateOptionalSap(value: unknown) {
  const code_sap = normalizeOptionalText(value, 32);
  if (code_sap && !SAP_RE.test(code_sap)) {
    throw new ValidationError('Code SAP invalide');
  }
  return code_sap;
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

  const code_sap = validateOptionalSap(input.code_sap);
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

export function validateInversionInput(payload: unknown): InversionInput {
  if (!payload || typeof payload !== 'object') {
    throw new ValidationError('Payload invalide');
  }

  const input = payload as Record<string, unknown>;
  const date = validateDate(input.date);
  const sortie_id = validateId(input.sortie_id);
  const immatriculation = normalizeImmatriculation(String(input.immatriculation ?? ''));
  if (!immatriculation || !IMMAT_ALLOWED_RE.test(immatriculation)) {
    throw new ValidationError('Immatriculation invalide');
  }

  const quantite = Number(input.quantite);
  if (!Number.isInteger(quantite) || quantite <= 0 || quantite > 20) {
    throw new ValidationError('La quantité doit être un entier entre 1 et 20');
  }

  const mounted_code_sap = validateOptionalSap(input.mounted_code_sap);
  const mounted_manufacturer_ref = normalizeOptionalText(input.mounted_manufacturer_ref, 64);
  const mounted_search_label = normalizeOptionalText(input.mounted_search_label, 120);
  const mounted_description = normalizeOptionalText(input.mounted_description, 240);
  const mounted_tyre_catalog_id = input.mounted_tyre_catalog_id == null || input.mounted_tyre_catalog_id === '' ? null : validateId(input.mounted_tyre_catalog_id);

  const billed_code_sap = validateOptionalSap(input.billed_code_sap);
  const billed_manufacturer_ref = normalizeOptionalText(input.billed_manufacturer_ref, 64);
  const billed_search_label = normalizeOptionalText(input.billed_search_label, 120);
  const billed_description = normalizeOptionalText(input.billed_description, 240);
  const billed_tyre_catalog_id = input.billed_tyre_catalog_id == null || input.billed_tyre_catalog_id === '' ? null : validateId(input.billed_tyre_catalog_id);
  const facture_reference = normalizeOptionalText(input.facture_reference, 120);

  if (!billed_code_sap && !billed_manufacturer_ref && !billed_search_label && !billed_description) {
    throw new ValidationError('La référence facturée est obligatoire');
  }

  const billedFingerprint = [billed_code_sap, billed_manufacturer_ref, billed_search_label, billed_description].map((value) => value || '').join('|');
  const mountedFingerprint = [mounted_code_sap, mounted_manufacturer_ref, mounted_search_label, mounted_description].map((value) => value || '').join('|');
  if (billedFingerprint === mountedFingerprint) {
    throw new ValidationError('La référence facturée doit être différente de la référence montée');
  }

  return {
    sortie_id,
    date,
    immatriculation,
    quantite,
    mounted_code_sap,
    mounted_manufacturer_ref,
    mounted_search_label,
    mounted_description,
    mounted_tyre_catalog_id,
    billed_code_sap,
    billed_manufacturer_ref,
    billed_search_label,
    billed_description,
    billed_tyre_catalog_id,
    facture_reference,
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
