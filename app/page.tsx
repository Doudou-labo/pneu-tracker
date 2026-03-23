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
import { useToast } from '@/hooks/use-toast';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAudit } from '@/hooks/use-audit';
import { buildCsv, parseCsvLine } from '@/lib/csv';
import { formatDateFr, formatDateTimeFr } from '@/lib/formatters';
import { FactureFilter, Sortie, SortieInput, TyreCatalogItem } from '@/lib/types';
import { normalizeImmatriculation } from '@/lib/validators';

type Tab = 'form' | 'history' | 'dashboard';
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
  if (!form.immatriculation.trim()) errors.immatriculation = 'L\u2019immatriculation est obligatoire';
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
  const [selectedTyre, setSelectedTyre] = useState<TyreCatalogItem | null>(null);
  const [lastSortie, setLastSortie] = useState<Sortie | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toasts, toast: addToast } = useToast();
  const { dashboard, refreshDashboard, period, handlePeriodChange } = useDashboard();
  const { auditLogs, refreshAudit } = useAudit();

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
    markFacture,
    bulkImport,
    resetFilters,
  } = useSorties();

  useEffect(() => {
    void refreshAudit();
    void refreshDashboard();
  }, [refreshAudit, refreshDashboard]);

  const totalPneus = useMemo(() => items.reduce((acc, item) => acc + item.quantite, 0), [items]);
  const thisMonth = new Date().toISOString().slice(0, 7);
  const thisMonthQty = useMemo(() => items.filter((item) => item.date.startsWith(thisMonth)).reduce((acc, item) => acc + item.quantite, 0), [items, thisMonth]);

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
      setSelectedTyre(item);
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
      setLastSortie(created);

      // Si "Conserver le pneu" est coché, garder le pneu sélectionné
      const keepTyre = typeof window !== 'undefined' && localStorage.getItem('pneu-tracker-keep-tyre') === 'true';
      if (keepTyre && selectedTyre) {
        const kept = {
          ...defaultForm(),
          tyre_search: selectedTyre.sap_code || selectedTyre.manufacturer_ref || selectedTyre.search_label || selectedTyre.description,
          tyre_catalog_id: String(selectedTyre.id),
          code_sap: selectedTyre.sap_code || '',
          manufacturer_ref: selectedTyre.manufacturer_ref || '',
          search_label: selectedTyre.search_label || '',
          description: selectedTyre.description || '',
        };
        setForm(kept);
      } else {
        setForm(defaultForm());
        setSelectedTyre(null);
      }

      void refreshAudit();
      void refreshDashboard();
      addToast('success', `✅ Sortie enregistrée : ${created.immatriculation} · ${created.quantite} pneus`);
    } catch (error) {
      setFormErrors({ global: error instanceof Error ? error.message : 'Erreur lors de l\u2019enregistrement' });
      addToast('error', error instanceof Error ? error.message : 'Erreur lors de l\u2019enregistrement');
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

  const handleEditTyreSearchChange = (value: string) => {
    setEditForm((current) => ({ ...current, tyre_search: value }));
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    try {
      const updated = await update(editing.id, toPayload(editForm));
      setEditing(null);
      void refreshAudit();
      void refreshDashboard();
      addToast('success', `✏️ Sortie modifiée : ${updated.immatriculation}`);
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erreur lors de la modification');
    }
  };

  const handleToggleFacture = async (sortie: Sortie) => {
    try {
      await markFacture(sortie.id);
      const wasFacture = Boolean(sortie.facture_at);
      addToast('success', wasFacture ? `↩️ Marquage facturé retiré : ${sortie.immatriculation}` : `✅ Sortie marquée comme facturée : ${sortie.immatriculation}`);
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erreur lors du marquage');
    }
  };

  const handleDelete = async () => {
    if (!deletingSortie) return;
    try {
      await remove(deletingSortie.id);
      void refreshAudit();
      void refreshDashboard();
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
        void refreshDashboard();
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

      {/* Header pleine largeur — dégradé bleu foncé → blanc lisse */}
      <div className="-mx-4 -mt-6 mb-0 bg-gradient-to-b from-[#0d305c] to-white">
        <div className="mx-auto max-w-5xl px-4 pt-4 pb-0">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div className="px-1 pb-4 text-white">
              <h1 className="text-2xl font-bold">Pneu Tracker</h1>
              <p className="mt-1 text-sm text-white/70">
                {total} sortie{total > 1 ? 's' : ''} · {totalPneus} pneus affichés
                {lastSaved ? ` · dernière action ${formatDateTimeFr(lastSaved)}` : ''}
              </p>
            </div>
            <HeaderStats total={totalPneus} thisMonth={thisMonthQty} vehicles={uniqueImmats.length} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <Tabs tab={tab} onChange={setTab} />
      </div>

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
          lastSortie={lastSortie}
          selectedTyre={selectedTyre}
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
                facture={(filters.facture as FactureFilter) || 'all'}
                uniqueImmats={uniqueImmats}
                nonFactureCount={filters.facture === 'all' ? items.filter((item) => !item.facture_at).length : 0}
                onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value, offset: 0 }))}
                onReset={resetFilters}
                onSearchSelect={(item) => setFilters((current) => ({ ...current, search: item.sap_code || item.manufacturer_ref || item.search_label || item.description, offset: 0 }))}
              />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Recherche + filtres côté serveur, pagination 20 par page, audit trail actif.</span>
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100">
                    {importing ? 'Import…' : '📥 Import CSV'}
                    <input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCsv} className="hidden" />
                  </label>
                  <button onClick={handleExportCsv} className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100">⬇️ CSV (Excel)</button>
                  <button
                    onClick={() => {
                      const params = new URLSearchParams();
                      if (filters.search) params.set('search', filters.search);
                      if (filters.immatriculation) params.set('immatriculation', filters.immatriculation);
                      if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
                      if (filters.dateTo) params.set('dateTo', filters.dateTo);
                      if (filters.facture !== 'all') params.set('facture', filters.facture);
                      window.open(`/api/sorties/export/pdf?${params.toString()}`, '_blank');
                    }}
                    className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100"
                  >
                    📄 PDF
                  </button>
                </div>
              </div>
            </div>
          </div>

          <SortiesList items={items} total={total} loading={loading} onEdit={openEdit} onDelete={setDeletingSortie} onToggleFacture={handleToggleFacture} />
          <PaginationControls pageStart={pageStart} pageEnd={pageEnd} total={total} hasPrev={hasPrev} hasNext={hasNext} onPrev={prevPage} onNext={nextPage} />
          <AuditLogPanel logs={auditLogs} />
        </div>
      ) : null}

      {tab === 'dashboard' ? (
        !dashboard || dashboard.summary.totalLines === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">Aucune donnée à afficher</div>
        ) : (
          <DashboardCharts data={dashboard} period={period} onPeriodChange={handlePeriodChange} />
        )
      ) : null}

      <EditSortieDialog
        open={Boolean(editing)}
        form={editForm}
        loading={saving}
        error={undefined}
        onChange={handleEditChange}
        onTyreSearchChange={handleEditTyreSearchChange}
        onTyreSelect={(item) => applyTyreSelection('edit', item)}
        onClose={() => setEditing(null)}
        onSubmit={handleEdit}
      />

      <DeleteDialog sortie={deletingSortie} loading={deleting} onConfirm={handleDelete} onClose={() => setDeletingSortie(null)} />
    </div>
  );
}
