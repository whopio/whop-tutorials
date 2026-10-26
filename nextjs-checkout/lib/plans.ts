export type PlanKey = "subscription" | "lifetime";

export interface PlanDefinition {
  planKey: PlanKey;
  name: string;
  price: number;
  priceSuffix: string;
  description: string;
  features: readonly string[];
  envVar:
    | "NEXT_PUBLIC_WHOP_SUBSCRIPTION_PLAN_ID"
    | "NEXT_PUBLIC_WHOP_LIFETIME_PLAN_ID";
}

export const PRO_FEATURES = [
  "Unlimited projects",
  "Advanced analytics",
  "Priority support",
  "Team access (up to 5 seats)",
] as const;

export const PLANS = {
  subscription: {
    planKey: "subscription",
    name: "Pro Monthly",
    price: 29,
    priceSuffix: "/mo",
    description: "Month-to-month billing. Cancel anytime.",
    features: PRO_FEATURES,
    envVar: "NEXT_PUBLIC_WHOP_SUBSCRIPTION_PLAN_ID",
  },
  lifetime: {
    planKey: "lifetime",
    name: "Pro Lifetime",
    price: 199,
    priceSuffix: "one-time",
    description: "Pay once. Keep Pro forever.",
    features: PRO_FEATURES,
    envVar: "NEXT_PUBLIC_WHOP_LIFETIME_PLAN_ID",
  },
} as const satisfies Record<PlanKey, PlanDefinition>;

export function planIdFor(key: PlanKey): string {
  const plan = PLANS[key];
  const value = process.env[plan.envVar];
  if (!value) {
    throw new Error(`Missing env var: ${plan.envVar}`);
  }
  return value;
}
