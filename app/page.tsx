'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { HeaderStats } from '@/components/header-stats';
import { Tabs } from '@/components/tabs';
import { SortieForm } from '@/components/sortie-form';
import { FiltersBar } from '@/components/filters-bar';
import { SortiesList } from '@/components/sorties-list';
import { DashboardCharts } from '@/components/dashboard-charts';
import { EditSortieDialog } from '@/components/edit-sortie-dialog';
import { DeleteDialog } from '@/components/delete-dialog';
import { PaginationControls } from '@/components/pagination-controls';
import { AuditLogPanel } from '@/components/audit-log-panel';
import { ToastViewport } from '@/components/toast-viewport';
import { useSorties } from '@/hooks/use-sorties';
import { buildCsv, parseCsvLine } from '@/lib/csv';
import { fetchAuditLogs } from '@/lib/api';
import { formatDateFr, formatDateTimeFr } from '@/lib/formatters';
import { AuditLog, Sortie, SortieInput, TyreCatalogItem } from '@/lib/types';
import { normalizeImmatriculation } from '@/lib/validators';

type Tab = 'form' | 'history' | 'dashboard';
type Toast = { id: number; type: 'success' | 'error' | 'info'; text: string };
type FormState = {
  date: string;
  immatriculation: string;
  code_sap: string;
  manufacturer_ref: string;
  search_label: string;
  tyre_search: string;
  tyre_catalog_id: string;
  quantite: string;
  description: string;
};

const defaultForm = (): FormState => ({
  date: new Date().toISOString().split('T')[0],
  immatriculation: '',
  code_sap: '',
  manufacturer_ref: '',
  search_label: '',
  tyre_search: '',
  tyre_catalog_id: '',
  quantite: '',
  description: '',
});

function validateClientForm(form: FormState) {
  const errors: Partial<Record<keyof SortieInput | 'global', string>> = {};
  const quantity = Number(form.quantite);
  if (!form.date) errors.date = 'La date est obligatoire';
  if (!form.immatriculation.trim()) errors.immatriculation = 'L’immatriculation est obligatoire';
  if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 20) errors.quantite = 'Quantité entre 1 et 20';
  if (form.code_sap.length > 32) errors.code_sap = '32 caractères max';
  if (form.description.length > 240) errors.description = '240 caractères max';
  return errors;
}

function toPayload(form: FormState): SortieInput {
  return {
    date: form.date,
    immatriculation: normalizeImmatriculation(form.immatriculation),
    code_sap: form.code_sap.trim() || null,
    manufacturer_ref: form.manufacturer_ref.trim() || null,
    search_label: form.search_label.trim() || null,
    tyre_catalog_id: form.tyre_catalog_id ? Number(form.tyre_catalog_id) : null,
    quantite: Number(form.quantite),
    description: form.description.trim() || null,
  };
}

export default function Home() {
  const [tab, setTab] = useState<Tab>('form');
  const [form, setForm] = useState<FormState>(defaultForm());
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof SortieInput | 'global', string>>>({});
  const [editForm, setEditForm] = useState<FormState>(defaultForm());
  const [editing, setEditing] = useState<Sortie | null>(null);
  const [deletingSortie, setDeletingSortie] = useState<Sortie | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    items,
    total,
    loading,
    saving,
    deleting,
    importing,
    filters,
    setFilters,
    uniqueImmats,
    lastSaved,
    hasPrev,
    hasNext,
    pageStart,
    pageEnd,
    nextPage,
    prevPage,
    create,
    update,
    remove,
    bulkImport,
    resetFilters,
  } = useSorties();

  const addToast = (type: Toast['type'], text: string) => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, type, text }]);
    setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 4000);
  };

  const refreshAudit = async () => {
    try {
      const data = await fetchAuditLogs(12);
      setAuditLogs(data.items);
    } catch {
      // audit non bloquant pour l'UI
    }
  };

  useEffect(() => {
    void refreshAudit();
  }, []);

  const totalPneus = useMemo(() => items.reduce((acc, item) => acc + item.quantite, 0), [items]);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthQty = useMemo(() => items.filter((item) => item.date.startsWith(thisMonth)).reduce((acc, item) => acc + item.quantite, 0), [items, thisMonth]);
  const statsByImmat = useMemo(() => Object.entries(
    items.reduce((acc: Record<string, number>, item) => {
      acc[item.immatriculation] = (acc[item.immatriculation] || 0) + item.quantite;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([immat, total]) => ({ immat, total })), [items]);

  const chartData = useMemo(() => {
    const last6Months: Record<string, number> = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const key = d.toISOString().slice(0, 7);
      last6Months[key] = 0;
    }
    items.forEach((item) => {
      const month = item.date.slice(0, 7);
      if (month in last6Months) last6Months[month] += item.quantite;
    });
    return Object.entries(last6Months).map(([month, total]) => ({ month: `${month.slice(5)}/${month.slice(2, 4)}`, total }));
  }, [items]);

  const recentHint = items[0] ? `${items[0].immatriculation} · ${items[0].quantite} pneus` : undefined;

  const handleFormChange = (key: string, value: string) => {
    setForm((current) => ({ ...current, [key]: key === 'immatriculation' ? value.toUpperCase() : value }));
    setFormErrors((current) => ({ ...current, [key]: undefined, global: undefined }));
  };

  const handleTyreSearchChange = (value: string) => {
    setForm((current) => ({ ...current, tyre_search: value }));
  };

  const applyTyreSelection = (target: 'create' | 'edit', item: TyreCatalogItem) => {
    const updater = (current: FormState): FormState => ({
      ...current,
      tyre_search: item.sap_code || item.manufacturer_ref || item.search_label || item.description,
      tyre_catalog_id: String(item.id),
      code_sap: item.sap_code || current.code_sap,
      manufacturer_ref: item.manufacturer_ref || current.manufacturer_ref,
      search_label: item.search_label || current.search_label,
      description: item.description || current.description,
    });

    if (target === 'create') {
      setForm(updater);
    } else {
      setEditForm(updater);
    }
  };

  const handleQuickQty = (qty: number) => setForm((current) => ({ ...current, quantite: String(qty) }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errors = validateClientForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      const created = await create(toPayload(form));
      setForm(defaultForm());
      void refreshAudit();
      addToast('success', `✅ Sortie enregistrée : ${created.immatriculation} · ${created.quantite} pneus`);
    } catch (error) {
      setFormErrors({ global: error instanceof Error ? error.message : 'Erreur lors de l’enregistrement' });
      addToast('error', error instanceof Error ? error.message : 'Erreur lors de l’enregistrement');
    }
  };

  const openEdit = (sortie: Sortie) => {
    setEditing(sortie);
    setEditForm({
      date: sortie.date,
      immatriculation: sortie.immatriculation,
      code_sap: sortie.code_sap || '',
      manufacturer_ref: sortie.manufacturer_ref || '',
      search_label: sortie.search_label || '',
      tyre_search: sortie.code_sap || sortie.manufacturer_ref || sortie.search_label || sortie.description || '',
      tyre_catalog_id: sortie.tyre_catalog_id ? String(sortie.tyre_catalog_id) : '',
      quantite: String(sortie.quantite),
      description: sortie.description || '',
    });
  };

  const handleEditChange = (key: string, value: string) => {
    setEditForm((current) => ({ ...current, [key]: key === 'immatriculation' ? value.toUpperCase() : value }));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const updated = await update(editing.id, toPayload(editForm));
      setEditing(null);
      void refreshAudit();
      addToast('success', `✏️ Sortie modifiée : ${updated.immatriculation}`);
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erreur lors de la modification');
    }
  };

  const handleDelete = async () => {
    if (!deletingSortie) return;
    try {
      await remove(deletingSortie.id);
      void refreshAudit();
      addToast('success', `🗑️ Sortie supprimée : ${deletingSortie.immatriculation}`);
      setDeletingSortie(null);
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erreur lors de la suppression');
    }
  };

  const handleExportCsv = () => {
    const csv = buildCsv([
      ['Date', 'Immatriculation', 'Code SAP', 'Référence fabricant', 'Libellé de recherche', 'Quantité', 'Description'],
      ...items.map((item) => [formatDateFr(item.date), item.immatriculation, item.code_sap || '', item.manufacturer_ref || '', item.search_label || '', item.quantite, item.description || '']),
    ]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sorties-pneus-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    void fetch('/api/audit/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ total, offset: filters.offset, limit: filters.limit, search: filters.search }),
    }).then(() => refreshAudit()).catch(() => undefined);
    addToast('info', '📤 Export CSV généré (compatible Excel)');
  };

  const handleImportCsv = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) {
      addToast('error', 'Le fichier dépasse 1 Mo');
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = String(event.target?.result || '').replace(/^\uFEFF/, '');
        const lines = text.split(/\r?\n/).filter(Boolean);
        if (lines.length < 2) throw new Error('CSV vide ou invalide');

        const headers = parseCsvLine(lines[0]).map((item) => item.toLowerCase());
        const dateIdx = headers.findIndex((item) => item === 'date');
        const immatIdx = headers.findIndex((item) => item.includes('immat'));
        const sapIdx = headers.findIndex((item) => item.includes('sap'));
        const manufacturerIdx = headers.findIndex((item) => item.includes('référence fabricant') || item.includes('reference fabricant'));
        const searchLabelIdx = headers.findIndex((item) => item.includes('libell'));
        const qteIdx = headers.findIndex((item) => item.includes('quantite') || item.includes('quantité') || item.includes('qté'));
        const descIdx = headers.findIndex((item) => item.includes('desc'));

        const rows: SortieInput[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = parseCsvLine(lines[i]);
          const dateRaw = cols[dateIdx] || '';
          const date = dateRaw.includes('/') ? dateRaw.split('/').reverse().join('-') : dateRaw;
          rows.push({
            date,
            immatriculation: cols[immatIdx] || '',
            code_sap: cols[sapIdx] || '',
            manufacturer_ref: cols[manufacturerIdx] || '',
            search_label: cols[searchLabelIdx] || '',
            quantite: Number(cols[qteIdx] || 0),
            description: cols[descIdx] || '',
          });
        }

        const result = await bulkImport(rows);
        void refreshAudit();
        addToast('success', `📥 Import terminé : ${result.inserted} ajoutée(s), ${result.skipped} ignorée(s)`);
        if (result.errors.length) {
          addToast('info', `ℹ️ ${result.errors.slice(0, 3).map((item) => `L${item.row}: ${item.message}`).join(' · ')}`);
        }
      } catch (error) {
        addToast('error', error instanceof Error ? error.message : 'Erreur import CSV');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <ToastViewport toasts={toasts} />

      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏎️ Suivi Sorties Pneus</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {total} sortie{total > 1 ? 's' : ''} · {totalPneus} pneus affichés
            {lastSaved ? ` · dernière action ${formatDateTimeFr(lastSaved)}` : ''}
          </p>
        </div>
        <HeaderStats total={totalPneus} thisMonth={thisMonthQty} vehicles={uniqueImmats.length} />
      </div>

      <Tabs tab={tab} onChange={setTab} />

      {tab === 'form' ? (
        <SortieForm
          form={form}
          errors={formErrors}
          loading={saving}
          onChange={handleFormChange}
          onQuickQty={handleQuickQty}
          onSubmit={handleSubmit}
          onTyreSearchChange={handleTyreSearchChange}
          onTyreSelect={(item) => applyTyreSelection('create', item)}
          recentHint={recentHint}
        />
      ) : null}

      {tab === 'history' ? (
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <FiltersBar
                search={filters.search}
                immatriculation={filters.immatriculation}
                dateFrom={filters.dateFrom}
                dateTo={filters.dateTo}
                uniqueImmats={uniqueImmats}
                onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value, offset: 0 }))}
                onReset={resetFilters}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Recherche + filtres côté serveur, pagination 20 par page, audit trail actif.</span>
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100">
                    {importing ? 'Import…' : '📥 Import CSV'}
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
                  </label>
                  <button onClick={handleExportCsv} className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100">⬇️ CSV (Excel)</button>
                </div>
              </div>
            </div>
          </div>

          <SortiesList items={items} total={total} loading={loading} onEdit={openEdit} onDelete={setDeletingSortie} />
          <PaginationControls pageStart={pageStart} pageEnd={pageEnd} total={total} hasPrev={hasPrev} hasNext={hasNext} onPrev={prevPage} onNext={nextPage} />
          <AuditLogPanel logs={auditLogs} />
        </div>
      ) : null}

      {tab === 'dashboard' ? (
        items.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">Aucune donnée à afficher</div>
        ) : (
          <DashboardCharts chartData={chartData} statsByImmat={statsByImmat} />
        )
      ) : null}

      <EditSortieDialog
        open={Boolean(editing)}
        form={editForm}
        loading={saving}
        error={undefined}
        onChange={handleEditChange}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
      />

      <DeleteDialog sortie={deletingSortie} loading={deleting} onConfirm={handleDelete} onClose={() => setDeletingSortie(null)} />
    </div>
  );
}
