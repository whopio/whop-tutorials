export type RawSpeed = {
  fee: number;
  total_received: number;
  estimated_arrival: string;
};

export type RawQuote = {
  destination_currency: string;
  amount: number;
  currency: string;
  exchange_rate: number;
  min_limit: number | null;
  max_limit: number | null;
  standard: RawSpeed | null;
  instant: RawSpeed | null;
};

// One supported payout method as Whop lists it. The name can come back null,
// and quotes is null whenever no amount was asked for.
export type RawDestination = {
  id: string;
  name: string | null;
  delivery_type: string;
  supports_instant_delivery: boolean;
  quotes: RawQuote[] | null;
  icon_url?: string | null;
};

export type RailKind = "bank" | "crypto" | "other";

export type FormattedRail = {
  id: string;
  name: string;
  kind: RailKind;
  fee: number | null;
  received: number | null;
  arrivesOn: string | null;
  currency: string | null;
  available: boolean;
  unavailableReason: string | null;
};

function kindOf(deliveryType: string): RailKind {
  if (deliveryType === "bank_deposit") return "bank";
  if (deliveryType === "cryptocurrency") return "crypto";
  return "other";
}

// Turns one payout destination into the row the table renders. A missing
// standard speed means this rail cannot take this amount right now, which is a
// state to show rather than an error to throw. Every destination observed live
// came back with instant null, so treating a null speed as a failure would
// blank the whole grid.
export function formatRail(destination: RawDestination): FormattedRail {
  const quote = destination.quotes?.[0] ?? null;
  const speed = quote?.standard ?? null;
  const kind = kindOf(destination.delivery_type);
  const name = destination.name ?? "Unnamed payout method";

  if (!quote || !speed) {
    return {
      id: destination.id,
      name,
      kind,
      fee: null,
      received: null,
      arrivesOn: null,
      currency: quote?.destination_currency ?? null,
      available: false,
      unavailableReason: "Not available for this amount",
    };
  }

  return {
    id: destination.id,
    name,
    kind,
    fee: speed.fee,
    received: speed.total_received,
    arrivesOn: speed.estimated_arrival,
    currency: quote.destination_currency,
    available: true,
    unavailableReason: null,
  };
}

const KIND_ORDER: Record<RailKind, number> = { bank: 0, crypto: 1, other: 2 };

// Usable rails first, banks before crypto, then alphabetical. Anything that
// cannot take the amount sinks to the bottom.
export function compareRails(
  a: Pick<FormattedRail, "kind" | "name" | "available">,
  b: Pick<FormattedRail, "kind" | "name" | "available">,
): number {
  if (a.available !== b.available) return a.available ? -1 : 1;
  if (a.kind !== b.kind) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
  return a.name.localeCompare(b.name);
}

export function formatMoney(value: number, currency: string | null): string {
  const digits = currency === "btc" ? 8 : 2;
  const amount = value.toFixed(digits).replace(/\.?0+$/, (match) =>
    match.includes(".") && digits === 8 ? "" : match,
  );
  return currency ? `${amount} ${currency.toUpperCase()}` : amount;
}

export function formatArrival(iso: string | null): string {
  if (!iso) return "Unknown";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
