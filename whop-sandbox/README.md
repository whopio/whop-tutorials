# Whop sandbox breakdown

Companion demo for the article **"How to use the Whop sandbox"**. A six-step walkthrough of the sandbox itself: see which hosts the page is wired to, look at the product under test, buy it with a test card, break the payment on purpose with the decline and 3D Secure cards, refund it and watch what a refund does and does not change, then see the webhooks land in a live feed.

Every step runs against the real Whop sandbox with test cards. No real money moves.

Live demo: https://nextjs-whop-sandbox-demo.vercel.app

## How the flow works

Two pieces of state. An encrypted session cookie holds the receipt id the walkthrough is working on, and a single Neon table holds webhook deliveries so step 6 can render a feed, because deliveries cannot be read back from the API afterwards.

1. The page server-renders the environment panel from the same env the SDK client uses, so the hosts and company id on screen cannot drift from what the code is actually calling.
2. `plans.retrieve` fetches the product live on every load. On sandbox its `purchase_url` comes back pointing at `sandbox.whop.com/checkout/`, which is the fastest proof you are talking to the right Whop.
3. `WhopCheckoutEmbed` opens in a modal with `environment="sandbox"`, which points the checkout frame at `sandbox.whop.com` instead of `whop.com`. Completing it fires `onComplete(planId, receiptId)` and the client posts the `pay_` id to `/api/verify`.
4. `/api/verify` calls `payments.retrieve`, checks the payment belongs to this product and reached `paid`, and seals the id into an iron-session cookie. It answers 202 while the payment is still `pending` and 404 while Whop cannot read it yet, and the client polls through both.
5. The failure step reopens the same embed so you can pay with the decline card and the 3D Secure card. The decline surfaces inline and never fires `onComplete`, so the panel reads the outcome from the webhook feed instead.
6. `/api/refund` re-reads the payment, refuses anything that is not this product, calls `payments.refund`, then re-reads again because the refund settles asynchronously. The panel reports the settled values and the membership status beside them.
7. Whop posts to `/api/webhooks/feed`, which verifies the `x-whop-signature` header manually, normalizes the payload, and upserts it on the event id. The feed polls `/api/events` and prunes rows older than seven days.

## Key files

- `app/api/verify/route.ts` - the trust boundary. The browser only ever carries a receipt id, and this route decides what it is worth.
- `app/api/refund/route.ts` - refund plus the re-read, and the graceful 409 when Whop answers a repeat refund with a 400.
- `app/api/webhooks/feed/route.ts` - the demo's webhook sink, verifying the `x-whop-signature` scheme that API-created webhooks send.
- `app/api/webhooks/whop/route.ts` - the route the article teaches, using `whop.webhooks.unwrap` for dashboard-created webhooks.
- `lib/whop.ts` - the SDK client, and the one place the sandbox base URL is chosen.
- `lib/verify-whop-signature.ts` - the manual HMAC check, kept separate so it is readable next to `unwrap`.
- `lib/session.ts` - iron-session helper holding the receipt id across reloads.
- `lib/db.ts` - the one Neon table behind the feed.
- `components/Lab.tsx` - the six-step client walkthrough.
- `scripts/setup.mjs` - idempotent provisioning, writes `constants/whop-ids.ts`.
- `next.config.ts` - the CSP the checkout embed needs.

## Run it

```bash
npm install
cp .env.example .env.local
npm run setup
npm run dev
```

You need a Whop sandbox company, which is a fresh signup at `sandbox.whop.com` even if you already use Whop, and a Company API key from its Developer page with `payment:basic:read`, `payment:manage`, `plan:create`, and `access_pass:create`. Pay with `4242 4242 4242 4242` for a success and `4000 0000 0000 0002` for a decline, using any future expiry and any CVC. `DATABASE_URL` and `WHOP_FEED_WEBHOOK_SECRET` are optional and only power the step 6 feed, so the first five steps work without them.

`constants/whop-ids.ts` ships with placeholder ids and `npm run setup` overwrites it with the product and plan it creates, so it has to run before `npm run dev`.

## Sandbox behaviour this demo relies on

Verified live, 2026-08-10.

- A refund does not revoke access. After `payments.refund` the payment reads `status: "paid"` with `substatus: "refunded"`, `refunded_amount` set and `refundable: false`, while the membership stays `completed`. Relocking means cancelling the membership yourself.
- Refunds settle asynchronously. The response to `payments.refund` can still show pre-refund values, and a re-read a moment later shows the settled ones. A second refund answers 400 with a message saying the payment was already refunded.
- The decline card still creates a payment record and still fires `payment.failed`. The embed surfaces the decline inline and stays open, so no receipt ever reaches your code.
- The 3D Secure card renders a Checkout.com challenge simulator inside the embed, and the field hint tells you the password to type.
- `4000 0000 0000 0341` declines at checkout too. Saving it succeeds, but every charge fails including the first, so it only behaves differently where nothing is charged today.
- Checkout rejects email domains that do not accept mail, so `example.com` fails validation before the payment is attempted.
- Webhooks created through the API do not send Standard Webhooks headers, so `whop.webhooks.unwrap` rejects them. With `api_version: "v5"` they send `x-whop-signature: t=<unix>,v1=<hex>`, where v1 is an HMAC-SHA256 over `"t.body"` keyed with the raw `ws_` secret. Dashboard-created webhooks follow the spec `unwrap` expects, which is why this repo carries both routes.
- `webhooks.create` wants `resource_id`, not `company_id`, and rejects `membership.activated` and `membership.deactivated` even though the docs list them.
- There is no sandbox build of the checkout embed script and no sandbox script host, which is worth knowing because CSP snippets in the wild list one that has never resolved. The `environment` prop only swaps the checkout frame host, so `frame-src https://*.whop.com` covers both environments.

## What this demo deliberately leaves out

The article's reader path stays free of a database. It verifies webhooks with `console.error` and the Vercel runtime logs, and cross-checks against the sandbox dashboard's payments page. This demo adds a table only because a shared live feed needs somewhere to keep deliveries, and it does no retries, no queueing, and no reconciliation. For the durable payment records a production build wants, see the checkout tutorial.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
