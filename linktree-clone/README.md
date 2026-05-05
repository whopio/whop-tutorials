# Linkstacks (Linktree Clone)

A link-in-bio platform where creators publish a public profile of free links and gate premium ones behind a one-time payment. Buyers unlock premium content through Whop hosted checkout. Built with Next.js 16, Prisma, and the Whop SDK.

## Features

- **OAuth Authentication** - Secure login via Whop with PKCE flow
- **Customizable Profile** - Handle, display name, bio, avatar, accent color (six-preset palette)
- **Link Management** - Add, edit, delete, hide, drag-to-reorder, mark as free or premium
- **Public Profile Page** - `/u/[handle]` shows free links to everyone, premium links unlock after payment
- **One-Time Unlock** - Visitors pay once on Whop hosted checkout to reveal all premium links
- **Connected Accounts** - Each creator has their own Whop sub-company under the platform; KYC via Whop's hosted onboarding
- **Sandbox Bypass** - Skips KYC redirect in sandbox so the demo flow is testable end-to-end without real ID verification
- **Application Fee** - Platform takes a configurable flat fee per sale (default $0.50); the rest goes straight to the creator
- **Embedded Payout Portal** - Creators see balance, complete KYC, and withdraw earnings without leaving the dashboard
- **Webhook-Driven Reconciliation** - `payment.succeeded` / `payment.failed` events are signed, idempotent, and the source of truth
- **Live Preview** - Dashboard shows a sticky side-by-side preview of what visitors will see at the public profile

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework (App Router) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma](https://www.prisma.io/) | Database ORM |
| [PostgreSQL](https://www.postgresql.org/) | Database |
| [Whop SDK](https://dev.whop.com/) | Payments, OAuth, KYC, connected accounts, embedded payouts |
| [Iron Session](https://github.com/vvo/iron-session) | Encrypted cookie sessions |
| [Zod](https://zod.dev/) | Request validation |
| [@dnd-kit](https://dndkit.com/) | Drag-and-drop link reordering |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- [Whop Developer Account](https://whop.com/developer)

### 1. Clone the repository

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/linktree-clone
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

See `.env.example` for all required variables and where to find them.

### 4. Set up the database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 6. Configure Whop OAuth

Whop requires an `https://` URL for OAuth callbacks and webhook delivery. For local development, run ngrok to expose your dev server:

```bash
npx ngrok http 3000
```

In your Whop app settings (whop.com/developer → your app → OAuth tab), add the redirect URI:

```
https://your-ngrok-url.ngrok-free.app/api/auth/callback
```

The `WHOP_REDIRECT_URI` env var must match this value exactly.

### 7. Configure Whop webhooks

In your Whop developer dashboard (whop.com/developer → your app → Webhooks), create a webhook pointing to:

```
https://your-ngrok-url.ngrok-free.app/api/webhooks/whop
```

Subscribe to the `payment.succeeded` and `payment.failed` events. **Enable "Connected account events"** so webhooks fire on payments to creators' connected accounts.

## Project Structure

```
linktree-clone/
├── prisma/
│   └── schema.prisma              # Database schema (4 models + WebhookEvent)
├── src/
│   ├── app/
│   │   ├── actions/               # Server actions (creator, links, checkout, earnings)
│   │   ├── api/
│   │   │   ├── auth/              # OAuth login, callback, logout
│   │   │   ├── checkout/verify/   # Post-checkout redirect handler
│   │   │   ├── earnings/complete/ # KYC return handler
│   │   │   ├── payout-token/      # Mints access tokens for the embedded portal
│   │   │   └── webhooks/whop/     # payment.succeeded / payment.failed
│   │   ├── dashboard/             # Creator dashboard (profile, links, earnings, payouts)
│   │   ├── u/[handle]/            # Public profile page
│   │   ├── layout.tsx             # Root layout
│   │   └── page.tsx               # Landing page (hero, handle picker)
│   ├── components/                # Hero cards, profile renderer, signup input
│   └── lib/                       # prisma, session, whop, theme
├── next.config.ts                 # CSP and security headers
└── package.json
```

## Database Schema

```
User ────── Creator ──────┬──── Link
                          ├──── Unlock
                          └──── (whopCompanyId — connected account)

WebhookEvent (idempotency tracking — keyed on Whop event ID)
```

## Sandbox vs Production

| Environment | Dashboard | API | Payments |
|-------------|-----------|-----|----------|
| **Sandbox** | sandbox.whop.com | sandbox-api.whop.com | Test cards only |
| **Production** | whop.com | api.whop.com | Real payments |

Set `NEXT_PUBLIC_WHOP_ENV="sandbox"` and the sandbox `WHOP_BASE_URL` / `WHOP_OAUTH_BASE` values for development. Remove (or switch to `production`) for production.

### Test Cards (Sandbox)

- `4242 4242 4242 4242` - Successful payment
- Any future expiration date and any 3-digit CVC

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables (set `NEXT_PUBLIC_WHOP_ENV=production` and remove `WHOP_BASE_URL` / `WHOP_OAUTH_BASE` for production)
4. Set Whop webhook URL to `https://your-app.vercel.app/api/webhooks/whop` (with **Connected account events** enabled)
5. Set OAuth redirect URI to `https://your-app.vercel.app/api/auth/callback`
6. Deploy

### Other Platforms

```bash
npm run build
npm start
```

Requires Node.js 18+ runtime, PostgreSQL database, and all environment variables configured.

## Disclaimer

This project is for **educational purposes only** and is not intended for production use. It demonstrates core concepts for building a link-in-bio platform on top of Whop but omits certain security hardening and scalability measures that would be required in a real-world application.

## License

MIT

## Acknowledgments

- [Whop](https://whop.com) for the payment infrastructure
- [Vercel](https://vercel.com) for Next.js and hosting
- [Prisma](https://prisma.io) for the ORM
