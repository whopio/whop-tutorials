export const APP_NAME = "Cuppa";

// Default coffee unit price and quick presets (in coffees).
export const COFFEE_UNIT_CENTS = 500;
export const COFFEE_PRESETS = [1, 3, 5] as const;

// Membership/shop guardrails.
export const MIN_TIP_CENTS = 100;
export const MAX_TIP_CENTS = 100_000;

export type CheckoutKind = "tip" | "membership" | "shop";

export const PAGE_SIZE = 10;

// Onboarding step 2 ("How are you planning to earn?"). UI only: every creator
// gets all of these, so we collect the answer for the flow but don't store it.
export const EARN_GOALS = [
  "Tips & donations",
  "Monthly memberships",
  "Digital products",
  "Physical products",
  "Commissions",
] as const;

// Onboarding step 4 ("Choose your interests"). Persisted to Creator.tags.
export const CREATOR_CATEGORIES = [
  "Art & Illustration",
  "Music",
  "Writing",
  "Podcasts",
  "Video & Film",
  "Photography",
  "Gaming",
  "Education",
  "Technology",
  "Crafts & DIY",
  "Comics & Animation",
  "Cooking",
  "Fitness & Health",
  "Cosplay",
  "Charity & Causes",
] as const;
