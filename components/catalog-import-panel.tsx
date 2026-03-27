import { formatDateTimeFr } from '@/lib/formatters';
import { TyreCatalogImportRun } from '@/lib/types';

export function CatalogImportPanel({
  totalCatalogReferences,
  lastImportedAt,
  lastRun,
  loading,
  importing,
  onSelectFile,
}: {
  totalCatalogReferences: number;
  lastImportedAt: string | null;
  lastRun: TyreCatalogImportRun | null;
  loading: boolean;
  importing: boolean;
  onSelectFile: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Catalogue pneus</h2>
            <p className="mt-1 text-sm text-gray-500">Import CSV/XLSX en mode UPSERT : mise à jour si la référence existe déjà, sinon création. Aucune suppression automatique.</p>
          </div>
          <label className="cursor-pointer rounded-lg border border-indigo-300 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 transition-colors hover:bg-indigo-100">
            {importing ? 'Import en cours…' : '📦 Importer un catalogue'}
            <input type="file" accept=".csv,.xlsx" onChange={onSelectFile} className="hidden" disabled={importing} />
          </label>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Références catalogue</div>
            <div className="mt-1 text-2xl font-bold text-slate-900">{loading ? '…' : totalCatalogReferences}</div>
          </div>
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-1 lg:col-span-3">
            <div className="text-xs uppercase tracking-wide text-slate-500">Dernier import</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{lastImportedAt ? formatDateTimeFr(lastImportedAt) : 'Aucun import catalogue enregistré'}</div>
          </div>
        </div>

        {lastRun && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <div className="font-semibold">Dernier rapport d’import</div>
            <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1">
              <span>Fichier : {lastRun.file_name || 'n/a'}</span>
              <span>Lignes : {lastRun.total_rows}</span>
              <span>Ajoutées : {lastRun.inserted_count}</span>
              <span>Mises à jour : {lastRun.updated_count}</span>
              <span>Ignorées : {lastRun.ignored_count}</span>
              <span>Erreurs : {lastRun.error_count}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
