export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
}

// Six steps. Each id matches a data-annotation-id on the panel it highlights,
// which the StepRail scrolls into view and outlines.
export const WALKTHROUGH_STEPS: WalkthroughStep[] = [
  {
    id: "story",
    title: "Someone sold something",
    body: "A seller on our marketplace made a sale. They live in another country and we owe them the money.",
  },
  {
    id: "seller",
    title: "Give them an account",
    body: "We create an account for them that sits underneath ours. Pick a country and watch the id come back.",
  },
  {
    id: "verify",
    title: "They prove who they are",
    body: "Whop draws this part and collects it. Their passport never reaches us.",
  },
  {
    id: "method",
    title: "They pick how to get paid",
    body: "A bank wants one thing, a crypto wallet wants another. Whop knows which, so we never had to.",
  },
  {
    id: "pay",
    title: "We send the money",
    body: "One call. The fee changes with what they picked, and we decide who absorbs it.",
  },
  {
    id: "track",
    title: "We follow it there",
    body: "Whop tells us every time the payment moves, until it lands.",
  },
];
