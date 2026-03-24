import { NextResponse } from 'next/server';
import { getActor, logAudit } from '@/lib/audit';
import { createInversionRecord, listInversions } from '@/lib/inversions';
import { errorResponse, validateInversionInput } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const factureFilter = (searchParams.get('facture') || 'all').trim();

    const data = listInversions({
      search: (searchParams.get('search') || '').trim(),
      immatriculation: (searchParams.get('immatriculation') || '').trim(),
      dateFrom: (searchParams.get('dateFrom') || '').trim(),
      dateTo: (searchParams.get('dateTo') || '').trim(),
      limit: Number(searchParams.get('limit') || 20),
      offset: Number(searchParams.get('offset') || 0),
      hasInvoice: factureFilter === 'facture' ? 'with_invoice' : factureFilter === 'non_facture' ? 'without_invoice' : 'all',
    });

    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const input = validateInversionInput(await request.json());
    const result = createInversionRecord(input);

    if ('error' in result) {
      const failure = result.error;
      return NextResponse.json({ code: failure?.code || 'INVERSION_ERROR', message: failure?.message || 'Erreur inversion' }, { status: failure?.status || 500 });
    }

    logAudit({
      actor: getActor(request),
      action: 'create',
      entityType: 'inversion',
      entityId: Number((result.created as { id: number }).id),
      details: {
        sortie_id: input.sortie_id,
        immatriculation: input.immatriculation,
        quantite: input.quantite,
        facture_reference: input.facture_reference,
      },
    });

    return NextResponse.json(result.created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
