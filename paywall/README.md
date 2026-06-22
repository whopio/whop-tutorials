# Pulse — a Whop paywall demo

Companion demo for the tutorial **"How to add a paywall to your app or website"**. A small premium-content app where every paid post sits behind a real Whop sandbox checkout: pick a tab, open the checkout, pay with the test card `4242 4242 4242 4242`, and watch the post unlock in place. An auto-running, step-by-step walkthrough on the left explains what each piece does.

## How the paywall works

The paywall is database-free and webhook-free. Entitlements live on Whop; the session cookie only stores identity.

1. An anonymous visitor opens a premium post. The server gate finds no session cookie and renders the locked preview with a call-to-action that opens the Whop checkout in a modal. The checkout's email field is the first time the app learns who the visitor is.
2. `WhopCheckoutEmbed`'s `onComplete(planId, receiptId)` fires after payment. The client POSTs the receipt id (a Whop payment id, `pay_...`) to `/api/unlock`.
3. The server retrieves the payment from Whop, confirms it paid for one of this app's products, and seals `{ whopUserId }` into an encrypted iron-session cookie.
4. The client refreshes. The gate calls `users.checkAccess(productId, { id: whopUserId })` per relevant product; any grant renders the content. Cancel the membership in the Whop dashboard and the page relocks on the next render — no webhook involved.

Two tiers, two entitlements: the Pro product (recurring plan) unlocks every premium post; a post with its own product (one-time plan) can be bought on its own.

## Key files

- `lib/paywall.ts` — the gate: per-product `checkAccess`, deduped per request with React `cache()`, and it fails closed if Whop is unreachable
- `app/api/unlock/route.ts` — receipt verification → session mint (the heart of the flow)
- `components/PaywallCard.tsx` — tier picker + embedded checkout (in a modal) + a verify/poll state machine
- `lib/session.ts` — iron-session cookie (`whop_session`), holds only `{ whopUserId, username, unlockedAt }`
- `constants/posts.ts` — the posts map (stands in for your database), including per-post product/plan ids
- `app/api/auth/login` + `callback` — minimal Whop OAuth (PKCE), used only to restore access on a new device
- `components/StepRail.tsx` + `StepAnchor.tsx` + `steps.ts` — the auto-running step-by-step walkthrough

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

You'll need a Whop sandbox company with the products and plans described in `.env.example` and `constants/posts.ts`. Create them in the [sandbox dashboard](https://sandbox.whop.com/dashboard). Sandbox test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines.

## What this demo deliberately leaves out

Webhooks, databases, checkout sessions, and stored payment records. If you need durable payment records or webhook-driven state, that's the companion checkout article's territory.
