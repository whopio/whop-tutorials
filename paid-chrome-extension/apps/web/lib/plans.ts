export const DEMO_PRODUCT = {
  name: "Whop Chrome Extension Starter",
  description:
    "A production-minded template for Chrome extension founders who want Whop login, checkout, billing, and premium access gating without building subscription plumbing from scratch."
};

export const FREE_FEATURES = [
  "whop_oauth_login",
  "checkout_link",
  "free_extension_shell"
];

export const PREMIUM_FEATURES = [
  ...FREE_FEATURES,
  "server_verified_access",
  "billing_portal",
  "premium_feature_unlock",
  "webhook_ready_backend"
];

export const FEATURE_MATRIX = [
  {
    tier: "Free",
    name: "Whop OAuth login",
    description:
      "The extension signs users in with Whop through Chrome identity and PKCE."
  },
  {
    tier: "Free",
    name: "Checkout handoff",
    description:
      "Send non-paying users to your Whop checkout from the popup or website."
  },
  {
    tier: "Premium",
    name: "Server-verified gated access",
    description:
      "The Next.js API checks the Whop resource ID before unlocking paid features."
  },
  {
    tier: "Premium",
    name: "Billing portal access",
    description:
      "Customers can open Whop billing management from the extension."
  }
];
