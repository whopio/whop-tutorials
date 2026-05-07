/**
 * Base URL for the app (redirects, links). Use in API routes and server code.
 * Order:
 *   1. NEXT_PUBLIC_APP_URL (set this to your canonical production URL on Vercel)
 *   2. VERCEL_URL (Vercel preview/production deployment URL)
 *   3. http://localhost:3000 for local development
 *
 * Set NEXT_PUBLIC_APP_URL on production environments so redirects do not hit
 * preview URLs that may require login.
 */
export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit;
  const vercel = process.env.VERCEL_URL?.trim();
  if (vercel) return `https://${vercel}`;
  return 'http://localhost:3000';
}
