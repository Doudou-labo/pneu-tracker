import { NextResponse } from 'next/server';
import { getActor, logAudit } from '@/lib/audit';
import { buildCsv } from '@/lib/csv';
import { listInversionsForExport, type InversionFilters } from '@/lib/inversions';
import { errorResponse } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const factureFilter = (searchParams.get('facture') || searchParams.get('hasInvoice') || 'all').trim();
    const filters: InversionFilters = {
      search: (searchParams.get('search') || '').trim(),
      immatriculation: (searchParams.get('immatriculation') || '').trim(),
      dateFrom: (searchParams.get('dateFrom') || '').trim(),
      dateTo: (searchParams.get('dateTo') || '').trim(),
      hasInvoice: factureFilter === 'facture' ? 'with_invoice' : factureFilter === 'non_facture' ? 'without_invoice' : 'all' as const,
    };

    const items = listInversionsForExport(filters);
    const csv = buildCsv([
      ['Date', 'Immatriculation', 'Quantité', 'SAP monté', 'Réf montée', 'Libellé monté', 'SAP facturé', 'Réf facturée', 'Libellé facturé', 'Description facturée', 'Facture'],
      ...items.map((item: any) => [
        item.date,
        item.immatriculation,
        item.quantite,
        item.mounted_code_sap || '',
        item.mounted_manufacturer_ref || '',
        item.mounted_search_label || '',
        item.billed_code_sap || '',
        item.billed_manufacturer_ref || '',
        item.billed_search_label || '',
        item.billed_description || '',
        item.facture_reference || '',
      ]),
    ]);

    logAudit({ actor: getActor(request), action: 'export_csv', entityType: 'inversion', details: { ...filters, rows: items.length } });

    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inversions-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
