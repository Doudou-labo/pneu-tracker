export interface Sortie {
  id: number;
  date: string;
  immatriculation: string;
  code_sap: string | null;
  manufacturer_ref: string | null;
  search_label: string | null;
  quantite: number;
  description: string | null;
  tyre_catalog_id: number | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  facture_at: string | null;
}

export interface Inversion {
  id: number;
  sortie_id: number;
  date: string;
  immatriculation: string;
  quantite: number;
  mounted_code_sap: string | null;
  mounted_manufacturer_ref: string | null;
  mounted_search_label: string | null;
  mounted_description: string | null;
  mounted_tyre_catalog_id: number | null;
  billed_code_sap: string | null;
  billed_manufacturer_ref: string | null;
  billed_search_label: string | null;
  billed_description: string | null;
  billed_tyre_catalog_id: number | null;
  facture_reference: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export type FactureFilter = 'all' | 'facture' | 'non_facture';

export interface SortiesQueryResult {
  items: Sortie[];
  total: number;
  limit: number;
  offset: number;
}

export interface InversionsQueryResult {
  items: Inversion[];
  total: number;
  limit: number;
  offset: number;
}

export interface AuditLog {
  id: number;
  created_at: string;
  actor: string;
  action: string;
  entity_type: string;
  entity_id: number | null;
  details_json: string | null;
}

export interface TyreCatalogItem {
  id: number;
  sap_code: string | null;
  description: string;
  manufacturer_ref: string | null;
  search_label: string | null;
  brand: string | null;
  diameter: string | null;
  season: string | null;
}

export interface DashboardPayload {
  summary: { totalLines: number; totalQuantity: number; distinctRefs: number; topBrand: string };
  topBrands: Array<{ label: string; lines: number; quantity: number }>;
  seasonStats: Array<{ label: string; lines: number; quantity: number }>;
  topSapCodes: Array<{ sapCode: string; description: string; lines: number; quantity: number }>;
  diameterStats: Array<{ label: string; lines: number; quantity: number }>;
  trend: Array<{ label: string; lines: number; quantity: number }>;
}

export interface InversionCandidate {
  id: number;
  date: string;
  immatriculation: string;
  quantite: number;
  code_sap: string | null;
  manufacturer_ref: string | null;
  search_label: string | null;
  description: string | null;
  tyre_catalog_id: number | null;
}

export type InversionInput = {
  sortie_id: number;
  date: string;
  immatriculation: string;
  quantite: number;
  mounted_code_sap?: string | null;
  mounted_manufacturer_ref?: string | null;
  mounted_search_label?: string | null;
  mounted_description?: string | null;
  mounted_tyre_catalog_id?: number | null;
  billed_code_sap?: string | null;
  billed_manufacturer_ref?: string | null;
  billed_search_label?: string | null;
  billed_description?: string | null;
  billed_tyre_catalog_id?: number | null;
  facture_reference?: string | null;
};

export type SortieInput = {
  date: string;
  immatriculation: string;
  code_sap?: string | null;
  manufacturer_ref?: string | null;
  search_label?: string | null;
  quantite: number;
  description?: string | null;
  tyre_catalog_id?: number | null;
};

export type BulkImportPayload = {
  rows: Array<{
    date: string;
    immatriculation: string;
    code_sap?: string | null;
    manufacturer_ref?: string | null;
    search_label?: string | null;
    quantite: number;
    description?: string | null;
    tyre_catalog_id?: number | null;
  }>;
};
