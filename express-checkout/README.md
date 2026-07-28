# Express checkout breakdown

Companion demo for the article **"How to add express checkout to your app"**. A six-step walkthrough that takes Whop's express checkout button apart: mount it and watch it pick a payment method, buy through the Whop Pay dialog without the page ever reloading, verify the payment server-side, then do it again through a real redirect round trip, break the button on purpose, and finish by flipping between the button and the full embedded checkout for the same plan.

Every step runs against the real Whop sandbox. No real money moves.

Live demo: https://nextjs-whop-express-checkout-demo.vercel.app

## How the flow works

No database and no webhooks. The only state is an encrypted session cookie holding the two receipt ids the walkthrough has collected.

1. `WhopExpressCheckoutButton` mounts and fires `onExpressMethodResolved` with what it chose. On sandbox that is always `whop-pay`, because Apple Pay and Google Pay only render in production.
2. Paying in the dialog fires `onComplete(planId, receiptId)`. Passing `onComplete` implies `skipRedirect`, so the page never navigates. The client posts the `pay_` id to `/api/verify`.
3. `/api/verify` calls `payments.retrieve`, checks the payment belongs to this product and is paid, and seals the id into an iron-session cookie. A 202 comes back while Whop cannot read the payment yet, and the client retries.
4. A second button instance omits `onComplete`, so completing it navigates away and returns to `returnUrl` with `status`, `payment_id` and `state_id` in the query string. The session cookie is what carries the walkthrough across that round trip, which is the lesson of the step.
5. The failure step mounts a button with no `returnUrl` and taps `console.error` to surface the element's real refusal message, then takes a decline card through the dialog for a genuine `onPaymentError`.
6. The last panel swaps the button for `WhopCheckoutEmbed` on the same plan, so you can see the two surfaces side by side.

## Key files

- `app/api/verify/route.ts` - the trust boundary: `payments.retrieve`, product and status guards, then the session write
- `components/TeardownLab.tsx` - the six panels, the wire log, and the retry loop that polls while a payment settles
- `components/steps.ts` - the walkthrough copy, one entry per panel
- `lib/whop.ts` - the SDK client, including the sandbox `baseURL` override
- `lib/session.ts` - the iron-session cookie that survives the redirect
- `app/api/inspect/route.ts` - returns the raw payment JSON the panels annotate
- `scripts/setup.mjs` - provisions the demo product and writes `constants/whop-ids.ts`
- `next.config.ts` - the CSP the button needs, including `https://t.whop.tw`

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

Verified live, 2026-07-17.

- The button always resolves to `whop-pay` on sandbox. The wallet buttons need production.
- The redirect return carries more parameters than the docs list, including `receipt_id` and `checkout_status`. Read only `status`, `payment_id` or `setup_intent_id`, and `state_id`.
- Mounting without `returnUrl` does not throw in React. The custom element logs `[whop-checkout] return-url is required on <whop-express-checkout-button>. Refusing to mount.` and renders nothing.
- The button loads an attribution script from `https://t.whop.tw`, which a strict CSP blocks until you allow it.
- The custom element dispatches `ready`, `overlay-open` and `overlay-close` DOM events that the React wrapper does not expose as props, so the demo attaches its own listeners.

## What this demo deliberately leaves out

Webhooks and a database. Verification here is a direct `payments.retrieve` call, which is the right shape for unlocking a page while the buyer waits. Production fulfillment should also listen for `payment.succeeded`, so a buyer whose browser dies still gets what they paid for. The companion checkout article builds that path.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
