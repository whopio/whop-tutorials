/** Platform fee percent (read from the public env var so this stays client-safe). */
function platformFeePercent(): number {
  const n = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

/** Our platform application fee, in cents, taken from a gross payment amount. */
export function applicationFeeCents(amountCents: number): number {
  const pct = platformFeePercent();
  const fee = Math.round((amountCents * pct) / 100);
  // Application fee must be positive and strictly less than the total.
  if (amountCents <= 0) return 0;
  return Math.min(Math.max(fee, 1), amountCents - 1);
}

/** Whop checkout amounts are expressed in dollars, not cents. */
export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
