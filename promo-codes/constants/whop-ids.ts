// Placeholder ids. Run `npm run setup` against your own sandbox company
// and this file is rewritten with the ids it creates.
export const WHOP_IDS = {
  productId: "prod_XXXXXXXXX",
  planId: "plan_XXXXXXXXX",
  price: 40,
  purchaseUrl: "https://sandbox.whop.com/checkout/plan_XXXXXXXXX",
  // The codes this demo offers. Visitors pick from these; nothing here
  // creates or destroys a promo code at runtime.
  promoCodes: [
    { id: "promo_XXXXXXXX1", code: "save25", note: "A quarter off, the everyday case." },
    { id: "promo_XXXXXXXX2", code: "halfoff", note: "A big percentage, so the math is obvious on the receipt." },
    { id: "promo_XXXXXXXX3", code: "fifteenoff", note: "A flat amount, which survives the round trip unchanged." },
  ],
} as const;
