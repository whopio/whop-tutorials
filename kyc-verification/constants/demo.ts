// Countries the pre-fill form offers. The United States sits alongside places
// where the rule does not apply, which is what makes the tax number condition
// visible rather than theoretical.
export const VERIFY_COUNTRIES = [
  { code: "us", label: "United States" },
  { code: "br", label: "Brazil" },
  { code: "de", label: "Germany" },
  { code: "tr", label: "Turkey" },
  { code: "ng", label: "Nigeria" },
  { code: "ph", label: "Philippines" },
] as const;

export const DEFAULT_COUNTRY = "br";

export type VerifyCountry = (typeof VERIFY_COUNTRIES)[number]["code"];

// No two accounts under one platform may share a title, and every visitor
// starts from the same form, so the demo picks a name at random on each load.
export const PERSON_NAMES = [
  { first: "Ada", last: "Lovelace" },
  { first: "Grace", last: "Hopper" },
  { first: "Alan", last: "Turing" },
  { first: "Katherine", last: "Johnson" },
  { first: "Claude", last: "Shannon" },
  { first: "Barbara", last: "Liskov" },
  { first: "Edsger", last: "Dijkstra" },
  { first: "Radia", last: "Perlman" },
  { first: "Ken", last: "Thompson" },
  { first: "Margaret", last: "Hamilton" },
] as const;

export function randomPerson(): { first: string; last: string } {
  return PERSON_NAMES[Math.floor(Math.random() * PERSON_NAMES.length)];
}

// The scopes the embedded element's session runs on. Minting a token without
// them succeeds and hands back a token whose action list is empty, which then
// fails inside the component with nothing useful to read.
export const VERIFY_SESSION_SCOPES = [
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
