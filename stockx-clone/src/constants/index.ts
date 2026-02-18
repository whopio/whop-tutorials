export const PLATFORM_FEE_PERCENT = 9.5;

export const MIN_BID_PRICE = 1;

export const MAX_BID_PRICE = 100_000;

export const BID_EXPIRY_DAYS = 30;

export const CATEGORIES = [
  "Sneakers",
  "Streetwear",
  "Electronics",
  "Collectibles",
  "Accessories",
  "Trading Cards",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const ORDER_STATUSES: Record<string, string> = {
  MATCHED: "Matched",
  PAYMENT_PENDING: "Payment Pending",
  PAID: "Paid",
  SHIPPED: "Shipped",
  AUTHENTICATING: "Authenticating",
  VERIFIED: "Verified",
  DELIVERED: "Delivered",
  FAILED: "Authentication Failed",
  REFUNDED: "Refunded",
};

export const ITEMS_PER_PAGE = 24;

export const CATEGORY_PRIORITY: Record<string, number> = {
  Sneakers: 0,
  Streetwear: 1,
};
