// The formation_state enum from the endpoint: fifty states plus DC. Kept in the
// endpoint's own order-independent alphabetical form so a missing entry is easy
// to spot against the docs.
export const FORMATION_STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL",
  "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME",
  "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH",
  "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI",
  "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY",
] as const;

export const LLC_SUFFIXES = [
  "LLC",
  "L.L.C",
  "L.L.C.",
  "Limited Liability Company",
] as const;

export const CORP_SUFFIXES = [
  "Inc.",
  "Inc",
  "Incorporated",
  "Corp.",
  "Corporation",
  "C Corp",
  "C Corporation",
  "CCorp",
  "Company",
] as const;

export const OFFICER_ROLES = [
  "president",
  "secretary",
  "treasurer",
  "director",
] as const;

export type OfficerRole = (typeof OFFICER_ROLES)[number];
