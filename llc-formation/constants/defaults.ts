import type { Application } from "@/lib/formation/schema";

// A complete application that Whop accepts as it stands, so the first thing a
// visitor sees is a passing request they can then break on purpose.
export const DEFAULT_APPLICATION: Application = {
  business_name: "Ridgemont Detailing",
  entity_type: "llc",
  entity_suffix: "LLC",
  formation_state: "WY",
  business_type: "brick_and_mortar",
  industry_group: "automotive",
  industry_type: "car_wash",
  business_website: "",
  business_phone: "",
  business_address: {
    line1: "4180 Burnet Rd",
    line2: "",
    city: "Austin",
    state: "TX",
    postal_code: "78756",
    country: "US",
  },
  use_registered_agent: true,
  expedite_ein: false,
  share_structure: { number_of_shares: 10000000, value: 0.00001 },
  founders: [
    {
      first_name: "Marcus",
      last_name: "Webb",
      email: "user@example.com",
      phone: "+12125550100",
      is_primary: true,
      date_of_birth: "1990-04-12",
      ssn: "",
      ownership_percentage: 100,
      roles: ["president", "secretary", "treasurer", "director"],
      address: {
        line1: "907 Ridgemont Dr",
        line2: "",
        city: "Austin",
        state: "TX",
        postal_code: "78704",
        country: "US",
      },
    },
  ],
};

// What the demo drops in when a visitor asks to see what Whop lets through.
// Every one of these was accepted by the sandbox on 2026-08-25.
export const SLOPPY_PATCH = {
  email: "not-an-email",
  phone: "555-0100",
  date_of_birth: "2024-01-01",
  postal_code: "ZZZZZ",
} as const;
