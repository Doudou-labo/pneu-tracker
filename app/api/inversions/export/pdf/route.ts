import { NextResponse } from 'next/server';
import PDFDocument from 'pdfkit';
import { getActor, logAudit } from '@/lib/audit';
import { listInversionsForExport, type InversionFilters } from '@/lib/inversions';

interface InversionRow {
  date: string;
  immatriculation: string;
  quantite: number;
  mounted_manufacturer_ref: string | null;
  billed_manufacturer_ref: string | null;
  facture_reference: string | null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const factureFilter = (searchParams.get('facture') || searchParams.get('hasInvoice') || 'all').trim();
    const filters: InversionFilters = {
      search: (searchParams.get('search') || '').trim(),
      immatriculation: (searchParams.get('immatriculation') || '').trim(),
      dateFrom: (searchParams.get('dateFrom') || '').trim(),
      dateTo: (searchParams.get('dateTo') || '').trim(),
      hasInvoice: factureFilter === 'facture' ? 'with_invoice' : factureFilter === 'non_facture' ? 'without_invoice' : 'all',
    };

    const rows = listInversionsForExport(filters) as InversionRow[];
    const totalPneus = rows.reduce((sum, row) => sum + row.quantite, 0);

    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 40 });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    const pdfReady = new Promise<Buffer>((resolve, reject) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    const BLUE = '#b45309';
    doc.rect(0, 0, doc.page.width, 60).fill(BLUE);
    doc.fillColor('#ffffff').fontSize(20).text('Pneu Tracker — Export Inversions', 40, 18, { align: 'center' });
    doc.fontSize(10).text(`Export du ${new Date().toLocaleDateString('fr-FR')} · ${rows.length} inversion(s) · ${totalPneus} pneus`, 40, 42, { align: 'center' });

    const headers = ['Date', 'Immatriculation', 'Monté', 'Facturé', 'Qté', 'Facture'];
    const widths = [70, 110, 220, 220, 50, 90];
    const headerHeight = 24;
    const rowHeight = 20;
    const tableX = 40;
    let x = tableX;
    let y = 80;

    doc.rect(tableX, y, widths.reduce((a, b) => a + b, 0), headerHeight).fill(BLUE);
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(9);
    headers.forEach((header, index) => {
      doc.text(header, x + 4, y + 6, { width: widths[index] - 8, align: index >= 4 ? 'center' : 'left' });
      x += widths[index];
    });

    y += headerHeight;
    rows.forEach((row, index) => {
      if (y + rowHeight > doc.page.height - 50) {
        doc.addPage();
        y = 40 + headerHeight;
      }

      const bg = index % 2 === 0 ? '#fff7ed' : '#ffffff';
      const tableWidth = widths.reduce((a, b) => a + b, 0);
      doc.rect(tableX, y, tableWidth, rowHeight).fill(bg);
      doc.rect(tableX, y, tableWidth, rowHeight).strokeColor('#fed7aa').lineWidth(0.5).stroke();
      doc.fillColor('#333').font('Helvetica').fontSize(8);

      const cells = [
        row.date.split('-').reverse().join('/'),
        row.immatriculation,
        row.mounted_manufacturer_ref || '—',
        row.billed_manufacturer_ref || '—',
        String(row.quantite),
        row.facture_reference || '—',
      ];

      x = tableX;
      cells.forEach((cell, cellIndex) => {
        doc.text(cell, x + 4, y + 6, {
          width: widths[cellIndex] - 8,
          align: cellIndex >= 4 ? 'center' : 'left',
          lineBreak: false,
        });
        x += widths[cellIndex];
      });
      y += rowHeight;
    });

    doc.end();
    const pdfBuffer = await pdfReady;

    logAudit({ actor: getActor(request), action: 'export_pdf', entityType: 'inversion', details: { ...filters, rows: rows.length } });

    return new NextResponse(pdfBuffer as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="inversions-pneus.pdf"',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 });
  }
}
