/**
 * Next.js Edge Middleware — runs before every matched request.
 *
 * Responsibilities:
 *  1. IP-based rate limiting (graceful 429 with Retry-After header)
 *  2. Strict security headers on every response (OWASP recommended set)
 *
 * Rate-limit state is kept in-memory per Edge function instance.
 * For a multi-region or serverless deployment, replace the Map with
 * an edge-compatible store (e.g. Upstash Redis via @upstash/ratelimit).
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ── IP Rate Limiting ─────────────────────────────────────────────────────────
const WINDOW_MS    = 60_000; // 1 minute sliding window
const MAX_PER_MIN  = 200;    // generous limit — real users won't hit this

const ipWindows = new Map<string, number[]>();

function isRateLimited(ip: string): boolean {
  const now        = Date.now();
  const timestamps = (ipWindows.get(ip) ?? []).filter(t => now - t < WINDOW_MS);

  if (timestamps.length >= MAX_PER_MIN) {
    // Don't record the blocked attempt (avoids poisoning the window)
    ipWindows.set(ip, timestamps);
    return true;
  }

  timestamps.push(now);
  ipWindows.set(ip, timestamps);
  return false;
}

// Prune stale IP entries every ~5 minutes to prevent unbounded memory growth
let lastPrune = Date.now();
function maybePruneMap() {
  const now = Date.now();
  if (now - lastPrune < 300_000) return;
  lastPrune = now;
  ipWindows.forEach((ts, ip) => {
    const fresh = ts.filter((t: number) => now - t < WINDOW_MS);
    if (fresh.length === 0) ipWindows.delete(ip);
    else ipWindows.set(ip, fresh);
  });
}

// ── Security Headers ─────────────────────────────────────────────────────────
// Derived from OWASP Secure Headers Project recommendations.
const SECURITY_HEADERS: Record<string, string> = {
  // Prevent MIME-type sniffing attacks
  'X-Content-Type-Options': 'nosniff',

  // Deny framing entirely (clickjacking prevention)
  'X-Frame-Options': 'DENY',

  // Legacy XSS filter (belt-and-suspenders for older browsers)
  'X-XSS-Protection': '1; mode=block',

  // Limit referrer information leakage
  'Referrer-Policy': 'strict-origin-when-cross-origin',

  // Restrict browser features not used by this app
  'Permissions-Policy': 'camera=(), microphone=()',

  // Force HTTPS for 2 years once the site is visited over HTTPS
  'Strict-Transport-Security': 'max-age=63072000; includeSubDomains; preload',

  // Content-Security-Policy:
  //  - unsafe-inline / unsafe-eval required for Next.js hydration & Firebase SDK
  //  - gstatic / googleapis / google needed for reCAPTCHA v3 and Google OAuth
  //  - 'https:' in connect-src covers Firebase Firestore, OSRM, and Overpass APIs
  //  - frame-src allows the Google OAuth popup
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://apis.google.com https://www.google.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "connect-src 'self' https: wss:",
    `frame-src https://${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? ''} https://www.google.com`,
    "worker-src blob: 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; '),
};

// ── Middleware ───────────────────────────────────────────────────────────────
export function middleware(request: NextRequest) {
  maybePruneMap();

  // Best-effort IP extraction (works behind common reverse proxies)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0].trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    // Graceful 429 with Retry-After so clients back off automatically
    return new NextResponse('Too Many Requests', {
      status: 429,
      headers: {
        'Content-Type': 'text/plain',
        'Retry-After':  '60',
      },
    });
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}

// Apply to all routes except Next.js internals and static files
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|icon\\.svg).*)'],
};
