# Promo code breakdown

Companion demo for the article **"How to add promo codes to your app or website"**. A six-step lab that takes Whop promo codes apart: pick one of three seeded codes, read back the number Whop returns next to the number you sent, let a buyer type a code into the embedded checkout or carry it in on a link, check a code before you send people to it, prove the discount on the receipt, then pause and resume a code.

Every step runs against the real Whop sandbox. The codes are real and no real money moves.

Live demo: https://nextjs-whop-promo-codes-demo.vercel.app

## How the flow works

No database and no webhooks. Whop stores the codes and their usage, and the only local state is an encrypted session cookie holding the receipt id of the last payment.

1. `npm run setup` creates the "Promo demo pass" product with a one-time $40 plan, seeds three codes (`SAVE25`, `HALFOFF`, `FIFTEENOFF`), and writes their ids to `constants/whop-ids.ts`. It is the only thing that calls `promoCodes.create`.
2. `GET /api/promo-codes` reads the codes live with `promoCodes.list` and narrows them to the seeded set. `toSummary` in `lib/promo.ts` converts `amount_off` in one place, because a 25% code is written as `25` and read back as `0.25`.
3. The checkout is `WhopCheckoutEmbed`. Its `promoCode` prop applies a code from a `?promo=` link before the buyer sees the full price, and `onPromoCodeChanged` reports the code the buyer applied, in the same fraction encoding.
4. `GET /api/promo-codes/lookup` answers whether a code is worth applying before the buyer reaches the checkout. There is no lookup by code string, so it lists and matches locally, then checks status, stock and expiry.
5. `onComplete` hands the page a `pay_` id, which it posts to `/api/verify`. The route calls `payments.retrieve`, checks the product and the status, reads `subtotal` and `total`, looks the code up from `promo_code_id`, and seals the receipt id into the session cookie. A 202 or 404 means the payment is not readable yet, and the client asks again.
6. `PATCH /api/promo-codes/[id]` pauses and resumes a seeded code with `promoCodes.deactivate` and `promoCodes.activate`. Reset puts any paused code back to active and forgets the receipt.

## Key files

- `lib/promo.ts` - the encoding conversion, the lookup-by-code workaround, and pause and resume
- `app/api/verify/route.ts` - the trust boundary: `payments.retrieve`, product and status guards, the promo code lookup, then the session write
- `app/api/promo-codes/lookup/route.ts` - is this code worth applying, answered before checkout
- `app/api/promo-codes/[id]/route.ts` - pause and resume, limited to the seeded ids
- `components/CheckoutModal.tsx` - the embedded checkout with `promoCode`, `onPromoCodeChanged` and `onComplete`, plus the retry loop while a payment settles
- `components/Lab.tsx` - the six panels and the activity log
- `lib/whop.ts` - the SDK client, on `WhopEnvironment.Sandbox` when `WHOP_SANDBOX=true`
- `lib/session.ts` - the iron-session cookie that holds the receipt id
- `scripts/setup.mjs` - provisions the product, plan and seeded codes, and writes `constants/whop-ids.ts`
- `next.config.ts` - the CSP the embed needs, including `https://cdn.plaid.com` for Plaid Link

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox key, company id and a session secret
npm run setup                # creates "Promo demo pass", seeds three codes, writes constants/whop-ids.ts
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)) and a Company API key with `promo_code:create`, `promo_code:basic:read`, `promo_code:delete`, `access_pass:basic:read`, `payment:basic:read` and `plan:basic:read`, plus `access_pass:create` for `npm run setup`. Sandbox test cards: `4242 4242 4242 4242` succeeds and `4000 0000 0000 0002` declines.

`constants/whop-ids.ts` ships with placeholder ids. `npm run setup` overwrites it with the ids from your own company, so run it before `npm run dev`.

## Sandbox behaviour this demo relies on

Verified live, 2026-08-21 and 2026-10-06.

- A percentage code is written as a whole percent and read back as a fraction. `SAVE25` is created with `amount_off: 25` and lists as `0.25`. A flat amount reads back unchanged, so `FIFTEENOFF` stays `15`.
- Whop lowercases every code, so `SAVE25` is stored as `save25`.
- The `promoCode` prop applies a code before the buyer sees the full price. With `save25` on the $40 plan the checkout shows 25% off and $30.00 due.
- A code that does not exist, or one that was archived, raises no error. The checkout opens at full price with an empty promo row and `onPromoCodeChanged` never fires.
- A payment carries `product_id` and `promo_code_id`. `subtotal` and `total` are money objects whose `amount` is an exact decimal string, `"40.00"` and `"30.00"` for a `save25` purchase.
- `promoCodes.deactivate` and `promoCodes.activate` pause and resume a code and answer with the full promo code. Archiving cannot be undone, but it frees the code string for a new code.
- Creating a code whose string a working code already holds is refused with "This code has already been taken by another promo code."
- The embedded checkout loads Plaid Link's script from `https://cdn.plaid.com` into the host page, so a strict CSP blocks it until that host is allowed.
- The sandbox checkout rejects undeliverable email domains such as `example.com`.

## What this demo deliberately leaves out

Creating and archiving codes. A promo code cannot be updated or un-archived, so a shared demo that let visitors create or archive codes would fill the sandbox company with codes nobody can reclaim. The code picker still shows the exact create call `npm run setup` sends. Webhooks and a database are left out too. Verification here is a direct `payments.retrieve` call, which is the right shape for showing a receipt while the buyer waits. Production fulfillment should also listen for `payment.succeeded`, so a buyer whose browser closes still gets what they paid for.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
