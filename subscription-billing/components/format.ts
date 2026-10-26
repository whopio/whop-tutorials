const usdFormat = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

export function usd(amount: number | string): string {
  return usdFormat.format(Number(amount));
}

export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
