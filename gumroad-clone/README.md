# Shelfie (Gumroad Clone)

A multi-seller digital product marketplace where users become sellers, upload files, set prices, and publish to a shared storefront. Buyers browse, purchase, and download products. Built with Next.js 16, Prisma 7, and the Whop SDK.

## Features

- **OAuth Authentication** - Secure login via Whop with PKCE flow
- **Seller Onboarding** - Connected accounts with KYC verification through Whop
- **Product Creation** - Upload files via UploadThing, add descriptions, set prices, publish when ready
- **Draft/Publish Workflow** - Products start as drafts, publish creates a Whop checkout configuration
- **Marketplace** - Search, category filters, pagination, trending products
- **One-Time Purchases** - Free products (instant) and paid products (Whop hosted checkout)
- **File Delivery** - Access-gated download page with purchase verification
- **Cookie Ratings** - Buyers rate products on a 1-5 cookie scale with half-cookie support
- **Like System** - Optimistic like toggle on products
- **Seller Dashboard** - Earnings, sales stats, product management, bio editing
- **Buyer Dashboard** - Purchase history with download links
- **Configurable Platform Fee** - Default 5%, adjustable per environment
- **Payout Portal** - Sellers manage withdrawals through Whop's hosted portal

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework (App Router) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma 7](https://www.prisma.io/) | Database ORM (with driver adapter) |
| [PostgreSQL](https://www.postgresql.org/) | Database (via Neon) |
| [Whop SDK](https://dev.whop.com/) | Payments, OAuth, KYC, connected accounts |
| [UploadThing](https://uploadthing.com/) | File uploads and CDN delivery |
| [Iron Session](https://github.com/vvo/iron-session) | Encrypted cookie sessions |
| [Zod](https://zod.dev/) | Request validation |
| [Tailwind CSS](https://tailwindcss.com/) | Styling |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon recommended)
- [Whop Developer Account](https://sandbox.whop.com/)
- [UploadThing Account](https://uploadthing.com/)

### 1. Clone the repository

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/gumroad-clone
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

In your Whop app settings (sandbox.whop.com > Developer > Your App > OAuth tab), add redirect URIs:

```
http://localhost:3000/api/auth/callback
https://your-domain.com/api/auth/callback
```

### 7. Configure Whop webhooks

In your Whop developer dashboard (sandbox.whop.com > Developer > Webhooks), create a webhook pointing to:

```
https://your-domain.com/api/webhooks/whop
```

Subscribe to the `payment.succeeded` event.

## Project Structure

```
gumroad-clone/
├── prisma/
│   └── schema.prisma              # Database schema (8 models)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/              # OAuth login/callback/logout
│   │   │   ├── products/          # Like, rate, free purchase
│   │   │   ├── sell/              # Onboard, KYC, product CRUD, publish
│   │   │   ├── uploadthing/       # File upload endpoint
│   │   │   └── webhooks/          # Whop payment webhook
│   │   ├── dashboard/             # Buyer dashboard
│   │   ├── products/              # Catalog, detail, download pages
│   │   ├── sell/                  # Seller onboarding, dashboard, product editor
│   │   ├── sellers/               # Public seller profiles
│   │   └── sign-in/               # Sign-in page
│   ├── components/                # Product card, like button, cookie rating, navbar
│   ├── constants/                 # Product categories
│   └── lib/                       # Auth, prisma, session, whop, env, utils
├── guides/                        # Step-by-step tutorial (6 parts)
└── prisma.config.ts               # Prisma CLI configuration
```

## Database Schema

```
User ──────┬──── SellerProfile ──────┬──── Product ──────┬──── ProductFile
           │                         │                    ├──── Like
           │                         │                    ├──── Rating
           │                         │                    └──── Purchase
           │
           ├──── Purchase (links User to Product)
           ├──── Like
           └──── Rating

WebhookEvent (idempotency tracking)
```

## Sandbox vs Production

| Environment | Dashboard | API | Payments |
|-------------|-----------|-----|----------|
| **Sandbox** | sandbox.whop.com | sandbox-api.whop.com | Test cards only |
| **Production** | whop.com | api.whop.com | Real payments |

Set `WHOP_SANDBOX=true` for development. Remove it for production.

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

This project is for **educational purposes only** and is not intended for production use. It demonstrates core concepts for building a digital product marketplace but omits certain security hardening and scalability measures that would be required in a real-world application.

## License

MIT

## Acknowledgments

- [Whop](https://whop.com) for the payment infrastructure
- [Vercel](https://vercel.com) for Next.js and hosting
- [Prisma](https://prisma.io) for the ORM
- [UploadThing](https://uploadthing.com) for file uploads
