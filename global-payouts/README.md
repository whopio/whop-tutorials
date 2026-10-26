# Global payouts breakdown

Companion demo for the article **"Global payouts API guide: How to pay anyone in 187+ countries"**. A six-step walkthrough of a marketplace paying a seller who lives in another country: create a connected account for the seller, let them prove who they are and pick how they get paid inside Whop's embedded components, see what each payout option would cost them, move a sale into their balance, send the payout with one call, and follow its status until it lands. The seller's identity documents and bank details never reach this app.

Every step runs against the real Whop sandbox. No real money moves.

Live demo: https://nextjs-whop-payouts-demo.vercel.app

## How the flow works

No database. The only state is an encrypted iron-session cookie holding the seller's account id, the chosen payout method and the payout id. The webhook route verifies and logs deliveries, and the timeline reads the payout back from Whop.

1. `/api/seller` calls `accounts.create` with the platform's Company API key. There is no parent field: the key decides that the new `biz_` account sits under the platform. Titles must be unique per platform and the email must be a mailbox that really accepts mail, so the demo plus-tags one address from `DEMO_SELLER_EMAIL`.
2. `/api/token` mints a short-lived credential with `accessTokens.create({ account_id, scoped_actions })`. `PayoutsSession` receives it as a function rather than a string, so the components refresh it themselves before it expires.
3. `VerifyElement`, inside `PayoutsSession`, draws Whop's identity flow in the page. Nothing in that box touches this server.
4. `/api/rails` lists every payout option with `payouts.supportedMethods.list`, passing an amount so each option carries a fee and arrival quote, and iterates the whole list rather than the first page. When the list is empty it reads `required_actions` off `accounts.retrieve` to say why. `AddPayoutMethodElement` saves the seller's choice, and `/api/methods` reads it back with `payouts.methods.list`, keeping the default method's `potk_` id.
5. `/api/fund` stands in for a sale by moving $40 into the seller's balance with `transfers.create({ type: "balance" })`. `/api/pay` then sends $25 with `payouts.create`, passing `payout_method_id`, the `platform_covers_fees` switch from the page, and an `idempotencyKey` saved in the cookie before the call, so a retry carries the same key and cannot pay twice.
6. `/api/payment` polls `payouts.retrieve({ id })` for the timeline (requested, processing, completed, or an end state with `failure.code` and `failure.message`). `/api/webhooks/whop` verifies each delivery with `unwrapWebhook` from `@whop/sdk/helpers` and the raw `ws_` secret, accepts `payout.*` and the older `withdrawal.*` events, and drops repeats by the `webhook-id` header.

## Key files

- `app/api/pay/route.ts` - the money call: `payouts.create` with the saved payout method and a stored idempotency key
- `app/api/seller/route.ts` - creates the seller's connected account and passes Whop's own error wording through
- `app/api/rails/route.ts` - every payout option with a live quote, and the reason when there are none yet
- `components/PayoutsLab.tsx` - the six panels and the activity log
- `components/VerifyPanel.tsx` - `PayoutsSession` and the identity step
- `components/PayoutMethodPanel.tsx` - `AddPayoutMethodElement`, the saved method and the options table
- `app/api/webhooks/whop/route.ts` - signature check, event filter and delivery dedupe
- `app/api/token/route.ts` - the scoped credential the embedded components run on
- `lib/whop.ts` - the SDK client, with `environment` switching between sandbox and production
- `lib/store.ts` - the cookie state, and why it is not a module-level `Map`
- `lib/quotes.ts` - turns a payout option into a table row, with tests in `lib/quotes.test.ts`
- `next.config.ts` - the CSP the embedded components need, including `https://apollo.elements.whop.com`

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox key, company id and a mailbox you own
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)) and a Company API key with `company:create_child`, `company:basic:read`, `company:balance:read`, `payout:account:read`, `payout:destination:read`, `payout:create_destination`, `payout:transfer_funds`, `payout:withdraw_funds`, `payout:withdrawal:read` and `webhook_receive:withdrawals`. `DEMO_SELLER_EMAIL` has to be a real mailbox, because Whop checks that a connected account's address accepts mail.

There is nothing to provision first and no `npm run setup`. The demo creates each seller account at runtime, and `constants/whop-ids.ts` holds only the demo's countries, seller names, session scopes and amounts.

The embedded components draw on `localhost`, but `PayoutsSession` documents that localhost redirect URLs will not work, so finishing verification and coming back from it needs an https `APP_URL`.

## Sandbox behaviour this demo relies on

Verified live, 2026-08-04 and 2026-10-25.

- A new connected account gets an empty list of payout options with a `200`, plus a `verify_identity` required action. Empty means the seller has not verified yet, not that their country is unsupported.
- Verification runs through Sumsub and ends in a camera liveness check, so a person has to finish it. No API call skips it.
- Each option is quoted per amount, and options can differ a lot. On 2026-10-25 a $25 payout to a Brazilian seller quoted $1.50 for Bank Deposit and PIX, while Bank Wire returned no standard quote at that amount. A missing quote is a state to show, not an error.
- Connected account titles must be unique within a platform: a duplicate returns "You have already created an account with the same name".
- Balance transfers land straight away, including on an account that has not verified yet.
- `platform_covers_fees` only works when the account being paid belongs to a platform: on the platform's own account it returns "Platform fee coverage is only available for accounts with a parent platform".
- A saved payout method can be retired by the payout provider. It then reads `unavailable_reason: "destination_retired"` in `payouts.methods.list`, and `payouts.create` against it returns `400` "This payout method is no longer supported by our payout provider".

## What this demo deliberately leaves out

A database. A production app would write each status from `payout.updated` against its own payment record, and dedupe deliveries there instead of in memory. Here the webhook route verifies, filters and logs, and the timeline reads the payout back from Whop, so the walkthrough still advances when a delivery is late. Also left out is funding the platform's own balance, which needs Whop's hosted deposit page.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
