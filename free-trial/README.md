# Northwind - a Whop free trial demo

Companion demo for the article **"How to add free trials to your app or website"**. A small SaaS-style app where the Pro workspace sits behind a real Whop sandbox checkout with a 3-day free trial: start the trial with the test card `4242 4242 4242 4242`, watch the page unlock in place with a live countdown to the first charge, then extend the trial by three days or end it early and watch the gate relock.

## How the trial works

The flow is database-free and webhook-free. Entitlements live on Whop; the session cookie only stores identity.

1. A visitor opens the gated page. The server gate finds no session cookie and renders the pitch with the checkout embedded inline. The checkout collects the card but charges nothing today; Whop starts a membership in the `trialing` state whose `renewal_period_end` is the first-charge date.
2. `WhopCheckoutEmbed`'s `onComplete(planId, receiptId)` fires. The client POSTs the receipt id (`pay_...`) to `/api/unlock`.
3. The server retrieves the payment from Whop, confirms it paid for one of this app's products and is not refunded, and seals `{ whopUserId, membershipId }` into an encrypted iron-session cookie. A $0 trial checkout produces a normal `paid` receipt, so the purchase guard verifies trials unchanged.
4. The gate calls `users.checkAccess(productId, { id: whopUserId })` on every render; `trialing` grants access like `active` does. Extending the trial is `memberships.addFreeDays`, ending it early is `memberships.cancel` with `cancellation_mode: "immediate"`, and conversion day needs no code at all.

Two products teach the trial rule: Northwind Pro (recurring, carries the trial) and Northwind Lifetime (one-time, which Whop cannot put a trial on).

## Key files

- `lib/paywall.ts` - the gate: per-product `checkAccess`, deduped per request with React `cache()`
- `app/api/unlock/route.ts` - receipt verification -> session mint (the heart of the flow)
- `app/api/extend-trial/route.ts` - `addFreeDays`: pushes the first charge back three days
- `app/api/end-trial/route.ts` - `cancellation_mode: "immediate"`: revokes access on the spot
- `components/TrialCheckoutModal.tsx` + `Countdown.tsx` - the demo checkout and the live first-charge countdown
- `constants/products.ts` - the two demo products (placeholder ids; `scripts/setup-demo.mjs` prints yours)
- `app/premium/page.tsx` + `components/TrialCheckoutCard.tsx` - the article's minimal versions of the gated page and checkout card
- `app/api/auth/login` + `callback` - minimal Whop OAuth (PKCE), used only to restore access on a new device
- `scripts/setup-demo.mjs` - provisions the two demo products; `scripts/setup.mjs` is the article's single-product version

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your key + company id
node --env-file=.env.local scripts/setup-demo.mjs
# paste the printed ids into constants/products.ts and .env.local
npm run dev
```

You'll need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)). Sandbox test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines. A user gets a plan's free trial once, so re-testing the flow takes a fresh checkout email.

## What this demo deliberately leaves out

Webhooks, databases, and stored payment records. Conversion day is Whop's job (the card is charged and `trialing` flips to `active` with no code here), and the one webhook a real app eventually adds is `membership.trial_ending_soon` for the "your trial ends tomorrow" email. If you need durable payment records or webhook-driven state, that's the companion checkout article's territory.
