# Pulse, a Whop paywall demo

Companion demo for the tutorial **"How to add a paywall to your app or website"**. A small premium-content app where every paid post sits behind a real Whop sandbox checkout: pick a tab, open the checkout, pay with the test card `4242 4242 4242 4242`, and watch the post unlock in place. An auto-running, step-by-step walkthrough on the left explains what each piece does.

Runs on `@whop/sdk` 2.4.0 and `@whop/checkout` 0.7.0, the versions the tutorial installs.

## How the paywall works

The paywall is database-free and webhook-free. Entitlements live on Whop, and the session cookie only stores identity.

1. An anonymous visitor opens a premium post. The server gate finds no session cookie and renders the locked preview with a call-to-action that opens the Whop checkout in a modal. The checkout's email field is the first time the app learns who the visitor is.
2. `WhopCheckoutEmbed`'s `onComplete(planId, receiptId)` fires after payment. The client POSTs the receipt id (a Whop payment id, `pay_...`) to `/api/unlock`.
3. The server retrieves the payment with `payments.retrieve({ id })`, confirms its `product_id` is one of this app's products and that it is paid and not refunded, then seals `{ whopUserId }` into an encrypted iron-session cookie.
4. The client refreshes. The gate calls `users.checkAccess({ id: whopUserId, resource_id: productId })` per relevant product, and any grant renders the content. Cancel the membership in the Whop dashboard and the page relocks on the next render, with no webhook involved.

Two tiers, two entitlements: the Pro product (recurring plan) unlocks every premium post, and a post with its own product (one-time plan) can be bought on its own.

## Key files

- `lib/whop.ts`: the `WhopClient`, pointed at `WhopEnvironment.Sandbox` while `WHOP_SANDBOX=true`
- `lib/paywall.ts`: the gate. Per-product `checkAccess`, deduped per request with React `cache()`, and it fails closed if Whop is unreachable
- `app/api/unlock/route.ts`: receipt verification to session mint (the heart of the flow)
- `components/PaywallCard.tsx`: tier picker, embedded checkout in a modal, and a verify and poll state machine that treats only a `200` as unlocked
- `lib/session.ts`: iron-session cookie (`whop_session`), holds only `{ whopUserId, username, unlockedAt }`
- `constants/posts.ts`: the posts map (stands in for your database), including per-post product and plan ids
- `app/api/auth/login` + `callback`: minimal Whop OAuth (PKCE), used only to restore access on a new device
- `components/StepRail.tsx` + `StepAnchor.tsx` + `steps.ts`: the auto-running step-by-step walkthrough

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

You'll need a Whop sandbox company with the products and plans described in `.env.example` and `constants/posts.ts`. Create them in the [sandbox dashboard](https://sandbox.whop.com/), or run `node scripts/setup-sandbox.mjs` to create the one-time product and plan for the teardown post. Sandbox test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines.

## What this demo deliberately leaves out

Webhooks, databases, checkout sessions, and stored payment records. If you need durable payment records or webhook-driven state, that's the companion checkout article's territory.
