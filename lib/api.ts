import { DashboardPayload, FactureFilter, Inversion, InversionsQueryResult, InversionInput, Sortie, SortiesQueryResult, SortieInput, TyreCatalogItem } from './types';

export type SortiesFilters = {
  search: string;
  immatriculation: string;
  dateFrom: string;
  dateTo: string;
  limit: number;
  offset: number;
  facture: FactureFilter;
};

export type InversionsFilters = SortiesFilters;

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.message || 'Erreur réseau');
  }

  return data as T;
}

export function buildQuery(filters: Partial<SortiesFilters>) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === '' || value == null) return;
    params.set(key, String(value));
  });
  return params.toString();
}

export async function fetchSorties(filters: SortiesFilters) {
  const query = buildQuery(filters);
  return request<SortiesQueryResult>(`/api/sorties?${query}`);
}

export async function fetchInversions(filters: InversionsFilters) {
  const query = buildQuery(filters);
  return request<InversionsQueryResult>(`/api/inversions?${query}`);
}

export async function fetchAuditLogs(limit = 20) {
  return request<{ items: Array<{ id: number; created_at: string; actor: string; action: string; entity_type: string; entity_id: number | null; details_json: string | null }> }>(`/api/audit?limit=${limit}`);
}

export async function fetchTyreSuggestions(q: string, limit = 8) {
  return request<{ items: TyreCatalogItem[] }>(`/api/tyres/suggest?q=${encodeURIComponent(q)}&limit=${limit}`);
}

export async function fetchDashboard(period?: string) {
  const qs = period ? `?period=${period}` : '';
  return request<DashboardPayload>(`/api/dashboard${qs}`);
}

export async function createSortie(input: SortieInput) {
  return request<Sortie>('/api/sorties', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateSortie(id: number, input: SortieInput) {
  return request<Sortie>(`/api/sorties/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function deleteSortie(id: number) {
  return request<{ success: true; id: number }>(`/api/sorties/${id}`, { method: 'DELETE' });
}

export async function toggleFacture(id: number) {
  return request<Sortie>(`/api/sorties/${id}/facture`, { method: 'PATCH' });
}

export async function importSorties(rows: SortieInput[]) {
  return request<{ inserted: number; skipped: number; errors: Array<{ row: number; message: string }> }>('/api/sorties/import', {
    method: 'POST',
    body: JSON.stringify({ rows }),
  });
}

export async function createInversion(input: InversionInput) {
  return request<Inversion>('/api/inversions', { method: 'POST', body: JSON.stringify(input) });
}

export async function updateInversion(id: number, input: InversionInput) {
  return request<Inversion>(`/api/inversions/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export async function toggleInversionDone(id: number) {
  return request<Inversion>(`/api/inversions/${id}/done`, { method: 'PATCH' });
}
