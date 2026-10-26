# Next.js checkout with webhooks

Companion demo for the article **"How to add checkout to a Next.js app"**. A small SaaS-shaped app that adds Whop checkout to a project that already has users: a stub sign-in creates a user in Postgres, two pricing cards start a Whop checkout session tagged with that user's id, the checkout page mounts Whop's embedded checkout for the session, and a signed webhook flips the user's `plan` flag to `pro`, which gates the Pro features. The complete page shows the receipt and the account flag updating once the webhook lands.

Every Whop call runs against the Whop sandbox. No real money moves.

Live demo: https://nextjs-checkout-demo.vercel.app

## How the flow works

Postgres, through Prisma, holds two tables: `User` with the `plan` flag the webhook flips, and `WebhookEvent` with the ids already handled. The signed-in user lives in an iron-session cookie.

1. The stub sign-in posts an email to `/api/auth/login`, which upserts a `User` and seals its id into the session cookie. It stands in for the auth your app already has, so swap `requireUser()` for your own helper.
2. A pricing card posts `plan=subscription` or `plan=lifetime` to `/api/checkout`. The route reads the plan id from `lib/plans.ts` and calls `checkoutConfigurations.create({ plan_id, mode: "payment", redirect_url, metadata: { userId } })`, then redirects to `/checkout?session=ch_...&plan=...`.
3. `/checkout` checks the user again and renders `WhopCheckoutEmbed` with the session id, the `returnUrl`, and an `environment` that follows `WHOP_SANDBOX`. Card details stay inside Whop's iframe.
4. After the payment Whop sends the buyer to `/checkout/complete` with `status=success` or `status=error`. The page reads the receipt with `payments.retrieve({ id })` for display only and shows the user's current plan.
5. `/api/webhooks/whop` reads the raw body with `request.text()` and verifies it with `unwrapWebhook` from `@whop/sdk/helpers` and the raw `ws_` secret. A bad or missing signature gets a 401 before anything runs.
6. `payment.succeeded` and `membership.activated` set `plan` to `pro`, and `membership.deactivated` sets it back to `free`. The user id comes from the checkout configuration's `metadata`, and the plan from `plan_id ?? plan?.id`, so both webhook payload versions work. Each handled event id goes into `WebhookEvent`, so a redelivery changes nothing.
7. `requirePro()` in `lib/access.ts` redirects anyone whose flag isn't `pro`.

## Key files

- `app/api/webhooks/whop/route.ts` - signature verification and event routing
- `lib/webhooks.ts` - the handlers: both payload shapes, the idempotency table, the plan flag
- `app/api/checkout/route.ts` - creates the checkout configuration tagged with the user id
- `app/checkout/WhopCheckout.tsx` - the embedded checkout
- `lib/whop.ts` - the SDK client, with the sandbox switch
- `lib/env.ts` - validates every environment variable on first use
- `lib/plans.ts` - the two plans, shared by the pricing cards and the checkout route
- `lib/access.ts` - the `requirePro()` gate
- `prisma/schema.prisma` - the `User` and `WebhookEvent` tables
- `scripts/setup-whop.ts` - creates the Pro product and both plans in your sandbox company and prints their ids
- `next.config.ts` - the CSP the embed needs
- `lib/session.ts` and `app/api/auth/` - the stub sign-in

## Run it

```bash
npm install
cp .env.example .env.local   # sandbox key, webhook secret, database URLs, session secret
npx prisma generate          # writes the Prisma client to generated/
npx prisma db push           # creates the User and WebhookEvent tables
npm run setup:whop           # creates the product and both plans, prints the two plan ids
npm run dev
```

You need a Whop sandbox company ([sandbox.whop.com](https://sandbox.whop.com/dashboard)) with a Company API key (the article creates it with the Admin role), a Postgres database such as Neon, and a webhook on the company pointing at `/api/webhooks/whop` with `payment_succeeded`, `payment_failed`, `membership_activated` and `membership_deactivated` enabled. Whop has to reach that URL, so use a tunnel or a preview deployment for local runs. Sandbox test cards: `4242 4242 4242 4242` succeeds and `4000 0000 0000 0002` declines.

`.env.example` ships with placeholder plan ids. `npm run setup:whop` creates the plans in your own company and prints the two ids to paste into `.env.local`, so run it before `npm run dev`. If the script can't read your company (missing `company:basic:read`), prepend `WHOP_COMPANY_ID=biz_...` from your dashboard URL.

## Sandbox behaviour this demo relies on

Verified live, 2026-10-20 to 2026-10-26.

- `checkoutConfigurations.create` with a `plan_id` and `metadata` returns a `ch_` id for both plans.
- Payments made through a checkout configuration carry its `metadata` and a flat `plan_id` with no nested `plan`.
- `accounts.me()` returns the key's own `biz_` account, which the setup script uses instead of asking for a company id.
- **The embedded checkout is currently refused.** As of 2026-10-26 the `@whop/checkout` embed frame (`/embedded/checkout/<id>/`) answers "This checkout is no longer available. Contact the seller to complete your purchase." for every plan and session tried, this demo's included. The hosted checkout page for the same plan (`/checkout/<plan_id>/`) still takes a card. Until Whop changes this, the payment step can't be finished inside the embed.

## What this demo deliberately leaves out

Real authentication, CSRF tokens and rate limiting. The stub sign-in accepts any email with no password, because the article is about adding checkout to an app that already has auth. The receipt on the complete page is display only. The webhook is what grants access, so a buyer whose browser closes after paying still ends up on Pro.
