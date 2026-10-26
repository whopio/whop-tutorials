# Subscription billing breakdown

Companion demo for the article **"How to build a subscription billing app with Next.js and Whop"**. A six-step walkthrough of a monthly subscription you run yourself: sign in with Whop, subscribe to a Pro plan in an embedded checkout that locks your email, open the Pro area, cancel, keep, pause or resume the subscription without contacting anyone, see what each charge leaves after Whop's fees, and watch renewals arrive.

Every step runs against the real Whop sandbox. No real money moves.

Live demo: https://nextjs-whop-subscriptions-demo.vercel.app

## How the flow works

No database. Whop holds the plan, the membership and every charge, and the only local state is an encrypted session cookie with the signed-in user's Whop id and email.

1. `/api/auth/login` starts Sign in with Whop using PKCE, with the verifier kept in a short-lived cookie. `/api/auth/callback` checks `state` and `nonce`, swaps the code, reads the user's id and email, and seals both into the iron-session cookie.
2. `getCheckoutId` in `lib/subscription.ts` finds or creates one checkout configuration for `WHOP_PLAN_ID`, with a `redirect_url` back to the app when the app runs on https. `MembershipCheckout` mounts the Elements `Checkout` with that configuration and passes `buyerEmail` with `lockBuyerEmail`, so the membership lands on the Whop user who signed in.
3. After paying, the buyer comes back with `status=success`. If Whop has not listed the new membership yet, `ActivationPoller` refreshes the page a few times instead of showing a locked Pro area.
4. `findSubscription` lists the user's memberships on the plan, lists them again with `status: "paused"` to learn whether one is paused, and reads the newest with `memberships.retrieve`. `hasAccess` opens the Pro area for `active`, `trialing` and `past_due`. A paused subscriber keeps access until `current_period_end`.
5. `POST /api/subscription` takes one of four actions: cancel at period end, keep, pause or resume. The membership always comes from the session, so there is no id in the request to tamper with.
6. `listCharges` shows every charge on the membership, and `readReceipt` reads the latest paid one with `payments.listFees` and `amount_after_fees` to show what Whop took and what you keep.
7. `/api/webhooks/whop` verifies each delivery with `unwrapWebhook`, answers at once, and logs the receipt for `payment.succeeded`, or the failed renewal for `payment.failed`, inside `after()`.

## Key files

- `lib/subscription.ts` - the checkout configuration lookup, the subscription read, the access rule, and the four changes
- `app/api/subscription/route.ts` - the trust boundary for changes: Zod-validated action, membership from the session
- `components/MembershipCheckout.tsx` - the embedded checkout with the locked buyer email
- `lib/whop-oauth.ts` - Sign in with Whop with PKCE, `state` and `nonce`
- `lib/session.ts` - the iron-session cookie holding the Whop user id and email
- `lib/payments.ts` - the charge list and the fee breakdown for one payment
- `app/api/webhooks/whop/route.ts` - signed webhook deliveries, with the Whop reads moved into `after()`
- `lib/whop.ts` - the SDK client, on `WhopEnvironment.Sandbox` when `WHOP_SANDBOX=true`
- `proxy.ts` - per-address rate limits and a same-origin check on writes
- `scripts/verify-whop.mjs` - confirms the API key reaches your sandbox company before anything else runs

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox key, plan id, OAuth app and a session secret
npm run verify:whop          # checks the key and the environment
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)) and a Company API key with `access_pass:create`, `access_pass:update`, `plan:create`, `checkout_configuration:create`, `checkout_configuration:basic:read`, `member:basic:read`, `member:email:read`, `member:manage`, `membership:cancel` and `payment:basic:read`. Create the webhook in the dashboard. You also need an OAuth app with the `oauth:token_exchange` permission and `http://localhost:3000/api/auth/callback` as a redirect URL.

There is no `npm run setup` in this one. Create the monthly plan once, in the sandbox dashboard or with the Whop CLI, and put its `plan_` id in `WHOP_PLAN_ID`. The app finds or creates its own checkout configuration on the first page load.

```bash
npm install -g @whop/cli
export WHOP_API_BASE_URL=https://sandbox-api.whop.com/api/v1
export WHOP_API_KEY=apik_XXXXXXXX
whop products create --title "Pro membership" --visibility visible
whop variants create --product_id prod_XXXXXXXX --plan_type renewal --initial_price 0 --renewal_price 29 --billing_period 30
```

Sandbox test cards: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines, and `4000 0000 0000 0341` subscribes but fails later renewals.

## Sandbox behaviour this demo relies on

Verified live, 2026-10-09 and 2026-10-12. The checkout, the four changes, the fee rows and a signed webhook delivery ran again on `@whop/sdk` 2.4.0 on 2026-10-25.

- Whop Elements runs against the sandbox with `environment="sandbox"`, even though the sandbox guide says Elements are not available there yet.
- After a payment, Elements moves the tab to Whop's own return page unless the checkout configuration has a `redirect_url`. With one, the buyer comes back with `payment_id` and `status=success`. Whop only accepts an https `redirect_url`, so a localhost run stays on Whop's page after paying.
- `buyerEmail` and `lockBuyerEmail` belong on `CheckoutElement`, not on `Checkout`. With them, the membership is created on the Whop user whose email was passed.
- `checkoutConfigurations.list` needs `account_id`. The app reads it from the plan's `account.id`.
- Pausing and canceling at the end of the period both leave the membership `active` with the same `current_period_end`. A paused membership is only told apart by listing with `status: "paused"`, and a canceling one by `cancel_at_period_end`.
- `memberships.list` trails a cancel or an undo by a few seconds, while `memberships.retrieve` is current. The app finds the id with the list and reads the membership with retrieve.
- `users.checkAccess` reports `admin` access for anyone on the company's team, so a team member always looks subscribed. The app gates on the membership status instead.
- A payment's Whop fees come back as separate rows from `payments.listFees`, and `amount_after_fees` is what lands in the balance.
- A signed test delivery to `/api/webhooks/whop` verifies with `unwrapWebhook` and gets a 200.

## What this demo deliberately leaves out

A database and webhook-driven state. The app reads the membership from Whop on every visit, which keeps the code short and always current, and the webhook only logs each charge. A production build would cache that read, let the webhook clear the cache, and store each `webhook-id` to skip duplicate deliveries. Plan changes are left out too, because Whop has no API that moves a membership to another plan. Subscribers can still reach Whop's own manage page through the membership's `manage_url`.

## Fonts

The live demo uses Whop's licensed typefaces. Those files are not redistributed here, so this copy falls back to system fonts and will look a little different. Add your own files to `public/fonts` and matching `@font-face` rules in `app/globals.css` if you want to change that.
