// The walkthrough content for the playground's left rail. Each step
// anchors a [data-annotation-id] element in the preview (or the rail
// itself) and explains what the paywall is doing at that moment.
export type PaywallMode = "subscription" | "one-time";

export interface WalkthroughStep {
  id: string;
  title: string;
  body: string;
}

export function lockedSteps(mode: PaywallMode): WalkthroughStep[] {
  return [
    {
      id: "free-teaser",
      title: "Free content skips the gate",
      body: "The teaser renders for every visitor. No cookie, no API call, no sign-in wall. A paywall only guards what is worth paying for.",
    },
    {
      id: "gate",
      title: "The gate already ran",
      body: "While rendering this page, the server asked Whop `users.checkAccess` and got `has_access: false`, so it rendered placeholder shapes instead of the post. The real text never left the server - it is not hidden with CSS, it simply is not in your browser.",
    },
    {
      id: "tabs",
      title: "Two ways to sell the same post",
      body: "Each Whop product is its own entitlement. The subscription product unlocks every premium post; a post with its own product can also be bought once, on its own. These tabs switch between the two models.",
    },
    {
      id: "unlock",
      title: "The checkout is the signup form",
      body:
        mode === "subscription"
          ? "Click the button to open Whop's checkout for the $10/month subscription. No account needed first: the email field in the checkout is the first time the app learns who you are. It runs on the sandbox, so pay with the test card `4242 4242 4242 4242` (any expiry, any CVC) and watch the page unlock in place. Curious about failure? `4000 0000 0000 0002` declines."
          : "Click the button to open Whop's checkout for the $5 one-time unlock. No account needed first: the email field in the checkout is the first time the app learns who you are. It runs on the sandbox, so pay with the test card `4242 4242 4242 4242` (any expiry, any CVC) and watch the page unlock in place. Curious about failure? `4000 0000 0000 0002` declines.",
    },
    {
      id: "restore",
      title: "Already paid once?",
      body: "Access lives on your Whop account, not in this browser. If you unlocked before and lost the cookie, signing in with Whop yields the same user id, and the same `checkAccess` call unlocks again.",
    },
  ];
}

export function unlockedSteps(mode: PaywallMode): WalkthroughStep[] {
  return [
    {
      id: "verify",
      title: "Whop told us who you are",
      body: "When payment settled, the embed handed the page a receipt id (`pay_...`). Our server traded it for an identity: it retrieved the payment from Whop, confirmed it paid for this content, and read the buyer's user id. No signup form ever appeared.",
    },
    {
      id: "session",
      title: "The session is just an id",
      body: "The encrypted httpOnly `whop_session` cookie stores the Whop user id and nothing else. There is no `isPro` flag to go stale - the cookie identifies, Whop authorizes.",
    },
    {
      id: "entitlement",
      title: "Entitlements stay on Whop",
      body:
        mode === "subscription"
          ? "The gate checks each product separately. Your subscription product grants this post (and every other premium post); a one-time purchase would grant only its own post."
          : "The gate checks each product separately. This post is granted either by its own one-time product or by the subscription product - whichever you own.",
    },
    {
      id: "access-check",
      title: "Checked live, on every render",
      body: "This timestamp is the moment `users.checkAccess` ran during this render - refresh and it changes. Cancel the membership in the Whop dashboard and the page relocks within seconds, no webhook needed.",
    },
    {
      id: "pro-content",
      title: "This HTML did not exist before",
      body: "The post body is server-rendered only after the gate says yes. Locked visitors never receive it, which is the difference between a paywall and a curtain.",
    },
    {
      id: "reset",
      title: "Replay it",
      body: "Reset clears only this demo's session cookie - Whop still remembers the purchase. Sign in with Whop to restore access, or run the checkout again with a new email to replay from scratch.",
    },
  ];
}
