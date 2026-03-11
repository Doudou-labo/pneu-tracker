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
}

export interface SortiesQueryResult {
  items: Sortie[];
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
