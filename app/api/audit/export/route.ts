import { NextResponse } from 'next/server';
import { getActor, logAudit } from '@/lib/audit';
import { errorResponse } from '@/lib/validators';

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    logAudit({
      actor: getActor(request),
      action: 'export_csv',
      entityType: 'sortie',
      details: body,
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
