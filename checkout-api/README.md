# Checkout API breakdown

Companion demo for the article **"How to integrate a checkout API, step by step"**. A six-step walkthrough of the one idea the checkout API is built around: you tag a checkout with your own order id before the buyer sees it, and that id comes back to you on the payment, so a charge always knows which sale it belongs to.

The walkthrough reads the product and plan back from Whop, makes a checkout carrying an order number, sends the same request twice to show Whop returns one checkout rather than two, takes a payment in the page, and then asks Whop what that payment was so you can see the order number on the other side.

Every step runs against the real Whop sandbox. No real money moves.

Live demo: https://nextjs-whop-checkout-api-demo.vercel.app

## How the flow works

No database. The order id is generated in the browser and never stored, which is the point: it goes out on the checkout and comes back on the payment, so Whop is the only thing holding it.

1. `app/page.tsx` reads the product and plan back from Whop on every request, so the ids on screen are the ones the CLI actually created rather than strings typed into a file.
2. `POST /api/demo/checkout` calls `checkoutConfigurations.create` with `metadata: { order_id }` and an `Idempotency-Key` header built from that order id. It returns the `ch_` id.
3. Sending the same request again returns the **same** `ch_` id, because the idempotency key has not changed. The panel shows both ids side by side.
4. `WhopCheckoutEmbed` takes that `ch_` id as `sessionId`, so the form rendered in the page is already carrying the order number.
5. Paying fires `onComplete(planId, receiptId)`. The client posts the `pay_` id to `/api/demo/verify`.
6. `/api/demo/verify` calls `payments.retrieve`, checks the payment belongs to this plan and that `substatus` is `succeeded`, and returns the payment with its metadata. The order number is on it.

## Key files

- `components/CheckoutLab.tsx` - the six panels, the activity log, and the retry loop that polls while a payment settles
- `components/steps.ts` - the walkthrough copy, one entry per panel
- `app/api/demo/checkout/route.ts` - creates the checkout configuration and attaches the order id
- `app/api/demo/verify/route.ts` - the trust boundary: `payments.retrieve`, plan and status guards
- `lib/whop.ts` - the SDK client, including the sandbox `baseURL` override
- `next.config.ts` - the CSP the embedded checkout needs, including `https://t.whop.tw`

The article's own files sit alongside the demo and are the reference implementation a reader is following: `lib/orders.ts`, `lib/auth.ts`, `lib/fulfil.ts`, `lib/webhook-log.ts`, `app/api/checkout`, `app/api/verify`, `app/api/webhooks/whop` and `app/pricing`.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox API key
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com)) and a Company API key.

`constants/whop-ids.ts` ships with placeholder ids. Create your own product and plan with the Whop CLI and paste the ids in:

```bash
npm install -g @whop/cli

export WHOP_API_BASE_URL="https://sandbox-api.whop.com/api/v1"
whop auth login --method api-key --api-key <your key>

whop products create --title "Pro pass" --description "Sold through our own checkout." --visibility visible
whop plans create --product_id prod_XXXXXXXXX --plan_type one_time --initial_price 49.99 --visibility visible
```

`WHOP_API_BASE_URL` is not remembered between terminal windows. Without it the CLI talks to your live Whop.com business instead of the sandbox.

Sandbox test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines.

## Sandbox behaviour this demo relies on

- `checkoutConfigurations.create` accepts `plan_id`, `mode`, `metadata` and `redirect_url`. A `redirect_url` must be https, so it is omitted when `APP_URL` is a plain http origin.
- `purchase_url` comes back as `.../checkout/<plan id>/?session=<ch id>`. Building that URL by hand drops the session and with it the metadata.
- Sending the same `Idempotency-Key` with the same body returns the original checkout. Sending it with a different body returns `400 This Idempotency-Key was already used with a different request`.
- `@whop/sdk` accepts an `idempotencyKey` request option but never sends it. The header has to be set explicitly, which is what this demo does.
- A payment's `status` is invoice shaped. `succeeded` only ever appears on `substatus`.
- The embedded checkout is framed from `sandbox.whop.com`, which `frame-src https://*.whop.com` already covers. There is no separate sandbox script host.

## What this demo deliberately leaves out

Storage. The walkthrough never writes an order down, because the whole point is that the id round-trips through Whop. The article's own files do keep an order and fulfil it from a `payment.succeeded` webhook, which is the shape a real integration needs so a buyer whose browser dies still gets what they paid for.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
