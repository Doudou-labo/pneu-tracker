import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function unauthorized() {
  return new NextResponse('Authentification requise', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="pneu-tracker"' },
  });
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

export function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const allowedOrigin = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) {
      const origin = request.headers.get('origin');
      if (!origin || origin !== allowedOrigin) {
        return NextResponse.json({ code: 'FORBIDDEN_ORIGIN', message: 'Origine non autorisée' }, { status: 403 });
      }
    }

    const user = process.env.APP_BASIC_AUTH_USER;
    const pass = process.env.APP_BASIC_AUTH_PASS;

    if (user && pass) {
      const header = request.headers.get('authorization');
      if (!header?.startsWith('Basic ')) return unauthorized();

      const decoded = Buffer.from(header.slice(6), 'base64').toString('utf8');
      const index = decoded.indexOf(':');
      const incomingUser = index >= 0 ? decoded.slice(0, index) : '';
      const incomingPass = index >= 0 ? decoded.slice(index + 1) : '';

      if (!constantTimeEqual(incomingUser, user) || !constantTimeEqual(incomingPass, pass)) {
        return unauthorized();
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
