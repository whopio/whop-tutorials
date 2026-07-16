// The demo's two products, with placeholder ids: run scripts/setup-demo.mjs
// against your sandbox company and paste the four ids it prints below. The
// trial product is a recurring plan with a free trial; the foil is a one-time
// product, which Whop cannot put a trial on (trials are recurring-only).
// `trialDays` mirrors the real plan's `trial_period_days` (3 for the trial,
// null for the foil), which is what step 1's trial-rule error keys off.
export interface DemoProduct {
  key: "trial" | "foil";
  name: string;
  tagline: string;
  priceLabel: string;
  bullets: string[];
  productId: string;
  planId: string;
  trialDays: number | null;
}

export const products: DemoProduct[] = [
  {
    key: "trial",
    name: "Northwind Pro",
    tagline: "The full Northwind toolkit, billed monthly.",
    priceLabel: "3 days free, then $10/month",
    bullets: [
      "Unlimited projects and exports",
      "Real-time collaboration",
      "Priority support",
    ],
    productId: "prod_REPLACE_WITH_TRIAL_PRODUCT",
    planId: "plan_REPLACE_WITH_TRIAL_PLAN",
    trialDays: 3,
  },
  {
    key: "foil",
    name: "Northwind Lifetime",
    tagline: "Pay once, keep it forever.",
    priceLabel: "$149 one-time",
    bullets: [
      "Everything in Pro",
      "One payment, no renewals",
      "Yours forever",
    ],
    productId: "prod_REPLACE_WITH_LIFETIME_PRODUCT",
    planId: "plan_REPLACE_WITH_LIFETIME_PLAN",
    trialDays: null,
  },
];

export const trialProduct: DemoProduct = products.find(
  (p) => p.key === "trial",
)!;

export const knownProductIds: string[] = products.map((p) => p.productId);

export function getProduct(key: DemoProduct["key"]): DemoProduct {
  const found = products.find((p) => p.key === key);
  if (!found) throw new Error(`unknown demo product: ${key}`);
  return found;
}
