export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
}

// The six-step tour. Each id matches a data-annotation-id on the panel it
// highlights; the StepRail scrolls it into view and outlines it.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "create",
    title: "Pick a discount",
    body: "Three real codes are waiting on Whop, seeded once by a script. Pick one and every panel below follows it. Open the disclosure to see the `promoCodes.create` call that made it.",
  },
  {
    id: "encoding",
    title: "Read it back carefully",
    body: "Whop hands percentages back in a different form than it takes them in. This panel puts the two numbers side by side, because trusting the wrong one is the bug this page exists to prevent.",
  },
  {
    id: "redeem",
    title: "Let someone use it",
    body: "Open the checkout and type the code into the promo row. The panel echoes what Whop reports back, which is your app's only signal that a discount was applied.",
  },
  {
    id: "link",
    title: "Put it in a link",
    body: "Marketing rarely asks people to type anything. Hand the checkout the code up front and the buyer sees the lower price before they see the higher one.",
  },
  {
    id: "proof",
    title: "Trust the receipt",
    body: "The price on screen is decoration until the server confirms it. This panel compares the list price with what the payment actually charged.",
  },
  {
    id: "manage",
    title: "Turn it off",
    body: "Pause a code and the checkout stops taking it. Resume and it works again. Archiving is the third option, and it is permanent.",
  },
];
