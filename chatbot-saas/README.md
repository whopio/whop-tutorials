# ChatForge, an AI chatbot SaaS

Companion demo for the article **"How to build an AI chatbot SaaS with Next.js and Whop"**. ChatForge is a multi-bot chat app: visitors browse the bot catalog without an account, sign in with Whop, chat with streaming Claude and GPT bots, and upgrade to a paid plan that unlocks premium bots, higher daily limits and, on the right plan, a custom bot builder. Admins create plans and bots from the app itself.

Everything runs against the Whop sandbox. No real money moves.

Live demo: https://chatforge-taupe.vercel.app

## How the flow works

Neon Postgres through Prisma 7 holds users, plans, bots, conversations, messages, memberships and processed webhook ids. The session is an encrypted iron-session cookie.

1. `/api/auth/login` sends the visitor to Whop OAuth with PKCE (`S256`), a `state` value and a `nonce`, asking for `openid profile email`. `/api/auth/callback` checks the state, exchanges the code, reads `/oauth/userinfo` (the user id is `sub`) and upserts the user.
2. `isAdmin()` in `src/lib/admin.ts` calls `users.checkAccess({ id, resource_id })` with the company id. An `admin` access level opens `/admin/plans` and `/admin/bots`.
3. Creating a plan in `/admin/plans` calls `products.create` and `plans.create` with `account_id`, using the company API key, and stores the plan with its Whop ids.
4. The sidebar's upgrade button runs the `createCheckoutUrl` server action. It calls `checkoutConfigurations.create({ plan_id, redirect_url })` with the company API key and sends the buyer to the returned `purchase_url`.
5. Whop delivers `membership.activated` and `membership.deactivated` to `/api/webhooks/whop`. The route verifies the signature with `unwrapWebhook` from `@whop/sdk/helpers` and the raw `ws_` secret, records the event id for idempotency, and upserts the user's membership. It reads both payload shapes: flat `user_id`, `product_id` and ISO `current_period_*` from webhooks pinned to a recent API version, and nested `user.id`, `product.id` and `renewal_period_*` from unpinned ones.
6. `/api/chat` checks the plan and the daily message limit, then streams the reply from the bot's model with the AI SDK.

## Key files

- `src/lib/whop.ts` - the two `WhopClient`s (app key and company key), switched between `WhopEnvironment.Sandbox` and `Production` by `WHOP_SANDBOX`, plus the OAuth settings and PKCE helpers
- `src/app/api/webhooks/whop/route.ts` - signature check, idempotency and the membership upsert
- `src/app/checkout-action.ts` - the server action that creates the checkout configuration
- `src/app/admin/plans/actions.ts` - plan creation through the Whop API
- `src/lib/admin.ts` - the admin check with `users.checkAccess`
- `src/app/api/auth/login/route.ts` and `src/app/api/auth/callback/route.ts` - Whop OAuth with PKCE
- `src/lib/membership.ts` - plan lookup, bot access rules and daily limits
- `src/app/api/chat/route.ts` - the streaming chat endpoint
- `prisma/schema.prisma` and `prisma/seed.ts` - the data model and the starter bots

## Run it

```bash
npm install
cp .env.example .env.local   # fill in your sandbox keys, Neon URLs and AI keys
npx prisma db push
npx prisma generate
npx tsx prisma/seed.ts
npm run dev
```

You need a Whop sandbox whop ([sandbox.whop.com](https://sandbox.whop.com)) with an app (app id, API key, OAuth client id and secret, and `http://localhost:3000/api/auth/callback` as a redirect URI), a company API key from the Developer page for plans and checkout, a Neon database, and Anthropic and OpenAI API keys. Sandbox test cards: `4242 4242 4242 4242` succeeds and `4000 0000 0000 0002` declines.

Prisma 7's `db push` does not generate the client, so run `npx prisma generate` after it. The seed adds the starter bots once. Plans come from `/admin/plans` while signed in as an admin of the company.

## Sandbox behaviour this demo relies on

Verified live, 2026-10-26, on `@whop/sdk` 2.4.0.

- `users.checkAccess` with the app API key returns `admin` for an admin of the whop and `no_access` for a buyer.
- The sidebar upgrade creates a checkout configuration and lands on the hosted sandbox checkout. Paying with `4242 4242 4242 4242` returns the buyer to `redirect_url` with `payment_id` and `status=success` in the query string.
- Whop refuses an `http://` `redirect_url` with "The redirect URL must be a valid URL, starting with https://". On `http://localhost:3000` the sidebar upgrade therefore fails, so test it on the deployed app or through a tunnel.
- The SDK reads no environment variables by itself, so `WHOP_COMPANY_API_KEY` must be set wherever the app runs. Without it the upgrade fails with "Please provide 'token' when initializing the client".
- A delivery signed with the raw `ws_` secret verifies. Signing with the base64 of the secret, the old 0.0.x habit, gets a 401.

## What this demo deliberately leaves out

The rate limiter is in memory, so it resets on cold starts and is not shared between instances. A production build would move it to Redis. Webhooks are the only source of membership state, so a missed delivery stays missed until the next event.
