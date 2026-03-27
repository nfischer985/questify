/** @type {import('next').NextConfig} */
const nextConfig = {
  // Additional security headers applied at the CDN/static-asset level.
  // The middleware.ts covers page-level requests; these headers catch
  // static files that middleware may not match.
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options',    value: 'nosniff' },
          { key: 'X-Frame-Options',           value: 'DENY' },
          { key: 'Referrer-Policy',           value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',        value: 'camera=(), microphone=()' },
          // HSTS: enforce HTTPS for 2 years once visited
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
