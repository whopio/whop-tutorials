export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
}

// The six-step tour. Each id matches a data-annotation-id on the panel it
// highlights; the StepRail scrolls it into view and outlines it.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "environment",
    title: "Meet the sandbox",
    body: "The sandbox is a practice copy of Whop with fake money. This badge shows exactly what this page is wired to, down to the `baseURL` every call goes through.",
  },
  {
    id: "product",
    title: "The product under test",
    body: "The demo product exists to be bought, declined, and refunded. One script, `npm run setup`, created it, and this panel shows what Whop knows about it live.",
  },
  {
    id: "pay",
    title: "Pay with a test card",
    body: "Buy the product with `4242 4242 4242 4242`. The checkout is real, the money is not, and we ask Whop to confirm the payment before trusting it.",
  },
  {
    id: "break",
    title: "Break it on purpose",
    body: "Real payments fail all the time, so practice that here. One card always gets declined, another asks you to pass a bank security check first.",
  },
  {
    id: "refund",
    title: "Refund it",
    body: "One click gives the fake money back. The buyer keeps their access though, taking that away is a separate decision.",
  },
  {
    id: "webhooks",
    title: "Watch the webhooks",
    body: "Whop also reports every payment and refund to your server the moment it happens. This feed shows those reports arriving live.",
  },
];
