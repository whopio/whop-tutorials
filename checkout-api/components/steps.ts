export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
}

// Five steps. Each id matches a data-annotation-id on the panel it
// highlights, which the StepRail scrolls into view and outlines.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "catalogue",
    title: "What we are selling",
    body: "Two things, both made from the terminal with the Whop CLI. A product is the thing, a plan is the price on it. Nothing on this page was typed by hand.",
  },
  {
    id: "order",
    title: "Our own order number",
    body: "This number belongs to our app, not to Whop. Everything else here exists to get it out to the checkout and back again.",
  },
  {
    id: "session",
    title: "Tag a checkout with it",
    body: "We ask Whop for a checkout and attach our order number to it as `metadata`. That happens before the buyer sees anything.",
  },
  {
    id: "replay",
    title: "Ask twice, get one",
    body: "We send the exact same request again with the same `Idempotency-Key`. Whop hands back the checkout it already made instead of a second one.",
  },
  {
    id: "pay",
    title: "Pay without leaving",
    body: "The checkout is on this page, not on Whop's. Use `4242 4242 4242 4242` with any future date and any three digits.",
  },
  {
    id: "receipt",
    title: "The payment knows our number",
    body: "We ask Whop what that payment was. Our order number comes back on it, which is how a payment finds its way to the right sale.",
  },
];
