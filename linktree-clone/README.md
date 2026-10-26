# Whop Linktree Clone

A link-in-bio platform where creators publish free links and gate premium ones behind a one-time payment. Built with Next.js, Prisma, and Whop.

Companion demo for the article **"How to build a Linktree clone with Next.js and Whop"**: https://whop.com/blog/build-a-linktree-clone/

Live demo: https://linktree-clone-theta-azure.vercel.app

Build it with AI: [`docs/link-tree.md`](./docs/link-tree.md) is the condensed build guide the article's "Build this with AI" button hands to your coding assistant.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Prisma 5** + PostgreSQL
- **Tailwind CSS v4**
- **Whop SDK 2.4.0** (`@whop/sdk`) for connected accounts, hosted checkout with an application fee, payment reads, webhooks and payout portal tokens
- **Whop embedded components 1.2.0** for the payout portal
- **Whop OAuth** (PKCE) for sign-in

## Getting started

You need Node.js 20.9 or newer (Next.js 16 requires it).

**1. Clone and install**

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/linktree-clone
npm install
```

**2. Set up environment variables**

```bash
cp .env.example .env
```

Fill in all values. See `.env.example` for descriptions. You'll need a Whop developer account at [whop.com/developer](https://whop.com/developer).

For local development, use Whop's sandbox: uncomment the `WHOP_OAUTH_BASE`, `WHOP_BASE_URL` and `NEXT_PUBLIC_WHOP_ENV` lines in `.env`. Whop needs an `https://` URL for the OAuth callback, webhooks and the checkout's `redirect_url`, so run ngrok and use its URL for `NEXT_PUBLIC_APP_URL` and `WHOP_REDIRECT_URI`:

```bash
npx ngrok http 3000
```

**3. Run the database migration**

```bash
npx prisma migrate dev
```

**4. Start the dev server**

```bash
npm run dev
```

Open your ngrok URL.

## Environment variables

See `.env.example` for the full list. Key values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `WHOP_CLIENT_ID` | OAuth app client ID |
| `WHOP_CLIENT_SECRET` | OAuth app client secret |
| `WHOP_API_KEY` | Platform API key (all permissions). Creators' connected accounts are created under the account that owns this key |
| `WHOP_OAUTH_BASE` | `https://sandbox-api.whop.com` for sandbox, omit for production |
| `WHOP_BASE_URL` | `https://sandbox-api.whop.com/api/v1` for sandbox, omit for production. The SDK reads no environment variables, so `src/lib/whop.ts` passes it as `baseUrl` |
| `WHOP_WEBHOOK_SECRET` | Webhook signing secret, the raw `ws_` value from the dashboard |
| `SESSION_SECRET` | iron-session encryption key (`openssl rand -base64 32`). Also signs the unlock cookie |
| `NEXT_PUBLIC_APP_URL` | Your app's public `https://` URL (no trailing slash) |
| `NEXT_PUBLIC_WHOP_ENV` | `sandbox` or `production`. Drives the embedded components and the sandbox KYC shortcut |

## Deploying

1. Push to GitHub and import at [vercel.com/new](https://vercel.com/new)
2. Add all env vars with production values (remove sandbox `WHOP_BASE_URL` and `WHOP_OAUTH_BASE`)
3. Run `npx prisma migrate deploy` against your production database
4. Update redirect URI and webhook URL in the Whop dashboard to your production domain

## Project structure

```
src/
  app/
    actions/          # Server actions (creator, links, socials, checkout, earnings)
    api/
      auth/           # OAuth login, callback, logout
      avatar/         # Avatar upload to Vercel Blob
      checkout/verify # Return from Whop's hosted checkout
      earnings/       # KYC return handler
      payout-token/   # Mints access tokens for the payout portal
      webhooks/whop/  # payment.succeeded / payment.failed
    dashboard/        # Creator dashboard (profile, theme, links, socials, earnings, payouts)
    u/[handle]/       # Public profile page
  lib/
    prisma.ts         # Prisma client singleton
    session.ts        # iron-session helpers
    unlock.ts         # Signed unlock cookie
    rate-limit.ts     # In-memory rate limiter
    whop.ts           # Whop SDK client singleton
prisma/
  schema.prisma       # User, Creator, Link, SocialLink, Unlock, WebhookEvent models
```
