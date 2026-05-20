# Stax (Template Marketplace)

A multi-seller marketplace for digital templates where any signed-in user can become a seller through Whop's connected-account flow, upload templates with preview images plus either downloadable files or a share/duplicate URL, and publish for one-time purchase. Buyers browse the Tool x Category catalog, purchase via Whop's hosted checkout, leave star reviews on what they bought, and redeem seller-issued promo codes at checkout. The platform takes a configurable percentage fee (default 5%) via `application_fee_amount` on every paid sale. Built with Next.js 16, Prisma 7, UploadThing, and the Whop SDK.

## Features

- **OAuth Authentication** - Whop OAuth 2.1 with PKCE + nonce, iron-session encrypted cookies
- **Seller Onboarding** - Connected Whop sub-companies via `companies.create({ parent_company_id })`, hosted KYC via `accountLinks.create({ use_case: "account_onboarding" })`, sandbox shortcut that auto-approves KYC for fast dev iteration
- **Multi-Tool Catalog** - Tool axis (Notion, Figma, Webflow, Framer, WordPress, Code, Word, Excel, PowerPoint, AI Prompts) and Category axis (Productivity, Project Management, Landing Pages, Dashboards, Branding, Dev Boilerplates, Marketing, Finance)
- **Hybrid Delivery** - Each template is either a downloadable file bundle or a share URL revealed post-purchase, chosen by the seller at upload time
- **UploadThing Two-Route Pattern** - `preview` (public, 8MB images) and `downloadable` (page-gated, 16MB mixed types) with shared seller-ownership middleware
- **Hosted Checkout with Application Fees** - `products.create` + `checkoutConfigurations.create` with an inline one-time plan, `application_fee_amount` deducts the platform's cut and credits the rest to the seller's connected company
- **Free Templates Bypass Whop** - `price === 0` skips all SDK calls and writes Purchase rows directly
- **Webhook-Driven Reconciliation** - Company-level webhook on the parent company with "Connected account events" enabled, signature-verified `payment.succeeded` upserts the Purchase, dedupes by `event.id`
- **Purchase-Gated Access Pages** - File downloads or revealed share URL, gated by a Purchase row keyed on `(userId, templateId)`
- **Verified-Buyer Star Reviews** - 1-5 stars with optional title + body, one review per buyer per template, sellers can't review their own work, aggregate ratings computed per request
- **Seller-Issued Promo Codes** - `whop.promoCodes.list / create / delete` routed directly through the Whop SDK; no local mirror. 100%-off codes are explicitly rejected on paid plans because they break `application_fee_amount` math
- **Embedded Payout Portal** - `accountLinks.create({ use_case: "payouts_portal" })` returns a hosted URL sellers visit to withdraw earnings
- **Custom Pagination + Search + Filters** - `/templates` supports Tool, Category, full-text search, and sort, all from `searchParams` with no extra state library

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | App Router, React 19, Turbopack |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma 7](https://www.prisma.io/) | ORM with `@prisma/adapter-pg` driver adapter, `prisma-client` generator output to `src/generated/prisma` |
| [PostgreSQL](https://www.postgresql.org/) (via [Neon](https://neon.tech/)) | Cloud database, provisioned through Vercel Marketplace |
| [Whop SDK](https://dev.whop.com/) | OAuth, connected accounts, products, checkout configurations, webhooks, promo codes, payouts portal |
| [UploadThing](https://uploadthing.com/) | File storage for preview images + downloadable bundles (16MB max) |
| [Iron Session](https://github.com/vvo/iron-session) | Encrypted cookie sessions, no DB session table |
| [Zod 4](https://zod.dev/) | Runtime validation at API boundaries; lazy Proxy for env var schema |
| [Tailwind CSS v4](https://tailwindcss.com/) | CSS-first theming via `@theme` |
| [next-themes](https://github.com/pacocoursey/next-themes) | System/light/dark theme toggle |
| [Vercel](https://vercel.com/) | Hosting; build configured via TypeScript `vercel.ts` |

## Getting Started

### Prerequisites

- Node.js 18+
- A [Vercel](https://vercel.com) account (Neon is provisioned through the Vercel Marketplace)
- A [Whop sandbox](https://sandbox.whop.com) account for development
- An [UploadThing](https://uploadthing.com) account

### 1. Clone the repository

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/template-marketplace
```

### 2. Install dependencies

```bash
npm install
```

### 3. Provision Neon through Vercel

Connect a Vercel project to this repo. Storage > Create Database > Neon. The integration auto-populates `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct, used by Prisma CLI) across all environments.

### 4. Set up environment variables

```bash
cp .env.example .env.local
```

Open `.env.local` and fill in:

- `DATABASE_URL` and `DATABASE_URL_UNPOOLED` - pulled from Vercel via `vercel env pull .env.local`
- `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET` - sandbox.whop.com > Developer > your app > OAuth tab
- `WHOP_API_KEY` - sandbox.whop.com > Developer > your app > API Keys (App API Key)
- `WHOP_COMPANY_API_KEY` - sandbox.whop.com > Business Settings > API Keys (Company API Key with `access_pass:create`)
- `WHOP_COMPANY_ID` - the parent company ID, starts with `biz_`, copied from the dashboard URL
- `WHOP_WEBHOOK_SECRET` - Developer > Webhooks > the company-level webhook secret, starts with `whsec_`
- `SESSION_SECRET` - generate with `openssl rand -base64 32`
- `NEXT_PUBLIC_APP_URL` - `http://localhost:3000` in dev, your Vercel URL in production
- `UPLOADTHING_TOKEN` - uploadthing.com > your project > settings
- `WHOP_SANDBOX` - `true` in development, unset in production
- `PLATFORM_FEE_PERCENT` - default `5`

### 5. Configure the Whop sandbox app

In `sandbox.whop.com`:

1. **Create a whop** and copy the company ID (`biz_...`) from the dashboard URL to `WHOP_COMPANY_ID`. Every seller's sub-company is created under this parent.
2. **Developer > Create app**. Copy Client ID, Client Secret, and the App API Key.
3. **OAuth tab > Redirect URIs** > add `http://localhost:3000/api/auth/callback` and `https://<your-vercel-url>.vercel.app/api/auth/callback`. Enable the `oauth:token_exchange` permission.
4. **Business Settings > API Keys** > create a Company API Key with all permissions enabled (in particular `access_pass:create`). Copy to `WHOP_COMPANY_API_KEY`.
5. **Developer > Webhooks** > create a webhook pointing to `https://<your-vercel-url>.vercel.app/api/webhooks/whop`. Subscribe to `payment.succeeded`. **Enable "Connected account events"** so payments to sellers' sub-companies fire on this single platform-level webhook. Copy the signing secret to `WHOP_WEBHOOK_SECRET`.

### 6. Push the database schema

```bash
npx prisma generate
npx prisma db push
```

### 7. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

```
template-marketplace/
|-- prisma/
|   `-- schema.prisma                  # 7 models (User, SellerProfile, Template, TemplateFile, Purchase, Review, WebhookEvent)
|-- src/
|   |-- app/
|   |   |-- page.tsx                   # Landing
|   |   |-- sign-in/                   # OAuth start CTA
|   |   |-- templates/                 # Catalog, detail, access page, review form
|   |   |-- sellers/[username]/        # Public seller profile
|   |   |-- sell/                      # Become-a-seller landing, dashboard, template editor
|   |   |-- dashboard/                 # Buyer purchase history
|   |   `-- api/
|   |       |-- auth/{login,callback,logout}/
|   |       |-- sell/{onboard,payouts,templates/...}/
|   |       |-- templates/[id]/{purchase,reviews}/
|   |       |-- uploadthing/
|   |       `-- webhooks/whop/         # payment.succeeded receiver
|   |-- components/                    # Header, Footer, TemplateCard, PromoCodesPanel, ReviewForm, etc.
|   |-- constants/                     # Tool/Category enum metadata + lookup helpers
|   `-- lib/
|       |-- env.ts                     # Zod env schema (lazy Proxy)
|       |-- prisma.ts                  # Singleton with PrismaPg driver adapter
|       |-- session.ts                 # iron-session config
|       |-- auth.ts                    # requireAuth / requireSeller / isAuthenticated
|       |-- whop.ts                    # whopApp + whopCompany (sandbox-aware)
|       |-- uploadthing.ts             # Typed React helpers
|       |-- slug.ts                    # Unique template slug generation
|       |-- username.ts                # Unique seller username generation
|       `-- templates.ts               # Shared list query (filters + pagination + ratings)
|-- next.config.ts
|-- prisma.config.ts                   # Prisma 7 CLI config (loads .env.local, falls back when DATABASE_URL_UNPOOLED missing)
|-- vercel.ts                          # buildCommand: prisma generate + db push + next build
`-- package.json
```

## Database Schema

```
User --- SellerProfile --- Template --- TemplateFile
  |          |                |
  |          `-- Purchase ----+
  |                |
  `-- Purchase ---+
  |
  `-- Review --- Template

WebhookEvent (standalone idempotency table)
```

Seven models. `User` is keyed by `whopUserId` (the OAuth `sub`). `SellerProfile` holds the seller's `whopCompanyId` (the connected sub-company that owns their products and receives payouts). `Template` carries the Whop product/plan/checkout-URL once published. `TemplateFile.kind` distinguishes preview images from downloadable files. `Purchase` is the buyer's access record, keyed `@@unique([userId, templateId])`. `Review` is purchase-gated, also `@@unique([userId, templateId])`. `WebhookEvent.id` is Whop's event ID, used to dedupe webhook deliveries.

All prices are integer cents.

## Payment Flow

1. **Seller onboards** - `whop.companies.create({ parent_company_id })` creates the sub-company; in sandbox `kycComplete` is set to `true` immediately; in production the seller completes Whop-hosted KYC.
2. **Seller publishes a template** - `whop.products.create({ company_id: seller.whopCompanyId })` then `whop.checkoutConfigurations.create({ plan: { initial_price, application_fee_amount, plan_type: "one_time" }, redirect_url: /templates/[slug]/access })`. The `purchase_url` is stored on the Template.
3. **Buyer pays** - clicks Buy on `/templates/[slug]`, gets redirected to `whopCheckoutUrl`. Whop processes the payment, deducts the application fee, credits the seller's connected company.
4. **Webhook reconciliation** - `payment.succeeded` fires on the platform-level company webhook (with connected-account events enabled). The handler verifies the signature, dedupes by `event.id`, finds the Template by `whopPlanId`, upserts the buyer's User, and upserts the Purchase.
5. **Buyer accesses** - `/templates/[slug]/access` is gated by a Purchase row keyed on `(session.userId, templateId)`. Renders file downloads or the revealed share URL.
6. **Seller withdraws** - dashboard "Withdraw earnings" button hits `/api/sell/payouts`, which mints a fresh `accountLinks.create({ use_case: "payouts_portal" })` URL. Seller manages their Whop balance via Whop's hosted portal.
7. **Free templates** skip steps 2-4. POST to `/api/templates/[id]/purchase` creates the Purchase directly.
8. **Promo codes** flow through Whop. Seller creates a code via `whop.promoCodes.create({ company_id, product_id, code, promo_type, amount_off })`. Buyer enters the code at Whop's hosted checkout. Whop applies the discount; the application fee stays fixed, so the discount comes out of the seller's revenue, not the platform's.

Edge cases:

- 100%-off percentage codes on paid plans are explicitly rejected at creation time because `application_fee_amount` can't exceed the total. Free distribution should use the free-template path (price = 0) instead.
- Webhook retries are deduped via the `WebhookEvent` primary key (Whop's event ID).
- Hard-deleting a template with any Purchase is rejected with a 409 so buyers don't lose access they paid for. Sellers archive instead, which hides the template but preserves access.

## Sandbox vs Production

| Environment | Dashboard | API | Payments |
|-------------|-----------|-----|----------|
| **Sandbox** | sandbox.whop.com | sandbox-api.whop.com/api/v1 | Test cards only |
| **Production** | whop.com | api.whop.com/api/v1 | Real payments |

Set `WHOP_SANDBOX=true` in `.env.local` during development; the SDK overrides `baseURL` to the sandbox endpoint and the OAuth flow targets the sandbox authorize/token endpoints. Unset `WHOP_SANDBOX` in production to use the live API.

### Test Cards (Sandbox)

- `4242 4242 4242 4242` - Successful payment
- `4000 0000 0000 0002` - Declined payment
- Any future expiration date and any 3-digit CVC

## Deployment (Vercel)

1. Push to GitHub.
2. Import the project in [Vercel](https://vercel.com).
3. Add the Neon integration (Storage > Create Database > Neon). It auto-populates `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.
4. Add all other environment variables from `.env.example` in Project Settings > Environment Variables. In production, **omit** `WHOP_SANDBOX`. In preview, set `WHOP_SANDBOX=true` and use sandbox Whop credentials.
5. Update the Whop OAuth redirect URI to your Vercel URL: `https://<your-app>.vercel.app/api/auth/callback`.
6. Update the Whop webhook URL to `https://<your-app>.vercel.app/api/webhooks/whop`. Ensure "Connected account events" is enabled.
7. The build pipeline is configured via `vercel.ts`: `prisma generate && prisma db push && next build`.

For the full sandbox-to-production switch (rotating App + Company API keys, recreating webhooks, swapping `WHOP_COMPANY_ID`), see Section 13 of [`docs/template-marketplace.md`](docs/template-marketplace.md).

## Documentation

- [`docs/template-marketplace.md`](docs/template-marketplace.md) - Condensed reference walkthrough: full code for every Whop SDK interaction (dual-client setup, OAuth callback, onboarding, publish flow, webhook handler, promo codes, payouts portal), Prisma schema, UploadThing two-route pattern, and the 20-item Whop SDK + integration gotchas checklist
- [Whop for Platforms](https://dev.whop.com/) - Official documentation for connected accounts, application fees, and payouts
- [UploadThing docs](https://docs.uploadthing.com/) - File router config, typed React helpers

## Disclaimer

This project is for **educational purposes only** and is not intended for production use as-is. It demonstrates the core marketplace pattern on top of Whop (connected accounts + application fees + hosted checkout + webhooks + promo codes) but omits security hardening, rate-limiting, observability, and scalability measures a real platform would need.

## License

MIT

## Acknowledgments

- [Whop](https://whop.com) for the payment infrastructure
- [UploadThing](https://uploadthing.com) for file storage
- [Neon](https://neon.tech) and [Vercel](https://vercel.com) for the database and hosting
- [Prisma](https://prisma.io) for the ORM
