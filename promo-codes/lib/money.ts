// The checkout shows buyers their local currency, so a payment can come back in
// lira or euros even though the plan is priced in dollars. Receipt amounts are
// formatted with the payment's own currency code instead of assuming "$".
export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
    }).format(amount);
  } catch {
    // An unknown code still gets printed, just without the symbol.
    return `${amount.toFixed(2)} ${currency.toUpperCase()}`;
  }
}
