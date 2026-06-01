# How to build a Medium clone with Next.js and Whop — Foundation + Editor (1/2)

A condensed reference for building **Storyline**, a Next.js publishing platform where anyone signs in with Whop and starts writing, drops a paywall divider anywhere in a story to make it Plus-only, and gets paid two ways — direct tips charged to their connected Whop sub-company, and a monthly Partner Program payout that splits Plus subscription revenue across writers based on Plus reads.

This file keeps **full code only for Whop SDK calls, OAuth + PKCE, webhook verification, the embedded payout portal, the custom TipTap paywall node, and the partner-payout cron** — the parts most likely to be tricky. Everything else is summarized.

- Demo: [storyline-three-orpin.vercel.app](https://storyline-three-orpin.vercel.app)
- Code: [github.com/whopio/whop-tutorials/tree/main/medium-clone](https://github.com/whopio/whop-tutorials/tree/main/medium-clone)

## Guide structure

This guide is split into two files. Load them in order, or jump straight to file 2 when you're past the editor.

1. **`medium-clone-1.md`** (this file) — overview, setup, env vars, `next.config.ts`, `vercel.ts`, full Prisma schema, core libraries (`whop.ts`, `env.ts`, `session.ts`, `prisma.ts`, `auth.ts`), OAuth + PKCE auth, app shell and theme, TipTap editor with the custom `paywallBreak` node, UploadThing uploads, story persistence (draft / PATCH autosave / publish), server-side paywall truncation, and the reading page.
2. **`medium-clone-2.md`** — Plus subscription (single $5/month plan, embedded checkout, self-service), the unified `/api/webhooks/whop` handler, writer sub-company onboarding + KYC, embedded payout portal, tipping (`application_fee_amount` to platform), Partner Program monthly cron with `transfers.create`, discovery (home feed, topics, search), likes/bookmarks/follows + notifications, operator allowlist + promo codes, sandbox→prod switch, deploy steps, and the **consolidated 26-item gotchas list**.

---

## Overview

**Tech stack**

- **Next.js 16** (App Router, Turbopack) — framework convention is `proxy.ts`, not `middleware.ts`.
- **React 19** for Server Components and editor client islands.
- **Tailwind CSS v4** with CSS-first `@theme` blocks (no `tailwind.config.js`).
- **Prisma 7** with `@prisma/adapter-pg` (driver-adapter pattern, ESM-friendly). Generated client lives at `src/generated/prisma/client`.
- **Neon Postgres** via the Vercel Marketplace.
- **iron-session** for encrypted-cookie sessions (no session table).
- **TipTap 3** for the writing editor, with a custom `paywallBreak` node.
- **UploadThing** for cover and inline images.
- **Zod 4** for runtime validation at every API boundary.
- **next-themes** for an OS-aware light/dark toggle.
- **Whop SDK** (`@whop/sdk`), the checkout embed (`@whop/checkout`), and the embedded payouts UI (`@whop/embedded-components-react-js`).
- **Vercel** for hosting with `vercel.ts` for typed routing, cron, and CSP.

**Pages**

- `/` — home feed (signed-out trending + Plus pitch; signed-in two-column "Latest" + sidebar)
- `/membership` — Plus pricing ($5/month plan)
- `/search` — site-wide story search
- `/tag/[slug]` — topic feed
- `/topics` — topic directory
- `/@[username]` — writer profile
- `/@[username]/[storySlug]` — story reading page with paywall enforcement
- `/new-story` — creates a draft and redirects to the editor
- `/edit/[id]` — the TipTap editor
- `/me/stories` — drafts and published stories
- `/me/library` — bookmarks
- `/me/membership` — Plus self-service (pause, cancel, resume, uncancel)
- `/me/dashboard` — writer dashboard with embedded payout portal
- `/me/settings` — profile and payout enablement
- `/admin/operators` — operator allowlist (operator-only)
- `/admin/promo-codes` — Plus discount codes (operator-only)

**API routes**

- Auth: `/api/auth/login`, `/api/auth/callback`, `/api/auth/logout`
- Stories: `/api/stories`, `/api/stories/[id]`, `/api/stories/[id]/publish`, `/api/stories/[id]/unpublish`
- Engagement: `/api/stories/[id]/like`, `/api/stories/[id]/bookmark`, `/api/stories/[id]/read`, `/api/users/[username]/follow`, `/api/topics/[slug]/follow`
- Plus: `/api/membership/checkout`, `/api/membership/pause`, `/api/membership/resume`, `/api/membership/cancel`, `/api/membership/uncancel`
- Tipping: `/api/stories/[id]/tip`
- Writer onboarding and payouts: `/api/writers/onboard`, `/api/writers/kyc-return`, `/api/writers/payout-token`, `/api/writers/hosted-payout-link`
- Promo codes and operators: `/api/promo-codes`, `/api/promo-codes/[id]/archive`, `/api/admin/operators`, `/api/admin/operators/[id]`
- Cron: `/api/cron/partner-payout`
- Webhooks: `/api/webhooks/whop`
- Notifications: `/api/notifications`, `/api/notifications/mark-read`
- Uploads: `/api/uploadthing`

**Payment flow**

Storyline has three distinct payment paths, all running through Whop:

1. **Plus subscription** — one recurring `$5/month` plan on Storyline's **own** company (`WHOP_COMPANY_ID`). Reader hits `/membership`, the `<WhopCheckoutEmbed>` opens against a fresh `checkoutConfigurations.create` referencing `STORYLINE_PLUS_PLAN_ID`. The webhook (`membership.activated`, `payment.succeeded`) creates/updates the `PlusMembership` row keyed by `whopMembershipId`. Self-service pause/cancel/resume/uncancel call the matching `whop.memberships.*` methods and mirror the state locally.
2. **Direct tips** — writer creates a Whop **sub-company** via `whop.companies.create({ parent_company_id: WHOP_COMPANY_ID, ... })` and completes KYC via `whop.accountLinks.create`. Tip checkout calls `whop.checkoutConfigurations.create` with `plan.company_id` = the writer's `whopCompanyId` and `application_fee_amount` for Storyline's 10% cut. The webhook (`payment.succeeded` branched on `metadata.kind === "tip"`) upserts the `Tip` row keyed by `whopPaymentId` and fires a `TIP_RECEIVED` notification.
3. **Partner Program** — Vercel Cron fires `/api/cron/partner-payout` on the 1st of each month at 00:00 UTC. The cron sums Plus-member reads per writer over the previous `monthBucket`, computes each writer's share of (active members × $5 × (1 − platform fee %)), and calls `whop.transfers.create` with `origin_id: WHOP_COMPANY_ID` → `destination_id: writer.whopCompanyId`. Idempotent via `idempotence_key: partner-payout-{writerId}-{bucket}` plus a `PartnerPayout` row check.

The same `<WhopCheckoutEmbed>` component runs both Plus and tip checkouts — only the payload differs.

---

## Setup

```bash
npx create-next-app@latest storyline --ts --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"
cd storyline
```

Push to GitHub (empty repo, no README), then deploy at [vercel.com/new](https://vercel.com/new) — Vercel auto-detects Next.js. Save the stable project alias (e.g. `storyline-six.vercel.app`); that's `NEXT_PUBLIC_APP_URL`.

Provision Neon from Vercel **Storage → Connect Database → Neon**. It injects `DATABASE_URL` and `DATABASE_URL_UNPOOLED`.

**Whop sandbox setup** — at [sandbox.whop.com](https://sandbox.whop.com):

1. Create a Whop → grab company ID (`biz_...`) → `WHOP_COMPANY_ID`.
2. Developer → Apps → Create App → grab App API key (`apik_...`) → `WHOP_APP_API_KEY`.
3. App OAuth tab → grab Client ID (`app_...`) + Client Secret → `WHOP_CLIENT_ID` / `WHOP_CLIENT_SECRET`.
4. Add two OAuth Redirect URIs: `${NEXT_PUBLIC_APP_URL}/api/auth/callback` **and** `http://localhost:3000/api/auth/callback`.
5. Developer → Company API Keys → Create new key (`apik_...`) → `WHOP_COMPANY_API_KEY`. This one has `access_pass:create` scope; the App API key does not.

**Env vars** — add to Vercel first (Production/Preview/Development), then `vercel env pull .env.local`. Sensitive ones come down empty; paste manually for local dev.

| Variable | Notes |
| --- | --- |
| `WHOP_APP_API_KEY` | `apik_...` from App API tab |
| `WHOP_CLIENT_ID` | `app_...` from OAuth tab |
| `WHOP_CLIENT_SECRET` | secret from OAuth tab |
| `WHOP_COMPANY_API_KEY` | `apik_...` from Company API Keys |
| `WHOP_COMPANY_ID` | `biz_...` |
| `WHOP_SANDBOX` | literal string `true` (server-side router switch) |
| `NEXT_PUBLIC_WHOP_SANDBOX` | literal `true` (mirror for embed components) |
| `NEXT_PUBLIC_APP_URL` | Vercel alias URL, **no** trailing slash |
| `SESSION_SECRET` | `openssl rand -hex 32` |
| `ROOT_OPERATOR_EMAIL` | sandbox Whop email, lowercased |
| `CRON_SECRET` | `openssl rand -hex 32` |
| `TIP_PLATFORM_FEE_PERCENT` | `10` |
| `PLATFORM_PLUS_FEE_PERCENT` | `30` |
| `STORYLINE_PLUS_MONTHLY_PRICE` | `5` |
| `PARTNER_PAYOUT_MIN_USD` | `1` |
| `STORYLINE_PLUS_PLAN_ID` | placeholder; filled in file 2 |
| `WHOP_WEBHOOK_SECRET` | placeholder; filled in file 2 |
| `UPLOADTHING_TOKEN` | placeholder; filled below |

> **Sandbox swap convention.** Sandbox lives at `sandbox-api.whop.com`; production at `api.whop.com`. We branch on `WHOP_SANDBOX === "true"` inside helpers (`resolveBaseURL`, `whopOauthBaseUrl`). In production, set `WHOP_SANDBOX=false` (or omit), and the helpers route to live.

**Install all deps in one shot:**

```bash
npm install @whop/sdk @whop/checkout @whop/embedded-components-react-js iron-session zod @prisma/client @prisma/adapter-pg pg @types/pg prisma @tiptap/core @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-link @tiptap/extension-placeholder uploadthing @uploadthing/react next-themes lucide-react clsx tailwind-merge dotenv @vercel/config @vercel/functions
```

> No ngrok needed — we develop against the real deployed Vercel URL. OAuth + webhook callbacks hit Vercel, not localhost.

---

## next.config.ts

```ts
import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "assets.whop.com" },
      { protocol: "https", hostname: "cdn.whop.com" },
      // Whop returns a generated avatar from ui-avatars.com when the user has
      // no profile photo set. The URL comes from the OIDC `picture` claim.
      { protocol: "https", hostname: "ui-avatars.com" },
    ],
  },
};

export default nextConfig;
```

---

## vercel.ts

Typed Vercel config (`@vercel/config/v1`). Defines build command, crons, and a project-wide CSP. CSP allowlists Whop's JS hosts (live + sandbox), UploadThing, Google Fonts, and the same image hosts as `next.config.ts`. The monthly partner-payout cron lives here (full route handler is in file 2).

```ts
import { routes, type VercelConfig } from "@vercel/config/v1";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.whop.com https://sandbox-js.whop.com https://uploadthing.com",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https://utfs.io https://assets.whop.com https://cdn.whop.com https://ui-avatars.com",
  "connect-src 'self' https://*.whop.com https://*.uploadthing.com https://*.utfs.io",
  "frame-src 'self' https://*.whop.com",
].join("; ");

export const config: VercelConfig = {
  buildCommand: "prisma generate && next build",
  framework: "nextjs",
  crons: [
    { path: "/api/cron/partner-payout", schedule: "0 0 1 * *" },
  ],
  headers: [
    routes.header("/(.*)", [
      { key: "Content-Security-Policy", value: CSP },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    ]),
  ],
};
```

---

## Database schema (Prisma)

Prisma 7 generates the client to `src/generated/prisma`. Driver adapter is `@prisma/adapter-pg` (no native binary). One `db push` up-front covers every part — fifteen models cover users, writers, operators, stories, topics, social graph, Plus subs, tips, reads, payouts, promo codes, notifications, and webhook dedup.

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
  email       String   @unique
  name        String?
  username    String   @unique
  avatar      String?
  bio         String?
  headline    String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  writerProfile  WriterProfile?
  plusMembership PlusMembership?
  operator       Operator?

  stories            Story[]
  likes              Like[]
  bookmarks          Bookmark[]
  followers          Follow[]         @relation("Followed")
  following          Follow[]         @relation("Follower")
  tipsGiven          Tip[]            @relation("Tipper")
  tipsReceived       Tip[]            @relation("Writer")
  storyReads         StoryRead[]
  partnerPayouts     PartnerPayout[]
  notifications      Notification[]
  promoCodesCreated  PromoCode[]
  operatorsInvited   Operator[]       @relation("OperatorAddedBy")
  topicFollows       TopicFollow[]
}

model Operator {
  id              String   @id @default(cuid())
  email           String   @unique
  userId          String?  @unique
  addedByUserId   String?
  createdAt       DateTime @default(now())

  user    User? @relation(fields: [userId], references: [id], onDelete: SetNull)
  addedBy User? @relation("OperatorAddedBy", fields: [addedByUserId], references: [id], onDelete: SetNull)
}

model WriterProfile {
  id              String   @id @default(cuid())
  userId          String   @unique
  whopCompanyId   String   @unique
  kycComplete     Boolean  @default(false)
  tippingEnabled  Boolean  @default(false)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum StoryStatus {
  DRAFT
  PUBLISHED
  UNLISTED
}

enum StoryVisibility {
  FREE
  PLUS
}

model Story {
  id                  String           @id @default(cuid())
  authorUserId        String
  title               String
  subtitle            String?
  slug                String
  contentJson         Json
  excerpt             String           @default("")
  coverImageUrl       String?
  coverImageKey       String?
  status              StoryStatus      @default(DRAFT)
  visibility          StoryVisibility  @default(FREE)
  paywallNodePos      Int?
  readingTimeMinutes  Int              @default(1)
  likesTotal          Int              @default(0)
  publishedAt         DateTime?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt

  author     User         @relation(fields: [authorUserId], references: [id], onDelete: Cascade)
  topics     StoryTopic[]
  likes      Like[]
  bookmarks  Bookmark[]
  tips       Tip[]
  storyReads StoryRead[]

  @@unique([authorUserId, slug])
  @@index([status, publishedAt(sort: Desc)])
  @@index([visibility, publishedAt(sort: Desc)])
}

model Topic {
  id          String         @id @default(cuid())
  slug        String         @unique
  name        String
  description String?
  stories     StoryTopic[]
  followers   TopicFollow[]
}

model StoryTopic {
  storyId String
  topicId String

  story Story @relation(fields: [storyId], references: [id], onDelete: Cascade)
  topic Topic @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@id([storyId, topicId])
}

model TopicFollow {
  userId    String
  topicId   String
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  topic Topic @relation(fields: [topicId], references: [id], onDelete: Cascade)

  @@id([userId, topicId])
}

model Like {
  id        String   @id @default(cuid())
  userId    String
  storyId   String
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  story Story @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@unique([userId, storyId])
}

model Bookmark {
  id        String   @id @default(cuid())
  userId    String
  storyId   String
  createdAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  story Story @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@unique([userId, storyId])
}

model Follow {
  id              String   @id @default(cuid())
  followerUserId  String
  followedUserId  String
  createdAt       DateTime @default(now())

  follower User @relation("Follower", fields: [followerUserId], references: [id], onDelete: Cascade)
  followed User @relation("Followed", fields: [followedUserId], references: [id], onDelete: Cascade)

  @@unique([followerUserId, followedUserId])
}

enum PlusStatus {
  ACTIVE
  PAUSED
  CANCELED
  EXPIRED
}

model PlusMembership {
  id                  String      @id @default(cuid())
  userId              String      @unique
  whopMembershipId    String      @unique
  status              PlusStatus  @default(ACTIVE)
  currentPeriodEnd    DateTime
  cancelAtPeriodEnd   Boolean     @default(false)
  priceCents          Int
  whopPlanId          String
  createdAt           DateTime    @default(now())
  updatedAt           DateTime    @updatedAt

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

enum TipStatus {
  SUCCEEDED
  REFUNDED
}

model Tip {
  id                   String    @id @default(cuid())
  tipperUserId         String
  writerUserId         String
  storyId              String
  amountCents          Int
  applicationFeeCents  Int
  whopPaymentId        String    @unique
  status               TipStatus @default(SUCCEEDED)
  createdAt            DateTime  @default(now())

  tipper User  @relation("Tipper", fields: [tipperUserId], references: [id], onDelete: Cascade)
  writer User  @relation("Writer", fields: [writerUserId], references: [id], onDelete: Cascade)
  story  Story @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@index([writerUserId, createdAt])
  @@index([storyId])
}

model StoryRead {
  id            String   @id @default(cuid())
  userId        String
  storyId       String
  readAt        DateTime @default(now())
  monthBucket   String
  dwellSeconds  Int?

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  story Story @relation(fields: [storyId], references: [id], onDelete: Cascade)

  @@unique([userId, storyId, monthBucket])
  @@index([monthBucket, storyId])
}

enum PayoutStatus {
  PENDING
  SENT
  FAILED
}

model PartnerPayout {
  id                 String       @id @default(cuid())
  writerUserId       String
  monthBucket        String
  totalReads         Int
  revenueShareCents  Int
  whopTransferId     String?
  status             PayoutStatus @default(PENDING)
  failureReason      String?
  createdAt          DateTime     @default(now())
  sentAt             DateTime?

  writer User @relation(fields: [writerUserId], references: [id], onDelete: Cascade)

  @@unique([writerUserId, monthBucket])
}

model PromoCode {
  id                 String    @id @default(cuid())
  code               String    @unique
  whopPromoCodeId    String    @unique
  discountPercent    Int
  validUntil         DateTime?
  maxUses            Int?
  usageCount         Int       @default(0)
  createdByUserId    String
  archivedAt         DateTime?
  createdAt          DateTime  @default(now())

  createdBy User @relation(fields: [createdByUserId], references: [id], onDelete: Cascade)
}

enum NotificationType {
  LIKE
  FOLLOWED
  TIP_RECEIVED
  PAYOUT_SENT
  PLUS_RENEWED
}

model Notification {
  id        String           @id @default(cuid())
  userId    String
  type      NotificationType
  entityId  String
  read      Boolean          @default(false)
  createdAt DateTime         @default(now())

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId, read, createdAt(sort: Desc)])
}

model WebhookEvent {
  id          String   @id
  eventType   String
  processedAt DateTime @default(now())
}
```

> `Story.contentJson` stores the TipTap doc as JSON. `paywallNodePos` is the integer position of the paywall divider inside that doc — the renderer uses it to truncate the doc for non-Plus readers (covered in the editor section below).
>
> `StoryRead.monthBucket` is a `YYYY-MM` string and the unique key `[userId, storyId, monthBucket]` dedupes reads per user per story per month. The payout cron groups by `monthBucket` (file 2).
>
> `WebhookEvent.id` doubles as the Whop event ID — `prisma.webhookEvent.create` on every handled event makes retries idempotent (file 2).

**`prisma.config.ts`** (project root) — loads `.env.local` so `prisma db push` reads `DATABASE_URL_UNPOOLED` without manual export, and points at `prisma/schema.prisma` + `prisma/migrations`:

```ts
import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: env("DATABASE_URL_UNPOOLED") },
});
```

Then: `npx prisma generate && npx prisma db push`.

---

## Core libraries

### `src/lib/env.ts`

Single Zod schema, lazy via Proxy — each var is validated **only when read**, so a missing `STORYLINE_PLUS_PLAN_ID` only breaks the membership flow, not boot.

```ts
import { z } from "zod";

const envSchema = z.object({
  WHOP_APP_API_KEY: z.string().min(1),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),

  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),

  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_COMPANY_ID: z.string().min(1),
  WHOP_WEBHOOK_SECRET: z.string().min(1),
  STORYLINE_PLUS_PLAN_ID: z.string().min(1),

  UPLOADTHING_TOKEN: z.string().min(1),

  ROOT_OPERATOR_EMAIL: z.string().email(),
  OPERATOR_TOPUP_PAYMENT_METHOD_ID: z.string().optional(),

  CRON_SECRET: z.string().min(16),

  TIP_PLATFORM_FEE_PERCENT: z.string().default("10"),
  PLATFORM_PLUS_FEE_PERCENT: z.string().default("30"),
  STORYLINE_PLUS_MONTHLY_PRICE: z.string().default("5"),
  PARTNER_PAYOUT_MIN_USD: z.string().default("1"),

  NEXT_PUBLIC_WHOP_SANDBOX: z.string().optional(),
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

### `src/lib/whop.ts`

Two Whop clients — App key for OAuth + webhook verification, Company key for resource creation (products, plans, transfers, promo codes). Both are **factory functions** so the env is read per call.

```ts
import Whop from "@whop/sdk";

function resolveBaseURL(): string {
  return process.env.WHOP_SANDBOX === "true"
    ? "https://sandbox-api.whop.com/api/v1"
    : "https://api.whop.com/api/v1";
}

function webhookKey() {
  return Buffer.from(process.env.WHOP_WEBHOOK_SECRET || "").toString("base64");
}

export function getWhop() {
  return new Whop({
    apiKey: process.env.WHOP_APP_API_KEY!,
    webhookKey: webhookKey(),
    baseURL: resolveBaseURL(),
  });
}

export function getCompanyWhop() {
  return new Whop({
    apiKey: process.env.WHOP_COMPANY_API_KEY!,
    webhookKey: webhookKey(),
    baseURL: resolveBaseURL(),
  });
}
```

> **Gotcha — must be functions, not constants.** Module imports hoist above `dotenv.config()`. Read `process.env` at module load and sandbox calls silently route to production. Same reason `resolveBaseURL` is a function.
>
> **Gotcha — `/api/v1` suffix is mandatory.** Without it every call 404s into production.

**`src/lib/whop-oauth.ts`** — base64url + random + sha256 helpers for PKCE. Exports both `getWhopOauthBaseUrl()` (function, preferred) and `whopOauthBaseUrl` (constant — only safe after env is loaded):

```ts
export function getWhopOauthBaseUrl(): string {
  return process.env.WHOP_SANDBOX === "true"
    ? "https://sandbox-api.whop.com"
    : "https://api.whop.com";
}

export const whopOauthBaseUrl =
  process.env.WHOP_SANDBOX === "true"
    ? "https://sandbox-api.whop.com"
    : "https://api.whop.com";

export function base64url(bytes: Uint8Array) {
  return Buffer.from(bytes).toString("base64url");
}

export function randomString(len: number) {
  return base64url(crypto.getRandomValues(new Uint8Array(len)));
}

export async function sha256(s: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return base64url(new Uint8Array(digest));
}
```

### `src/lib/session.ts`

iron-session encrypted cookie — no session table, no Redis, no token refresh dance. The OAuth access token is stashed in the session for later SDK-as-user calls.

```ts
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { env } from "@/lib/env";

export interface SessionData {
  userId?: string;
  whopUserId?: string;
  accessToken?: string;
}

const sessionOptions: SessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: "storyline_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
```

> The PKCE verifier and OAuth `state` live in their own short-lived cookies (`storyline_pkce_verifier`, `storyline_oauth_state`, `storyline_oauth_return_to`), **not** in the session — the session doesn't exist yet during the OAuth round-trip.

### `src/lib/prisma.ts`

Standard global singleton with the `PrismaPg` driver adapter (`@prisma/adapter-pg`) wrapping a pooled `pg.Pool`. Cached on `globalThis` in dev to survive HMR. Client imported from `@/generated/prisma/client`.

```ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/lib/env";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const pool = new Pool({ connectionString: env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### `src/lib/auth.ts`

Two helpers used by every protected route/component. `getAuthUser` returns the user or null; `requireAuth` redirects to `/api/auth/login` when nobody's signed in. Generic `include` preserves Prisma relation types. (The companion `requireOperator` + `requireWriter` helpers are introduced in file 2.)

```ts
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import type { Prisma } from "@/generated/prisma/client";

export async function getAuthUser<I extends Prisma.UserInclude | undefined = undefined>(
  opts?: { include?: I },
): Promise<Prisma.UserGetPayload<{ include: I }> | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return (await prisma.user.findUnique({
    where: { id: session.userId },
    include: opts?.include,
  })) as Prisma.UserGetPayload<{ include: I }> | null;
}

export async function requireAuth<I extends Prisma.UserInclude | undefined = undefined>(
  opts?: { include?: I },
): Promise<Prisma.UserGetPayload<{ include: I }>> {
  const user = await getAuthUser(opts);
  if (!user) redirect("/api/auth/login");
  return user;
}
```

### `src/lib/utils.ts`

`cn(...inputs)` = `twMerge(clsx(...))`. Plus a `generateUsername(seed)` that lowercases + strips non-alphanumerics and appends a 4-digit numeric suffix; used by the OAuth callback to dedupe usernames.

---

## Authentication (Whop OAuth + PKCE)

> **No `proxy.ts` in Storyline.** Routes are guarded inside each Server Component / layout via `requireAuth()` rather than a global Next.js 16 proxy. Server-only enforcement, no edge runtime constraints.

### `src/app/api/auth/login/route.ts`

Generates PKCE verifier + challenge + state + nonce, stashes them in 10-minute cookies along with a `returnTo`, and 302s to Whop's `/oauth/authorize`.

```ts
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { whopOauthBaseUrl, randomString, sha256 } from "@/lib/whop-oauth";

export async function GET(req: NextRequest) {
  const verifier = randomString(32);
  const challenge = await sha256(verifier);
  const state = randomString(16);
  const nonce = randomString(16);

  const returnTo = req.nextUrl.searchParams.get("returnTo") || "/";

  const c = await cookies();
  c.set("storyline_pkce_verifier", verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  c.set("storyline_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  c.set("storyline_oauth_return_to", returnTo, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.WHOP_CLIENT_ID,
    redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return NextResponse.redirect(`${whopOauthBaseUrl}/oauth/authorize?${params}`);
}
```

> **Gotcha — `nonce` is required.** Whop requires `nonce` whenever scope includes `openid`, even though OAuth 2.1 treats it as optional. Skip it and the authorize call fails with `invalid_request: nonce is required for openid scope`.

### `src/app/api/auth/callback/route.ts`

Validates `state`, swaps `code` for token, fetches `/oauth/userinfo`, upserts the User (dedupes username on collision), claims any pending Operator invite by email, stashes `accessToken` in the session, deletes the PKCE cookies, redirects to `returnTo`.

```ts
import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";
import { getSession } from "@/lib/session";
import { whopOauthBaseUrl } from "@/lib/whop-oauth";
import { prisma } from "@/lib/prisma";
import { generateUsername } from "@/lib/utils";

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
  id_token?: string;
}

interface UserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
  preferred_username?: string;
}

export async function GET(req: NextRequest) {
  const c = await cookies();
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const verifier = c.get("storyline_pkce_verifier")?.value;
  const expectedState = c.get("storyline_oauth_state")?.value;
  const returnTo = c.get("storyline_oauth_return_to")?.value || "/";

  if (!code || !state || !verifier || state !== expectedState) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?auth_error=state_mismatch`,
    );
  }

  const tokenRes = await fetch(`${whopOauthBaseUrl}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      client_id: env.WHOP_CLIENT_ID,
      client_secret: env.WHOP_CLIENT_SECRET,
      code_verifier: verifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?auth_error=token_exchange_failed`,
    );
  }

  const tokens = (await tokenRes.json()) as TokenResponse;

  const userinfoRes = await fetch(`${whopOauthBaseUrl}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userinfoRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/?auth_error=userinfo_failed`,
    );
  }
  const userinfo = (await userinfoRes.json()) as UserInfo;

  const lowerEmail = (userinfo.email || "").toLowerCase();

  let baseUsername = (userinfo.preferred_username || userinfo.name || "writer")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  if (!baseUsername) baseUsername = "writer";
  let username = baseUsername;
  let attempts = 0;
  while (await prisma.user.findUnique({ where: { username } })) {
    username = generateUsername(baseUsername);
    if (++attempts > 5) break;
  }

  const user = await prisma.user.upsert({
    where: { whopUserId: userinfo.sub },
    create: {
      whopUserId: userinfo.sub,
      email: lowerEmail,
      name: userinfo.name,
      avatar: userinfo.picture,
      username,
    },
    update: {
      email: lowerEmail,
      name: userinfo.name,
      avatar: userinfo.picture,
    },
  });

  if (lowerEmail) {
    await prisma.operator.updateMany({
      where: { email: lowerEmail, userId: null },
      data: { userId: user.id },
    });
  }

  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.accessToken = tokens.access_token;
  await session.save();

  c.delete("storyline_pkce_verifier");
  c.delete("storyline_oauth_state");
  c.delete("storyline_oauth_return_to");

  return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}${returnTo}`);
}
```

> **Gotcha — Whop's `/oauth/token` wants JSON, not form-urlencoded**, and it requires `client_secret` in the body even with PKCE. Either mistake returns 400 / `invalid_client`.
>
> Usernames are generated once and never edited in this build. Collisions get a random 4-digit suffix.

### `src/app/api/auth/logout/route.ts`

`POST` calls `session.destroy()` then `303` to `/`. `GET` proxies to `POST` so any nav style works.

---

## App shell + theme

- **`globals.css`** — Tailwind v4 CSS-first `@theme` (no `tailwind.config.js`). Defines Medium-inspired tokens: white/off-white backgrounds, `#1a8917` brand green, `#ffc017` Plus yellow, Fraunces display / Inter sans / Source Serif 4 reading fonts loaded via `next/font/google` as CSS vars. Dark-mode block under `.dark { ... }`. Uses `@custom-variant dark (&:where(.dark, .dark *))` for dark-mode utilities. Restores `cursor: pointer` on buttons (Tailwind v4 dropped it). Honors `prefers-reduced-motion`. Defines a `.skip-to-content` skip link.
- **`ThemeProvider.tsx`** — wraps children in `next-themes`'s `ThemeProvider` with `attribute="class" defaultTheme="system" enableSystem` for OS-aware dark mode.
- **`layout.tsx`** — wires the three Google Fonts as CSS vars, sets `<html suppressHydrationWarning>`, renders `<ThemeProvider>` containing skip-link → `<TopNav />` → `<main id="main">` → `<Footer />`. The collapsible `<LeftSidebar>` is signed-in only (collapsed state lives in a cookie via `<SidebarProvider>`).
- **`TopNav.tsx`** — server component. `await getAuthUser()`. Signed-in: hidden-on-mobile "✎ Write" link + `<UserMenu>`. Signed-out: "Subscribe" + "Sign in" + green "Start writing" CTA pointing to `/api/auth/login?returnTo=/new-story`.
- **`UserMenu.tsx`** — `"use client"`. Avatar button toggles a dropdown (Profile link + Sign out form posting to `/api/auth/logout`). Closes on outside click + Escape.
- **`page.tsx`** — home feed (split signed-out trending vs signed-in two-column "Latest"; full composition is in file 2 under "Discovery surfaces"). The signed-out hero pairs the headline + CTAs with a static WebP of three fanned story cards (`public/hero-stack.webp`, served via `next/image priority`). The asset is generated once via `scripts/hero-stack-tuner.html` — an interactive page with sliders for title/excerpt/meta font sizes that exports the canvas to PNG via `html-to-image` at any pixel ratio, then converted to WebP offline. No runtime cost.
- **`not-found.tsx` / `error.tsx`** — branded 404 + client-component error boundary with "Try again" / "Go home" buttons.

---

## Writing experience (TipTap editor)

The editor stores TipTap JSON in `Story.contentJson` (Postgres `Json`). A custom `paywallBreak` node lets writers drop a single divider anywhere in the document; on publish the server records its index in `paywallNodePos` and flips `visibility` to `PLUS`. The editor itself always renders the full document — paywall truncation is the renderer's job, not the editor's.

Autosave fires 1.5s after the last edit via a debounced `PATCH /api/stories/[id]`. On `beforeunload`, pending payload is flushed via `navigator.sendBeacon` so the last keystrokes survive a tab close.

### The paywallBreak custom TipTap node

`src/lib/tiptap/paywall-break-node.ts`:

```ts
import { Node, mergeAttributes, type RawCommands } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    paywallBreak: {
      insertPaywallBreak: () => ReturnType;
      removePaywallBreak: () => ReturnType;
    };
  }
}

export const PaywallBreak = Node.create({
  name: "paywallBreak",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,
  parseHTML() {
    return [{ tag: 'div[data-paywall-break="true"]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, {
        "data-paywall-break": "true",
        class: "paywall-break",
      }),
      ["div", { class: "paywall-break-inner" }, "Paid content starts here"],
    ];
  },
  addCommands(): Partial<RawCommands> {
    return {
      insertPaywallBreak:
        () =>
        ({ chain, editor }) => {
          let exists = false;
          editor.state.doc.descendants((node) => {
            if (node.type.name === "paywallBreak") exists = true;
          });
          if (exists) return false;
          return chain().focus().insertContent({ type: "paywallBreak" }).run();
        },
      removePaywallBreak:
        () =>
        ({ chain, editor }) => {
          let pos: number | null = null;
          editor.state.doc.descendants((node, p) => {
            if (node.type.name === "paywallBreak") pos = p;
          });
          if (pos === null) return false;
          return chain().focus().setNodeSelection(pos).deleteSelection().run();
        },
    };
  },
});

export function findPaywallNodePos(doc: { content?: unknown[] } | null | undefined): number | null {
  if (!doc?.content || !Array.isArray(doc.content)) return null;
  const idx = doc.content.findIndex(
    (n) => typeof n === "object" && n !== null && (n as { type?: string }).type === "paywallBreak",
  );
  return idx >= 0 ? idx : null;
}
```

`atom: true` + insert-guard ensures there is at most one paywall break per story. The toolbar's lock icon calls `editor.chain().focus().insertPaywallBreak().run()`. `findPaywallNodePos` is reused by the publish route and by the client to compute `hasPaywallBreak` for the publish dialog copy.

### Editor setup

`src/lib/tiptap/extensions.ts`:

```ts
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { PaywallBreak } from "./paywall-break-node";

export const storylineExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3] },
    codeBlock: { HTMLAttributes: { class: "story-code" } },
  }),
  Image.configure({
    HTMLAttributes: { class: "story-image" },
    allowBase64: false,
  }),
  Link.configure({
    openOnClick: false,
    HTMLAttributes: { class: "story-link", rel: "noopener noreferrer" },
  }),
  Placeholder.configure({
    placeholder: ({ node }) => {
      if (node.type.name === "heading") return "Title";
      return "Tell your story…";
    },
    emptyEditorClass: "is-editor-empty",
  }),
  PaywallBreak,
];
```

`useEditor` is called with `immediatelyRender: false` — required when TipTap mounts inside a Server Component tree, otherwise it tries to hydrate before the DOM exists.

> `allowBase64: false` is deliberate. All images go through UploadThing so storage is consistent and the contentJson stays small.

The title and subtitle are plain `<input>` fields rendered outside `<EditorContent>` (not TipTap heading nodes), so they're cheap to bind and never disrupt the editor schema. The toolbar (`EditorToolbar.tsx`) is a sticky row of icon buttons calling `editor.chain().focus().toggle*().run()` for H1/H2, bold, italic, link, blockquote, code block, divider, image, and paywall break. There is no slash menu — the toolbar is the only insertion surface.

### Image uploads (UploadThing)

`src/app/api/uploadthing/core.ts`:

```ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { getAuthUser } from "@/lib/auth";

const f = createUploadthing();

async function authedMiddleware() {
  const user = await getAuthUser();
  if (!user) throw new Error("Unauthorized");
  return { userId: user.id };
}

export const storylineFileRouter = {
  storyCover: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(authedMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key };
    }),
  storyInlineImage: f({ image: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(authedMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key };
    }),
  avatar: f({ image: { maxFileSize: "2MB", maxFileCount: 1 } })
    .middleware(authedMiddleware)
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, url: file.ufsUrl, key: file.key };
    }),
} satisfies FileRouter;

export type StorylineFileRouter = typeof storylineFileRouter;
```

`src/app/api/uploadthing/route.ts` is a one-liner: `export const { GET, POST } = createRouteHandler({ router: storylineFileRouter });`.

`src/lib/uploadthing.ts` wires typed helpers:

```ts
import { generateUploadButton, generateUploadDropzone, generateReactHelpers } from "@uploadthing/react";
import type { StorylineFileRouter } from "@/app/api/uploadthing/core";

export const UploadButton = generateUploadButton<StorylineFileRouter>();
export const UploadDropzone = generateUploadDropzone<StorylineFileRouter>();
export const { useUploadThing, uploadFiles } = generateReactHelpers<StorylineFileRouter>();
```

The editor toolbar's image button creates an off-DOM `<input type="file">`, calls `startUpload([file])` via `useUploadThing("storyInlineImage", ...)`, and inserts the returned `ufsUrl` via `editor.chain().focus().setImage({ src: url }).run()` in `onClientUploadComplete`. The cover picker uses the same pattern against `storyCover`.

> Env: drop your UploadThing token into Vercel as `UPLOADTHING_TOKEN` and pull locally. UploadThing reads it automatically — no client wiring needed.

### Story persistence

All four routes guard with `requireAuth()` + an ownership check (`story.authorUserId !== user.id` → 404, not 403, so existence is never leaked). Zod validates every body.

#### `src/app/api/stories/route.ts` — POST creates a draft

```ts
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStorySlug } from "@/lib/slug";

const CreateSchema = z.object({ title: z.string().max(160).optional() });

export async function POST(req: NextRequest) {
  const user = await requireAuth();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  const title = (parsed.data.title || "Untitled draft").trim().slice(0, 160);
  const slug = await generateStorySlug(user.id, title);
  const story = await prisma.story.create({
    data: {
      authorUserId: user.id,
      title,
      slug,
      contentJson: { type: "doc", content: [{ type: "paragraph" }] },
    },
  });
  return NextResponse.json({ id: story.id });
}
```

The `/new-story` page is a server component that does the same `prisma.story.create` and then `redirect(\`/edit/\${story.id}\`)` — no UI is rendered there, the editor is the first thing the writer sees.

#### `src/app/api/stories/[id]/route.ts` — PATCH (update) and DELETE

```ts
const PatchSchema = z.object({
  title: z.string().max(160).optional(),
  subtitle: z.string().max(280).optional().nullable(),
  contentJson: z.unknown().optional(),
  coverImageUrl: z.string().url().optional().nullable(),
  coverImageKey: z.string().optional().nullable(),
  topicSlugs: z.array(z.string()).max(5).optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const story = await findOwnedStory(id, user.id);
  if (!story) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = PatchSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const data: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) data.title = parsed.data.title.trim().slice(0, 160) || "Untitled draft";
  if (parsed.data.subtitle !== undefined) data.subtitle = parsed.data.subtitle;
  if (parsed.data.coverImageUrl !== undefined) data.coverImageUrl = parsed.data.coverImageUrl;
  if (parsed.data.coverImageKey !== undefined) data.coverImageKey = parsed.data.coverImageKey;

  if (parsed.data.contentJson !== undefined) {
    const json = parsed.data.contentJson as JSONContent;
    data.contentJson = json as unknown as object;
    data.excerpt = buildExcerpt(json);
    data.readingTimeMinutes = computeReadingTime(json);
  }

  await prisma.$transaction(async (tx) => {
    await tx.story.update({ where: { id }, data });
    if (parsed.data.topicSlugs) {
      const topics = await tx.topic.findMany({
        where: { slug: { in: parsed.data.topicSlugs } },
        select: { id: true },
      });
      await tx.storyTopic.deleteMany({ where: { storyId: id } });
      if (topics.length > 0) {
        await tx.storyTopic.createMany({
          data: topics.map((t) => ({ storyId: id, topicId: t.id })),
        });
      }
    }
  });
  return NextResponse.json({ ok: true });
}
```

PATCH is the autosave target. Every save re-derives `excerpt` and `readingTimeMinutes` from the current document so card grids and metadata stay in sync without a publish step.

#### `src/app/api/stories/[id]/publish/route.ts` — POST publishes

```ts
import { NextResponse, type NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStorySlug } from "@/lib/slug";
import { buildExcerpt } from "@/lib/excerpt";
import { computeReadingTime } from "@/lib/reading-time";
import { findPaywallNodePos } from "@/lib/tiptap/paywall-break-node";
import type { JSONContent } from "@tiptap/core";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireAuth();
  const story = await prisma.story.findUnique({
    where: { id },
    select: { id: true, authorUserId: true, title: true, contentJson: true, slug: true, status: true },
  });
  if (!story || story.authorUserId !== user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!story.title.trim()) {
    return NextResponse.json({ error: "Title required" }, { status: 400 });
  }

  const doc = story.contentJson as JSONContent;
  const paywallPos = findPaywallNodePos(doc);
  const visibility = paywallPos !== null ? "PLUS" : "FREE";
  const slug = await generateStorySlug(user.id, story.title, story.id);

  await prisma.story.update({
    where: { id },
    data: {
      status: "PUBLISHED",
      visibility,
      paywallNodePos: paywallPos,
      slug,
      excerpt: buildExcerpt(doc),
      readingTimeMinutes: computeReadingTime(doc),
      publishedAt: story.status === "PUBLISHED" ? undefined : new Date(),
    },
  });
  return NextResponse.json({ ok: true, slug });
}
```

> Visibility is computed at publish-time from the document — there's no separate "make this paid" toggle. Drop a paywall break, hit publish, story is `PLUS`. `publishedAt` is only set on first publish; re-publishing preserves it.

Unpublish (`/unpublish/route.ts`) flips `status` back to `"DRAFT"` and nulls `publishedAt`. The DELETE branch on `[id]/route.ts` cascades via Prisma relations.

### Slug generation

`src/lib/slug.ts` slugifies the title and resolves collisions against the `[authorUserId, slug]` composite unique constraint. Up to 6 random suffixes are tried, then a timestamp fallback. Slugs are scoped per author — two writers can both own `/my-first-story`.

```ts
export async function generateStorySlug(
  authorUserId: string,
  title: string,
  excludeStoryId?: string,
): Promise<string> {
  const base = slugify(title) || "untitled";
  let candidate = base;
  let attempt = 0;
  while (true) {
    const existing = await prisma.story.findUnique({
      where: { authorUserId_slug: { authorUserId, slug: candidate } },
      select: { id: true },
    });
    if (!existing || existing.id === excludeStoryId) return candidate;
    attempt += 1;
    const suffix = Math.random().toString(36).slice(2, 6);
    candidate = `${base}-${suffix}`;
    if (attempt > 6) return `${base}-${Date.now().toString(36)}`;
  }
}
```

The reader URL is `/@[username]/[storySlug]`. `src/lib/handle.ts` parses the route param, accepting both `@user` and the URL-encoded `%40user` form Next.js sometimes hands you:

```ts
export function parseHandle(handleParam: string): string | null {
  let decoded: string;
  try { decoded = decodeURIComponent(handleParam); } catch { decoded = handleParam; }
  if (!decoded.startsWith("@")) return null;
  const username = decoded.slice(1).trim();
  return username || null;
}
```

### Autosave wiring (the StoryEditor client)

The relevant slice of `src/components/editor/StoryEditor.tsx`:

```tsx
const editor = useEditor({
  extensions: storylineExtensions,
  content: story.contentJson,
  immediatelyRender: false,
  editorProps: {
    attributes: { class: "tiptap-prose prose-storyline focus:outline-none ..." },
  },
  onUpdate({ editor }) {
    const json = editor.getJSON();
    let has = false;
    editor.state.doc.descendants((node) => {
      if (node.type.name === "paywallBreak") has = true;
    });
    setHasPaywallBreak(has);
    queueSave({ contentJson: json });
  },
});

function queueSave(patch: Record<string, unknown>) {
  pendingPayloadRef.current = { ...(pendingPayloadRef.current ?? {}), ...patch };
  if (saveTimer.current) clearTimeout(saveTimer.current);
  setSaveState("saving");
  saveTimer.current = setTimeout(flushSave, 1500);
}

async function flushSave() {
  const payload = pendingPayloadRef.current;
  pendingPayloadRef.current = null;
  if (!payload) return;
  const res = await fetch(`/api/stories/${story.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) { setSaveState("error"); return; }
  setSaveState("saved");
}

useEffect(() => {
  function onUnload() {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    if (pendingPayloadRef.current && navigator.sendBeacon) {
      navigator.sendBeacon(
        `/api/stories/${story.id}`,
        new Blob([JSON.stringify(pendingPayloadRef.current)], { type: "application/json" }),
      );
      pendingPayloadRef.current = null;
    }
  }
  window.addEventListener("beforeunload", onUnload);
  return () => window.removeEventListener("beforeunload", onUnload);
}, [story.id]);
```

Title/subtitle/cover changes all funnel through the same `queueSave` so a single PATCH carries everything pending. The header pill reads "Draft · Saving…/Saved/Save failed". The Publish button opens `PublishDialog` (cover picker + `TopicsPicker` for up to 5 topics + a sentence about whether a paywall break exists), which PATCHes cover+topics and then POSTs `/publish` before redirecting to `/me/stories?published=1`.

### Server-side rendering and paywall enforcement

`src/lib/tiptap/render-server.tsx` walks TipTap JSON and emits React on the server — no client TipTap bundle ships to readers. It also handles the paywall truncation:

```tsx
import "server-only";
import type { ReactNode } from "react";
import type { JSONContent } from "@tiptap/core";

interface RenderOptions { truncateAtPaywall?: boolean; }

const SAFE_PROTOCOLS = new Set(["http:", "https:", "mailto:", "ftp:"]);

function sanitizeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  if (href.startsWith("/") || href.startsWith("#")) return href;
  try {
    const url = new URL(href);
    if (!SAFE_PROTOCOLS.has(url.protocol)) return undefined;
    return href;
  } catch { return undefined; }
}

// renderMarks: bold/italic/strike/underline/code/link (link sanitized via sanitizeHref,
//   always rendered with rel="noopener noreferrer nofollow" target="_blank").
// renderNode handles: doc, paragraph, heading (level 1/2/3), blockquote,
//   bulletList, orderedList, listItem, codeBlock, horizontalRule, hardBreak,
//   image (src sanitized; uses <img>, not next/image, since URLs are dynamic),
//   paywallBreak (rendered as a divider div), text (via renderMarks).

export function StoryContent({ json, options = {} }: { json: unknown; options?: RenderOptions }) {
  let doc = (json ?? { type: "doc", content: [] }) as JSONContent & { content?: JSONContent[] };
  if (options.truncateAtPaywall && Array.isArray(doc.content)) {
    const idx = doc.content.findIndex((n) => (n as { type?: string }).type === "paywallBreak");
    if (idx > -1) doc = { ...doc, content: doc.content.slice(0, idx) };
  }
  return <>{renderNode(doc, "n")}</>;
}
```

> Paywall enforcement is one line: `<StoryContent json={story.contentJson} options={{ truncateAtPaywall: !readerHasPlus }} />`. The non-Plus reader gets a document whose `content` array is sliced at the break — the second half never touches their browser. The full doc still exists in Postgres, so flipping the reader's Plus status renders the rest with no re-fetch logic. The `<PaywallCard>` upsell that renders beneath the truncated body lives in file 2.

### Reading time and excerpt utilities

`src/lib/reading-time.ts` and `src/lib/excerpt.ts` walk `JSONContent` recursively. Reading time is `Math.max(1, ceil(words / 265))`. Excerpts collect text up to 200 chars and truncate cleanly on whitespace with an ellipsis. Both run inside the PATCH route on every autosave so cards never go stale.

### Reading page composition

`src/app/[handle]/[slug]/page.tsx` is a server component:

1. `parseHandle(handle)` → username, else `notFound()`.
2. `prisma.user.findUnique({ where: { username } })` → author.
3. `prisma.story.findUnique({ where: { authorUserId_slug: { authorUserId: author.id, slug } } })`, `notFound()` if missing or not `PUBLISHED`.
4. Renders title, subtitle, author byline (`next/image` avatar at 40×40 rounded), reading time + long date + optional Plus badge.
5. Cover image uses `next/image` with `priority` (LCP), `width={1280} height={720}`, `sizes="(max-width: 680px) 100vw, 680px"`, capped at `max-h-[520px]`.
6. Article body is a single styled div containing `<StoryContent>`. The Plus gate slots in by swapping the `<StoryContent>` line for `<StoryContent json={story.contentJson} options={{ truncateAtPaywall: locked }} />` and rendering `<PaywallCard>` below when `locked`. The `locked` boolean is computed server-side as `story.visibility === "PLUS" && !isPlus`, where `isPlus` comes from `prisma.plusMembership.findUnique({ where: { userId } })` (full logic in file 2).

`generateMetadata` does its own minimal lookup (title, subtitle, coverImageUrl) for OG tags.

> Cover and avatar both hit external hosts (UploadThing, ui-avatars for seeds). Add the relevant hostnames to `next.config.ts` → `images.remotePatterns` (above) or `next/image` will refuse to render them in prod.

The writer profile (`/@[handle]/page.tsx`) and topic page (`/tag/[slug]/page.tsx`) both reuse `StoryCard` (`src/components/StoryCard.tsx`), which builds the canonical reader URL as `` `/@${story.author.username}/${story.slug}` ``. The drafts/published dashboard (`/me/stories`) lists the writer's own stories and uses a two-step `DeleteStoryButton` (first click swaps label to "Confirm delete," second click within 3s fires `DELETE /api/stories/[id]` and `router.refresh()`).

---

**Next:** continue to `medium-clone-2.md` for the Plus subscription, the unified webhook handler, writer sub-company onboarding + embedded payout portal, tipping with `application_fee_amount`, the Partner Program monthly cron, discovery surfaces, engagement (likes/bookmarks/follows + notifications), operator allowlist + promo codes, the sandbox→prod switch, and the consolidated 26-item Whop gotchas list.
