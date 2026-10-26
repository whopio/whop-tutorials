export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
}

// The six-step tour. Each id matches a data-annotation-id on the panel it highlights.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "account",
    title: "Sign in",
    body: "You built this app, and now you try it as a subscriber. Signing in with Whop gives the app your Whop user id, which is all it needs to find your subscription later.",
  },
  {
    id: "subscribe",
    title: "Subscribe to Pro",
    body: "The Pro plan was made once on Whop. The checkout only names that plan and your email, so the price can't be changed in the browser. Pay with `4242 4242 4242 4242`.",
  },
  {
    id: "access",
    title: "Get into the Pro area",
    body: "The app reads your membership from Whop on every visit and opens the Pro area while it's active. There's no database to keep in sync.",
  },
  {
    id: "manage",
    title: "Manage your subscription",
    body: "Cancel at the end of the period, change your mind, or pause it. A pause stops the next charge, and you keep the Pro area until the month you paid for ends.",
  },
  {
    id: "receipt",
    title: "See what you keep",
    body: "Switch back to being the app's owner. Each charge lists Whop's fees, and what's left is yours.",
  },
  {
    id: "renewals",
    title: "Let Whop renew it",
    body: "Whop charges every month, retries a failed card, and emails the receipt. Each renewal shows up here, and a webhook can react to it.",
  },
];
