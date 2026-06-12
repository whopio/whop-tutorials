# Cuppa — a Ko-fi clone built with Next.js and Whop

Cuppa is a creator support platform (a Ko-fi clone). Fans send one-time tips (the price of a coffee),
join monthly memberships, and buy from a shop; creators publish posts (public or supporter-only),
set donation goals, and withdraw earnings on-site. Authentication is Whop OAuth; payments and payouts
run on Whop connected accounts with embedded checkout and an on-site payout portal.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Prisma 5 · Postgres · iron-session ·
Zod · Whop SDK (`@whop/sdk`, `@whop/checkout`, `@whop/embedded-components-*`) · Vercel.

## Prerequisites
- Node.js 18+ and npm
- A Postgres database (local or cloud, e.g. Neon)
- A Whop account (use the sandbox at https://sandbox.whop.com while developing)

## Environment
Copy `.env.example` to `.env` and fill it in:

- `DATABASE_URL` — Postgres connection string
- `SESSION_SECRET` — 32+ random chars (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
- `NEXT_PUBLIC_APP_URL` — `http://localhost:3005` in dev
- `WHOP_SANDBOX` — `"true"` in dev
- `WHOP_PLATFORM_COMPANY_ID` / `NEXT_PUBLIC_WHOP_COMPANY_ID` — your Whop company id (`biz_…`)
- `WHOP_CLIENT_ID` / `NEXT_PUBLIC_WHOP_APP_ID` — your Whop app id (`app_…`)
- `WHOP_CLIENT_SECRET` — your app's OAuth client secret
- `WHOP_COMPANY_API_KEY` — your Company API key (`apik_…`)
- `WHOP_WEBHOOK_SECRET` — webhook signing secret (set after creating the webhook)
- `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` — platform application fee (default `5`)

Register `http://localhost:3005/oauth/callback` as a redirect URI on your Whop app's OAuth settings,
and enable the `oauth:token_exchange` permission.

## Run (local)
```bash
npm install
npx prisma migrate dev      # create the database tables
npm run dev                 # http://localhost:3005
```

## Notes
- Dev runs on **port 3005** to match the registered OAuth redirect URI.
- The embedded payout portal works in sandbox and production alike, as long as the Company API key has the
  payout scopes (`company:balance:read`, `payout:account:read`, `payout:destination:read`,
  `payout:transfer:read`, `payout:transfer_funds`). Whop's sandbox never credits the connected company's
  ledger, so the payouts page shows the creator's earned total from the app's own database as the headline.
- To deploy: push to GitHub, import to Vercel, attach a Neon Postgres database, set the env vars (with
  production Whop keys for production), add your production `/oauth/callback` redirect URI, and create a
  payments webhook pointing at `https://<your-domain>/api/webhooks/whop`.
