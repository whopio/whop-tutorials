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
    body: "Both of Whop's checkouts already have a promo field. Open one, type the code, and pay. The panel shows everything the embedded checkout tells your app afterwards, which is less than you might expect.",
  },
  {
    id: "link",
    title: "Put it in a link",
    body: "Marketing rarely asks people to type anything. Put the code in the link, for this page or for Whop's hosted checkout, and the buyer sees the lower price before they see the higher one.",
  },
  {
    id: "proof",
    title: "Trust the receipt",
    body: "The price on screen is decoration until the server confirms it. This panel compares the list price with what the payment actually charged.",
  },
  {
    id: "manage",
    title: "Turn it off",
    body: "Pause a code and the checkout turns it away with a reason. Resume and it works again. Archiving is the third option, and it is permanent.",
  },
];
