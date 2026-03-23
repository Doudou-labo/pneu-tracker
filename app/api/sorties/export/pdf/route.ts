import { NextResponse } from 'next/server';
import db from '@/lib/db';
import PDFDocument from 'pdfkit';

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

    // Build PDF
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    const pdfReady = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    // Header
    const BLUE = '#144390';
    doc.rect(0, 0, doc.page.width, 60).fill(BLUE);
    doc.fillColor('#ffffff').fontSize(20).text('Pneu Tracker — Export Sorties', 40, 18, { align: 'center' });
    doc.fontSize(10).text(`Export du ${dateExport}  ·  ${sorties.length} sortie(s)  ·  ${totalPneus} pneus`, 40, 42, { align: 'center' });

    // Table setup
    const startY = 80;
    const colWidths = [70, 100, 80, 260, 45, 55]; // Date, Immat, SAP, Desc, Qté, Facturé
    const headers = ['Date', 'Immatriculation', 'Code SAP', 'Description', 'Qté', 'Facturé'];
    const tableX = 40;
    const rowHeight = 20;
    const headerHeight = 24;

    // Draw header row
    let x = tableX;
    doc.rect(tableX, startY, colWidths.reduce((a, b) => a + b, 0), headerHeight).fill(BLUE);
    doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
    for (let i = 0; i < headers.length; i++) {
      const align = i >= 4 ? 'center' : 'left';
      doc.text(headers[i], x + 4, startY + 6, { width: colWidths[i] - 8, align });
      x += colWidths[i];
    }

    // Draw rows
    let y = startY + headerHeight;
    doc.font('Helvetica').fontSize(8);

    for (let idx = 0; idx < sorties.length; idx++) {
      // New page check
      if (y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        y = 40;
        // Redraw header on new page
        x = tableX;
        doc.rect(tableX, y, colWidths.reduce((a, b) => a + b, 0), headerHeight).fill(BLUE);
        doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
        for (let i = 0; i < headers.length; i++) {
          const align = i >= 4 ? 'center' : 'left';
          doc.text(headers[i], x + 4, y + 6, { width: colWidths[i] - 8, align });
          x += colWidths[i];
        }
        doc.font('Helvetica').fontSize(8);
        y += headerHeight;
      }

      const s = sorties[idx];
      const bg = idx % 2 === 0 ? '#F0F4FA' : '#ffffff';
      const tableWidth = colWidths.reduce((a, b) => a + b, 0);

      // Row background
      doc.rect(tableX, y, tableWidth, rowHeight).fill(bg);

      // Row border
      doc.rect(tableX, y, tableWidth, rowHeight).strokeColor('#e5e7eb').lineWidth(0.5).stroke();

      doc.fillColor('#333333');

      const date = s.date ? s.date.split('-').reverse().join('/') : '—';
      const desc = s.description ? s.description.slice(0, 50) : '—';
      const cells = [
        date,
        s.immatriculation || '—',
        s.code_sap || '—',
        desc,
        String(s.quantite),
        s.facture_at ? '✓' : '—',
      ];

      x = tableX;
      for (let i = 0; i < cells.length; i++) {
        const align = i >= 4 ? 'center' : 'left';
        const fontStyle = i === 1 ? 'Helvetica-Bold' : 'Helvetica';
        doc.font(fontStyle).text(cells[i], x + 4, y + 6, { width: colWidths[i] - 8, align, lineBreak: false });
        x += colWidths[i];
      }

      y += rowHeight;
    }

    // Footer
    y += 10;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(BLUE);
    doc.text(`Total : ${sorties.length} sortie(s)  ·  ${totalPneus} pneus`, tableX, y, {
      align: 'right',
      width: colWidths.reduce((a, b) => a + b, 0),
    });

    doc.end();

    const pdfBuffer = await pdfReady;

    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="sorties-pneus.pdf"',
      },
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 });
  }
}
