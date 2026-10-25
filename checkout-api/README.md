# Checkout API breakdown

Companion demo for the article **"How to integrate a checkout API, step by step"**. A six-step walkthrough of the one idea the checkout API is built around: you tag a checkout with your own order id before the buyer sees it, and that id comes back to you on the payment, so a charge always knows which sale it belongs to.

The walkthrough reads the product and plan back from Whop, makes a checkout carrying an order number, sends the same request twice to show Whop returns one checkout rather than two, takes a payment in the page with Whop Elements, and then asks Whop what that payment was so you can see the order number on the other side.

Every step runs against the real Whop sandbox. No real money moves.

Live demo: https://nextjs-whop-checkout-api-demo.vercel.app

## How the flow works

No database. The order id is generated in the browser and never stored, which is the point: it goes out on the checkout and comes back on the payment, so Whop is the only thing holding it.

1. `app/page.tsx` reads the plan and product back from Whop on every request with `variants.retrieve` and `products.retrieve`, so the ids on screen are the ones the CLI actually created rather than strings typed into a file.
2. `POST /api/demo/checkout` calls `checkoutConfigurations.create` with `metadata: { order_id }` and an `idempotencyKey` request option built from that order id. It returns the `ch_` id.
3. Sending the same request again returns the **same** `ch_` id, because the idempotency key has not changed. The panel shows both ids side by side.
4. `Checkout` from `@whop/elements-react` takes that `ch_` id as `checkoutConfiguration`, inside `WhopElements` set to the sandbox, so the form rendered in the page is already carrying the order number.
5. Paying fires `onComplete` with `{ result: "payment", paymentId }`. The client posts the `pay_` id to `/api/demo/verify`.
6. `/api/demo/verify` calls `payments.retrieve({ id })`, checks the payment belongs to this plan and that `substatus` is `succeeded`, and returns the payment with its metadata. The order number is on it. A 202 comes back while Whop cannot read the payment yet, and the client asks again.

## Key files

- `components/CheckoutLab.tsx` - the six panels, the Elements checkout, the activity log, and the retry loop that polls while a payment settles
- `app/api/demo/verify/route.ts` - the trust boundary: `payments.retrieve`, plan and status guards
- `app/api/demo/checkout/route.ts` - creates the checkout configuration and attaches the order id
- `components/steps.ts` - the walkthrough copy, one entry per panel
- `lib/whop.ts` - the `WhopClient`, pointed at the sandbox with `WhopEnvironment.Sandbox` when `WHOP_SANDBOX` is true
- `next.config.ts` - the CSP Elements needs: `https://cdn.whop.com` in `script-src` and `frame-src`, and the Whop API hosts in `connect-src`

The article's own files sit alongside the demo and are the reference implementation a reader is following: `lib/env.ts`, `lib/orders.ts`, `lib/auth.ts`, `lib/fulfil.ts`, `lib/webhook-log.ts`, `components/Checkout.tsx`, `app/api/checkout`, `app/api/verify`, `app/api/webhooks/whop` and `app/pricing`. Like the article, they use `@whop/sdk` 2.4.0 and `@whop/elements` 1.9.0.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox API key
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com)) and a Company API key with the permissions listed in `.env.example`. Sandbox test cards: `4242 4242 4242 4242` succeeds and `4000 0000 0000 0002` declines.

`constants/whop-ids.ts` ships with placeholder ids. Create your own product and plan with the Whop CLI and paste the ids it prints into that file before `npm run dev`:

```bash
npm install -g @whop/cli

export WHOP_API_BASE_URL="https://sandbox-api.whop.com/api/v1"
whop auth login --method api-key --api-key <your key>

whop products create --title "Pro pass" --description "Sold through our own checkout." --visibility visible
whop variants create --product_id prod_XXXXXXXXX --plan_type one_time --initial_price 49.99 --visibility visible
```

On Windows PowerShell, set the base URL with `$env:WHOP_API_BASE_URL = "https://sandbox-api.whop.com/api/v1"` instead. `WHOP_API_BASE_URL` is not remembered between terminal windows. Without it the CLI talks to your live Whop.com business instead of the sandbox. Whop now calls plans variants, and their ids keep the `plan_` prefix.

## Sandbox behaviour this demo relies on

Verified live, 2026-10-25, on `@whop/sdk` 2.4.0 and `@whop/elements` 1.9.0.

- Sending the same request with the same `idempotencyKey` returns the original checkout. The 2.4.0 SDK sends the request option as an `Idempotency-Key` header, so no hand-set header is needed.
- A payment's `status` is invoice shaped. `succeeded` only ever appears on `substatus`, which is what the verify routes check.
- Elements loads its script and frames from `cdn.whop.com` and calls `sandbox-api.whop.com` from the page. The CSP in `next.config.ts` allows those hosts.
- The checkout can show the price in the buyer's local currency, while the plan itself is priced in USD.
- After a card payment by a buyer whose email has no Whop account yet, `onComplete` fires and the payment verifies, and then Whop moves the tab to `sandbox.whop.com/checkout/return` to finish setting up that account. This happens with or without a `returnUrl`, so the walkthrough's last panel may not get the chance to show.
- Apple Pay's script is blocked by this CSP, because the demo adds no wallet hosts. `contentSecurityPolicy()` from `@whop/elements` returns the full list when you want wallets.

## What this demo deliberately leaves out

Storage. The walkthrough never writes an order down, because the whole point is that the id round-trips through Whop. The article's own files do keep an order and fulfil it from a `payment.succeeded` webhook, which is the shape a real integration needs so a buyer whose browser dies still gets what they paid for. The live demo has no webhook registered, because an in-memory order store does not survive between serverless instances.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
