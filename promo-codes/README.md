# Promo code breakdown

Companion demo for the article **"How to add promo codes to your app or website"**. A six-step lab that takes Whop promo codes apart: pick one of three seeded codes, read back the number Whop returns next to the number you sent, let a buyer type a code into the embedded checkout or carry it in on a link, check a code before you send people to it, prove the discount on the receipt, then pause and resume a code.

Every step runs against the real Whop sandbox. The codes are real and no real money moves.

Live demo: https://nextjs-whop-promo-codes-demo.vercel.app

## How the flow works

No database and no webhooks. Whop stores the codes and their usage, and the only local state is an encrypted session cookie holding the receipt id of the last payment.

1. `npm run setup` creates the "Promo demo pass" product with a one-time $40 plan, seeds three codes (`SAVE25`, `HALFOFF`, `FIFTEENOFF`), and writes their ids to `constants/whop-ids.ts`. It is the only thing that calls `promoCodes.create`.
2. `GET /api/promo-codes` reads the codes live with `promoCodes.list` and narrows them to the seeded set. `toSummary` in `lib/promo.ts` converts `amount_off` in one place, because a 25% code is written as `25` and read back as `0.25`.
3. The checkout is Whop Elements (`WhopElements`, `Checkout`, `CheckoutElement`). Its `promoCode` option applies a code from a `?promo=` link before the buyer sees the full price. Elements has no event for a code the buyer types in, so the page learns which code was used from the payment's `promo_code_id`. On an https origin the checkout mounts the checkout configuration from `lib/checkout.ts`, whose `redirect_url` sends every buyer back to this page with `payment_id` and `status=success` on the URL. Whop only accepts an https `redirect_url`, so on `http://localhost` the checkout mounts with the plan alone.
4. `GET /api/promo-codes/lookup` answers whether a code is worth applying before the buyer reaches the checkout. There is no lookup by code string, so it lists and matches locally, then checks status, stock and expiry.
5. `onComplete` hands the page a `pay_` id, and a buyer coming back from the redirect brings one on the URL. Either way the page posts it to `/api/verify`. The route calls `payments.retrieve`, checks the product and the status, reads `subtotal` and `total`, looks the code up from `promo_code_id`, and seals the receipt id into the session cookie. A 202 or 404 means the payment is not readable yet, and the client asks again.
6. `PATCH /api/promo-codes/[id]` pauses and resumes a seeded code with `promoCodes.deactivate` and `promoCodes.activate`. Reset puts any paused code back to active and forgets the receipt.

## Key files

- `lib/promo.ts` - the encoding conversion, the lookup-by-code workaround, and pause and resume
- `app/api/verify/route.ts` - the trust boundary: `payments.retrieve`, product and status guards, the promo code lookup, then the session write
- `app/api/promo-codes/lookup/route.ts` - is this code worth applying, answered before checkout
- `app/api/promo-codes/[id]/route.ts` - pause and resume, limited to the seeded ids
- `components/CheckoutModal.tsx` - the Elements checkout with `promoCode` and `onComplete`, plus the retry loop while a payment settles
- `lib/checkout.ts` - the checkout configuration whose `redirect_url` brings buyers back after paying
- `components/Lab.tsx` - the six panels and the activity log
- `lib/whop.ts` - the SDK client, on `WhopEnvironment.Sandbox` when `WHOP_SANDBOX=true`
- `lib/session.ts` - the iron-session cookie that holds the receipt id
- `scripts/setup.mjs` - provisions the product, plan and seeded codes, and writes `constants/whop-ids.ts`
- `next.config.ts` - the CSP, built with `contentSecurityPolicy()` from `@whop/elements`, which knows the Whop hosts for the sandbox and for production

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox key, company id and a session secret
npm run setup                # creates "Promo demo pass", seeds three codes, writes constants/whop-ids.ts
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)) and a Company API key with `promo_code:create`, `promo_code:basic:read`, `promo_code:delete`, `access_pass:basic:read`, `payment:basic:read` and `plan:basic:read`, plus `access_pass:create` for `npm run setup`, and `checkout_configuration:create`, `checkout_configuration:basic:read`, `plan:create` and `access_pass:update` for the checkout configuration that brings buyers back. Sandbox test cards: `4242 4242 4242 4242` succeeds and `4000 0000 0000 0002` declines.

`constants/whop-ids.ts` ships with placeholder ids. `npm run setup` overwrites it with the ids from your own company, so run it before `npm run dev`.

## Sandbox behaviour this demo relies on

Verified live, 2026-08-21, 2026-10-06 and 2026-10-25.

- A percentage code is written as a whole percent and read back as a fraction. `SAVE25` is created with `amount_off: 25` and lists as `0.25`. A flat amount reads back unchanged, so `FIFTEENOFF` stays `15`.
- Whop lowercases every code, so `SAVE25` is stored as `save25`.
- The `promoCode` option applies a code before the buyer sees the full price. With `save25` on the $40 plan the checkout shows 25% off and $30.00 due. It opens in the buyer's local currency, with a link to pay in USD instead.
- A code that does not exist, or one that is paused or expired, raises no error. The checkout opens at full price and says why, for example "This promo code is invalid".
- A payment carries `product_id` and `promo_code_id`. `subtotal` and `total` are money objects whose `amount` is an exact decimal string, `"40.00"` and `"30.00"` for a `save25` purchase.
- `promoCodes.deactivate` and `promoCodes.activate` pause and resume a code and answer with the full promo code. Archiving cannot be undone, but it frees the code string for a new code.
- Creating a code whose string a working code already holds is refused with "This code has already been taken by another promo code."
- Without a checkout configuration, a buyer whose email has no Whop account goes to Whop's account setup page (`sandbox.whop.com/checkout/return`) right after paying. `onComplete` fires just before the tab leaves, which can be too soon for the page's own request to come back. Elements' `returnUrl` does not change this, because it only covers off-site steps such as some bank payments.
- The sandbox checkout rejects undeliverable email domains such as `example.com`.

## What this demo deliberately leaves out

Creating and archiving codes. A promo code cannot be updated or un-archived, so a shared demo that let visitors create or archive codes would fill the sandbox company with codes nobody can reclaim. The code picker still shows the exact create call `npm run setup` sends. Webhooks and a database are left out too. Verification here is a direct `payments.retrieve` call, which is the right shape for showing a receipt while the buyer waits. Production fulfillment should also listen for `payment.succeeded`, so a buyer whose browser closes still gets what they paid for.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
