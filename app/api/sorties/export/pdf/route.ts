import PDFDocument from 'pdfkit';
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { errorResponse } from '@/lib/validators';

function hasEnoughMeaningfulChars(term: string) {
  return term.replace(/\*/g, '').trim().length >= 2;
}

function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, '\\$&');
}

function toSearchPattern(term: string) {
  const normalized = term.trim().replace(/\*+/g, '*');
  if (normalized.includes('*')) {
    return escapeLike(normalized).replace(/\*/g, '%');
  }
  return `%${normalized}%`;
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

    if (factureFilter === 'facture') {
      conditions.push('facture_at IS NOT NULL');
    } else if (factureFilter === 'non_facture') {
      conditions.push('facture_at IS NULL');
    }

    if (search && (!search.includes('*') || hasEnoughMeaningfulChars(search))) {
      conditions.push("(immatriculation LIKE ? ESCAPE '\\' OR COALESCE(code_sap,'') LIKE ? ESCAPE '\\' OR COALESCE(manufacturer_ref,'') LIKE ? ESCAPE '\\' OR COALESCE(search_label,'') LIKE ? ESCAPE '\\' OR COALESCE(description,'') LIKE ? ESCAPE '\\')");
      const like = toSearchPattern(search);
      params.push(like, like, like, like, like);
    }

    if (immatriculation) {
      conditions.push('immatriculation = ?');
      params.push(immatriculation);
    }

    if (dateFrom) {
      conditions.push('date >= ?');
      params.push(dateFrom);
    }

    if (dateTo) {
      conditions.push('date <= ?');
      params.push(dateTo);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const sorties = db
      .prepare(`SELECT * FROM sorties ${where} ORDER BY date DESC, created_at DESC`)
      .all(...params) as Record<string, unknown>[];

    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));

    // Header
    doc.fontSize(18).fillColor('#144390').text('Pneu Tracker — Export Sorties', { align: 'center' });
    doc
      .fontSize(10)
      .fillColor('#666')
      .text(`Export du ${new Date().toLocaleDateString('fr-FR')} · ${sorties.length} sortie(s)`, { align: 'center' });
    doc.moveDown();

    // Separator
    doc.moveTo(40, doc.y).lineTo(555, doc.y).strokeColor('#144390').stroke();
    doc.moveDown(0.5);

    // Column layout
    const colX = [40, 110, 185, 265, 410, 490];
    const colW = [65, 70, 75, 140, 75, 65];
    const headers = ['Date', 'Immat.', 'Code SAP', 'Description', 'Qté', 'Facturé'];

    const drawHeaders = (y: number) => {
      doc.fontSize(8).fillColor('#144390').font('Helvetica-Bold');
      headers.forEach((h, i) => {
        doc.text(h, colX[i], y, { width: colW[i] });
      });
      const lineY = y + doc.currentLineHeight() + 2;
      doc.moveTo(40, lineY).lineTo(555, lineY).strokeColor('#ccc').lineWidth(0.5).stroke();
      return lineY + 4;
    };

    let y = drawHeaders(doc.y);

    for (const s of sorties) {
      // Page break check
      if (y > 750) {
        doc.addPage();
        y = 40;
        y = drawHeaders(y);
      }

      const row = [
        String(s.date || ''),
        String(s.immatriculation || ''),
        String(s.code_sap || ''),
        String(s.description || ''),
        String(s.quantite ?? ''),
        s.facture_at ? '✓' : '',
      ];

      doc.fontSize(7.5).fillColor('#333').font('Helvetica');
      let maxH = 0;
      for (let i = 0; i < row.length; i++) {
        const h = doc.heightOfString(row[i], { width: colW[i] });
        if (h > maxH) maxH = h;
      }

      for (let i = 0; i < row.length; i++) {
        doc.text(row[i], colX[i], y, { width: colW[i] });
      }
      y += maxH + 4;

      // Light row separator
      doc.moveTo(40, y - 1).lineTo(555, y - 1).strokeColor('#eee').lineWidth(0.3).stroke();
    }

    // Footer
    doc.moveDown(2);
    doc
      .fontSize(8)
      .fillColor('#999')
      .font('Helvetica-Oblique')
      .text('Document généré automatiquement par Pneu Tracker', { align: 'center' });

    const pdfEnd = new Promise<Buffer>((resolve) => {
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.end();
    });

    const buffer = await pdfEnd;

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sorties-pneus-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
