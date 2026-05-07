# GigFlow (Fiverr Clone)

A freelance services marketplace where verified sellers list tiered gig packages, buyers pay through an in-app checkout with a configurable platform fee, and the two coordinate via embedded chat for the full delivery lifecycle. Built with Next.js 16, Supabase, and the Whop SDK.

## Features

- **Direct Charges with Application Fees** - Buyers pay sellers' connected Whop companies; the platform's cut is captured via `application_fee_amount`
- **Embedded Checkout** - `<WhopCheckoutEmbed />` slides over the gig page; no redirect off the domain
- **Embedded KYC + Payouts** - `<VerifyElement />` and `<PayoutsSession>` keep verification and withdrawals inside the seller dashboard
- **Tiered Gig Packages** - Basic / Standard / Premium tiers with optional add-ons
- **Order Lifecycle State Machine** - Requirements → in_progress → delivered → completed, with revision and dispute branches
- **Embedded Buyer/Seller Chat** - `<ChatElement />` per order with a Supabase Realtime fallback when a user has not linked Whop
- **Whop OAuth (PKCE)** - Login with Whop using chat scopes; email/password through Supabase Auth as a fallback
- **Reviews** - Star ratings on delivered orders with auto-completion when a review is left
- **Webhook-Driven Reconciliation** - Whop SDK signs and verifies every payment, refund, dispute, KYC, and payout event; idempotent and the source of truth
- **Database-Enforced KYC Gate** - A Postgres trigger rejects gig publishes from unverified sellers, even on direct API calls
- **Row Level Security** - Self / participant / admin policies on every table

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework (App Router) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Supabase](https://supabase.com/) | Postgres, Row Level Security, Realtime, Auth |
| [Whop SDK](https://dev.whop.com/) | Payments, OAuth, KYC, connected accounts, embedded payouts, chat |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Whop Developer Account](https://whop.com/developer)

### 1. Clone the repository

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/fiverr-clone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env.local
```

See `.env.example` for all required variables and where to find them.

### 4. Set up the database

Install the Supabase CLI, link your project, and apply the migrations:

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

This applies every file in `supabase/migrations/` in order, including the schema, seed categories, RLS policies, and the KYC enforcement trigger.

Optional: seed demo gigs, sellers, and reviews.

```bash
npm run seed:gigs
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Configure Whop

This app uses Whop sandbox mode by default. Use [sandbox.whop.com](https://sandbox.whop.com) for development and switch to production once you are live.

#### API key and platform company

1. In your Whop dashboard, copy your platform parent company ID from the URL (`biz_xxxxxxxxxxxx`) into `WHOP_PLATFORM_COMPANY_ID`.
2. **Developer → API Keys → Create** — generate a Company API key with payments, KYC, and payouts permissions. Set as `WHOP_API_KEY`.
3. If your Company key cannot grant `dms:channel:manage`, create a Whop App and use its API key as `WHOP_APP_API_KEY` for chat routes.

#### OAuth

1. **Developer → Apps → OAuth** — create or open your OAuth app.
2. Register redirect URIs:
   - `http://localhost:3000/api/auth/callback/whop` for development
   - `https://your-app.vercel.app/api/auth/callback/whop` for production
3. Copy the client ID and secret into `WHOP_OAUTH_CLIENT_ID` / `WHOP_OAUTH_CLIENT_SECRET`.
4. Enable scopes: `openid`, `profile`, `email`, `chat:read`, `chat:message:create`, `dms:read`, `dms:message:manage`, `dms:channel:manage`, `support_chat:read`, `support_chat:message:create`.

The `scripts/create-whop-oauth-app.js` helper can create or update the app via API if you prefer to manage it from code.

#### Webhooks

1. **Developer → Webhooks → Create** — point the endpoint at `https://your-app.vercel.app/api/webhooks/whop`.
2. Subscribe to: `payment_succeeded`, `payment_failed`, `payment_pending`, `refund_created`, `refund_updated`, `dispute_created`, `dispute_updated`, `dispute_alert_created`, `verification_succeeded`, `payout_method_created`, `withdrawal_created`, `withdrawal_updated`.
3. Copy the signing secret into `WHOP_WEBHOOK_SECRET`. The handler verifies every request via the Whop SDK before acting on it.

## Project Structure

```
fiverr-clone/
├── docs/
│   ├── fiverr-clone.md            # Full build walkthrough (data model, payment flow, KYC, chat)
│   └── WHOP_CHAT_SETUP.md         # Chat token + DM channel deep-dive
├── public/                        # Demo images, Whop brandmarks, static assets
├── scripts/
│   ├── check-whop-kyc.js          # Reconcile seller KYC status against Whop ledger
│   ├── create-whop-oauth-app.js   # Create/update the Whop OAuth app via API
│   ├── demo-gigs-from-design.ts   # Seed demo users, gigs, reviews from the design system
│   ├── get-whop-oauth-secret.js   # Fetch the OAuth client secret for an existing app
│   ├── seed-gigs-and-reviews.ts   # Seed five gigs across categories with reviews
│   └── test-whop-dm-channel.sh    # Manually exercise the Create DM channel endpoint
├── src/
│   ├── app/
│   │   ├── (auth)/login/          # Email/password + Continue with Whop
│   │   ├── account/               # Authenticated buyer landing page
│   │   ├── sell/
│   │   │   ├── onboarding/        # Connected company creation + embedded KYC
│   │   │   ├── dashboard/         # Seller workspace, balance, payout methods
│   │   │   └── orders/[id]/       # Seller-side order workspace
│   │   ├── orders/[id]/           # Buyer-side order workspace
│   │   ├── checkout/complete/     # Post-payment confirmation
│   │   └── api/
│   │       ├── auth/whop/         # OAuth authorize + callback (PKCE)
│   │       ├── sell/              # Onboard, KYC sync, payouts token, withdraw
│   │       ├── checkout/          # Create + confirm checkout configurations
│   │       ├── orders/[id]/       # Requirements, deliver, revision, accept, review
│   │       ├── webhooks/whop/     # Signed Whop webhook receiver
│   │       └── chat/token + token/ # Mint Whop access tokens for embedded chat
│   ├── components/                # UI: gigs, orders, chat, profile, admin
│   └── lib/                       # Whop client, Supabase clients, env validation
└── supabase/
    ├── config.toml
    └── migrations/                # Schema, RLS policies, KYC trigger, category seeds
```

## Database Schema

```
profiles ───── seller_accounts ─── gigs ──────┬─── gig_packages
                                              ├─── gig_extras
                                              └─── orders ──┬── order_requirements
                                                            ├── order_deliveries
                                                            ├── order_messages
                                                            └── reviews

whop_checkout_configs / whop_payments / webhook_events  (idempotent payment reconciliation)
notifications                                            (in-app notifications)
```

## Sandbox vs Production

| Environment | Dashboard | API | Payments |
|-------------|-----------|-----|----------|
| **Sandbox** | sandbox.whop.com | sandbox-api.whop.com | Test cards only |
| **Production** | whop.com | api.whop.com | Real payments |

Set `NEXT_PUBLIC_WHOP_ENVIRONMENT="sandbox"` for development and switch to `production` when you go live. The embedded components and SDK both read this value to point at the right API.

### Test Cards (Sandbox)

- `4242 4242 4242 4242` - Successful payment
- Any future expiration date and any 3-digit CVC

## Deployment

### Vercel (Recommended)

1. Push this directory to a GitHub repo (or import the parent `whop-tutorials` repo and deploy this subdirectory).
2. Add every variable from `.env.example` to **Settings → Environment Variables** for **Production** and **Preview**.
3. Set `NEXT_PUBLIC_APP_URL` to your canonical production URL (e.g. `https://your-app.vercel.app`) so OAuth redirects never use a preview deployment URL that might require login.
4. After deploying, register the production redirect URI in your Whop OAuth app and the production webhook URL in **Developer → Webhooks**.

### Other Platforms

```bash
npm run build
npm start
```

Requires Node.js 18+ runtime, a Supabase project, and all environment variables configured.

## Documentation

- [`docs/fiverr-clone.md`](docs/fiverr-clone.md) - Full walkthrough of the build: data model, payment flow, KYC enforcement, chat integration
- [`docs/WHOP_CHAT_SETUP.md`](docs/WHOP_CHAT_SETUP.md) - Chat token strategies and the `WHOP_APP_API_KEY` fallback
- [Whop for Platforms](https://docs.whop.com/payments/platforms/about) - Official documentation for connected accounts, application fees, and payouts

## Disclaimer

This project is for **educational purposes only** and is not intended for production use. It demonstrates core concepts for building a services marketplace on top of Whop but omits certain security hardening and scalability measures that would be required in a real-world application.

## License

MIT

## Acknowledgments

- [Whop](https://whop.com) for the payment infrastructure
- [Supabase](https://supabase.com) for the database, auth, and realtime layer
- [Vercel](https://vercel.com) for Next.js and hosting
