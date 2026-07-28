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
    body: "The button looks at your browser and picks the fastest way to pay. On this test sandbox it always picks Whop Pay because the wallet buttons only appear on live sites.",
  },
  {
    id: "dialog",
    title: "Buy through the popup",
    body: "Click the real button and pay with `4242 4242 4242 4242`. Checkout opens in a popup and this page never reloads.",
  },
  {
    id: "verifyStep",
    title: "Verify on the server",
    body: "The page only saw a success message. The server double-checks with Whop before treating the payment as real.",
  },
  {
    id: "redirect",
    title: "Leave the page and come back",
    body: "This copy of the button works the other way. After you pay, the browser leaves the page and comes back with the result in the address bar.",
  },
  {
    id: "breakStep",
    title: "Break it on purpose",
    body: "Two real failures. Leave out the required `returnUrl` and watch the button refuse, then pay with the decline card `4000 0000 0000 0002`.",
  },
  {
    id: "shapes",
    title: "Same product, two shapes",
    body: "Flip between the one-click button and the full checkout form for the same product. The captions say when to use which.",
  },
];
