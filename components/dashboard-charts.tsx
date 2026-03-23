'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, Legend } from 'recharts';

const COLORS = ['#2563eb', '#10b981', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4'];

const SEASON_MAP: Record<string, { label: string; color: string }> = {
  'SUMMER': { label: 'Été', color: '#f59e0b' },
  'WINTER': { label: 'Hiver', color: '#3b82f6' },
  'ALL SEASON': { label: '4 Saisons', color: '#10b981' },
  'N/A': { label: 'Non renseigné', color: '#d1d5db' },
};

type DashboardData = {
  summary: { totalLines: number; totalQuantity: number; distinctRefs: number; topBrand: string };
  topBrands: Array<{ label: string; lines: number; quantity: number }>;
  seasonStats: Array<{ label: string; lines: number; quantity: number }>;
  topSapCodes: Array<{ sapCode: string; description: string; lines: number; quantity: number }>;
  diameterStats: Array<{ label: string; lines: number; quantity: number }>;
  trend: Array<{ label: string; lines: number; quantity: number }>;
};

export function DashboardCharts({ data, period, onPeriodChange }: { data: DashboardData; period: string; onPeriodChange: (p: string) => void }) {
  const mappedSeasonStats = data.seasonStats.map(s => ({
    ...s,
    label: SEASON_MAP[s.label]?.label ?? s.label,
    color: SEASON_MAP[s.label]?.color ?? '#9ca3af',
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex gap-2 mb-2">
        {[
          { key: 'today', label: "Aujourd'hui" },
          { key: 'week', label: 'Cette semaine' },
          { key: 'month', label: 'Ce mois' },
          { key: 'all', label: 'Tout' },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => onPeriodChange(key)}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${period === key ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-blue-600">Sorties</div>
          <div className="mt-2 text-2xl font-bold text-blue-900">{data.summary.totalLines}</div>
          <div className="text-sm text-blue-700">lignes enregistrées</div>
        </div>
        <div className="rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-green-600">Quantité</div>
          <div className="mt-2 text-2xl font-bold text-green-900">{data.summary.totalQuantity}</div>
          <div className="text-sm text-green-700">pneus sortis</div>
        </div>
        <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-purple-600">Références</div>
          <div className="mt-2 text-2xl font-bold text-purple-900">{data.summary.distinctRefs}</div>
          <div className="text-sm text-purple-700">références distinctes</div>
        </div>
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wide text-orange-600">Top marque</div>
          <div className="mt-2 truncate text-2xl font-bold text-orange-900">{data.summary.topBrand}</div>
          <div className="text-sm text-orange-700">la plus sortie</div>
        </div>
      </div>

      {data.trend && data.trend.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Tendance 30 jours</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} tickFormatter={(v: string) => v.slice(5)} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v) => [`${v} pneus`, 'Quantité']} labelFormatter={(l) => `Date: ${l}`} />
              <Bar dataKey="quantity" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Top marques</h3>
          {data.topBrands.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Aucune donnée sur cette période</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.topBrands} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 11 }} width={110} />
                <Tooltip formatter={(v, name) => [v, name === 'quantity' ? 'Quantité' : 'Lignes']} />
                <Bar dataKey="quantity" fill="#2563eb" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Répartition saisons</h3>
          {mappedSeasonStats.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Aucune donnée sur cette période</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={mappedSeasonStats}
                  dataKey="quantity"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent, value }: { name?: string; percent?: number; value?: number }) => (percent ?? 0) >= 0.05 ? `${name}: ${value}` : ''}
                >
                  {mappedSeasonStats.map((entry) => (
                    <Cell key={entry.label} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${v} pneus`, 'Quantité']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Top codes SAP</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-gray-500">
                  <th className="py-2">SAP</th>
                  <th className="py-2">Description</th>
                  <th className="py-2">Qté</th>
                </tr>
              </thead>
              <tbody>
                {data.topSapCodes.map((item) => (
                  <tr key={item.sapCode} className="border-b border-gray-50 align-top">
                    <td className="py-2 pr-3 font-mono text-gray-900">{item.sapCode}</td>
                    <td className="py-2 pr-3 text-xs text-gray-600" title={item.description}>
                      {item.description.length > 40 ? item.description.slice(0, 40) + '…' : item.description}
                    </td>
                    <td className="py-2 font-semibold text-blue-700">{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-600">Répartition diamètres</h3>
          {data.diameterStats.length === 0 ? (
            <div className="flex items-center justify-center h-[260px] text-gray-400 text-sm">Aucune donnée sur cette période</div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.diameterStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [`${v} pneus`, 'Quantité']} />
                <Bar dataKey="quantity" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
