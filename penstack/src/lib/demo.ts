/**
 * Demo mode helpers.
 *
 * NEXT_PUBLIC_DEMO_MODE is a client-readable env var. When set to "true":
 * - Subscribe buttons show a demo modal instead of redirecting to Whop checkout
 * - KYC steps show a demo bypass
 * - /api/demo/subscribe creates a mock subscription in the DB
 *
 * The seed script (prisma/seed.ts) populates demo data when run manually.
 */

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
