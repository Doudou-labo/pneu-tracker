export interface Sortie {
  id: number;
  date: string;
  immatriculation: string;
  code_sap: string | null;
  quantite: number;
  description: string | null;
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

export type SortieInput = {
  date: string;
  immatriculation: string;
  code_sap?: string | null;
  quantite: number;
  description?: string | null;
};

export type BulkImportPayload = {
  rows: Array<{
    date: string;
    immatriculation: string;
    code_sap?: string | null;
    quantite: number;
    description?: string | null;
  }>;
};
