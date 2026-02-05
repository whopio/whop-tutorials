# Creator Platform (Patreon Clone)

A full-stack subscription platform where creators can monetize content through tiered memberships. Built with Next.js 16, Prisma, and the Whop SDK.

## Features

- **OAuth Authentication** - Secure login via Whop with PKCE flow
- **Creator Registration** - Users can become creators with custom profiles
- **Tiered Subscriptions** - Create multiple pricing tiers (Basic, Premium, VIP, etc.)
- **Content Gating** - Posts locked by tier level, higher tiers access all content below
- **Payment Processing** - Handled by Whop (checkout, webhooks, payouts)
- **KYC Onboarding** - Creator identity verification for payouts
- **Subscription Management** - Users can view and cancel subscriptions

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework (App Router) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma](https://www.prisma.io/) | Database ORM |
| [PostgreSQL](https://www.postgresql.org/) | Database |
| [Whop SDK](https://dev.whop.com/) | Payments, subscriptions, KYC |
| [Iron Session](https://github.com/vvo/iron-session) | Encrypted cookie sessions |
| [Zod](https://zod.dev/) | Request validation |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- [Whop Developer Account](https://dev.whop.com/)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/patreon-clone.git
cd patreon-clone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

Required variables:

```env
# Database
POSTGRES_PRISMA_URL="postgresql://user:password@host:5432/database?pgbouncer=true"
POSTGRES_URL_NON_POOLED="postgresql://user:password@host:5432/database"

# Session (generate with: openssl rand -base64 32)
SESSION_SECRET="your-32-character-minimum-secret-key"

# Whop OAuth & API (from https://dev.whop.com)
WHOP_APP_ID="your-whop-app-id"
WHOP_API_KEY="your-whop-api-key"
WHOP_WEBHOOK_SECRET="your-webhook-secret"
WHOP_COMPANY_ID="your-parent-company-id"

# App URL (no trailing slash)
AUTH_URL="http://localhost:3000"

# Optional
WHOP_SANDBOX="true"  # Set to "true" for sandbox mode
```

### 4. Set up the database

```bash
npx prisma migrate dev
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Configure Whop webhooks

In your Whop developer dashboard, set the webhook URL to:

```
https://your-domain.com/api/webhooks/whop
```

Subscribe to these events:
- `payment.succeeded`
- `membership.cancel_at_period_end_changed`
- `membership.deactivated`

## Project Structure

```
patreon-clone/
├── app/
│   ├── api/                  # API routes
│   │   ├── auth/             # OAuth login/logout/callback
│   │   ├── checkout/         # Payment checkout
│   │   ├── creator/          # Creator management
│   │   ├── subscriptions/    # Subscription management
│   │   └── webhooks/         # Whop webhook handler
│   ├── creator/              # Creator pages (dashboard, profile, posts, tiers)
│   ├── dashboard/            # User dashboard
│   ├── subscribe/            # Subscription checkout flow
│   └── subscriptions/        # User's subscriptions
├── lib/
│   ├── auth.ts               # Session & auth helpers
│   ├── access.ts             # Content access control
│   ├── oauth.ts              # Whop OAuth utilities
│   ├── prisma.ts             # Database client
│   ├── ratelimit.ts          # Rate limiting
│   ├── session.ts            # Session configuration
│   └── whop.ts               # Whop SDK client
├── prisma/
│   └── schema.prisma         # Database schema
└── public/                   # Static assets
```

## Database Schema

```
User ──────┬──── Creator ──────┬──── Tier
           │                   │
           │                   └──── Post
           │
           └──── Subscription ────── (links User to Creator + Tier)
```

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add environment variables
4. Deploy

### Other Platforms

```bash
npm run build
npm start
```

Requires:
- Node.js 18+ runtime
- PostgreSQL database
- Environment variables configured

## Disclaimer

This project is for **educational purposes only** and is not intended for production use. It demonstrates core concepts for building a subscription platform but omits certain security hardening and scalability measures that would be required in a real-world application.

## License

MIT

## Acknowledgments

- [Whop](https://whop.com) for the payment infrastructure
- [Vercel](https://vercel.com) for Next.js and hosting
- [Prisma](https://prisma.io) for the excellent ORM
