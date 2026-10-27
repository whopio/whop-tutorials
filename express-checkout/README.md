# Express checkout breakdown

Companion demo for the article **"How to add express checkout to your app"**. A six-step walkthrough that takes Whop's express checkout apart: mount the wallet buttons and watch them decide what to show, pay through Whop's card form, verify the payment server-side, replay the trip back from Whop, break it on purpose, and finish by flipping between the wallet buttons and the full checkout form for the same plan.

Every step runs against the real Whop sandbox through [Whop Elements](https://docs.whop.com/elements/latest/getting-started). No real money moves.

Live demo: https://nextjs-whop-express-checkout-demo.vercel.app

## How the flow works

No database and no webhooks. The only state is an encrypted session cookie holding the two receipt ids the walkthrough has collected.

1. `ExpressCheckoutElement` mounts inside a `Checkout` for the plan. It shows only the wallets the browser can pay with, and nothing at all on a domain without Apple Pay set up in Whop. There is no event for "nothing to show", so the demo measures the element's frame after `onReady`.
2. "Pay with card" mounts `CheckoutElement` instead. A finished payment fires `onComplete` with `{ result: "payment", paymentId }`, and the client posts the `pay_` id to `/api/verify`. The id is also parked in `sessionStorage`, because Whop can move the tab to its own page right after.
3. `/api/verify` calls `payments.retrieve`, checks the payment belongs to this product, is paid, and wasn't refunded, then seals the id into an iron-session cookie. A 202 comes back while the payment is still settling, and the client retries.
4. Whop sends the buyer back to `returnUrl` with `payment` and `status` (`succeeded`, `failed` or `canceled`) in the address bar. Here the return page is `/` itself. The step replays that trip with the visitor's own receipt, and the session cookie is what carries the walkthrough across it.
5. The failure step points the element at a plan that doesn't exist (Whop answers through `onError` with `CHECKOUT_UNAVAILABLE`) and takes the decline card through the card form, where the error stays inside the form and `onComplete` never fires.
6. The last panel swaps `ExpressCheckoutElement` for `CheckoutElement` on the same plan, so you can see the two shapes side by side.

## Key files

- `app/api/verify/route.ts` - the trust boundary: `payments.retrieve`, product, status and refund guards, then the session write
- `components/TeardownLab.tsx` - the six panels, the wire log, and the retry loop that polls while a payment settles
- `components/steps.ts` - the walkthrough copy, one entry per panel
- `lib/whop.ts` - the `@whop/sdk` client, which picks `WhopEnvironment.Sandbox` when `WHOP_SANDBOX` is `true`
- `lib/session.ts` - the iron-session cookie that survives the trip back from Whop
- `app/api/inspect/route.ts` - returns the raw payment JSON the panels annotate
- `scripts/setup.mjs` - provisions the demo product and writes `constants/whop-ids.ts`
- `next.config.ts` - the CSP, built with `contentSecurityPolicy()` from `@whop/elements` for the sandbox or production

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox key and company id
npm run setup                # creates "Demo pass" and writes constants/whop-ids.ts
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)) and a Company API key with payment read plus product and plan create. Sandbox test cards: `4242 4242 4242 4242` succeeds and `4000 0000 0000 0002` declines.

`constants/whop-ids.ts` ships with placeholder ids. `npm run setup` overwrites it with the ids from your own company, so run it before `npm run dev`.

## Sandbox behaviour this demo relies on

Verified live, 2026-10-27, on `@whop/elements` 1.9.0.

- The wallet row renders nothing on localhost and on this demo's domain, because wallets need a domain with Apple Pay set up in Whop. Visitors pay through the card form.
- After a card payment from an email with no Whop account, Whop moves the tab to its own "Payment complete" page and asks for an emailed code. `onComplete` fires first, so the receipt is already saved when the visitor presses Back.
- The first press of Pay sometimes shows "Internal error" (the sandbox's checkout challenge answers 503). Pressing Pay again goes through.
- A plan that doesn't exist fires `onError` with `[CHECKOUT_UNAVAILABLE] Plan not found`, and the element shows "Express checkout isn't available here".
- The decline card shows the error inside the form and never reaches `onComplete`.

## What this demo deliberately leaves out

Webhooks and a database. Verification here is a direct `payments.retrieve` call, which is the right shape for unlocking a page while the buyer waits. Production fulfillment should also listen for `payment.succeeded`, so a buyer whose browser dies, or who ends on Whop's own page, still gets what they paid for. The companion checkout article builds that path.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
