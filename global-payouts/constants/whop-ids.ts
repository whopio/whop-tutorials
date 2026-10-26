// Countries the demo offers when creating a seller. Deliberately spread across
// continents so the point lands: the list of ways to get paid comes back
// different for each one, and we never wrote a line of that logic.
export const SELLER_COUNTRIES = [
  { code: "us", label: "United States" },
  { code: "br", label: "Brazil" },
  { code: "ng", label: "Nigeria" },
  { code: "ph", label: "Philippines" },
  { code: "de", label: "Germany" },
  { code: "tr", label: "Turkey" },
] as const;

export const DEFAULT_SELLER_COUNTRY = "us";

export type SellerCountry = (typeof SELLER_COUNTRIES)[number]["code"];

// No two accounts under one platform may share a name, and every visitor gets
// the same default, so the demo picks one at random on each load.
export const SELLER_NAMES = [
  "Marta's Ceramics",
  "Northwind Prints",
  "Cedar & Co",
  "Bluefin Studio",
  "Rosewood Bakery",
  "Atlas Leather",
  "Harbour Coffee",
  "Wildflower Supply",
  "Copperline Tools",
  "Saltmarsh Candles",
] as const;

export function randomSellerName(): string {
  return SELLER_NAMES[Math.floor(Math.random() * SELLER_NAMES.length)];
}

// The scopes a payouts session needs. Minting a token without them succeeds and
// hands back a token whose action list is empty, which then fails inside the
// embedded component with nothing useful to read.
export const PAYOUT_SESSION_SCOPES = [
  "company:balance:read",
  "payout:account:read",
  "payout:account:update",
  "payout:withdraw_funds",
  "payout:withdrawal:read",
  "payout:transfer:read",
  "payout:transfer:export",
  "payout:destination:read",
  "payout:create_destination",
  "payout:update_destination",
  "payout:delete_destination",
] as const;

// What the demo moves. Small on purpose, the sandbox minimum withdrawal is 10.
export const DEMO_SALE_AMOUNT = 40;
export const DEMO_PAYOUT_AMOUNT = 25;
