# Whop Linktree Clone

A link-in-bio platform where creators publish free links and gate premium ones behind a one-time payment. Built with Next.js, Prisma, and Whop.

## Stack

- **Next.js 15** (App Router, TypeScript)
- **Prisma** + PostgreSQL
- **Tailwind CSS**
- **Whop SDK** — OAuth, Connected Accounts, Direct Charges, Webhooks, Payout Portal

## Getting started

**1. Clone and install**

```bash
git clone https://github.com/yourname/whop-linktree-clone
cd whop-linktree-clone
npm install
```

**2. Set up environment variables**

```bash
cp .env.example .env
```

Fill in all values — see `.env.example` for descriptions. You'll need a Whop developer account at [whop.com/developer](https://whop.com/developer).

For local development, use Whop's sandbox environment and run ngrok to get a stable `https://` URL:

```bash
npx ngrok http 3000
```

**3. Run the database migration**

```bash
prisma migrate dev
```

**4. Start the dev server**

```bash
npm run dev
```

Visit `http://localhost:3000`.

## Environment variables

See `.env.example` for the full list. Key values:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `WHOP_CLIENT_ID` | OAuth app client ID |
| `WHOP_CLIENT_SECRET` | OAuth app client secret |
| `WHOP_API_KEY` | Platform API key (all permissions) |
| `WHOP_PARENT_COMPANY_ID` | Your platform's Whop company ID |
| `WHOP_WEBHOOK_SECRET` | Webhook signing secret |
| `SESSION_SECRET` | iron-session encryption key (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | Your app's public URL (no trailing slash) |
| `NEXT_PUBLIC_WHOP_ENV` | `sandbox` or `production` |

## Deploying

1. Push to GitHub and import at [vercel.com/new](https://vercel.com/new)
2. Add all env vars with production values (remove sandbox `WHOP_BASE_URL` and `WHOP_OAUTH_BASE`)
3. Run `prisma migrate deploy` against your production database
4. Update redirect URI and webhook URL in the Whop dashboard to your production domain

## Project structure

```
src/
  app/
    actions/          # Server actions (creator, links, checkout, earnings)
    api/
      auth/           # OAuth login, callback, logout
      payout-token/   # Mints access tokens for the payout portal
      webhooks/whop/  # payment.succeeded / payment.failed
    dashboard/        # Creator dashboard (profile, links, earnings, payouts)
    u/[handle]/       # Public profile page
  lib/
    prisma.ts         # Prisma client singleton
    session.ts        # iron-session helpers
    whop.ts           # Whop SDK client singleton
prisma/
  schema.prisma       # User, Creator, Link, Unlock models
```

