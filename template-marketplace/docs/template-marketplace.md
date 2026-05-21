# Stax: Template Marketplace Tutorial (LLM Context)

Condensed reference for building Stax, a multi-seller marketplace for digital templates (Notion, Figma, Webflow, Framer, WordPress, code, Word, Excel, PowerPoint, AI prompts) built on Next.js and Whop. Non-obvious code (Whop SDK calls, dual-client setup, OAuth/PKCE, webhook handler, UploadThing two-route pattern, promo codes, payouts portal, the publish flow with `application_fee_amount`) is included in full. Standard React/Next.js UI files are described in prose so the LLM can generate them.

---

## 1. Overview

**Product:** Stax, a multi-seller marketplace where any signed-in user can become a seller through Whop's connected-account flow, upload digital templates with preview images and either downloadable files or a share/duplicate URL, publish for one-time purchase, and earn a payout via Whop's hosted portal. Buyers browse the Tool × Category catalog, pay via Whop's embedded checkout (the iframe renders inside Stax — buyers never leave the site), leave star reviews on what they bought, and redeem seller-issued promo codes at checkout.

**Business model:** Direct charges with application fees via Whop for Platforms.

- One-time payment per template (no subscriptions, no license tiers, no recurring billing)
- Platform takes a configurable percentage fee (default 5% via `PLATFORM_FEE_PERCENT`) on every paid sale
- Sellers withdraw earnings through Whop's hosted payout portal (linked via `accountLinks.create({ use_case: "payouts_portal" })`)
- Promo codes are issued by sellers through `whop.promoCodes.create` and live in Whop only — no local mirror

**Tech stack**

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router), React 19, Turbopack |
| Styling | Tailwind CSS v4 (CSS-first via `@theme`), `lucide-react` |
| Auth | Whop OAuth 2.1 (PKCE + nonce) + iron-session 8 (encrypted cookie, no DB sessions) |
| Payments | Whop for Platforms: `companies.create`, `products.create`, `checkoutConfigurations.create` with `application_fee_amount` on an inline one-time plan; embedded checkout via `@whop/checkout/react` |
| Promo codes | Whop Promo Codes API — `promoCodes.list / create / delete`, no local model |
| Payouts | Whop hosted payout portal via `accountLinks.create({ use_case: "payouts_portal" })` |
| Database | PostgreSQL via Neon (Vercel Marketplace integration, cloud-only) |
| ORM | Prisma 7 with `@prisma/adapter-pg` driver adapter (no native binary; `prisma-client` generator outputs to `src/generated/prisma`) |
| File storage | UploadThing 7 — two typed file routes (`preview` public, `downloadable` page-gated), 16MB max |
| Validation | Zod 4 (lazy Proxy for env vars, runtime validation on API boundaries) |
| Deployment | Vercel, build configured via `vercel.ts` (TypeScript) |

**Pages**

- `/` — Landing page: hero, search, trending templates, tool-bucket cards, seller CTA
- `/sign-in` — Whop OAuth start (just a CTA, the real flow lives in `/api/auth/login`)
- `/templates` — Catalog with Tool × Category filters, full-text search, custom pagination
- `/templates/[slug]` — Template detail with preview gallery, delivery indicator, price + Buy/Get-free button, reviews list, ratings summary
- `/templates/[slug]/checkout` — Embedded Whop checkout (`@whop/checkout/react`'s `<WhopCheckoutEmbed>` iframe) for paid templates; auth-gated and bounces existing buyers to `/access`
- `/templates/[slug]/access` — Purchase-gated page: file download list or revealed share URL
- `/templates/[slug]/review/new` — Purchase-gated review form (1–5 stars + optional title/body)
- `/sellers/[username]` — Public seller profile (headline, bio, published templates)
- `/sell` — Become a seller landing (Whop connected-account onboarding CTA)
- `/sell/dashboard` — Seller dashboard: earnings stats, template management table, payouts CTA, link to bio editor
- `/sell/templates/new` — Create-template form (tool, category, delivery type, price)
- `/sell/templates/[id]/edit` — Edit form: copy, files (uploads + reorder + delete), share URL, publish/unpublish/archive/delete, promo codes panel
- `/dashboard` — Buyer dashboard: purchase history with quick links to each `/access` page

**API routes**

- `GET /api/auth/login` — Generates PKCE verifier + challenge, `state`, `nonce`, sets two short-lived httpOnly cookies (verifier + state), redirects to `/oauth/authorize`
- `GET /api/auth/callback` — Verifies state cookie, exchanges code for tokens (JSON body, `client_secret` required even with PKCE), fetches `/oauth/userinfo`, upserts User by `whopUserId`, writes iron-session cookie, redirects home
- `POST /api/auth/logout` — Destroys session, redirects home (POST-only so RSC link prefetch can't log users out)
- `POST /api/sell/onboard` — Creates the seller's connected company via `whop.companies.create({ parent_company_id })`, creates the SellerProfile row, in sandbox marks KYC complete immediately; in production returns a Whop-hosted `accountLinks.create({ use_case: "account_onboarding" })` URL
- `POST /api/sell/payouts` — Mints a `accountLinks.create({ use_case: "payouts_portal" })` URL for the dashboard "Withdraw" button
- `POST /api/sell/templates` — Create draft template (validated with Zod, generates unique slug)
- `PATCH /api/sell/templates/[id]` — Update template fields
- `DELETE /api/sell/templates/[id]` — Hard delete (only allowed when zero purchases; otherwise tells the seller to archive)
- `POST /api/sell/templates/[id]/archive` — Soft archive (buyers keep access; product hidden from marketplace)
- `DELETE /api/sell/templates/[id]/archive` — Un-archive back to DRAFT (must republish to make purchasable)
- `POST /api/sell/templates/[id]/publish` — Validates the template is ready, creates the Whop product + checkout configuration with `application_fee_amount`, stores `whopProductId / whopPlanId / whopCheckoutUrl`. Free templates skip all Whop calls and just flip status to PUBLISHED
- `DELETE /api/sell/templates/[id]/files/[fileId]` — Delete a preview or downloadable file row; falls back the thumbnail to the next preview if needed
- `GET / POST /api/sell/templates/[id]/promo-codes` — Lists / creates promo codes by routing directly to `whopCompany.promoCodes`. No DB writes
- `DELETE /api/sell/templates/[id]/promo-codes/[codeId]` — Archives a promo code via `whopCompany.promoCodes.delete`
- `POST /api/templates/[id]/purchase` — Free-template direct purchase (skips Whop entirely, just creates a Purchase row)
- `POST / DELETE /api/templates/[id]/reviews` — Purchase-gated upsert / delete of the buyer's review
- `GET / POST /api/uploadthing` — UploadThing route handler bound to the typed `ourFileRouter`
- `POST /api/webhooks/whop` — Verifies the Whop signature, dedupes by event ID, handles `payment.succeeded` by upserting the Purchase. Configured as a company-level webhook on the parent platform with "Connected account events" enabled so events from sellers' sub-companies arrive here

**End-to-end flow**

1. Buyer or seller signs in via Whop OAuth (PKCE + nonce). The callback upserts a User row by `whopUserId` (the `sub` from `/oauth/userinfo`) and writes the iron-session cookie.
2. A signed-in user clicks "Become a seller" on `/sell`. The server calls `whopCompany.companies.create({ parent_company_id: WHOP_COMPANY_ID })`. In sandbox the SellerProfile is saved with `kycComplete: true` immediately; in production the server creates the row in pending KYC state and redirects the seller to `whopCompany.accountLinks.create({ use_case: "account_onboarding" }).url`. The `/sell/onboard/complete` return URL flips `kycComplete` and lands the seller on `/sell/dashboard`.
3. The seller creates a draft template (title, description, price, tool, category, delivery type). The DB row is saved as `status: DRAFT`. They upload preview images on the `preview` UploadThing route (8MB image, public) and either downloadable files on the `downloadable` route (16MB mixed types, page-gated) or a share URL.
4. The seller clicks Publish. The publish route validates that the template has a title, description, at least one preview image, and either at least one downloadable file or a share URL. Free templates (price = 0) skip Whop and flip straight to PUBLISHED. Paid templates trigger `whopCompany.products.create({ company_id: seller.whopCompanyId })` then `whopCompany.checkoutConfigurations.create({ plan: { initial_price, application_fee_amount, plan_type: "one_time" }, redirect_url: /templates/[slug]/access })`. The resulting `purchase_url` is saved on the Template as `whopCheckoutUrl`.
5. A buyer hits `/templates/[slug]`, clicks Buy, and is sent to `/templates/[slug]/checkout`. That page renders `<WhopCheckoutEmbed planId={template.whopPlanId}>` from `@whop/checkout/react`, which iframes Whop's checkout UI directly inside Stax — the buyer never leaves the site. Whop processes the payment, deducts the application fee, credits the seller's connected company. On success the embed's `onComplete` callback client-routes to `/templates/[slug]/access`; external payment methods (Apple Pay, Google Pay, PayPal) redirect to the `returnUrl` the embed was given, which is the same access URL.
6. Whop fires `payment.succeeded` to the company-level webhook on the platform parent company. The handler verifies the signature, dedupes by event ID via a `WebhookEvent` insert, finds the Template by `whopPlanId`, upserts the buyer's User (matching `payment.user.id` to `whopUserId`), and upserts the Purchase row by `(userId, templateId)`. The redirect from step 5 and the webhook race; whichever path completes first wins thanks to the upsert.
7. The `/templates/[slug]/access` page does a Purchase lookup keyed on `(session.userId, templateId)`. If present, it renders the list of downloadable files or the revealed share URL.
8. The buyer can leave a 1–5 star review at `/templates/[slug]/review/new`. The API route purchase-gates the write, blocks sellers from reviewing their own work, and upserts on `(userId, templateId)` so one buyer = one review per template. Aggregate ratings are computed per-request via the buyer's template detail page (no denormalized cache).
9. The seller dashboard surfaces earnings (computed by summing `Purchase.pricePaid` minus the platform fee), the template management table, the promo codes panel (every call goes straight to `whopCompany.promoCodes`), and a "Withdraw earnings" button that hits `/api/sell/payouts` to mint a fresh `payouts_portal` Whop-hosted URL.

---

## 2. Setup

### Scaffold

```bash
npx create-next-app@latest stax --ts --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"
cd stax
```

### Dependencies

Install everything upfront so `package.json` stays stable as the project grows.

```bash
npm install @whop/sdk @whop/checkout @prisma/client @prisma/adapter-pg pg iron-session zod \
  lucide-react clsx tailwind-merge dotenv \
  uploadthing @uploadthing/react
npm install -D prisma @types/pg @vercel/config
```

### Environment variables

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon via Vercel Marketplace integration (pooled) |
| `DATABASE_URL_UNPOOLED` | Neon via Vercel Marketplace integration (direct, for CLI) |
| `WHOP_CLIENT_ID` | Whop app → OAuth tab → App ID |
| `WHOP_CLIENT_SECRET` | Whop app → OAuth tab → Client Secret |
| `WHOP_API_KEY` | Whop app → API Keys (App API Key — for OAuth + webhooks) |
| `WHOP_COMPANY_API_KEY` | Business Settings → API Keys (Company API Key — has `access_pass:create`, used for products / plans / promo codes) |
| `WHOP_COMPANY_ID` | The platform's parent company ID (starts with `biz_`) — every seller's sub-company is created under it |
| `WHOP_WEBHOOK_SECRET` | Developer → Webhooks (company-level webhook on the parent company, with "Connected account events" enabled) |
| `SESSION_SECRET` | Generate with `openssl rand -base64 32` (32+ chars) |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL in production; `http://localhost:3000` in dev |
| `UPLOADTHING_TOKEN` | uploadthing.com project settings |
| `WHOP_SANDBOX` | `true` during development (forces SDK to `sandbox-api.whop.com/api/v1`); unset in production |
| `PLATFORM_FEE_PERCENT` | Platform's cut, default `5` |

The tutorial uses **two Whop API keys**. The **App API Key** (`WHOP_API_KEY`) signs OAuth requests and verifies webhooks. The **Company API Key** (`WHOP_COMPANY_API_KEY`) has the `access_pass:create` scope the App key lacks and is the only one that can call `products.create`, `plans.create`, `checkoutConfigurations.create`, and `promoCodes.*`. Both look like `apik_*`; they come from different places in the dashboard.

### Whop developer app setup

Use Whop **sandbox** (`sandbox.whop.com`) throughout development. Production switch happens last.

1. Sign in at `sandbox.whop.com` and create a whop. Copy the company ID from the dashboard URL (`biz_…`) to `WHOP_COMPANY_ID`.
2. Developer → Create app → name it "Stax (Sandbox)". From the app settings page copy Client ID + Client Secret (OAuth tab) and the App API Key (API Keys tab).
3. OAuth tab → Redirect URIs → add `http://localhost:3000/api/auth/callback` and `https://<your-vercel>.vercel.app/api/auth/callback`. Enable the `oauth:token_exchange` permission.
4. Business Settings → API Keys → create a Company API Key with all permissions enabled (in particular `access_pass:create`). Copy to `WHOP_COMPANY_API_KEY`.
5. Developer → Webhooks → New webhook pointing to `https://<your-vercel>.vercel.app/api/webhooks/whop`. Subscribe to `payment.succeeded`. **Enable "Connected account events"** so payments to sellers' sub-companies fire on this single platform-level webhook. Copy the signing secret (starts with `whsec_`) to `WHOP_WEBHOOK_SECRET`.

### UploadThing setup

Create a project at `uploadthing.com`. From the project settings, copy the API token to `UPLOADTHING_TOKEN`. The token is what the SDK uses to authenticate uploads server-side — no separate keys to configure on the dashboard side.

### Vercel build config

Prisma 7 doesn't run `prisma generate` automatically anymore, and Next.js 16 won't import the generated client if it's missing. A TypeScript `vercel.ts` at the project root configures every deploy to regenerate the client and push the schema before `next build`.

`vercel.ts`:

```ts
import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  buildCommand: "prisma generate && prisma db push && next build",
};
```

`prisma.config.ts` keeps the schema URL out of the Prisma datasource (Prisma 7 forbids `url` inside the datasource block) and falls back to a placeholder when `DATABASE_URL_UNPOOLED` isn't in `.env.local` (Vercel marks it Sensitive so it doesn't pull):

```ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "prisma/config";

const url =
  process.env.DATABASE_URL_UNPOOLED ??
  process.env.DATABASE_URL ??
  "postgresql://placeholder:placeholder@localhost:5432/placeholder";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url },
});
```

### Next.js config

`next.config.ts` only needs an `outputFileTracingIncludes` rule if you ship the optional seed-route's font files. For the tutorial without the seed script, an empty `NextConfig` is fine.

### Global CSS

`src/app/globals.css` imports Tailwind and the UploadThing styles, defines the light-mode design tokens via `@theme`, and exposes ten `--color-tool-*` brand colors that drive the tool badges across the marketplace. Dark mode is wired in via a single `@media (prefers-color-scheme: dark) { :root { ... } }` block that overrides the same tokens, plus the Tailwind v4 custom variant `@custom-variant dark (@media (prefers-color-scheme: dark));` so every `dark:` utility class follows the OS preference. No JS-side theme provider — the browser does the resolution natively, which means no hydration race and no need to track theme state. The hero on `/` uses three blurred gradient orbs (`.hero-mesh`).

### Root layout

`src/app/layout.tsx` registers Inter (`--font-sans`) and Space Grotesk (`--font-display`, used for headlines via the `.font-display` utility class) from `next/font/google`, then renders a shared `<Header>` and `<Footer>` around `{children}`. No `<ThemeProvider>` wrapper — dark mode is handled entirely by CSS in `globals.css`.

---

## 3. Database schema

Seven models. `User` is keyed by `whopUserId` (the OAuth `sub`). `SellerProfile` is the creator profile and stores the seller's `whopCompanyId` — the connected sub-company that owns their products and receives payouts. `Template` is the product, with a `Tool` enum (11 values) and a `Category` enum (9 values) feeding the discovery filters and a `DeliveryType` enum picking between file downloads and a revealed share URL. `TemplateFile` holds rows for both preview images (`kind: PREVIEW`) and downloadable files (`kind: DOWNLOAD`). `Purchase` is the buyer's access record (one per `(userId, templateId)`). `Review` is the 1–5 star rating, also one per `(userId, templateId)`. `WebhookEvent` is the idempotency table, primary-keyed on Whop's event ID.

`prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id          String   @id @default(cuid())
  whopUserId  String   @unique
  email       String
  name        String?
  avatar      String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  sellerProfile SellerProfile?
  purchases     Purchase[]
  reviews       Review[]
}

model SellerProfile {
  id            String   @id @default(cuid())
  userId        String   @unique
  username      String   @unique
  headline      String?
  bio           String?
  whopCompanyId String   @unique
  kycComplete   Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  templates Template[]
}

enum Tool {
  NOTION
  FIGMA
  WEBFLOW
  FRAMER
  WORDPRESS
  CODE
  DOCX
  XLSX
  PPTX
  AI_PROMPT
  OTHER
}

enum Category {
  PRODUCTIVITY
  PROJECT_MANAGEMENT
  LANDING_PAGES
  DASHBOARDS
  BRANDING
  DEV_BOILERPLATES
  MARKETING
  FINANCE
  OTHER
}

enum DeliveryType {
  FILE_DOWNLOAD
  SHARE_URL
}

enum TemplateStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum TemplateFileKind {
  PREVIEW
  DOWNLOAD
}

model Template {
  id              String         @id @default(cuid())
  sellerProfileId String
  title           String
  slug            String         @unique
  description     String
  price           Int
  tool            Tool
  category        Category
  deliveryType    DeliveryType
  shareUrl        String?
  content         String?
  thumbnailUrl    String?
  status          TemplateStatus @default(DRAFT)
  whopProductId   String?
  whopPlanId      String?
  whopCheckoutUrl String?
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt

  sellerProfile SellerProfile  @relation(fields: [sellerProfileId], references: [id], onDelete: Cascade)
  files         TemplateFile[]
  purchases     Purchase[]
  reviews       Review[]
}

model TemplateFile {
  id           String           @id @default(cuid())
  templateId   String
  kind         TemplateFileKind
  fileName     String
  fileKey      String           @unique
  fileUrl      String
  fileSize     Int
  mimeType     String
  displayOrder Int              @default(0)

  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)
}

model Purchase {
  id            String   @id @default(cuid())
  userId        String
  templateId    String
  whopPaymentId String?
  pricePaid     Int
  createdAt     DateTime @default(now())

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([userId, templateId])
}

model Review {
  id         String   @id @default(cuid())
  userId     String
  templateId String
  stars      Int
  title      String?
  body       String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  user     User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  template Template @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@unique([userId, templateId])
}

model WebhookEvent {
  id          String   @id
  processedAt DateTime @default(now())
}
```

`price` is integer cents. `whopPaymentId` on `Purchase` is nullable so the free-template direct path can write rows without going through Whop.

---

## 4. Core libraries

### `src/lib/env.ts` — lazy Zod proxy

Variables get validated only when the code path that needs them runs, not at import time. This lets early parts of the build run before later-part env vars exist.

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  WHOP_API_KEY: z.string().min(1),
  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_COMPANY_ID: z.string().min(1),
  WHOP_WEBHOOK_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  WHOP_SANDBOX: z.string().optional(),
  UPLOADTHING_TOKEN: z.string().min(1),
  PLATFORM_FEE_PERCENT: z.string().default("5"),
});

type Env = z.infer<typeof envSchema>;

export const env = new Proxy({} as Env, {
  get(_, key: string) {
    const value = process.env[key];
    const field = envSchema.shape[key as keyof typeof envSchema.shape];
    if (field) field.parse(value);
    return value as Env[keyof Env];
  },
});
```

### `src/lib/whop.ts` — two SDK clients, sandbox-aware

This is the central Stax-specific pattern. `whopApp` is built from the App API Key and is used for OAuth flows + webhook signature verification. `whopCompany` is built from the Company API Key and is used for anything that needs `access_pass:create` (products, plans, checkout configurations, promo codes, payouts portal links). The `baseURL` override has to include the `/api/v1` suffix — the SDK silently falls back to production if it's missing.

```ts
import Whop from "@whop/sdk";

const isSandbox = process.env.WHOP_SANDBOX?.trim() === "true";

// SDK option is `baseURL` (capital URL) and must include the `/api/v1` path.
// Without those two the SDK silently falls back to production.
const baseURL = isSandbox ? "https://sandbox-api.whop.com/api/v1" : undefined;

// Defensive trim on every Whop credential, Vercel's UI silently keeps
// leading/trailing whitespace on paste, which 401s every API call with no
// helpful error.
const appKey = (process.env.WHOP_API_KEY ?? "").trim();
const companyKey = (process.env.WHOP_COMPANY_API_KEY ?? "").trim();
const webhookSecret = (process.env.WHOP_WEBHOOK_SECRET ?? "").trim();
// SDK expects the webhook secret base64-encoded for signature verification.
const webhookKey = webhookSecret
  ? Buffer.from(webhookSecret, "utf-8").toString("base64")
  : undefined;

/**
 * App-key client. Used for OAuth flows + webhook signature verification.
 * Uses WHOP_API_KEY (the App API Key from Developer → Apps).
 */
export const whopApp = new Whop({
  apiKey: appKey,
  ...(webhookKey && { webhookKey }),
  ...(baseURL && { baseURL }),
});

/**
 * Company-key client. Used for operations that need the parent platform
 * Company's permissions: companies.create, accountLinks.create, products.create,
 * checkoutConfigurations.create, promoCodes.*. Uses WHOP_COMPANY_API_KEY
 * (the Company API Key from Business Settings → API Keys), which has the
 * access_pass:create scope the App API Key lacks.
 */
export const whopCompany = new Whop({
  apiKey: companyKey,
  ...(baseURL && { baseURL }),
});

export const whopOauthBaseUrl = isSandbox
  ? "https://sandbox-api.whop.com"
  : "https://api.whop.com";

// Trim defends against whitespace pasted into Vercel env-var UI.
export const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
```

### `src/lib/prisma.ts` — singleton with the `PrismaPg` driver adapter

```ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### `src/lib/session.ts` — iron-session

```ts
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  whopUserId?: string;
  accessToken?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "stax_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
```

### `src/lib/auth.ts` — guards

`requireAuth()` redirects to `/sign-in` if there's no session. `requireSeller()` additionally redirects to `/sell` if the user isn't a seller. `isAuthenticated()` returns the user or null without redirecting (for layouts that need to render both states).

```ts
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getSession } from "./session";

export async function requireAuth() {
  const session = await getSession();
  if (!session.userId) redirect("/sign-in");
  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) redirect("/sign-in");
  return user;
}

export async function isAuthenticated() {
  const session = await getSession();
  if (!session.userId) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function requireSeller() {
  const user = await requireAuth();
  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: user.id },
  });
  if (!seller) redirect("/sell");
  return { user, seller };
}

export async function getSellerProfile(userId: string) {
  return prisma.sellerProfile.findUnique({ where: { userId } });
}
```

### `src/lib/slug.ts` and `src/lib/username.ts`

Both follow the same pattern: slugify the input, try the bare slug, append a random 4–5 char suffix on collision, give up after 6 attempts and fall back to a fully-random slug. `slug.ts.generateSlug(title)` enforces a 60-char max for template slugs; `username.ts.generateUsername(seed)` caps usernames at 24 chars and uses `"seller"` as the fallback root.

### `src/lib/templates.ts` — list query helper

Centralizes the filter + pagination + rating-aggregation query so the catalog page, the seller profile page, and the seller dashboard can share it. Returns `{ items: TemplateCardSummary[], total, page, pageSize }`. The `avgRating` is computed in JS from the included reviews rather than via a separate aggregate query — fine for the tutorial's scale; swap for a denormalized column if your marketplace grows past tens of thousands of templates.

### `src/lib/utils.ts` — `cn` helper

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### `src/constants/categories.ts`

Single source of truth for the `TOOLS` and `CATEGORIES` arrays (with labels, CSS variable names, and tool grouping into `clone` vs `file`). Used by the filter UI, the badges on cards, and the create-template form. `toolByValue` and `categoryByValue` are lookup helpers used by `TemplateCard` and the detail page.

---

## 5. Authentication

Whop OAuth 2.1 mandates PKCE. The `nonce` parameter is also required because we request the `openid` scope, and Whop's `/oauth/token` requires `client_secret` in the body even with PKCE (their own docs page omits it; that's a known footgun documented in the Whop OAuth gotchas list).

### `src/app/api/auth/login/route.ts`

Also accepts a `?redirect_to=<path>` query param so callers (like the "Become a seller" CTA on the homepage) can route the user to a specific landing page after sign-in. The target is validated as a same-origin relative path and stored in a short-lived httpOnly cookie that the callback reads.

```ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { appUrl, whopOauthBaseUrl } from "@/lib/whop";

const VERIFIER_COOKIE = "stax_pkce_verifier";
const STATE_COOKIE = "stax_oauth_state";
const REDIRECT_COOKIE = "stax_oauth_redirect";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Only accept same-origin paths like "/sell" — never absolute URLs or
// protocol-relative URLs ("//evil.com") that could redirect off-site.
function safeRedirectTarget(raw: string | null): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export async function GET(request: NextRequest) {
  const verifier = base64url(randomBytes(32));
  const challenge = base64url(
    createHash("sha256").update(verifier).digest(),
  );
  const state = base64url(randomBytes(16));
  const nonce = base64url(randomBytes(16));

  const params = new URLSearchParams({
    client_id: process.env.WHOP_CLIENT_ID!,
    redirect_uri: `${appUrl}/api/auth/callback`,
    response_type: "code",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  const response = NextResponse.redirect(
    `${whopOauthBaseUrl}/oauth/authorize?${params.toString()}`,
  );

  response.cookies.set(VERIFIER_COOKIE, verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const redirectTo = safeRedirectTarget(
    new URL(request.url).searchParams.get("redirect_to"),
  );
  if (redirectTo) {
    response.cookies.set(REDIRECT_COOKIE, redirectTo, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10,
      path: "/",
    });
  }

  return response;
}
```

### `src/app/api/auth/callback/route.ts`

Token exchange uses **JSON body** with `Content-Type: application/json`. A `application/x-www-form-urlencoded` body returns 400. `client_secret` is required alongside `client_id` and `code_verifier`. Stax fetches `/oauth/userinfo` rather than decoding the `id_token` JWT — both work; userinfo is more forgiving when the JWT layout shifts. After the session is written, the callback reads the `stax_oauth_redirect` cookie (set by the login route) and routes the user to that path; otherwise it falls back to `/`.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appUrl, whopOauthBaseUrl } from "@/lib/whop";

const VERIFIER_COOKIE = "stax_pkce_verifier";
const STATE_COOKIE = "stax_oauth_state";
const REDIRECT_COOKIE = "stax_oauth_redirect";

// Only accept same-origin paths the login route stored — defense in depth
// against a stale cookie that somehow holds an absolute URL.
function safeRedirectTarget(raw: string | undefined): string | null {
  if (!raw) return null;
  if (!raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface UserInfo {
  sub: string;
  name?: string;
  preferred_username?: string;
  picture?: string;
  email?: string;
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  const verifier = request.cookies.get(VERIFIER_COOKIE)?.value;
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;

  if (!code || !verifier || !state || state !== expectedState) {
    return NextResponse.redirect(
      `${appUrl}/sign-in?error=invalid_state`,
    );
  }

  const tokenRes = await fetch(`${whopOauthBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${appUrl}/api/auth/callback`,
      client_id: process.env.WHOP_CLIENT_ID!,
      client_secret: process.env.WHOP_CLIENT_SECRET!,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    const body = await tokenRes.text();
    console.error("Token exchange failed", tokenRes.status, body);
    const detail = encodeURIComponent(`${tokenRes.status}:${body.slice(0, 500)}`);
    return NextResponse.redirect(
      `${appUrl}/sign-in?error=token_exchange&detail=${detail}`,
    );
  }

  const tokens = (await tokenRes.json()) as TokenResponse;

  const userInfoRes = await fetch(`${whopOauthBaseUrl}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    console.error("Userinfo fetch failed", await userInfoRes.text());
    return NextResponse.redirect(
      `${appUrl}/sign-in?error=userinfo`,
    );
  }

  const userInfo = (await userInfoRes.json()) as UserInfo;

  const user = await prisma.user.upsert({
    where: { whopUserId: userInfo.sub },
    create: {
      whopUserId: userInfo.sub,
      email: userInfo.email ?? `${userInfo.sub}@unknown.whop`,
      name: userInfo.name ?? userInfo.preferred_username ?? null,
      avatar: userInfo.picture ?? null,
    },
    update: {
      email: userInfo.email ?? undefined,
      name: userInfo.name ?? userInfo.preferred_username ?? undefined,
      avatar: userInfo.picture ?? undefined,
    },
  });

  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.accessToken = tokens.access_token;
  await session.save();

  const redirectTo =
    safeRedirectTarget(request.cookies.get(REDIRECT_COOKIE)?.value) ?? "/";

  const response = NextResponse.redirect(`${appUrl}${redirectTo}`);
  response.cookies.delete(VERIFIER_COOKIE);
  response.cookies.delete(STATE_COOKIE);
  response.cookies.delete(REDIRECT_COOKIE);
  return response;
}
```

### `src/app/api/auth/logout/route.ts`

POST-only so Next.js's RSC link prefetcher can't sign users out by hovering a logout link.

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { appUrl } from "@/lib/whop";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(
    `${appUrl}/`,
    { status: 303 },
  );
}
```

### Sign-in page

`src/app/sign-in/page.tsx` is a server component that renders a single card with a Stax logo, a heading, and a plain `<a href="/api/auth/login">` (not `<Link>`) styled as a button. Using a plain anchor is intentional — Next.js's RSC prefetch on a `<Link>` to a redirect-issuing route handler triggers a cross-origin fetch to Whop and breaks with CORS.

---

## 6. Seller onboarding

The flow is two-stage in production (create the sub-company, send the seller to Whop-hosted KYC, return-URL flips `kycComplete`) and one-stage in sandbox (Whop's sandbox auto-approves KYC, so we mark the seller complete immediately).

### `src/app/api/sell/onboard/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateUsername } from "@/lib/username";
import { appUrl, whopCompany } from "@/lib/whop";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.userId } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Idempotent: already a seller → just send them to the dashboard
  const existing = await prisma.sellerProfile.findUnique({
    where: { userId: user.id },
  });
  if (existing) {
    return NextResponse.json({ url: "/sell/dashboard" });
  }

  const isSandbox = process.env.WHOP_SANDBOX === "true";

  try {
    // Create the connected company on the platform's parent company
    const company = await whopCompany.companies.create({
      email: user.email,
      title: `${user.name ?? user.email}'s Templates`,
      parent_company_id: process.env.WHOP_COMPANY_ID!,
    });

    const username = await generateUsername(
      user.name ?? user.email.split("@")[0],
    );

    if (isSandbox) {
      await prisma.sellerProfile.create({
        data: {
          userId: user.id,
          username,
          whopCompanyId: company.id,
          kycComplete: true,
        },
      });
      return NextResponse.json({ url: "/sell/dashboard" });
    }

    // Production: create the seller in pending KYC state and hand off to
    // Whop's hosted onboarding.
    await prisma.sellerProfile.create({
      data: {
        userId: user.id,
        username,
        whopCompanyId: company.id,
        kycComplete: false,
      },
    });

    const accountLink = await whopCompany.accountLinks.create({
      company_id: company.id,
      use_case: "account_onboarding",
      return_url: `${appUrl}/sell/onboard/complete?company_id=${company.id}`,
      refresh_url: `${appUrl}/sell?refresh=true`,
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    console.error("Seller onboard failed", { status, message });
    return NextResponse.json(
      { error: "Onboarding failed", detail: message.slice(0, 500), status },
      { status: 500 },
    );
  }
}
```

### `/sell` page

Server component. Calls `requireAuth()` then `getSellerProfile(user.id)` — if the user is already a seller, redirects to `/sell/dashboard`. Otherwise renders an explanation of the connected-account model and a `<BecomeSellerButton>` client component that POSTs to `/api/sell/onboard` and `window.location.assign(url)` on success.

### `/sell/onboard/complete` page (production only)

Server component that reads `company_id` from the query string, finds the SellerProfile by `whopCompanyId`, and updates `kycComplete: true`. The Whop hosted onboarding sends sellers here after they finish KYC. In sandbox this page never fires because `kycComplete` is already true at onboarding time.

---

## 7. File uploads (UploadThing two-route pattern)

UploadThing's typed config requires power-of-2 file sizes; that's why everything is 8MB or 16MB rather than a round 10MB / 20MB. Both routes share the same seller-ownership middleware: the upload is rejected unless the signed-in user owns the template the upload is being attached to.

### `src/app/api/uploadthing/core.ts`

```ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const f = createUploadthing();

const inputSchema = z.object({ templateId: z.string().min(1) });

async function authorizeUpload(templateId: string) {
  const session = await getSession();
  if (!session.userId) throw new UploadThingError("Unauthorized");

  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: {
      id: true,
      sellerProfile: { select: { userId: true } },
    },
  });
  if (!template) throw new UploadThingError("Template not found");
  if (template.sellerProfile.userId !== session.userId) {
    throw new UploadThingError("You don't own this template");
  }
  return { templateId: template.id, userId: session.userId };
}

export const ourFileRouter = {
  // Public preview images shown on the template detail page
  preview: f({
    image: { maxFileSize: "8MB", maxFileCount: 6 },
  })
    .input(inputSchema)
    .middleware(async ({ input }) => authorizeUpload(input.templateId))
    .onUploadComplete(async ({ metadata, file }) => {
      const count = await prisma.templateFile.count({
        where: { templateId: metadata.templateId, kind: "PREVIEW" },
      });
      const created = await prisma.templateFile.create({
        data: {
          templateId: metadata.templateId,
          kind: "PREVIEW",
          fileName: file.name,
          fileKey: file.key,
          fileUrl: file.ufsUrl,
          fileSize: file.size,
          mimeType: file.type,
          displayOrder: count,
        },
      });
      // First preview image becomes the thumbnail by default
      if (count === 0) {
        await prisma.template.update({
          where: { id: metadata.templateId },
          data: { thumbnailUrl: file.ufsUrl },
        });
      }
      return { fileId: created.id, url: file.ufsUrl };
    }),

  // Post-purchase downloadable files
  downloadable: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    video: { maxFileSize: "16MB", maxFileCount: 5 },
    blob: { maxFileSize: "16MB", maxFileCount: 10 },
  })
    .input(inputSchema)
    .middleware(async ({ input }) => authorizeUpload(input.templateId))
    .onUploadComplete(async ({ metadata, file }) => {
      const count = await prisma.templateFile.count({
        where: { templateId: metadata.templateId, kind: "DOWNLOAD" },
      });
      const created = await prisma.templateFile.create({
        data: {
          templateId: metadata.templateId,
          kind: "DOWNLOAD",
          fileName: file.name,
          fileKey: file.key,
          fileUrl: file.ufsUrl,
          fileSize: file.size,
          mimeType: file.type,
          displayOrder: count,
        },
      });
      return { fileId: created.id, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

### `src/app/api/uploadthing/route.ts`

```ts
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({
  router: ourFileRouter,
});
```

### `src/lib/uploadthing.ts` — typed React helpers

```ts
import {
  generateReactHelpers,
  generateUploadButton,
  generateUploadDropzone,
} from "@uploadthing/react";

import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
```

### `TemplateFileUploader` component

`src/components/TemplateFileUploader.tsx` is a client component that takes `templateId`, `kind: "preview" | "downloadable"`, the current files, and a `revalidatePath` server-action prop. Renders an `<UploadDropzone>` from `@/lib/uploadthing` with `endpoint={kind}` and `input={{ templateId }}`, plus the existing files in a sortable grid. Deleting a file calls `DELETE /api/sell/templates/[id]/files/[fileId]`. Reordering updates `displayOrder` via a `PATCH` on each file row (kept out of the shortened guide for brevity; the pattern is standard).

### File delete route

`/api/sell/templates/[id]/files/[fileId]` performs an authorized delete (verifies the file's template belongs to the signed-in seller), then if a `PREVIEW` was deleted falls the template's `thumbnailUrl` back to the next preview by `displayOrder` (or `null` if there are no previews left).

---

## 8. Template creation, editing, and publishing

### Create draft

`POST /api/sell/templates` validates with Zod, generates a unique slug via `generateSlug(title)`, creates a `Template` row with `status: DRAFT`, and returns `{ id, slug }`. The seller is then redirected to `/sell/templates/[id]/edit`.

```ts
// src/app/api/sell/templates/route.ts (POST)
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { generateSlug } from "@/lib/slug";

const createSchema = z.object({
  title: z.string().min(1).max(80),
  description: z.string().max(2000).default(""),
  price: z.number().int().min(0).default(0),
  tool: z.enum([
    "NOTION", "FIGMA", "WEBFLOW", "FRAMER", "CODE",
    "DOCX", "XLSX", "PPTX", "AI_PROMPT", "OTHER",
  ]).default("DOCX"),
  category: z.enum([
    "PRODUCTIVITY", "PROJECT_MANAGEMENT", "LANDING_PAGES", "DASHBOARDS",
    "BRANDING", "DEV_BOILERPLATES", "MARKETING", "FINANCE", "OTHER",
  ]).default("PRODUCTIVITY"),
  deliveryType: z.enum(["FILE_DOWNLOAD", "SHARE_URL"]).default("FILE_DOWNLOAD"),
});

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!seller) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", detail: parsed.error.message },
      { status: 400 },
    );
  }

  const slug = await generateSlug(parsed.data.title);
  const template = await prisma.template.create({
    data: {
      sellerProfileId: seller.id,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      price: parsed.data.price,
      tool: parsed.data.tool,
      category: parsed.data.category,
      deliveryType: parsed.data.deliveryType,
      status: "DRAFT",
    },
  });

  return NextResponse.json({ id: template.id, slug: template.slug });
}
```

### Edit page

`/sell/templates/[id]/edit` is a server component that loads the owned template + files + (if `whopProductId`) the promo codes from Whop. It renders the editor: a `<TemplateForm>` that PATCHes `/api/sell/templates/[id]` per-field, two `<TemplateFileUploader>` instances (preview / downloadable), an optional Share URL input (visible only when `deliveryType === "SHARE_URL"`), a `<PublishButton>` (or "Unpublish" if already published), `<ArchiveButton>` / `<DeleteButton>` (delete is disabled if the template has purchases), and a `<PromoCodesPanel>` (visible once published).

### Update / delete

`PATCH /api/sell/templates/[id]` validates with a partial Zod schema and updates the matching fields. `DELETE /api/sell/templates/[id]` refuses the delete if there are any purchases — buyers paid for access, so we surface a 409 telling the seller to archive instead.

```ts
// DELETE handler — relevant excerpt
const purchaseCount = await prisma.purchase.count({ where: { templateId: id } });
if (purchaseCount > 0) {
  return NextResponse.json(
    {
      error: `This template has ${purchaseCount} ${purchaseCount === 1 ? "purchase" : "purchases"}. Archive it instead so buyers keep access.`,
      purchaseCount,
    },
    { status: 409 },
  );
}
```

### Archive / unarchive

`POST /api/sell/templates/[id]/archive` sets `status: ARCHIVED` (hidden from the marketplace and from public seller profiles; existing buyers keep their access). `DELETE` on the same route flips it back to `DRAFT` so the seller can republish.

### Publish

The heart of the money flow. Validation first (we surface every problem at once for a one-click fix UX), then:

- **Free templates** (`price === 0`): no Whop calls — just flip `status: PUBLISHED`. The free purchase route handles "buying" them later by creating Purchase rows directly.
- **Paid templates**: create the Whop product on the seller's `whopCompanyId` via `whopCompany.products.create`, then create a checkout configuration with an inline one-time plan and `application_fee_amount` set to the platform's cut. The plan's `application_fee_amount` is what makes Whop deduct our fee on every sale and credit the rest to the seller's connected company. `redirect_url` on the checkout config sends buyers to our access page after a successful checkout instead of Whop's default `whop.com/joined/...` page.

```ts
// src/app/api/sell/templates/[id]/publish/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appUrl, whopCompany } from "@/lib/whop";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.template.findFirst({
    where: { id, sellerProfile: { userId: session.userId } },
    include: {
      sellerProfile: true,
      files: true,
    },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  // Surface every problem at once
  const issues: string[] = [];
  if (!template.title?.trim()) issues.push("Title is required");
  if (!template.description?.trim()) issues.push("Description is required");
  const previews = template.files.filter((f) => f.kind === "PREVIEW");
  if (previews.length === 0) issues.push("At least one preview image is required");
  if (template.deliveryType === "FILE_DOWNLOAD") {
    const downloads = template.files.filter((f) => f.kind === "DOWNLOAD");
    if (downloads.length === 0) {
      issues.push("File-download templates need at least one downloadable file");
    }
  } else {
    if (!template.shareUrl?.trim()) {
      issues.push("Share-URL templates need a non-empty share URL");
    }
  }
  if (issues.length > 0) {
    return NextResponse.json({ error: "Not ready to publish", issues }, { status: 400 });
  }

  // Free templates skip Whop entirely
  if (template.price === 0) {
    const updated = await prisma.template.update({
      where: { id },
      data: { status: "PUBLISHED" },
    });
    return NextResponse.json({ ok: true, template: updated });
  }

  const platformFeePercent = parseInt(process.env.PLATFORM_FEE_PERCENT ?? "5", 10);
  const feeAmountCents = Math.round((template.price * platformFeePercent) / 100);

  try {
    // 1. Create the Whop product on the seller's connected company
    const whopProduct = await whopCompany.products.create({
      company_id: template.sellerProfile.whopCompanyId,
      title: template.title,
      description: template.description,
    });

    // 2. Create a checkout configuration with an inline one-time plan.
    // redirect_url sends the buyer to our access page after a successful
    // checkout instead of Whop's default `whop.com/joined/...` page.
    const checkoutConfig = await whopCompany.checkoutConfigurations.create({
      mode: "payment",
      redirect_url: `${appUrl}/templates/${template.slug}/access`,
      plan: {
        company_id: template.sellerProfile.whopCompanyId,
        product_id: whopProduct.id,
        currency: "usd",
        initial_price: template.price / 100,
        plan_type: "one_time",
        application_fee_amount: feeAmountCents / 100,
        // Whop caps plan title at 30 chars; the product title (shown on the
        // public product page) keeps the full text.
        title: template.title.slice(0, 30),
      },
    });

    const updated = await prisma.template.update({
      where: { id },
      data: {
        status: "PUBLISHED",
        whopProductId: whopProduct.id,
        whopPlanId: checkoutConfig.plan?.id ?? null,
        whopCheckoutUrl: checkoutConfig.purchase_url,
      },
    });

    return NextResponse.json({ ok: true, template: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;
    console.error("Publish failed", { templateId: id, status, message });
    return NextResponse.json(
      { error: "Publish failed", detail: message.slice(0, 500), status },
      { status: 500 },
    );
  }
}
```

---

## 9. Marketplace and discovery

### Persistent header chrome

Filters live in the sticky header, not on the catalog page itself. Three small client components read the current URL and push the user back to `/templates` with the right querystring.

- **`<HeaderSearch>`** (`src/components/HeaderSearch.tsx`) — the inline search input in the top bar. Uses `useRouter` + `useSearchParams` to seed its value from `?q=` on `/templates`, then `router.push('/templates?q=...')` on submit.
- **`<NavToolBar>`** (`src/components/NavToolBar.tsx`) — horizontal-scrolling tab strip below the brand row with one tab per `Tool` (Notion, Figma, Webflow, Framer, WordPress, Code, Word, Excel, PowerPoint, AI Prompts). The active tab is determined by reading `?tool=` and tinting the tab in that tool's brand color via `--color-tool-*`. Tapping a tab links to `/templates?tool=<TOOL>`, preserving any active `q`.
- **`<NavCategoryBar>`** (`src/components/NavCategoryBar.tsx`) — second sub-nav with one chip per `Category`. Rendered conditionally — only on `/templates` — by checking `usePathname()`. Chips work the same way as the tool tabs (read `?category=`, write it back on click).

The header renders all three components in `Header.tsx` so they stick across page navigations. The `Header` server component itself reads the session and conditionally renders the "Become a seller" / "Seller dashboard" links and the user pill; the search + nav components below it are pure client components.

### `<HomeHeroSearch>` (`src/components/HomeHeroSearch.tsx`)

A bigger version of `<HeaderSearch>` used in the homepage hero only. Same submit handler (pushes to `/templates?q=...`), bigger input. Lives on its own so the homepage `<Header>` and the hero search don't share state.

### `/templates` catalog

Server component. Reads `tool`, `category`, `q`, `page`, and `sort` from `searchParams`, calls `listPublishedTemplates({ tool, category, q, page, sort, pageSize: 12 })`, and renders:

- A left-aligned header: "Marketplace" eyebrow, the active filter as the H1 (`All templates`, `Notion templates`, `Dashboards templates`, etc.), and a single line below combining the result count, the active category sub-filter, and the active `q`.
- An active-query chip (with an `X` to clear) below the header when `?q=` is set.
- A grid of `<TemplateCard>`s (3 cols at `lg`, 2 at `md`, 1 at `sm`).
- A `<Pagination>` strip at the bottom with prev/next + numbered pages, preserving the current querystring.

The tool/category/search filters all live in the persistent header above — this page never renders a filter bar.

Empty states are honest: if a Tool filter is set to a clone-URL tool that's never been populated, show "Be the first seller to publish a [Tool] template" with a CTA to `/sell`.

### `/templates/[slug]` detail

Server component. Calls `getTemplateBySlug(slug)` (returns the template + seller + files + reviews). Computes `avgRating` per request from the included reviews. Renders:

- The preview gallery (first image as hero, the rest as a thumbnail strip).
- Title, seller link, tool badge, category, delivery indicator ("File download" or "Share URL"), price (or "Free").
- Buy button: paid → `<Link href={`/templates/${slug}/checkout`}>` (the next page renders Whop's embedded checkout iframe). Free → a small form POSTing to `/api/templates/[id]/purchase` (which redirects to `/access`). If the signed-in user already has a Purchase, this is replaced with "View your access". Guests trying to buy a paid template get a "Sign in to buy" anchor that points at `/api/auth/login?redirect_to=/templates/[slug]/checkout` so they land on the embed after OAuth.
- Reviews summary (avg rating + count) and the most recent reviews.
- A "Leave a review" CTA visible only to buyers who haven't reviewed yet.

### `/sellers/[username]` profile

Server component. Loads the SellerProfile + user (for the avatar) + headline + bio + recent published templates + an aggregated purchase count across the seller's templates. Renders a hero row with the seller's avatar (or an initial-circle placeholder if `user.avatar === null`), the seller name, `@username`, headline, bio, and a horizontal **Templates** / **Sales** counter on the right at every breakpoint. Below the hero, the bio and a grid of their templates using `<TemplateCard>`.

### `<TemplateCard>` (`src/components/TemplateCard.tsx`)

Client/server-neutral. Takes a `TemplateCardSummary`. Renders the thumbnail image (or a tool-colored placeholder if `thumbnailUrl === null`), a tool badge using `toolByValue(t).cssVar` as inline `backgroundColor`, the title, the seller's username, the avg rating + review count, the price (or "Free"), and a delivery-type micro-pill. Wraps the whole card in a `<Link>` to `/templates/[slug]`.

---

## 10. Embedded checkout, webhook, and free-template purchase

Whop runs the actual checkout — card vault, Apple Pay, fraud, taxes — but it renders inside an iframe on **our** page, so the buyer never bounces to whop.com. The redirect-back path (for external payment methods) and the `payment.succeeded` webhook race; whichever path writes the Purchase first wins thanks to the upsert. The `WebhookEvent` table dedupes deliveries (Whop retries on non-200) so we never process the same event twice.

### `<CheckoutEmbed>` client component (`src/components/CheckoutEmbed.tsx`)

Wraps `@whop/checkout/react`'s `<WhopCheckoutEmbed>` with the props the rest of Stax cares about. Server reads `WHOP_SANDBOX` and forwards a boolean (no `NEXT_PUBLIC_*` env var needed). We pass both an `onComplete` callback (which `useRouter().push`es to the access page after in-frame card payments) and a `returnUrl` (required for external payment methods — Apple Pay, Google Pay, PayPal — where the embed can't catch the callback because the top frame is the one that gets redirected).

```tsx
"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";
import { useRouter } from "next/navigation";

interface CheckoutEmbedProps {
  planId: string;
  slug: string;
  isSandbox: boolean;
  appUrl: string;
}

export function CheckoutEmbed({ planId, slug, isSandbox, appUrl }: CheckoutEmbedProps) {
  const router = useRouter();
  const accessPath = `/templates/${slug}/access`;

  return (
    <WhopCheckoutEmbed
      planId={planId}
      environment={isSandbox ? "sandbox" : "production"}
      returnUrl={`${appUrl}${accessPath}`}
      onComplete={() => router.push(accessPath)}
      fallback={
        <div className="grid min-h-[420px] place-items-center text-sm text-[var(--color-text-secondary)]">
          Loading checkout…
        </div>
      }
    />
  );
}
```

### `/templates/[slug]/checkout` server page

Auth-gates, ownership-gates, and existing-purchase-gates before rendering the embed. The plan that was created during publish (with `application_fee_amount` baked into it) is what the embed transacts against; nothing extra to do server-side at click time.

```tsx
import { notFound, redirect } from "next/navigation";
import { isAuthenticated } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTemplateBySlug } from "@/lib/templates";
import { appUrl } from "@/lib/whop";
import { CheckoutEmbed } from "@/components/CheckoutEmbed";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const template = await getTemplateBySlug(slug);
  if (!template || template.status !== "PUBLISHED") notFound();

  // Free templates skip Whop entirely — bounce to the detail page so the
  // free purchase route owns that path.
  if (template.price === 0 || !template.whopPlanId) {
    redirect(`/templates/${slug}`);
  }

  const me = await isAuthenticated();
  if (!me) {
    const next = encodeURIComponent(`/templates/${slug}/checkout`);
    redirect(`/api/auth/login?redirect_to=${next}`);
  }
  if (me.id === template.sellerProfile.userId) {
    redirect(`/templates/${slug}`);
  }

  const purchase = await prisma.purchase.findUnique({
    where: { userId_templateId: { userId: me.id, templateId: template.id } },
  });
  if (purchase) {
    redirect(`/templates/${slug}/access`);
  }

  const isSandbox = process.env.WHOP_SANDBOX?.trim() === "true";

  return (
    <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      {/* Header + back link + title + price ... */}
      <CheckoutEmbed
        planId={template.whopPlanId}
        slug={template.slug}
        isSandbox={isSandbox}
        appUrl={appUrl}
      />
    </main>
  );
}
```

> `template.whopCheckoutUrl` is still stored in the DB (we set it in the publish route) and remains useful as a public share link or a fallback "view checkout on whop.com" anchor in the seller dashboard. The buyer flow no longer uses it.

### `src/app/api/webhooks/whop/route.ts`

```ts
import type { NextRequest } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import type Whop from "@whop/sdk";
import { prisma } from "@/lib/prisma";
import { whopApp } from "@/lib/whop";

type WebhookEvent = ReturnType<Whop["webhooks"]["unwrap"]>;
type PaymentSucceededEvent = Extract<WebhookEvent, { type: "payment.succeeded" }>;
type PaymentData = PaymentSucceededEvent["data"];

/**
 * Whop webhook handler.
 *
 * Configured as a company-level webhook on the platform parent company,
 * with "connected account events" enabled so events from sellers'
 * connected companies fire here too.
 *
 * Returns 200 even on internal failures so Whop doesn't retry forever;
 * we log errors for offline inspection. Signature failures still 401.
 */
export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: WebhookEvent;
  try {
    event = whopApp.webhooks.unwrap(bodyText, { headers });
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return new Response("Invalid signature", { status: 401 });
  }

  // Idempotency: try to insert the event ID; if it already exists we've
  // processed this delivery before and can short-circuit.
  try {
    await prisma.webhookEvent.create({ data: { id: event.id } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return new Response("Already processed", { status: 200 });
    }
    console.error("Webhook event idempotency insert failed", err);
    return new Response("OK", { status: 200 });
  }

  try {
    if (event.type === "payment.succeeded") {
      await handlePaymentSucceeded(event.data);
    }
  } catch (err) {
    console.error("Webhook handler error", { type: event.type, err });
  }

  return new Response("OK", { status: 200 });
}

async function handlePaymentSucceeded(payment: PaymentData) {
  if (!payment.plan?.id || !payment.user?.id) {
    console.warn("payment.succeeded missing plan or user", {
      paymentId: payment.id,
      planId: payment.plan?.id,
      userId: payment.user?.id,
    });
    return;
  }

  // Find the Template by the Whop plan ID we stored at publish time.
  const template = await prisma.template.findFirst({
    where: { whopPlanId: payment.plan.id },
    select: { id: true },
  });
  if (!template) {
    console.warn("payment.succeeded for unknown plan", { planId: payment.plan.id });
    return;
  }

  // Match the buyer to a local User (or create one). The Whop sandbox
  // checkout collects the buyer's Whop identity, so payment.user.id maps
  // 1:1 to our User.whopUserId for buyers who've signed in to Stax. If
  // they haven't, we still create a User row so the purchase isn't lost.
  const user = await prisma.user.upsert({
    where: { whopUserId: payment.user.id },
    create: {
      whopUserId: payment.user.id,
      email: payment.user.email ?? `${payment.user.id}@unknown.whop`,
      name: payment.user.name ?? payment.user.username ?? null,
    },
    update: {
      ...(payment.user.email && { email: payment.user.email }),
      ...(payment.user.name && { name: payment.user.name }),
    },
  });

  // Whop sends subtotal in dollars; we store cents.
  const pricePaidCents = Math.round((payment.subtotal ?? payment.total ?? 0) * 100);

  await prisma.purchase.upsert({
    where: {
      userId_templateId: { userId: user.id, templateId: template.id },
    },
    create: {
      userId: user.id,
      templateId: template.id,
      whopPaymentId: payment.id,
      pricePaid: pricePaidCents,
    },
    update: {
      whopPaymentId: payment.id,
      pricePaid: pricePaidCents,
    },
  });
}
```

### `src/app/api/templates/[id]/purchase/route.ts` — free-template direct path

Free templates skip Whop entirely. The POST creates a Purchase row keyed on `(userId, templateId)` and redirects the buyer to `/templates/[slug]/access`.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appUrl } from "@/lib/whop";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.redirect(`${appUrl}/sign-in`, { status: 303 });
  }

  const template = await prisma.template.findUnique({
    where: { id },
    select: { id: true, slug: true, status: true, price: true },
  });
  if (!template || template.status !== "PUBLISHED") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }
  if (template.price !== 0) {
    return NextResponse.json(
      { error: "Paid templates must go through Whop checkout" },
      { status: 400 },
    );
  }

  // Idempotent: upsert one purchase per (user, template)
  await prisma.purchase.upsert({
    where: { userId_templateId: { userId: session.userId, templateId: template.id } },
    create: { userId: session.userId, templateId: template.id, pricePaid: 0 },
    update: {},
  });

  return NextResponse.redirect(`${appUrl}/templates/${template.slug}/access`, { status: 303 });
}
```

---

## 11. Access page and reviews

### `/templates/[slug]/access`

Server component. Calls `requireAuth()`, loads the template + files, then checks for a Purchase keyed on `(session.userId, templateId)`. If missing, redirects back to `/templates/[slug]`. If present, renders the appropriate UI:

- `deliveryType === "FILE_DOWNLOAD"` → a list of download links, each `<a href={file.fileUrl} download={file.fileName}>` rendered with file size + mimetype + an icon.
- `deliveryType === "SHARE_URL"` → a single "Open template" CTA `<a href={template.shareUrl}>` plus a copy-to-clipboard button. Optionally a `template.content` block with any seller-provided post-purchase instructions.

The page also shows a "Leave a review" CTA if the buyer hasn't already reviewed.

### Review API

```ts
// src/app/api/templates/[id]/reviews/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const reviewSchema = z.object({
  stars: z.number().int().min(1).max(5),
  title: z.string().max(80).nullable().optional(),
  body: z.string().max(2000).nullable().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: templateId } = await params;

  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Purchase-gate the review write: only buyers can review
  const purchase = await prisma.purchase.findUnique({
    where: { userId_templateId: { userId: session.userId, templateId } },
    select: { id: true },
  });
  if (!purchase) {
    return NextResponse.json(
      { error: "Only buyers can review this template" },
      { status: 403 },
    );
  }

  // Sellers can't review their own template
  const template = await prisma.template.findUnique({
    where: { id: templateId },
    select: { id: true, sellerProfile: { select: { userId: true } } },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (template.sellerProfile.userId === session.userId) {
    return NextResponse.json(
      { error: "Sellers can't review their own template" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = reviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", detail: parsed.error.message },
      { status: 400 },
    );
  }

  const review = await prisma.review.upsert({
    where: { userId_templateId: { userId: session.userId, templateId } },
    create: {
      userId: session.userId,
      templateId,
      stars: parsed.data.stars,
      title: parsed.data.title ?? null,
      body: parsed.data.body ?? null,
    },
    update: {
      stars: parsed.data.stars,
      title: parsed.data.title ?? null,
      body: parsed.data.body ?? null,
    },
  });

  return NextResponse.json({ ok: true, review });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: templateId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const review = await prisma.review.findUnique({
    where: { userId_templateId: { userId: session.userId, templateId } },
    select: { id: true },
  });
  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  await prisma.review.delete({ where: { id: review.id } });
  return NextResponse.json({ ok: true });
}
```

### Review form

`/templates/[slug]/review/new` is a server component that purchase-gates the page (same logic as the API), then renders a `<ReviewForm>` client component: a 5-star picker, optional title input, optional body textarea, submit button. The form POSTs to `/api/templates/[id]/reviews` and redirects to `/templates/[slug]` on success. If the buyer already has a review, the form is prefilled with their existing values (the API upserts).

---

## 12. Seller dashboard, promo codes, payouts

### `/sell/dashboard`

Server component. Calls `requireSeller()` → `{ user, seller }`. Loads in parallel: the seller's templates with `_count.purchases`, the sum of `Purchase.pricePaid` across all of them (split into gross / fee / net using `PLATFORM_FEE_PERCENT`), and the recent 5 purchases for an activity feed. Renders:

- Earnings stats card (gross, platform fee, net).
- "Withdraw earnings" button (`<PayoutsButton>` client component, POSTs to `/api/sell/payouts` and `window.location.assign(url)` on the returned hosted-portal URL).
- Templates table: title, status, price, purchase count, edit/archive/delete actions.
- Recent purchases activity feed.
- A bio editor (PATCH to `/api/sell/profile` if you choose to expose that route — Stax keeps profile editing on a separate `/sell/profile` page).

### Payouts portal route

```ts
// src/app/api/sell/payouts/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { appUrl, whopCompany } from "@/lib/whop";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const seller = await prisma.sellerProfile.findUnique({
    where: { userId: session.userId },
  });
  if (!seller) {
    return NextResponse.json({ error: "Not a seller" }, { status: 403 });
  }

  try {
    const accountLink = await whopCompany.accountLinks.create({
      company_id: seller.whopCompanyId,
      use_case: "payouts_portal",
      return_url: `${appUrl}/sell/dashboard`,
      refresh_url: `${appUrl}/sell/dashboard?refresh=true`,
    });
    return NextResponse.json({ url: accountLink.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Payouts portal link failed", { message });
    return NextResponse.json(
      { error: "Couldn't generate payouts link", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }
}
```

### Promo codes routes

The list / create / delete endpoints proxy straight to `whopCompany.promoCodes`. Stax doesn't mirror promo codes in its own DB — Whop is the source of truth. Two validation rules sit in the create route: percentage discounts must be < 100 (a 100%-off code on a paid plan would break `application_fee_amount` math, since the fee can't exceed the total — sellers who want free distribution should set the template's price to $0 instead), and duplicate-code collisions get rephrased as a clean 409 by substring-matching Whop's error message.

```ts
// src/app/api/sell/templates/[id]/promo-codes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { whopCompany } from "@/lib/whop";

const createSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/i, "Use letters, numbers, hyphen, or underscore only"),
  promoType: z.enum(["percentage", "flat_amount"]),
  amountOff: z.number().positive(),
  expiresAt: z.string().datetime().nullable().optional(),
  stock: z.number().int().positive().nullable().optional(),
  onePerCustomer: z.boolean().default(true),
});

async function loadOwnedTemplate(id: string, userId: string) {
  return prisma.template.findFirst({
    where: { id, sellerProfile: { userId } },
    include: { sellerProfile: { select: { whopCompanyId: true } } },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const template = await loadOwnedTemplate(id, session.userId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (!template.whopProductId) {
    return NextResponse.json({ codes: [] });
  }

  try {
    const codes = [];
    for await (const code of whopCompany.promoCodes.list({
      company_id: template.sellerProfile.whopCompanyId,
      product_ids: [template.whopProductId],
    })) {
      codes.push(code);
      if (codes.length >= 50) break;
    }
    return NextResponse.json({ codes });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Promo code list failed", { templateId: id, message });
    return NextResponse.json(
      { error: "Couldn't load promo codes", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const template = await loadOwnedTemplate(id, session.userId);
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (!template.whopProductId) {
    return NextResponse.json(
      { error: "Publish the template before issuing codes" },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", detail: parsed.error.message },
      { status: 400 },
    );
  }
  const input = parsed.data;

  // 100%-off codes break the application_fee_amount math (the platform fee
  // can't exceed the total). Free distribution should use the free-template
  // path (price = 0 + Get for free), not a 100% code on a paid plan.
  if (input.promoType === "percentage" && input.amountOff >= 100) {
    return NextResponse.json(
      {
        error:
          "100%-off codes can't be applied to paid templates because of the platform fee. Set the template's price to $0 instead.",
      },
      { status: 400 },
    );
  }
  if (input.promoType === "percentage" && input.amountOff > 100) {
    return NextResponse.json(
      { error: "Percentage discount can't exceed 100" },
      { status: 400 },
    );
  }

  const normalizedCode = input.code.toUpperCase();

  try {
    const created = await whopCompany.promoCodes.create({
      company_id: template.sellerProfile.whopCompanyId,
      product_id: template.whopProductId,
      code: normalizedCode,
      promo_type: input.promoType,
      amount_off: input.amountOff,
      base_currency: "usd",
      new_users_only: false,
      promo_duration_months: 1,
      expires_at: input.expiresAt ?? null,
      stock: input.stock ?? null,
      unlimited_stock: input.stock == null,
      one_per_customer: input.onePerCustomer,
    });
    return NextResponse.json({ code: created });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      typeof err === "object" && err !== null && "status" in err && typeof err.status === "number"
        ? err.status
        : 500;

    // Detect "code already exists" from Whop's response. The SDK throws on
    // 4xx with the API's message embedded in `err.message`. Whop's exact
    // wording can vary, so we substring-match a few common forms.
    const lc = message.toLowerCase();
    const isDuplicate =
      status === 409 ||
      status === 422 ||
      lc.includes("already") ||
      lc.includes("duplicate") ||
      lc.includes("taken") ||
      lc.includes("in use");

    if (isDuplicate) {
      return NextResponse.json(
        {
          error: `A promo code "${normalizedCode}" already exists. Pick a different code.`,
        },
        { status: 409 },
      );
    }

    if (status >= 400 && status < 500) {
      return NextResponse.json(
        { error: message.slice(0, 500) },
        { status },
      );
    }

    console.error("Promo code create failed", { templateId: id, status, message });
    return NextResponse.json(
      { error: "Couldn't create promo code", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }
}
```

The DELETE endpoint has to do an extra ownership check that's easy to miss: the Company API Key has org-wide permission to delete any promo code on the platform, so verifying "this seller owns the template at `[id]`" is not enough — we must also verify "the `[codeId]` actually belongs to that template's product." Without it, an authenticated seller could pass any `codeId` in the URL and archive promo codes belonging to other sellers' templates.

```ts
// src/app/api/sell/templates/[id]/promo-codes/[codeId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { whopCompany } from "@/lib/whop";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; codeId: string }> },
) {
  const { id, codeId } = await params;
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const template = await prisma.template.findFirst({
    where: { id, sellerProfile: { userId: session.userId } },
    include: { sellerProfile: { select: { whopCompanyId: true } } },
  });
  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }
  if (!template.whopProductId) {
    return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
  }

  // Defense in depth: the Company API Key has org-wide permission to delete
  // any promo code on the platform. Without this check, an authenticated
  // seller could pass any codeId in the URL and archive promo codes
  // belonging to other sellers' templates. Verify the codeId actually
  // belongs to this template's product before deleting.
  let belongsToTemplate = false;
  try {
    for await (const code of whopCompany.promoCodes.list({
      company_id: template.sellerProfile.whopCompanyId,
      product_ids: [template.whopProductId],
    })) {
      if (code.id === codeId) {
        belongsToTemplate = true;
        break;
      }
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Promo code ownership check failed", { codeId, message });
    return NextResponse.json(
      { error: "Couldn't verify promo code", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }

  if (!belongsToTemplate) {
    return NextResponse.json({ error: "Promo code not found" }, { status: 404 });
  }

  try {
    await whopCompany.promoCodes.delete(codeId);
    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Promo code archive failed", { codeId, message });
    return NextResponse.json(
      { error: "Couldn't archive promo code", detail: message.slice(0, 500) },
      { status: 500 },
    );
  }
}
```

### `<PromoCodesPanel>` UI

Client component embedded in the seller's template edit page. On mount it GETs `/api/sell/templates/[id]/promo-codes` and renders the active codes as a table (code, type, amount off, stock, expiry, delete button). The form below the table has fields for `code`, `promoType` (radio), `amountOff` (number), optional `expiresAt`, optional `stock`, and a `onePerCustomer` toggle. Submitting POSTs to the same endpoint and prepends the result to the list. Errors are surfaced inline.

---

## 13. Going to production

The Stax tutorial stays in sandbox throughout development. The production switch is article-only — no code changes are needed.

1. In `production` mode at `whop.com`, recreate the OAuth app and copy the new Client ID, Client Secret, and App API Key.
2. Business Settings → API Keys (production-mode dashboard) → create a new Company API Key with all permissions, copy to `WHOP_COMPANY_API_KEY`.
3. From the production parent company dashboard, copy the company ID (`biz_…`) to `WHOP_COMPANY_ID`.
4. Developer → Webhooks → recreate the webhook on the production parent company pointing to `https://your-app.vercel.app/api/webhooks/whop`. Subscribe to `payment.succeeded`. Enable "Connected account events". Copy the new signing secret to `WHOP_WEBHOOK_SECRET`.
5. Drop or unset `WHOP_SANDBOX` so the SDK defaults to `api.whop.com/api/v1`.
6. Update the OAuth redirect URIs on the production Whop app to match the production `NEXT_PUBLIC_APP_URL`.
7. Real KYC: the first seller to sign up after the switch will be sent to Whop's hosted onboarding because `WHOP_SANDBOX` is no longer set — the seller completes real KYC, lands on the return URL, and `kycComplete` flips to `true`.
8. Confirm with a real first payment (real card) and check the Vercel runtime logs for the `payment.succeeded` webhook delivery.

---

## 14. Whop SDK and integration gotchas

1. **Two API keys are required.** `WHOP_API_KEY` (App API Key, Developer → Apps) is used for OAuth and webhook verification. `WHOP_COMPANY_API_KEY` (Company API Key, Business Settings → API Keys) is used for everything that needs `access_pass:create`: `products.create`, `plans.create`, `checkoutConfigurations.create`, `promoCodes.*`. Both start with `apik_`; mixing them up returns a scope error on the product/plan calls.

2. **`baseURL` is capital-URL and must include `/api/v1`.** TypeScript silently accepts `baseUrl` (lowercase) as an unknown property and the SDK falls back to `https://api.whop.com/api/v1`. Every SDK call then hits production with a sandbox key and 401s. Set `baseURL: "https://sandbox-api.whop.com/api/v1"` when `WHOP_SANDBOX=true`. OAuth flows keep working in this state because they bypass the SDK and use manual fetch against `whopOauthBaseUrl`.

3. **OAuth requires PKCE + state + nonce + `client_secret` in the token body.** The PKCE verifier lives in a separate httpOnly cookie (`maxAge: 60 * 10`), not in the iron-session cookie — `NextResponse.redirect` plus a freshly written session cookie can drop session cookies on the cross-domain hop. The `nonce` is required because the scope includes `openid`. The `client_secret` is required in the token exchange body despite Whop's own docs example omitting it.

4. **Token exchange body must be `application/json`.** `application/x-www-form-urlencoded` returns 400.

5. **Webhook secret base64-encoded.** `webhookKey: Buffer.from(secret, "utf-8").toString("base64")`. Stax wraps this in a fall-through (`...(webhookKey && { webhookKey })`) so the SDK doesn't blow up if the secret isn't set yet.

6. **`webhooks.unwrap` takes raw text and a plain headers object.** Call `request.text()` first; `request.json()` consumes the stream and breaks HMAC. Convert headers with `Object.fromEntries(request.headers)`.

7. **Webhook event names are dotted, not underscored.** The Whop dashboard webhook UI lists `payment_succeeded`; the payload arrives as `payment.succeeded`. `event.type === "payment.succeeded"`.

8. **Webhook location: company-level on the parent company, with "Connected account events" enabled.** A connected-account marketplace doesn't need an app-level webhook. The single platform-level webhook receives events for payments to every seller's sub-company because of the connected-account toggle.

9. **Idempotency: dedupe by `event.id`.** Insert into a `WebhookEvent` table with the event ID as primary key; catch the unique violation (`Prisma.PrismaClientKnownRequestError` code `P2002`) and short-circuit. Don't compute idempotency from payment ID alone — Whop retries the same delivery, not just the same payment.

10. **`application_fee_amount` lives on the inline `plan` of `checkoutConfigurations.create`, not on `plans.create`.** Plan prices are in **dollars** (numbers), not cents. Stax stores cents internally and divides by 100 right before the SDK call.

11. **Plan titles are capped at 30 chars.** The product title (`products.create({ title })`) is shown on the public product page and can be the full template title. The plan title (`plan.title`) is what appears on the checkout summary line — truncate to 30 chars to avoid a 422 from Whop.

12. **`checkoutConfigurations.create` supports `redirect_url`** at the top level (sibling to `plan` and `mode`). Set it to the access page so buyers don't land on the default `whop.com/joined/…` flow. With the embedded checkout, this `redirect_url` is a fallback — the embed's own `returnUrl` prop and `onComplete` callback handle the happy path.

13. **`<WhopCheckoutEmbed>` needs both `onComplete` and `returnUrl`.** The two callbacks cover different payment paths: card payments stay in-frame and fire `onComplete` (use `useRouter().push` to move on); external methods (Apple Pay, Google Pay, PayPal) redirect the top frame to `returnUrl`. Setting only one of them breaks the other path silently. `returnUrl` must be an absolute URL.

14. **`environment="sandbox"` on the embed must match the plan's environment.** Sandbox plans don't transact through the production embed and vice versa. Read `WHOP_SANDBOX` on the server, forward a boolean prop to the client component — don't introduce a `NEXT_PUBLIC_WHOP_SANDBOX` env var just for this.

15. **100%-off promo codes break paid plans.** The application fee can't exceed the total. Free distribution should use the free-template path (price = 0, direct purchase route), not a 100% percentage code on a paid plan. The promo-codes POST validates and rejects this explicitly.

16. **Promo code DELETE requires explicit ownership verification.** `whopCompany.promoCodes.delete(codeId)` succeeds against any promo code on the platform because the Company API Key has org-wide permissions. Verifying "this seller owns the template at `[id]`" is not enough — the route also has to verify the `codeId` actually belongs to that template's product (list codes for the company filtered by `product_id`, search for `codeId`, 404 if missing). Skipping this check lets one seller archive another seller's codes.

17. **`whop.companies.create({ parent_company_id })` is how the connected-account sub-company is created.** The resulting `company.id` is what every subsequent call (`accountLinks.create`, `products.create`, `checkoutConfigurations.create`, `promoCodes.*`) keys off — store it as `SellerProfile.whopCompanyId`.

18. **`whop.accountLinks.create` requires HTTPS** for `return_url` and `refresh_url`. Vercel preview deploys work; localhost doesn't. The `use_case` is `"account_onboarding"` for KYC and `"payouts_portal"` for the withdraw flow.

19. **`<Link>` RSC prefetch on a route handler that issues a cross-origin redirect triggers CORS errors.** The sign-in CTA must be a plain `<a href>`, not `<Link>`. Add `prefetch={false}` to any other links that point at redirect-issuing routes.

20. **Vercel UI silently keeps leading/trailing whitespace on paste.** A leading tab in `NEXT_PUBLIC_APP_URL` shows up as `%09` in the OAuth redirect URI and breaks the exact-match check on Whop's authorize endpoint. Same goes for the webhook secret — a trailing newline 401s every signature verification. Stax trims every Whop credential and the app URL inside `lib/whop.ts` as defense in depth.

21. **Prisma 7 schema cannot include `url` in the datasource block.** Use `prisma.config.ts` to inject the URL at runtime, and leave the datasource as just `{ provider = "postgresql" }`. The `prisma db push` CLI flag `--skip-generate` was also removed in Prisma 7; drop it from the build command.

22. **Vercel marks `DATABASE_URL_UNPOOLED` Sensitive by default.** `vercel env pull` writes it as `""` in `.env.local`. Stax's `prisma.config.ts` falls back to `DATABASE_URL` (pooled) or a placeholder so local `prisma generate` keeps working; real DB operations on Vercel use the injected value at build time.

23. **`Purchase.whopPaymentId` is nullable.** The free-template direct path writes Purchase rows without a Whop payment, and the webhook upsert fills it in for paid purchases. Don't make it `@unique` — multiple free purchases by different users on the same template all have a null `whopPaymentId`, and a unique constraint would block them.
