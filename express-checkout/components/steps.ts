export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
}

// The six-step tour. Each id matches a data-annotation-id on the panel it
// highlights; the StepRail scrolls it into view and outlines it.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "mount",
    title: "Add the button, watch it decide",
    body: "The button checks which wallets this browser can pay with. This demo's domain has no Apple Pay set up, so the wallet row stays empty here.",
  },
  {
    id: "dialog",
    title: "Pay with card",
    body: "Open the card form and pay with `4242 4242 4242 4242`. The server checks the payment with Whop before the receipt shows up.",
  },
  {
    id: "verifyStep",
    title: "Verify on the server",
    body: "The page only heard that a payment went through. The server asks Whop directly before treating it as real.",
  },
  {
    id: "redirect",
    title: "Come back from Whop",
    body: "When a payment finishes, Whop can send the buyer back with the result in the address bar. The buttons here open this page at that same address.",
  },
  {
    id: "breakStep",
    title: "Break it on purpose",
    body: "Two real failures. Give the button a plan that doesn't exist, then pay with the decline card `4000 0000 0000 0002`.",
  },
  {
    id: "shapes",
    title: "Same product, two shapes",
    body: "Flip between the wallet buttons and the full checkout form for the same product. The captions say when to use which.",
  },
];
