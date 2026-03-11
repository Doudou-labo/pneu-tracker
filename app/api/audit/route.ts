import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { errorResponse } from '@/lib/validators';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(Math.max(Number(searchParams.get('limit') || 20), 1), 100);
    const items = db.prepare(`
      SELECT * FROM audit_log
      ORDER BY id DESC
      LIMIT ?
    `).all(limit);

    return NextResponse.json({ items });
  } catch (error) {
    return errorResponse(error);
  }
}
