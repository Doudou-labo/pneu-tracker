'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { HeaderStats } from '@/components/header-stats';
import { Tabs } from '@/components/tabs';
import { SortieForm } from '@/components/sortie-form';
import { FiltersBar } from '@/components/filters-bar';
import { SortiesList } from '@/components/sorties-list';
import { CatalogImportPanel } from '@/components/catalog-import-panel';
import { DashboardCharts } from '@/components/dashboard-charts';
import { EditSortieDialog } from '@/components/edit-sortie-dialog';
import { DeleteDialog } from '@/components/delete-dialog';
import { PaginationControls } from '@/components/pagination-controls';
import { AuditLogPanel } from '@/components/audit-log-panel';
import { ToastViewport } from '@/components/toast-viewport';
import { InversionForm, buildInversionEditPrefill, buildInversionPrefill, InversionFormState, toInversionPayload } from '@/components/inversion-form';
import { InversionsList } from '@/components/inversions-list';
import { useSorties } from '@/hooks/use-sorties';
import { useInversions } from '@/hooks/use-inversions';
import { useToast } from '@/hooks/use-toast';
import { useDashboard } from '@/hooks/use-dashboard';
import { useAudit } from '@/hooks/use-audit';
import { useTyreCatalog } from '@/hooks/use-tyre-catalog';
import { buildCsv, parseCsvLine } from '@/lib/csv';
import { formatDateFr, formatDateTimeFr } from '@/lib/formatters';
import { FactureFilter, Inversion, Sortie, SortieInput, TyreCatalogItem } from '@/lib/types';
import { normalizeImmatriculation } from '@/lib/validators';

type Tab = 'form' | 'history' | 'inversions' | 'dashboard';
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

const defaultInversionForm = (): InversionFormState => ({
  sortie_id: '',
  date: new Date().toISOString().split('T')[0],
  immatriculation: '',
  quantite: '',
  mounted_code_sap: '',
  mounted_manufacturer_ref: '',
  mounted_search_label: '',
  mounted_description: '',
  mounted_tyre_catalog_id: '',
  billed_code_sap: '',
  billed_manufacturer_ref: '',
  billed_search_label: '',
  billed_description: '',
  billed_tyre_catalog_id: '',
  billed_tyre_search: '',
  facture_reference: '',
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

function getTyreSearchValue(item: TyreCatalogItem) {
  return item.sap_code || item.manufacturer_ref || item.search_label || item.description;
}

function clearTyreSelection(state: FormState, nextSearch: string): FormState {
  return {
    ...state,
    tyre_search: nextSearch,
    tyre_catalog_id: '',
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
  const [inversionForm, setInversionForm] = useState<InversionFormState>(defaultInversionForm());
  const [inversionErrors, setInversionErrors] = useState<Record<string, string>>({});
  const [inversionSource, setInversionSource] = useState<Sortie | null>(null);
  const [editingInversion, setEditingInversion] = useState<Inversion | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { toasts, toast: addToast } = useToast();
  const { dashboard, refreshDashboard, period, handlePeriodChange } = useDashboard();
  const { auditLogs, refreshAudit } = useAudit();
  const { status: tyreCatalogStatus, loading: loadingTyreCatalog, importing: importingTyreCatalog, importFile: importTyreCatalogFile } = useTyreCatalog();
  const inversions = useInversions();

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
    setForm((current) => clearTyreSelection(current, value));
    setSelectedTyre(null);
  };

  const applyTyreSelection = (target: 'create' | 'edit', item: TyreCatalogItem) => {
    const updater = (current: FormState): FormState => ({
      ...current,
      tyre_search: getTyreSearchValue(item),
      tyre_catalog_id: String(item.id),
      code_sap: item.sap_code || '',
      manufacturer_ref: item.manufacturer_ref || '',
      search_label: item.search_label || '',
      description: item.description || '',
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
      const keepTyre = typeof window !== 'undefined' && localStorage.getItem('pneu-tracker-keep-tyre') === 'true';
      if (keepTyre && selectedTyre) {
        setForm({ ...defaultForm(), tyre_search: getTyreSearchValue(selectedTyre), tyre_catalog_id: String(selectedTyre.id), code_sap: selectedTyre.sap_code || '', manufacturer_ref: selectedTyre.manufacturer_ref || '', search_label: selectedTyre.search_label || '', description: selectedTyre.description || '' });
      } else {
        setForm(defaultForm());
        setSelectedTyre(null);
      }
      void refreshAudit();
      void refreshDashboard();
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

  const handleEditChange = (key: string, value: string) => setEditForm((current) => ({ ...current, [key]: key === 'immatriculation' ? value.toUpperCase() : value }));
  const handleEditTyreSearchChange = (value: string) => setEditForm((current) => clearTyreSelection(current, value));

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
      addToast('success', sortie.facture_at ? `↩️ Marquage facturé retiré : ${sortie.immatriculation}` : `✅ Sortie marquée comme facturée : ${sortie.immatriculation}`);
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
    void fetch('/api/audit/export', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ total, offset: filters.offset, limit: filters.limit, search: filters.search }) }).then(() => refreshAudit()).catch(() => undefined);
    addToast('info', '📤 Export CSV généré (compatible Excel)');
  };

  const handleExportInversionsCsv = () => {
    const csv = buildCsv([
      ['Date', 'Immatriculation', 'Quantité', 'SAP monté', 'Description montée', 'SAP facturé', 'Description facturée', 'Facture', 'Inversion faite'],
      ...inversions.items.map((item) => [formatDateFr(item.date), item.immatriculation, item.quantite, item.mounted_code_sap || '', item.mounted_description || '', item.billed_code_sap || '', item.billed_description || '', item.facture_reference || '', item.done_at ? 'Oui' : 'Non']),
    ]);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inversions-pneus-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast('info', '📤 Export CSV des inversions généré');
  };

  const handleImportTyreCatalog = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await importTyreCatalogFile(file);
      addToast('success', `📦 Catalogue importé : ${result.inserted} ajoutée(s), ${result.updated} mise(s) à jour, ${result.ignored} ignorée(s)`);
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erreur import catalogue');
    } finally {
      e.target.value = '';
    }
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
          rows.push({ date: dateRaw.includes('/') ? dateRaw.split('/').reverse().join('-') : dateRaw, immatriculation: cols[immatIdx] || '', code_sap: cols[sapIdx] || '', manufacturer_ref: cols[manufacturerIdx] || '', search_label: cols[searchLabelIdx] || '', quantite: Number(cols[qteIdx] || 0), description: cols[descIdx] || '' });
        }
        const result = await bulkImport(rows);
        void refreshAudit();
        void refreshDashboard();
        addToast('success', `📥 Import terminé : ${result.inserted} ajoutée(s), ${result.skipped} ignorée(s)`);
      } catch (error) {
        addToast('error', error instanceof Error ? error.message : 'Erreur import CSV');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  const handleOpenInversion = (sortie: Sortie) => {
    setEditingInversion(null);
    setInversionSource(sortie);
    setInversionForm(buildInversionPrefill(sortie));
    setInversionErrors({});
    setTab('inversions');
  };

  const handleEditInversion = (inversion: Inversion) => {
    setEditingInversion(inversion);
    setInversionSource(null);
    setInversionForm(buildInversionEditPrefill(inversion));
    setInversionErrors({});
    setTab('inversions');
  };

  const handleCancelInversionEdit = () => {
    setEditingInversion(null);
    setInversionSource(null);
    setInversionForm(defaultInversionForm());
    setInversionErrors({});
  };

  const handleInversionChange = (key: keyof InversionFormState, value: string) => {
    setInversionForm((current) => ({ ...current, [key]: value }));
    setInversionErrors((current) => ({ ...current, [key]: '', global: '' }));
  };

  const handleInversionTyreSearchChange = (value: string) => {
    setInversionForm((current) => ({ ...current, billed_tyre_search: value, billed_tyre_catalog_id: '' }));
  };

  const handleInversionTyreSelect = (item: TyreCatalogItem) => {
    setInversionForm((current) => ({ ...current, billed_tyre_search: getTyreSearchValue(item), billed_tyre_catalog_id: String(item.id), billed_code_sap: item.sap_code || '', billed_manufacturer_ref: item.manufacturer_ref || '', billed_search_label: item.search_label || '', billed_description: item.description || '' }));
  };

  const handleCreateInversion = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingInversion) {
        const updated = await inversions.update(editingInversion.id, toInversionPayload(inversionForm));
        setEditingInversion(null);
        setInversionSource(null);
        setInversionForm(defaultInversionForm());
        void refreshAudit();
        addToast('success', `✏️ Inversion modifiée : ${updated.immatriculation} · ${updated.quantite} pneus`);
        return;
      }

      const created = await inversions.create(toInversionPayload(inversionForm));
      setInversionSource(null);
      setInversionForm(defaultInversionForm());
      void refreshAudit();
      addToast('success', `↔️ Inversion enregistrée : ${created.immatriculation} · ${created.quantite} pneus`);
    } catch (error) {
      const message = error instanceof Error ? error.message : editingInversion ? 'Erreur lors de la modification de l’inversion' : 'Erreur lors de la création de l’inversion';
      setInversionErrors({ global: message });
      addToast('error', message);
    }
  };

  const handleToggleInversionDone = async (inversion: Inversion) => {
    try {
      const updated = await inversions.markDone(inversion.id);
      void refreshAudit();
      addToast('success', updated.done_at ? `✅ Inversion marquée comme faite : ${updated.immatriculation}` : `↩️ Marquage retiré : ${updated.immatriculation}`);
    } catch (error) {
      addToast('error', error instanceof Error ? error.message : 'Erreur lors du marquage');
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <ToastViewport toasts={toasts} />
      <div className="-mx-4 -mt-6 mb-0 bg-gradient-to-b from-[#0d305c] to-white">
        <div className="mx-auto max-w-5xl px-4 pt-4 pb-0">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div className="px-1 pb-4 text-white">
              <h1 className="text-2xl font-bold">Pneu Tracker</h1>
              <p className="mt-1 text-sm text-white/70">{total} sortie{total > 1 ? 's' : ''} · {totalPneus} pneus affichés{lastSaved ? ` · dernière action ${formatDateTimeFr(lastSaved)}` : ''}</p>
            </div>
            <HeaderStats total={totalPneus} thisMonth={thisMonthQty} vehicles={uniqueImmats.length} />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4">
        <Tabs tab={tab} onChange={setTab} />
      </div>

      {tab === 'form' && <SortieForm form={form} errors={formErrors} loading={saving} onChange={handleFormChange} onQuickQty={handleQuickQty} onSubmit={handleSubmit} onTyreSearchChange={handleTyreSearchChange} onTyreSelect={(item) => applyTyreSelection('create', item)} recentHint={recentHint} lastSortie={lastSortie} selectedTyre={selectedTyre} />}

      {tab === 'history' && (
        <div className="flex flex-col gap-4">
          <CatalogImportPanel
            totalCatalogReferences={tyreCatalogStatus?.totalCatalogReferences ?? 0}
            lastImportedAt={tyreCatalogStatus?.lastImportedAt ?? null}
            lastRun={tyreCatalogStatus?.lastRun ?? null}
            loading={loadingTyreCatalog}
            importing={importingTyreCatalog}
            onSelectFile={handleImportTyreCatalog}
          />
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <FiltersBar search={filters.search} immatriculation={filters.immatriculation} dateFrom={filters.dateFrom} dateTo={filters.dateTo} facture={(filters.facture as FactureFilter) || 'all'} uniqueImmats={uniqueImmats} nonFactureCount={filters.facture === 'all' ? items.filter((item) => !item.facture_at).length : 0} onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value, offset: 0 }))} onReset={resetFilters} onSearchSelect={(item) => setFilters((current) => ({ ...current, search: getTyreSearchValue(item), offset: 0 }))} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Recherche + filtres côté serveur, pagination 20 par page, audit trail actif.</span>
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100">{importing ? 'Import…' : '📥 Import CSV'}<input ref={fileInputRef} type="file" accept=".csv" onChange={handleImportCsv} className="hidden" /></label>
                  <button onClick={handleExportCsv} className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100">⬇️ CSV (Excel)</button>
                  <button onClick={() => { const params = new URLSearchParams(); if (filters.search) params.set('search', filters.search); if (filters.immatriculation) params.set('immatriculation', filters.immatriculation); if (filters.dateFrom) params.set('dateFrom', filters.dateFrom); if (filters.dateTo) params.set('dateTo', filters.dateTo); if (filters.facture !== 'all') params.set('facture', filters.facture); window.open(`/api/sorties/export/pdf?${params.toString()}`, '_blank'); }} className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">📄 PDF</button>
                </div>
              </div>
            </div>
          </div>
          <SortiesList items={items} total={total} loading={loading} onEdit={openEdit} onDelete={setDeletingSortie} onToggleFacture={handleToggleFacture} onCreateInversion={handleOpenInversion} />
          <PaginationControls pageStart={pageStart} pageEnd={pageEnd} total={total} hasPrev={hasPrev} hasNext={hasNext} onPrev={prevPage} onNext={nextPage} />
          <AuditLogPanel logs={auditLogs} />
        </div>
      )}

      {tab === 'inversions' && (
        <div className="flex flex-col gap-4">
          <InversionForm form={inversionForm} errors={inversionErrors} loading={inversions.saving} sourceSortieLabel={editingInversion ? `Inversion #${editingInversion.id}` : inversionSource ? `${inversionSource.immatriculation} · ${formatDateFr(inversionSource.date)}` : null} mode={editingInversion ? 'edit' : 'create'} onCancel={editingInversion ? handleCancelInversionEdit : undefined} onChange={handleInversionChange} onSubmit={handleCreateInversion} onBilledTyreSearchChange={handleInversionTyreSearchChange} onBilledTyreSelect={handleInversionTyreSelect} />
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3">
              <FiltersBar search={inversions.filters.search} immatriculation={inversions.filters.immatriculation} dateFrom={inversions.filters.dateFrom} dateTo={inversions.filters.dateTo} facture={(inversions.filters.facture as FactureFilter) || 'all'} uniqueImmats={inversions.uniqueImmats} nonFactureCount={inversions.filters.facture === 'all' ? inversions.items.filter((item) => !item.facture_reference).length : 0} onChange={(key, value) => inversions.setFilters((current) => ({ ...current, [key]: value, offset: 0 }))} onReset={inversions.resetFilters} onSearchSelect={(item) => inversions.setFilters((current) => ({ ...current, search: getTyreSearchValue(item), offset: 0 }))} />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm text-gray-500">Une inversion = même immatriculation et même quantité que la sortie source, mais référence facturée différente.</span>
                <div className="flex flex-wrap gap-2">
                  <button onClick={handleExportInversionsCsv} className="rounded-lg border border-green-300 bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 transition-colors hover:bg-green-100">⬇️ CSV (Excel)</button>
                  <button onClick={() => { const params = new URLSearchParams(); if (inversions.filters.search) params.set('search', inversions.filters.search); if (inversions.filters.immatriculation) params.set('immatriculation', inversions.filters.immatriculation); if (inversions.filters.dateFrom) params.set('dateFrom', inversions.filters.dateFrom); if (inversions.filters.dateTo) params.set('dateTo', inversions.filters.dateTo); if (inversions.filters.facture !== 'all') params.set('facture', inversions.filters.facture); window.open(`/api/inversions/export/pdf?${params.toString()}`, '_blank'); }} className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-100">📄 PDF</button>
                </div>
              </div>
            </div>
          </div>
          <InversionsList items={inversions.items} total={inversions.total} loading={inversions.loading} onEdit={handleEditInversion} onToggleDone={handleToggleInversionDone} />
          <PaginationControls pageStart={inversions.pageStart} pageEnd={inversions.pageEnd} total={inversions.total} hasPrev={inversions.hasPrev} hasNext={inversions.hasNext} onPrev={inversions.prevPage} onNext={inversions.nextPage} />
        </div>
      )}

      {tab === 'dashboard' && (!dashboard || dashboard.summary.totalLines === 0 ? <div className="rounded-xl border border-gray-200 bg-white p-12 text-center text-gray-400">Aucune donnée à afficher</div> : <DashboardCharts data={dashboard} period={period} onPeriodChange={handlePeriodChange} />)}

      <EditSortieDialog open={Boolean(editing)} form={editForm} loading={saving} error={undefined} onChange={handleEditChange} onTyreSearchChange={handleEditTyreSearchChange} onTyreSelect={(item) => applyTyreSelection('edit', item)} onClose={() => setEditing(null)} onSubmit={handleEdit} />
      <DeleteDialog sortie={deletingSortie} loading={deleting} onConfirm={handleDelete} onClose={() => setDeletingSortie(null)} />
    </div>
  );
}
