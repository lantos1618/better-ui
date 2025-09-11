import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Simple in-memory rate limiting (for demo purposes)
// In production, use Redis or similar
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '20'); // requests per minute (lower for demo)
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

export function middleware(request: NextRequest) {
  // Only apply to API routes
  if (!request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Get client identifier (IP or x-forwarded-for)
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const key = `${ip}:${request.nextUrl.pathname}`;
  
  const now = Date.now();
  const record = rateLimitMap.get(key);
  
  if (!record || record.resetTime < now) {
    // Create new record
    rateLimitMap.set(key, {
      count: 1,
      resetTime: now + RATE_WINDOW
    });
  } else {
    // Check rate limit
    if (record.count >= RATE_LIMIT) {
      return new NextResponse('Rate limit exceeded', {
        status: 429,
        headers: {
          'X-RateLimit-Limit': RATE_LIMIT.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': new Date(record.resetTime).toISOString(),
          'Retry-After': Math.ceil((record.resetTime - now) / 1000).toString()
        }
      });
    }
    
    // Increment counter
    record.count++;
  }
  
  const response = NextResponse.next();
  
  // Add rate limit headers
  const currentRecord = rateLimitMap.get(key)!;
  response.headers.set('X-RateLimit-Limit', RATE_LIMIT.toString());
  response.headers.set('X-RateLimit-Remaining', (RATE_LIMIT - currentRecord.count).toString());
  response.headers.set('X-RateLimit-Reset', new Date(currentRecord.resetTime).toISOString());
  
  // Add security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: '/api/:path*',
};