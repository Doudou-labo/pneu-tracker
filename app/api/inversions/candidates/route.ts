import { NextResponse } from 'next/server';
import { listInversionCandidates } from '@/lib/inversions';
import { errorResponse } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const items = listInversionCandidates({
      search: (searchParams.get('search') || '').trim(),
      limit: Number(searchParams.get('limit') || 20),
    });

    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}
