import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// In-memory sliding window rate limiter for prototype
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 120; // 120 requests per minute per client

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetInSec: number } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetInSec: Math.ceil(RATE_LIMIT_WINDOW_MS / 1000) };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetInSec: Math.ceil((record.resetAt - now) / 1000) };
  }

  record.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS_PER_WINDOW - record.count,
    resetInSec: Math.ceil((record.resetAt - now) / 1000),
  };
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only apply strict API guards to /api/* routes
  if (!pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const method = request.method.toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  // 1. Rate Limiting Check
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
             request.headers.get('x-real-ip') ||
             '127.0.0.1';
  const { allowed, remaining, resetInSec } = checkRateLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Too many requests. Please slow down and retry after the cooldown period.',
        },
      },
      {
        status: 429,
        headers: {
          'Retry-After': resetInSec.toString(),
          'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
          'X-RateLimit-Remaining': '0',
        },
      }
    );
  }

  // 2. Origin / CSRF Check on Mutations
  if (isMutation) {
    const origin = request.headers.get('origin');
    const host = request.headers.get('host');

    if (origin && host) {
      try {
        const originUrl = new URL(origin);
        const hostWithoutPort = host.split(':')[0];
        const originWithoutPort = originUrl.hostname;

        // Allow matching hostname, localhost, or 127.0.0.1
        const isLocal = ['localhost', '127.0.0.1'].includes(originWithoutPort) &&
                        ['localhost', '127.0.0.1'].includes(hostWithoutPort);
        const matches = originWithoutPort === hostWithoutPort || isLocal;

        if (!matches) {
          return NextResponse.json(
            {
              ok: false,
              error: {
                code: 'FORBIDDEN',
                message: 'Cross-site mutation request rejected (Origin mismatch).',
              },
            },
            { status: 403 }
          );
        }
      } catch {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: 'FORBIDDEN',
              message: 'Invalid Origin header format.',
            },
          },
          { status: 403 }
        );
      }
    }

    // 3. Content-Type Validation on JSON Mutations
    // Exclude multipart uploads (like document upload routes)
    const isUploadRoute = pathname.includes('/documents');
    const contentType = request.headers.get('content-type') || '';
    const contentLength = request.headers.get('content-length');

    if (!isUploadRoute && contentLength && contentLength !== '0') {
      if (!contentType.includes('application/json')) {
        return NextResponse.json(
          {
            ok: false,
            error: {
              code: 'BAD_REQUEST',
              message: 'Mutation payload must have Content-Type: application/json',
            },
          },
          { status: 415 }
        );
      }
    }
  }

  const response = NextResponse.next();
  response.headers.set('X-RateLimit-Limit', MAX_REQUESTS_PER_WINDOW.toString());
  response.headers.set('X-RateLimit-Remaining', remaining.toString());
  return response;
}

export const config = {
  matcher: ['/api/:path*'],
};

