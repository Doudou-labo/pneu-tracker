import { NextResponse } from 'next/server';
import db from '@/lib/db';

function escapeLike(s: string) {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}
function toSearchPattern(term: string) {
  const normalized = term.trim().replace(/\*+/g, '*');
  if (normalized.includes('*')) {
    return escapeLike(normalized).replace(/\*/g, '%');
  }
  return `%${normalized}%`;
}

interface Sortie {
  id: number;
  date: string;
  immatriculation: string;
  code_sap: string | null;
  description: string | null;
  quantite: number;
  facture_at: string | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim();
    const immatriculation = (searchParams.get('immatriculation') || '').trim().toUpperCase();
    const dateFrom = (searchParams.get('dateFrom') || '').trim();
    const dateTo = (searchParams.get('dateTo') || '').trim();
    const factureFilter = (searchParams.get('facture') || 'all').trim();

    const conditions = ['deleted_at IS NULL'];
    const params: unknown[] = [];

    if (factureFilter === 'facture') conditions.push('facture_at IS NOT NULL');
    else if (factureFilter === 'non_facture') conditions.push('facture_at IS NULL');

    if (search) {
      const esc = '\\';
      conditions.push(`(immatriculation LIKE ? ESCAPE '${esc}' OR COALESCE(code_sap,'') LIKE ? ESCAPE '${esc}' OR COALESCE(description,'') LIKE ? ESCAPE '${esc}')`);
      const like = toSearchPattern(search);
      params.push(like, like, like);
    }

    if (immatriculation) {
      conditions.push('immatriculation LIKE ?');
      params.push(`%${immatriculation}%`);
    }

    if (dateFrom) { conditions.push('date >= ?'); params.push(dateFrom); }
    if (dateTo) { conditions.push('date <= ?'); params.push(dateTo); }

    const sorties = db.prepare(`
      SELECT id, date, immatriculation, code_sap, description, quantite, facture_at
      FROM sorties
      WHERE ${conditions.join(' AND ')}
      ORDER BY date DESC, created_at DESC
    `).all(...params) as Sortie[];

    const totalPneus = sorties.reduce((sum, s) => sum + (s.quantite || 0), 0);
    const dateExport = new Date().toLocaleDateString('fr-FR');

    const rows = sorties.map((s, i) => {
      const bg = i % 2 === 0 ? '#F0F4FA' : '#ffffff';
      const date = s.date ? s.date.split('-').reverse().join('/') : '—';
      return `<tr style="background:${bg}">
        <td>${date}</td>
        <td><strong>${s.immatriculation || '—'}</strong></td>
        <td>${s.code_sap || '—'}</td>
        <td>${s.description ? s.description.slice(0, 55) : '—'}</td>
        <td style="text-align:center;font-weight:bold">${s.quantite}</td>
        <td style="text-align:center">${s.facture_at ? '✓' : ''}</td>
      </tr>`;
    }).join('');

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Export Sorties — Pneu Tracker</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, sans-serif; font-size: 11px; color: #333; padding: 20px; }
  h1 { color: #144390; font-size: 18px; text-align: center; margin-bottom: 4px; }
  .subtitle { color: #666; font-size: 10px; text-align: center; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th { background: #144390; color: white; padding: 6px 8px; text-align: left; font-size: 10px; }
  td { padding: 5px 8px; border-bottom: 1px solid #e5e7eb; font-size: 10px; }
  .footer { margin-top: 12px; text-align: right; color: #144390; font-weight: bold; font-size: 11px; }
  @media print {
    body { padding: 10px; }
    button { display: none; }
  }
</style>
</head>
<body>
  <h1>🚗 Pneu Tracker — Export Sorties</h1>
  <div class="subtitle">Export du ${dateExport} · ${sorties.length} sortie(s) · ${totalPneus} pneus</div>
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Immatriculation</th>
        <th>Code SAP</th>
        <th>Description</th>
        <th style="text-align:center">Qté</th>
        <th style="text-align:center">Facturé</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="footer">Total : ${sorties.length} sortie(s) · ${totalPneus} pneus</div>
  <script>window.onload = () => { window.print(); }</script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 });
  }
}
