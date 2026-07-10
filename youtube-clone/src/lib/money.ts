/** Our platform's cut on every viewer-funded charge (memberships + tips). */
export const PLATFORM_FEE_RATE = 0.1; // 10%

/** Application fee in cents — always > 0 and < the total (Whop requires this). */
export function platformFeeCents(amountCents: number): number {
  const fee = Math.round(amountCents * PLATFORM_FEE_RATE);
  return Math.min(Math.max(fee, 1), amountCents - 1);
}

/** Cents → a dollar number for the Whop SDK (which takes dollars, not cents). */
export function toDollars(cents: number): number {
  return Math.round(cents) / 100;
}

/** TIPS-4: preset Cheers amounts (cents). */
export const TIP_PRESETS_CENTS = [200, 500, 1000, 5000] as const;
