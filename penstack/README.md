# Penstack (Substack Clone)

A full-stack newsletter and publishing platform where writers monetize content through paid subscriptions. Built with Next.js 16, Prisma 7, and the Whop SDK.

## Features

- **OAuth Authentication** - Secure login via Whop with PKCE flow
- **Writer Registration** - Users create publications with custom handles and profiles
- **Rich Text Editor** - Tiptap-based editor with formatting toolbar, image uploads, and paywall breaks
- **Content Gating** - Free, paid, and preview visibility modes with server-side enforcement
- **Payment Processing** - Handled by Whop (checkout, webhooks, payouts via Direct Charge)
- **KYC Onboarding** - Writer identity verification for receiving payouts
- **Subscriptions** - Monthly recurring billing with Whop Payments Network
- **Explore Page** - Trending writers, category filtering, cursor-paginated post feed
- **Social Features** - Follow writers, like posts, in-app notifications
- **Embedded Chat** - Whop-powered community chat on writer profiles

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework (App Router) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma 7](https://www.prisma.io/) | Database ORM (with driver adapter) |
| [PostgreSQL](https://www.postgresql.org/) | Database (via Supabase) |
| [Whop SDK](https://dev.whop.com/) | Payments, subscriptions, OAuth, KYC |
| [Tiptap](https://tiptap.dev/) | Rich text editor |
| [UploadThing](https://uploadthing.com/) | File uploads |
| [Iron Session](https://github.com/vvo/iron-session) | Encrypted cookie sessions |
| [Zod](https://zod.dev/) | Request validation |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Supabase recommended)
- [Whop Developer Account](https://sandbox.whop.com/)
- [UploadThing Account](https://uploadthing.com/)

### 1. Clone the repository

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/penstack
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
npx prisma db push
```

### 5. (Optional) Seed demo data

To populate the app with demo writers and posts:

```bash
npm run db:seed
```

To enable real Whop checkout for seeded writers, set `SEED_EMAIL` in your `.env` to a real email address. The seed script will create Whop sandbox companies for each demo writer. Without it, seeded writers use the demo subscribe fallback.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Configure Whop webhooks

In your Whop developer dashboard (sandbox.whop.com > Dashboard > Developer), create a company-level webhook pointing to:

```
https://your-domain.com/api/webhooks/whop
```

Subscribe to these events:
- `payment.succeeded`
- `membership.activated`

## Project Structure

```
penstack/
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Demo data seed script
├── src/
│   ├── app/
│   │   ├── [writer]/          # Writer profile + article pages
│   │   ├── api/
│   │   │   ├── auth/          # OAuth login/callback
│   │   │   ├── checkout/      # Whop checkout creation
│   │   │   ├── demo/          # Demo subscribe (for seeded writers)
│   │   │   ├── posts/         # CRUD + like toggle
│   │   │   ├── webhooks/      # Whop webhook handler
│   │   │   └── writers/       # Writer CRUD + KYC + follow
│   │   ├── dashboard/         # Writer dashboard
│   │   ├── settings/          # Profile & KYC settings
│   │   └── write/             # Post editor
│   ├── components/
│   │   ├── chat/              # Embedded Whop chat
│   │   ├── demo/              # Demo mode modal
│   │   ├── editor/            # Tiptap editor + toolbar
│   │   ├── explore/           # Feed, trending, categories
│   │   ├── post/              # Post card, content, like, paywall
│   │   ├── settings/          # Onboarding, profile, KYC
│   │   ├── ui/                # Nav, footer, notifications
│   │   └── writer/            # Writer header, subscribe, card
│   ├── constants/             # Categories, config (platform fee)
│   ├── lib/                   # Auth, prisma, session, whop, utils
│   └── services/              # Business logic (posts, writers, etc.)
└── guides/                    # Step-by-step tutorial
```

## Database Schema

```
User ──────┬──── Writer ──────┬──── Post ────── Like
           │                  │
           │                  ├──── Subscription
           │                  │
           │                  └──── Follow
           │
           ├──── Subscription (links User to Writer)
           ├──── Follow
           ├──── Like
           └──── Notification

WebhookEvent (idempotency tracking)
```

## Sandbox vs Production

| Environment | Dashboard | API | Payments |
|-------------|-----------|-----|----------|
| **Sandbox** | sandbox.whop.com | sandbox-api.whop.com | Test cards only |
| **Production** | whop.com | api.whop.com | Real payments |

Set `WHOP_SANDBOX="true"` for development. Remove it for production.

### Test Cards (Sandbox)
- `4242 4242 4242 4242` - Successful payment
- Any future expiration date and any 3-digit CVC

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables (remove `WHOP_SANDBOX` for production)
4. Set Whop webhook URL to `https://your-app.vercel.app/api/webhooks/whop`
5. Set OAuth redirect URL to `https://your-app.vercel.app/api/auth/callback`
6. Deploy

### Other Platforms

```bash
npm run build
npm start
```

Requires Node.js 18+ runtime, PostgreSQL database, and all environment variables configured.

## Disclaimer

This project is for **educational purposes only** and is not intended for production use. It demonstrates core concepts for building a subscription publishing platform but omits certain security hardening and scalability measures that would be required in a real-world application.

## License

MIT

## Acknowledgments

- [Whop](https://whop.com) for the payment infrastructure
- [Vercel](https://vercel.com) for Next.js and hosting
- [Prisma](https://prisma.io) for the ORM
- [Tiptap](https://tiptap.dev) for the rich text editor
