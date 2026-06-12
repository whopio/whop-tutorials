# How to build a Ko-fi clone with Next.js and Whop

A condensed reference for building **Cuppa**, a Next.js Ko-fi clone where fans support creators with one-time tips ("buy them a coffee"), monthly memberships, and a small shop. Creators publish public or supporter-only posts, set donation goals with a live progress bar, customize their page (cover, avatar, accent color, light/dark theme), and withdraw earnings through an embedded Whop payout portal without leaving the site. Every creator is a Whop **connected account** (a child company under the platform), every charge is a **direct charge** on that creator's company with a platform application fee, and discovery (homepage, explore, feed) ties the creators together.

This file keeps **full code only for the security-sensitive and Whop-specific parts**: the Whop SDK service layer (connected accounts, inline-plan checkout configurations, ledger reads, access tokens, push notifications), OAuth 2.1/PKCE login and callback, the lazy-validated env module, the iron-session helpers and edge guard, the checkout API with its tip/membership/shop metadata pattern, the embedded checkout widget, the webhook handler with idempotency, the fulfillment module, the embedded payout portal wiring, the sharp-backed upload route, the content-gating logic, and the full Prisma schema. Boring UI and plain CRUD are summarized in a line or two.

- Demo: https://kofi-clone-whop-tutorial.vercel.app
- Source: https://github.com/whopio/whop-tutorials/tree/main/kofi-clone

---

## Overview

**Tech stack**

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 plus Frosted UI (`@whop/react/components`: Button, TextField, TextArea under a `WhopApp` provider)
- Whop OAuth 2.1 + PKCE for sign-in, `@whop/sdk` for payments, `@whop/checkout` for the embedded checkout, `@whop/embedded-components-react-js` + `-vanilla-js` for the on-site payout portal
- PostgreSQL (Neon) via Prisma 5 (not Prisma 7; v5 has no `prisma.config.ts`)
- iron-session 8 (encrypted httpOnly cookie sessions, no session store)
- Zod 4 for env, input, and webhook validation; `sharp` for image processing
- Vercel for deployment; the app runs on **port 3005** to match the registered OAuth redirect URI

**Pages**

- `/` — Marketing homepage: hero, featured "Creators of all kinds" grid bucketed by tags, how-it-works, FAQ, claim-your-handle CTA.
- `/features` — Static marketing page describing the product.
- `/[username]` — The core creator page: cover, sticky header, tabs, donation goal with progress bar, about card, mixed feed of posts and supporter activity, and the support widget plus membership/shop cards in a sidebar.
- `/[username]/membership` — Tier cards with benefits and a Join flow.
- `/[username]/shop` — Product grid with buy flow (free products download instantly).
- `/[username]/gallery`, `/[username]/posts`, `/[username]/leaderboard` — Image grid, full post feed, top supporters.
- `/[username]/post/[id]` — Single post with content gating (locked card for non-supporters).
- `/explore` — Paginated creator directory.
- `/feed` — Signed-in supporter home: creators you support or follow, plus suggestions.
- `/dashboard` — Creator home: onboarding checklist with progress, profile stats, latest support, share card, suggestions.
- `/dashboard/{posts,tiers,shop,supporters,payouts,settings}` — CRUD dashboards plus the embedded payout portal and settings (profile, images, accent, goal).
- `/dashboard/start` — Multi-step onboarding wizard that turns a user into a creator (creates the connected account).

**API routes**

- `/api/auth/login` — Starts OAuth: generates PKCE verifier/state/nonce, stores them in an httpOnly cookie, redirects to Whop's authorize URL.
- `/oauth/callback` — Verifies state, exchanges the code (PKCE verifier plus `client_secret`), fetches userinfo, upserts the User, saves the iron-session, redirects.
- `/api/auth/logout`, `/api/auth/me` — Destroy session; return the current user as JSON.
- `/api/creator` — POST creates the creator page: validates the handle, calls `companies.create` (connected account), stores `whopCompanyId`, sets `whopOnboarded: true`.
- `/api/creator/username` — Live handle-availability check used by onboarding.
- `/api/creator/settings` — PATCH profile fields (accepts hosted URLs or data URLs for images).
- `/api/creator/upload` — POST an avatar/cover image; sharp-resized data URL in sandbox, Whop Files API CDN URL in production.
- `/api/creator/goal` — PATCH upserts the single active donation goal; DELETE retires it.
- `/api/checkout` — Creates a Whop checkout configuration (direct charge on the creator's company with an application fee) for a tip, membership, or product; writes the PENDING Support/Order row.
- `/api/checkout/confirm` — Local-dev fallback: verifies a returned checkout against `payments.list` and fulfills.
- `/api/webhooks/whop` — `payment.succeeded`, `membership.activated`/`.deactivated`, `refund.created` with signature verification and idempotency.
- `/api/payouts/token` — Mints a short-lived company access token for the embedded payout portal (ownership-checked).
- `/api/tiers`, `/api/tiers/[id]`, `/api/products`, `/api/products/[id]`, `/api/posts`, `/api/posts/[id]`, `/api/follow` — Plain validated CRUD (described inline below).

**Payment flow**

1. A supporter picks an amount (or tier, or product) on `/[username]`. The client POSTs to `/api/checkout`.
2. The route writes a `PENDING` Support or Order row (memberships carry ids in metadata instead), then calls `checkoutConfigurations.create` with an **inline plan on the creator's connected company**: `company_id`, `plan_type` (`one_time` for tips/shop, `renewal` for memberships), the price, and `application_fee_amount` all nested INSIDE `plan`, plus `metadata` identifying what is being paid for.
3. The client renders `WhopCheckoutEmbed` with the returned `sessionId` and `planId` (inline on desktop, modal on mobile), themed to the page accent.
4. The supporter pays with a test card. Funds land on the **creator's connected balance**, minus Whop's processing fee and the platform application fee. The platform never holds the money.
5. `payment.succeeded` fires the webhook, which verifies the signature, dedupes on the event id, and fulfills from metadata: completes the Support/Order or upserts the Membership, bumps the goal, and push-notifies the creator. On localhost (where webhooks cannot reach), the embed's `onComplete` hits `/api/checkout/confirm`, which verifies against `payments.list` before fulfilling the same way.
6. Refunds (`refund.created`) mark the Support REFUNDED; `membership.deactivated` cancels the Membership and revokes gated content.
7. The creator withdraws on `/dashboard/payouts` through the embedded `PayoutsSession` components (KYC happens inline the first time), authenticated by `/api/payouts/token`.

---

## Step 1: Project setup

```bash
npx create-next-app@latest kofi-clone --typescript --tailwind --app --turbopack --eslint
cd kofi-clone
npm install @prisma/client @whop/checkout @whop/embedded-components-react-js @whop/embedded-components-vanilla-js @whop/react @whop/sdk iron-session sharp zod
npm install -D prisma @vercel/config
npx prisma init --datasource-provider postgresql
```

The init must run now because the scripts below run `prisma generate` on every install and build. Set the port and scripts in `package.json`:

```json
"scripts": {
  "dev": "next dev -p 3005",
  "build": "prisma generate && next build",
  "start": "next start -p 3005",
  "lint": "eslint",
  "postinstall": "prisma generate",
  "db:migrate": "prisma migrate dev",
  "db:push": "prisma db push",
  "db:studio": "prisma studio"
}
```

Design system, summarized: `app/globals.css` defines Ko-fi-style tokens as CSS variables (`--surface`, `--line`, `--ink`, `--muted`, `--positive`, a per-creator `--accent`) with a `.dark` class variant on `<html>`, utility classes (`kofi-card` for white rounded cards, `btn-pill`/`btn-primary`/`btn-accent`/`btn-secondary` pill buttons), and `button { cursor: pointer }` in `@layer base` because Tailwind v4 removed the default button cursor. DM Sans is the body font and Fraunces the display font, both via `next/font` in the root layout.

### `app/layout.tsx`

The root layout wires the fonts, a tiny inline script that applies the saved theme before paint (so there is no flash), and Frosted UI's `WhopApp` provider that the `@whop/react` components require.

```tsx
import type { Metadata } from "next";
import { DM_Sans, Fraunces } from "next/font/google";
import { WhopApp } from "@whop/react/components";
import "./globals.css";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Cuppa — get paid by the people who love your work",
  description:
    "Cuppa is where fans back the creators they love with tips, memberships, and shop purchases. Built with Next.js and Whop.",
};

const themeScript = `(function(){try{var t=localStorage.getItem('theme')||'system';var d=t==='dark'||(t==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d);}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen antialiased">
        <WhopApp accentColor="blue" grayColor="sand" appearance="inherit" hasBackground={false}>
          {children}
        </WhopApp>
      </body>
    </html>
  );
}
```

### `next.config.ts`

The CSP must allow Whop's embedded checkout and payout iframes, plus data/blob/https images for uploads and CDNs.

```ts
import type { NextConfig } from "next";

// Content Security Policy that allows the Whop embedded checkout + payout/elements
// iframes and scripts, while keeping everything else same-origin. 'unsafe-inline'
// and 'unsafe-eval' are required for Next.js (and Turbopack HMR in dev).
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.whop.com https://*.whop.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "frame-src https://*.whop.com",
  "connect-src 'self' https://*.whop.com wss://*.whop.com",
  "frame-ancestors 'self'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Content-Security-Policy", value: csp }],
      },
    ];
  },
};

export default nextConfig;
```

### `vercel.ts`

```ts
import type { VercelConfig } from "@vercel/config/v1";

// Vercel project configuration (typed, replaces vercel.json).
// The Content-Security-Policy that allows the Whop embedded checkout + payout
// iframes is applied in next.config.ts headers() so it works in dev and prod alike.
export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "npm run build",
};
```

The landing page, features page, footer, and brand sticker components (`BrandIcon` maps eight webp stickers in `public/brand/`: coffee-cup, paint-palette, megaphone, money-stack, heart, shopping-bag, lock, confetti) are plain presentational React; build them to taste.

## Step 2: Deploy to Vercel and Neon Postgres

Deploy first so OAuth always has a real https origin: push the repo to GitHub, import it in Vercel, then add **Neon Postgres** from the Vercel Marketplace (it injects `DATABASE_URL` and `POSTGRES_*` automatically). Add the remaining env vars in Vercel and pull them locally with `npx vercel env pull .env.local`. Vercel is the source of truth for env; never edit locally and mirror up. The full set:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/kofi_clone?schema=public"

SESSION_SECRET="a-random-string-at-least-32-characters-long"

NEXT_PUBLIC_APP_URL="http://localhost:3005"

WHOP_SANDBOX="true"

WHOP_PLATFORM_COMPANY_ID="biz_xxxxxxxxxxxxx"
NEXT_PUBLIC_WHOP_COMPANY_ID="biz_xxxxxxxxxxxxx"

WHOP_CLIENT_ID="app_xxxxxxxxxxxxx"
NEXT_PUBLIC_WHOP_APP_ID="app_xxxxxxxxxxxxx"
WHOP_CLIENT_SECRET="your-app-oauth-client-secret"

WHOP_COMPANY_API_KEY="apik_xxxxxxxxxxxxx"

WHOP_WEBHOOK_SECRET=""

NEXT_PUBLIC_PLATFORM_FEE_PERCENT="5"
```

Whop setup, all on **sandbox.whop.com** during the build: create a company (its id is `WHOP_PLATFORM_COMPANY_ID`), create an app under Developer with the `oauth:token_exchange` permission and redirect URI `http://localhost:3005/oauth/callback` (plus the production callback after deploying), and a Company API key for `WHOP_COMPANY_API_KEY`. The Company key needs product/plan creation scope plus the payout scopes used in Step 12 (`company:balance:read`, `payout:account:read`, `payout:destination:read`, `payout:transfer:read`, `payout:transfer_funds`).

## Step 3: Database schema

The full schema. Notable shapes: `Creator.whopCompanyId` is the connected account, `whopOnboarded` gates discovery; `Support.whopPaymentId` and the `ProcessedWebhook` table give payment idempotency; `Membership` has a compound unique on `[userId, tierId]`; `Order.status` reuses `SupportStatus`.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id           String   @id @default(cuid())
  whopUserId   String   @unique
  username     String
  email        String?
  name         String?
  avatarUrl    String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  creator      Creator?
  supports     Support[]    @relation("UserSupports")
  memberships  Membership[]
  orders       Order[]      @relation("UserOrders")
  follows      Follow[]     @relation("UserFollows")
}

model Creator {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  whopCompanyId String?  @unique
  whopOnboarded Boolean  @default(false)

  username      String   @unique
  displayName   String
  bio           String?
  coverImageUrl String?
  avatarUrl     String?
  accentColor   String   @default("sky")
  websiteUrl    String?
  socialLinks   Json?
  tags          String[]

  isActive      Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tiers         Tier[]
  posts         Post[]
  products      Product[]
  goals         Goal[]
  supports      Support[]
  memberships   Membership[]
  orders        Order[]
  followers     Follow[]
}

model Tier {
  id           String   @id @default(cuid())
  creatorId    String
  creator      Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  whopPlanId   String?  @unique
  name         String
  description  String?
  priceCents   Int
  benefits     String[]
  order        Int      @default(0)
  isActive     Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  memberships  Membership[]
  gatedPosts   Post[]   @relation("TierGatedPosts")
}

model Product {
  id           String      @id @default(cuid())
  creatorId    String
  creator      Creator     @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  whopPlanId   String?     @unique
  title        String
  description  String?
  priceCents   Int         @default(0)
  imageUrl     String?
  type         ProductType @default(DIGITAL)
  downloadUrl  String?
  salesCount   Int         @default(0)
  isActive     Boolean     @default(true)
  createdAt    DateTime    @default(now())
  updatedAt    DateTime    @updatedAt

  orders       Order[]
}

model Post {
  id             String     @id @default(cuid())
  creatorId      String
  creator        Creator    @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  title          String
  content        String
  imageUrl       String?
  visibility     Visibility @default(PUBLIC)
  minimumTierId  String?
  minimumTier    Tier?      @relation("TierGatedPosts", fields: [minimumTierId], references: [id])
  pinned         Boolean    @default(false)
  published      Boolean    @default(true)
  reactionsCount Int        @default(0)
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
}

model Goal {
  id           String    @id @default(cuid())
  creatorId    String
  creator      Creator   @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  title        String
  description  String?
  targetCents  Int
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  supports     Support[]
}

model Support {
  id              String        @id @default(cuid())
  creatorId       String
  creator         Creator       @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  supporterUserId String?
  supporter       User?         @relation("UserSupports", fields: [supporterUserId], references: [id])
  supporterName   String
  message         String?
  amountCents     Int
  coffees         Int           @default(1)
  isPublic        Boolean       @default(true)

  whopPaymentId   String?       @unique
  status          SupportStatus @default(PENDING)

  goalId          String?
  goal            Goal?         @relation(fields: [goalId], references: [id])

  createdAt       DateTime      @default(now())
}

model Membership {
  id               String           @id @default(cuid())
  creatorId        String
  creator          Creator          @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  userId           String
  user             User             @relation(fields: [userId], references: [id], onDelete: Cascade)

  tierId           String
  tier             Tier             @relation(fields: [tierId], references: [id])

  whopMembershipId String?          @unique
  status           MembershipStatus @default(ACTIVE)

  createdAt        DateTime         @default(now())
  updatedAt        DateTime         @updatedAt

  @@unique([userId, tierId])
}

model Order {
  id            String        @id @default(cuid())
  creatorId     String
  creator       Creator       @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  productId     String
  product       Product       @relation(fields: [productId], references: [id])

  buyerUserId   String?
  buyer         User?         @relation("UserOrders", fields: [buyerUserId], references: [id])
  buyerName     String
  amountCents   Int

  whopPaymentId String?       @unique
  status        SupportStatus @default(PENDING)

  createdAt     DateTime      @default(now())
}

model Follow {
  id        String   @id @default(cuid())
  creatorId String
  creator   Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  userId    String
  user      User     @relation("UserFollows", fields: [userId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([creatorId, userId])
}

model ProcessedWebhook {
  id        String   @id
  type      String
  createdAt DateTime @default(now())
}

enum Visibility {
  PUBLIC
  SUPPORTERS
  TIER
}

enum SupportStatus {
  PENDING
  COMPLETED
  REFUNDED
  FAILED
}

enum MembershipStatus {
  ACTIVE
  CANCELING
  CANCELED
  PAST_DUE
  EXPIRED
}

enum ProductType {
  DIGITAL
  PHYSICAL
}
```

Run `npm run db:migrate` to create the tables. `lib/prisma.ts` is the standard PrismaClient singleton (cache it on `globalThis` in dev).

## Step 4: Authentication

Whop OAuth 2.1 with PKCE plus iron-session. Three gotchas the code below already handles: Whop requires `client_secret` in the token exchange even with PKCE, `nonce` is required alongside the `openid` scope, and the sandbox OAuth endpoints live on `sandbox-api.whop.com`.

### `lib/env.ts`

Zod-validated env behind a lazy Proxy, so an unset var fails when first used rather than at import time. Also the sandbox switches for both API and OAuth hosts; note the base URL must be `baseURL` (capital URL) with the `/api/v1` suffix or the SDK silently falls back to production and every call 401s. Never import this module (or anything that imports it) from a client component.

```ts
import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  WHOP_SANDBOX: z.string().optional().default("true"),
  WHOP_PLATFORM_COMPANY_ID: z.string().min(1),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_WEBHOOK_SECRET: z.string().optional().default(""),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  NEXT_PUBLIC_WHOP_APP_ID: z.string().min(1),
  NEXT_PUBLIC_WHOP_COMPANY_ID: z.string().min(1),
  NEXT_PUBLIC_PLATFORM_FEE_PERCENT: z.string().optional().default("5"),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

function validate(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment variables. Check your .env file.");
  }
  cached = parsed.data;
  return cached;
}

export const env = new Proxy({} as ServerEnv, {
  get(_target, prop: string) {
    return validate()[prop as keyof ServerEnv];
  },
});

export function isSandbox(): boolean {
  return env.WHOP_SANDBOX !== "false";
}

export function whopApiBaseUrl(): string {
  return isSandbox()
    ? "https://sandbox-api.whop.com/api/v1"
    : "https://api.whop.com/api/v1";
}

export function whopOAuthBaseUrl(): string {
  return isSandbox() ? "https://sandbox-api.whop.com" : "https://api.whop.com";
}

export function platformFeePercent(): number {
  const n = Number(env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT);
  return Number.isFinite(n) ? n : 5;
}
```

### `lib/session.ts`

```ts
import type { SessionOptions } from "iron-session";

export interface SessionData {
  userId?: string;
  whopUserId?: string;
  isLoggedIn: boolean;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET as string,
  cookieName: "kofi_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  },
};

export const defaultSession: SessionData = {
  isLoggedIn: false,
};

export const PKCE_COOKIE = "kofi_pkce";
```

### `lib/oauth.ts`

```ts
import crypto from "crypto";
import { env, whopOAuthBaseUrl } from "./env";

const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/oauth/callback`;
const SCOPE = "openid profile email";

function base64url(buf: Buffer): string {
  return buf.toString("base64url");
}

export function randomString(bytes = 32): string {
  return base64url(crypto.randomBytes(bytes));
}

export function codeChallengeS256(verifier: string): string {
  return base64url(crypto.createHash("sha256").update(verifier).digest());
}

export interface PkceState {
  verifier: string;
  state: string;
  nonce: string;
  returnTo?: string;
}

export function buildAuthorizeUrl(pkce: PkceState): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: env.WHOP_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: SCOPE,
    state: pkce.state,
    nonce: pkce.nonce,
    code_challenge: codeChallengeS256(pkce.verifier),
    code_challenge_method: "S256",
  });
  return `${whopOAuthBaseUrl()}/oauth/authorize?${params.toString()}`;
}

export interface WhopTokens {
  access_token: string;
  refresh_token: string;
  id_token?: string;
  token_type: string;
  expires_in: number;
}

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<WhopTokens> {
  const res = await fetch(`${whopOAuthBaseUrl()}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      client_id: env.WHOP_CLIENT_ID,
      client_secret: env.WHOP_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Token exchange failed (${res.status}): ${detail}`);
  }
  return (await res.json()) as WhopTokens;
}

export interface WhopUserInfo {
  sub: string;
  preferred_username?: string;
  name?: string;
  picture?: string;
  email?: string;
  email_verified?: boolean;
}

export async function getUserInfo(accessToken: string): Promise<WhopUserInfo> {
  const res = await fetch(`${whopOAuthBaseUrl()}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch userinfo (${res.status})`);
  }
  return (await res.json()) as WhopUserInfo;
}
```

### `app/api/auth/login/route.ts`

Generates the PKCE state, stores it in a separate httpOnly cookie (the session does not exist yet at this point in the dance), and redirects to the authorize URL. Carries an optional `returnTo` destination through the flow.

```ts
import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl, randomString } from "@/lib/oauth";
import { PKCE_COOKIE } from "@/lib/session";

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  // The homepage "claim your URL" widget passes a handle; carry it into onboarding.
  const handle = (params.get("handle") || "").trim();
  const explicitReturnTo = params.get("returnTo");
  // With no explicit destination, leave returnTo empty so the OAuth callback can
  // route by account type (creators -> /dashboard, supporters -> /feed).
  const returnTo = handle
    ? `/dashboard/start?handle=${encodeURIComponent(handle)}`
    : explicitReturnTo && explicitReturnTo.startsWith("/")
      ? explicitReturnTo
      : "";
  const pkce = {
    verifier: randomString(32),
    state: randomString(16),
    nonce: randomString(16),
    returnTo,
  };

  const res = NextResponse.redirect(buildAuthorizeUrl(pkce));
  res.cookies.set(PKCE_COOKIE, JSON.stringify(pkce), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
```

### `app/oauth/callback/route.ts`

State check, token exchange, userinfo fetch, user upsert, session save. The session is written through the `cookies()` store because iron-session's `(req, res)` overload does not reliably emit Set-Cookie on a `NextResponse` in production.

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getUserInfo, type PkceState } from "@/lib/oauth";
import { PKCE_COOKIE } from "@/lib/session";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const base = req.nextUrl.origin;
  const params = req.nextUrl.searchParams;
  const code = params.get("code");
  const state = params.get("state");
  const oauthError = params.get("error");

  if (oauthError) {
    return NextResponse.redirect(new URL(`/?authError=${encodeURIComponent(oauthError)}`, base));
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/?authError=missing_code", base));
  }

  const cookieStore = await cookies();
  const pkceRaw = cookieStore.get(PKCE_COOKIE)?.value;
  if (!pkceRaw) {
    return NextResponse.redirect(new URL("/?authError=missing_pkce", base));
  }

  let pkce: PkceState;
  try {
    pkce = JSON.parse(pkceRaw) as PkceState;
  } catch {
    return NextResponse.redirect(new URL("/?authError=bad_pkce", base));
  }
  if (pkce.state !== state) {
    return NextResponse.redirect(new URL("/?authError=state_mismatch", base));
  }

  let accessToken: string;
  let info: Awaited<ReturnType<typeof getUserInfo>>;
  try {
    const tokens = await exchangeCodeForTokens(code, pkce.verifier);
    accessToken = tokens.access_token;
    info = await getUserInfo(accessToken);
  } catch (err: unknown) {
    console.error("OAuth callback failed:", err);
    return NextResponse.redirect(new URL("/?authError=token_exchange_failed", base));
  }

  const user = await prisma.user.upsert({
    where: { whopUserId: info.sub },
    update: {
      username: info.preferred_username ?? info.sub,
      name: info.name ?? null,
      email: info.email ?? null,
      avatarUrl: info.picture ?? null,
    },
    create: {
      whopUserId: info.sub,
      username: info.preferred_username ?? info.sub,
      name: info.name ?? null,
      email: info.email ?? null,
      avatarUrl: info.picture ?? null,
    },
  });

  // Write the session through the next/headers cookie store (the App Router way).
  // iron-session's (req, res) overload does not reliably emit Set-Cookie on a
  // NextResponse in production; saving via cookies() does.
  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.isLoggedIn = true;
  await session.save();

  cookieStore.delete(PKCE_COOKIE);

  // No explicit destination: send creators to their dashboard and everyone else
  // (supporters) to the feed.
  let dest: string;
  if (pkce.returnTo && pkce.returnTo.startsWith("/")) {
    dest = pkce.returnTo;
  } else {
    const creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    dest = creator ? "/dashboard" : "/feed";
  }
  return NextResponse.redirect(new URL(dest, base));
}
```

### `app/api/auth/logout/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

async function destroy(req: NextRequest) {
  // Clear the session through the next/headers cookie store (via getSession).
  // iron-session's (req, res) overload does not reliably emit Set-Cookie on a
  // NextResponse redirect in production, so destroying via cookies() is what
  // actually logs the user out.
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/", req.nextUrl.origin));
}

export async function GET(req: NextRequest) {
  return destroy(req);
}

export async function POST(req: NextRequest) {
  return destroy(req);
}
```

### `lib/auth.ts`

The one place sessions are read: `getCurrentUser` returns the user with their creator relation, `requireAuth` redirects guests to login, `requireCreator` redirects non-creators to onboarding.

```ts
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getIronSession } from "iron-session";
import { prisma } from "./prisma";
import { sessionOptions, type SessionData } from "./session";
import type { Creator, User } from "@prisma/client";

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export type CurrentUser = User & { creator: Creator | null };

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { creator: true },
  });
  return user;
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/api/auth/login");
  return user;
}

export async function requireCreator(): Promise<CurrentUser & { creator: Creator }> {
  const user = await requireAuth();
  if (!user.creator) redirect("/dashboard/start");
  return user as CurrentUser & { creator: Creator };
}
```

### `proxy.ts`

Next.js 16 renamed the middleware convention: this file must be `proxy.ts` exporting `proxy` (having a `middleware.ts` too crashes the dev server). It is a cheap edge guard that only checks cookie presence; real validation happens in `requireAuth` on the Node runtime.

```ts
import { NextRequest, NextResponse } from "next/server";

const SESSION_COOKIE = "kofi_session";

export function proxy(req: NextRequest) {
  // Edge guard: only check that the session cookie is present. The real
  // validation (decrypting and verifying the iron-session) happens on the Node
  // runtime via requireAuth(), where iron-session reliably reads the cookie.
  if (!req.cookies.has(SESSION_COOKIE)) {
    const url = new URL("/api/auth/login", req.url);
    url.searchParams.set("returnTo", req.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard", "/dashboard/:path*", "/feed", "/feed/:path*"],
};
```

`/api/auth/me` returns `getCurrentUser()` as JSON for client components. There is no password UI anywhere: every sign-in button links to `/api/auth/login?returnTo=...`.

## Step 5: Whop SDK and creator onboarding

Each creator becomes a Whop **child company** under the platform company. Tips and sales are direct charges on the creator's company, so "every payment goes straight to the creator" is literally true; the platform collects an application fee per charge.

### `lib/whop.ts`

One SDK client built with the Company API key. The `webhookKey` must be the base64 of the webhook secret.

```ts
import { Whop } from "@whop/sdk";
import { env, isSandbox, whopApiBaseUrl } from "./env";

function webhookKey(): string | null {
  const secret = env.WHOP_WEBHOOK_SECRET;
  if (!secret) return null;
  return Buffer.from(secret).toString("base64");
}

export const whopsdk = new Whop({
  apiKey: env.WHOP_COMPANY_API_KEY,
  webhookKey: webhookKey(),
  ...(isSandbox() ? { baseURL: whopApiBaseUrl() } : {}),
});
```

### `lib/fees.ts`

Money helpers. Whop checkout amounts are dollars, our database stores cents. This file reads `NEXT_PUBLIC_PLATFORM_FEE_PERCENT` directly from `process.env` (not via `lib/env.ts`) so client components can import it without dragging the server env Proxy into the bundle.

```ts
/** Platform fee percent (read from the public env var so this stays client-safe). */
function platformFeePercent(): number {
  const n = Number(process.env.NEXT_PUBLIC_PLATFORM_FEE_PERCENT);
  return Number.isFinite(n) && n >= 0 ? n : 5;
}

/** Our platform application fee, in cents, taken from a gross payment amount. */
export function applicationFeeCents(amountCents: number): number {
  const pct = platformFeePercent();
  const fee = Math.round((amountCents * pct) / 100);
  // Application fee must be positive and strictly less than the total.
  if (amountCents <= 0) return 0;
  return Math.min(Math.max(fee, 1), amountCents - 1);
}

/** Whop checkout amounts are expressed in dollars, not cents. */
export function centsToDollars(cents: number): number {
  return Math.round(cents) / 100;
}

export function dollarsToCents(dollars: number): number {
  return Math.round(dollars * 100);
}

export function formatUsd(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
```

### `lib/rate-limit.ts`

In-memory fixed-window limiter used by every mutating route.

```ts
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Simple in-memory fixed-window rate limiter. Good enough for a single instance. */
export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

export function clientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "local";
}
```

### `constants/index.ts`

```ts
export const APP_NAME = "Cuppa";

// Default coffee unit price and quick presets (in coffees).
export const COFFEE_UNIT_CENTS = 500;
export const COFFEE_PRESETS = [1, 3, 5] as const;

// Membership/shop guardrails.
export const MIN_TIP_CENTS = 100;
export const MAX_TIP_CENTS = 100_000;

export type CheckoutKind = "tip" | "membership" | "shop";

export const PAGE_SIZE = 10;

// Onboarding step 2 ("How are you planning to earn?"). UI only: every creator
// gets all of these, so we collect the answer for the flow but don't store it.
export const EARN_GOALS = [
  "Tips & donations",
  "Monthly memberships",
  "Digital products",
  "Physical products",
  "Commissions",
] as const;

// Onboarding step 4 ("Choose your interests"). Persisted to Creator.tags.
export const CREATOR_CATEGORIES = [
  "Art & Illustration",
  "Music",
  "Writing",
  "Podcasts",
  "Video & Film",
  "Photography",
  "Gaming",
  "Education",
  "Technology",
  "Crafts & DIY",
  "Comics & Animation",
  "Cooking",
  "Fitness & Health",
  "Cosplay",
  "Charity & Causes",
] as const;
```

### `lib/accent.ts`

Whop's embedded components accept a curated accent palette, not arbitrary hex, so the per-creator accent uses the same names and flows into both the page CSS and the checkout/payout embeds.

```ts
// Whop's embedded components accept a curated accent palette (not arbitrary hex).
// We expose the same names so the page accent matches the checkout/payout widgets.
export const ACCENT_OPTIONS = [
  { name: "sky", hex: "#0ea5e9" },
  { name: "blue", hex: "#3b82f6" },
  { name: "cyan", hex: "#06b6d4" },
  { name: "teal", hex: "#14b8a6" },
  { name: "jade", hex: "#10b981" },
  { name: "green", hex: "#22c55e" },
  { name: "grass", hex: "#65a30d" },
  { name: "pink", hex: "#ec4899" },
  { name: "crimson", hex: "#e11d48" },
  { name: "tomato", hex: "#ef4444" },
  { name: "orange", hex: "#f97316" },
  { name: "amber", hex: "#f59e0b" },
  { name: "purple", hex: "#a855f7" },
  { name: "violet", hex: "#8b5cf6" },
  { name: "indigo", hex: "#6366f1" },
  { name: "gold", hex: "#ca8a04" },
] as const;

export type AccentName = (typeof ACCENT_OPTIONS)[number]["name"];

const HEX_BY_NAME = new Map<string, string>(ACCENT_OPTIONS.map((a) => [a.name, a.hex] as [string, string]));

export const DEFAULT_ACCENT: AccentName = "sky";

export function accentHex(name: string | null | undefined): string {
  if (!name) return HEX_BY_NAME.get(DEFAULT_ACCENT)!;
  return HEX_BY_NAME.get(name) ?? HEX_BY_NAME.get(DEFAULT_ACCENT)!;
}

export function isAccentName(name: string): name is AccentName {
  return HEX_BY_NAME.has(name);
}
```

### `services/whop.ts`

Every Whop API call in one service module. The critical shape: in `checkoutConfigurations.create`, `company_id`, `currency`, `plan_type`, the price fields, and `application_fee_amount` all nest INSIDE `plan` (top-level `company_id` only applies to setup mode), and `redirect_url` must be https so it is omitted on localhost.

```ts
import { whopsdk } from "@/lib/whop";
import { env } from "@/lib/env";
import { centsToDollars } from "@/lib/fees";
import type { CheckoutKind } from "@/constants";

/** Create a connected account (child company) under our platform for a creator. */
export async function createConnectedCompany(params: {
  email: string;
  title: string;
  internalUserId: string;
}): Promise<string> {
  const company = await whopsdk.companies.create({
    email: params.email,
    parent_company_id: env.WHOP_PLATFORM_COMPANY_ID,
    title: params.title,
    metadata: { internal_user_id: params.internalUserId },
  });
  return company.id;
}

/** Hosted account link for KYC onboarding or the hosted payouts portal. */
export async function createAccountLink(params: {
  companyId: string;
  useCase: "account_onboarding" | "payouts_portal";
  returnUrl: string;
  refreshUrl: string;
}): Promise<string> {
  const link = await whopsdk.accountLinks.create({
    company_id: params.companyId,
    use_case: params.useCase,
    return_url: params.returnUrl,
    refresh_url: params.refreshUrl,
  });
  return link.url;
}

/** Short-lived access token used by the embedded payout portal for a company. */
export async function createCompanyAccessToken(companyId: string): Promise<string> {
  const { token } = await whopsdk.accessTokens.create({ company_id: companyId });
  return token;
}

export interface PayoutSnapshot {
  /** True once the connected account has finished KYC and can receive/withdraw funds. */
  activated: boolean;
  /** Raw payout-account status: connected | pending_verification | action_required | ... | null. */
  status: string | null;
  /** Withdrawable balance on the connected company's Whop ledger, in cents. */
  availableCents: number;
  /** Not-yet-settled balance on the connected company's Whop ledger, in cents. */
  pendingCents: number;
}

/**
 * Read a connected company's Whop ledger to learn its payout-account (KYC) status and
 * real balance. `ledgerAccounts.retrieve` accepts the company id directly and resolves
 * its primary ledger. Used to decide whether to show the "activate payouts" prompt or
 * the live balance, so the dashboard never renders a bare "no payout account" state.
 */
export async function getPayoutSnapshot(companyId: string): Promise<PayoutSnapshot> {
  const ledger = await whopsdk.ledgerAccounts.retrieve(companyId);
  const balance = ledger.balances?.find((b) => b.currency === "usd") ?? ledger.balances?.[0];
  const status = ledger.payout_account_details?.status ?? null;
  return {
    activated: status === "connected",
    status,
    availableCents: Math.round((balance?.balance ?? 0) * 100),
    pendingCents: Math.round((balance?.pending_balance ?? 0) * 100),
  };
}

export interface CheckoutResult {
  sessionId: string;
  planId: string;
  purchaseUrl: string;
}

/**
 * Create a checkout configuration as a direct charge on a creator's connected
 * company, collecting our platform application fee. Returns the session + plan id
 * for the embedded checkout component.
 */
export async function createCheckoutConfiguration(params: {
  connectedCompanyId: string;
  amountCents: number;
  applicationFeeCents: number;
  planType: "one_time" | "renewal";
  title: string;
  redirectUrl: string;
  metadata: { kind: CheckoutKind } & Record<string, string>;
}): Promise<CheckoutResult> {
  const amount = centsToDollars(params.amountCents);
  const fee = centsToDollars(params.applicationFeeCents);

  const cfg = await whopsdk.checkoutConfigurations.create({
    plan: {
      company_id: params.connectedCompanyId,
      currency: "usd",
      plan_type: params.planType,
      application_fee_amount: fee,
      title: params.title,
      ...(params.planType === "renewal"
        ? { renewal_price: amount, billing_period: 30, initial_price: 0 }
        : { initial_price: amount }),
    },
    metadata: params.metadata,
    // Whop requires an https redirect URL; omit on http://localhost (the embed's
    // client-side returnUrl + onComplete handle the local success flow instead).
    ...(params.redirectUrl.startsWith("https://") ? { redirect_url: params.redirectUrl } : {}),
  });

  const planId = cfg.plan?.id;
  if (!planId) throw new Error("Checkout configuration did not return a plan id");

  return { sessionId: cfg.id, planId, purchaseUrl: cfg.purchase_url };
}

/** Look up a payment to confirm it succeeded (checkout-return fallback when no webhook). */
export async function retrievePayment(paymentId: string) {
  return whopsdk.payments.retrieve(paymentId);
}

/** Fire a push notification to a creator's connected company. Best-effort. */
export async function notifyCreator(params: {
  companyId: string;
  title: string;
  subtitle?: string;
  content: string;
  restPath?: string;
  iconUserId?: string;
}): Promise<boolean> {
  try {
    await whopsdk.notifications.create({
      company_id: params.companyId,
      title: params.title,
      subtitle: params.subtitle,
      content: params.content,
      rest_path: params.restPath,
      icon_user_id: params.iconUserId,
    });
    return true;
  } catch (err: unknown) {
    console.error("notifyCreator failed:", err);
    return false;
  }
}

/** Create the payments webhook pointing at our deployed endpoint. Returns the secret. */
export async function createPaymentsWebhook(appUrl: string): Promise<{ id: string; secret?: string }> {
  const res = await whopsdk.webhooks.create({
    url: `${appUrl}/api/webhooks/whop`,
    events: [
      "payment.succeeded",
      "payment.failed",
      "membership.activated",
      "membership.deactivated",
      "refund.created",
    ],
  } as Parameters<typeof whopsdk.webhooks.create>[0]);
  const anyRes = res as unknown as { id: string; webhook_secret?: string; secret?: string };
  return { id: anyRes.id, secret: anyRes.webhook_secret ?? anyRes.secret };
}
```

### `app/api/creator/route.ts`

Creates the page: validates the handle against `lib/username.ts` (a Zod schema plus a reserved-names set: `dashboard`, `explore`, `feed`, `features`, `api`, and friends), calls `companies.create`, then stores the creator with `whopOnboarded: true` so discovery picks the page up. One trap: `companies.create` rejects undeliverable emails (anything `@example.com`), so real OAuth emails are used.

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createConnectedCompany } from "@/services/whop";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { DEFAULT_ACCENT } from "@/lib/accent";
import { CREATOR_CATEGORIES } from "@/constants";
import { usernameSchema, RESERVED_USERNAMES } from "@/lib/username";

const schema = z.object({
  username: usernameSchema,
  displayName: z.string().min(1).max(60),
  bio: z.string().max(500).optional(),
  tags: z.array(z.string().max(40)).max(8).optional(),
});

export async function POST(req: NextRequest) {
  if (!rateLimit(`creator:${clientIp(req)}`, 5, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (user.creator) return NextResponse.json({ error: "You already have a page" }, { status: 400 });

  const body: unknown = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const { username, displayName, bio, tags } = parsed.data;
  const allowed = new Set<string>(CREATOR_CATEGORIES);
  const cleanTags = (tags ?? []).filter((t) => allowed.has(t));

  if (RESERVED_USERNAMES.has(username)) {
    return NextResponse.json({ error: "That username is reserved" }, { status: 409 });
  }
  const existing = await prisma.creator.findUnique({ where: { username } });
  if (existing) {
    return NextResponse.json({ error: "That username is taken" }, { status: 409 });
  }

  let whopCompanyId: string | null = null;
  try {
    whopCompanyId = await createConnectedCompany({
      email: user.email ?? `${username}@example.com`,
      title: displayName,
      internalUserId: user.id,
    });
  } catch (err: unknown) {
    console.error("Failed to create connected company:", err);
    return NextResponse.json(
      { error: "We couldn't set up your payments account. Please try again." },
      { status: 502 },
    );
  }

  const creator = await prisma.creator.create({
    data: {
      userId: user.id,
      username,
      displayName,
      bio: bio || null,
      tags: cleanTags,
      whopCompanyId,
      // The connected company exists at this point, so the page can go live in
      // discovery (homepage, /explore, /feed all filter on whopOnboarded).
      whopOnboarded: true,
      accentColor: DEFAULT_ACCENT,
    },
  });

  return NextResponse.json({ ok: true, username: creator.username });
}
```

The onboarding UI (`/dashboard/start` rendering `components/OnboardingWizard.tsx`) is a five-step client wizard: creator-or-supporter choice, earning goals (UI only), handle picker with a debounced GET to `/api/creator/username` (auth-gated, rate-limited, reuses the same Zod schema), interest tags persisted to `Creator.tags`, then display name and bio, ending in a POST to `/api/creator`. `/api/creator/username` and the wizard are plain validated forms.

## Step 6: Creator page UI

The public page is a server component sandwich, summarized: `app/[username]/layout.tsx` sets `--accent` from the creator's accent color and renders a sticky mini header plus a footer CTA; `CreatorProfileHeader` shows the cover (CSS background with an accent-gradient fallback), overlapping avatar (initial fallback), supporter and follower counts, and a Frosted Follow button posting to `/api/follow` (a `@@unique([creatorId, userId])` toggle); `CreatorTabs` underlines the active tab (Home, Membership, Shop, Gallery, Posts). `app/[username]/page.tsx` composes the goal card (green progress bar fed by completed Support sums), about card with tag pills, a mixed feed (pinned posts first, then posts and public supports interleaved by date), and the sidebar (support widget, membership teaser, shop preview). Gallery, posts, and leaderboard subpages are simple queries over the same data.

### `lib/creator.ts`

The access-control core used by every gated surface: who is viewing, and can they see this post.

```ts
import { cache } from "react";
import { prisma } from "./prisma";
import { getCurrentUser } from "./auth";

/** Cached lightweight creator lookup, deduped across layout + page in one request. */
export const getCreatorLite = cache(async (username: string) => {
  return prisma.creator.findUnique({
    where: { username },
    select: {
      id: true,
      userId: true,
      username: true,
      displayName: true,
      bio: true,
      avatarUrl: true,
      coverImageUrl: true,
      accentColor: true,
      isActive: true,
    },
  });
});

export interface ViewerContext {
  userId: string | null;
  isOwner: boolean;
  isSupporter: boolean;
  activeTierIds: string[];
  isFollowing: boolean;
}

/** Determine the current viewer's relationship to a creator (for gating + UI). */
export async function getViewerContext(creatorId: string, creatorUserId?: string): Promise<ViewerContext> {
  const user = await getCurrentUser();
  if (!user) {
    return { userId: null, isOwner: false, isSupporter: false, activeTierIds: [], isFollowing: false };
  }

  const [memberships, follow] = await Promise.all([
    prisma.membership.findMany({
      where: { creatorId, userId: user.id, status: { in: ["ACTIVE", "CANCELING"] } },
      select: { tierId: true },
    }),
    prisma.follow.findUnique({
      where: { creatorId_userId: { creatorId, userId: user.id } },
      select: { id: true },
    }),
  ]);

  return {
    userId: user.id,
    isOwner: creatorUserId ? user.id === creatorUserId : Boolean(user.creator && user.creator.id === creatorId),
    isSupporter: memberships.length > 0,
    activeTierIds: memberships.map((m) => m.tierId),
    isFollowing: Boolean(follow),
  };
}

/** Whether a viewer can see a post's full content. */
export function canViewPost(
  post: { visibility: "PUBLIC" | "SUPPORTERS" | "TIER"; minimumTierId: string | null },
  viewer: ViewerContext,
): boolean {
  if (post.visibility === "PUBLIC") return true;
  if (viewer.isOwner) return true;
  if (post.visibility === "SUPPORTERS") return viewer.isSupporter;
  if (post.visibility === "TIER") {
    return post.minimumTierId ? viewer.activeTierIds.includes(post.minimumTierId) : viewer.isSupporter;
  }
  return false;
}
```

## Step 7: Tips and embedded checkout

### `app/api/checkout/route.ts`

One route for all three checkout kinds, discriminated by Zod. Tips and shop orders write their `PENDING` row first and carry its id in metadata (`ref`); memberships carry `creatorId`/`tierId`/`userId` so the webhook can upsert. Free products skip payment entirely.

```ts
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { env } from "@/lib/env";
import { applicationFeeCents } from "@/lib/fees";
import { createCheckoutConfiguration } from "@/services/whop";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { COFFEE_UNIT_CENTS, MIN_TIP_CENTS, MAX_TIP_CENTS } from "@/constants";

const schema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("tip"),
    creatorUsername: z.string().min(1),
    amountCents: z.number().int().min(MIN_TIP_CENTS).max(MAX_TIP_CENTS),
    supporterName: z.string().max(60).optional(),
    message: z.string().max(500).optional(),
    isPublic: z.boolean().optional().default(true),
  }),
  z.object({
    kind: z.literal("membership"),
    creatorUsername: z.string().min(1),
    tierId: z.string().min(1),
  }),
  z.object({
    kind: z.literal("shop"),
    creatorUsername: z.string().min(1),
    productId: z.string().min(1),
  }),
]);

export async function POST(req: NextRequest) {
  if (!rateLimit(`checkout:${clientIp(req)}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body: unknown = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 });
  }
  const input = parsed.data;

  const creator = await prisma.creator.findUnique({
    where: { username: input.creatorUsername },
    select: {
      id: true,
      displayName: true,
      whopCompanyId: true,
      goals: { where: { isActive: true }, take: 1, select: { id: true } },
    },
  });
  if (!creator || !creator.whopCompanyId) {
    return NextResponse.json({ error: "Creator not found or not ready for payments" }, { status: 404 });
  }

  const user = await getCurrentUser();
  const appUrl = env.NEXT_PUBLIC_APP_URL;
  const returnUrl = `${appUrl}/${input.creatorUsername}?status=success`;

  let amountCents: number;
  let planType: "one_time" | "renewal";
  let title: string;
  let metadata: Record<string, string>;

  if (input.kind === "tip") {
    amountCents = input.amountCents;
    planType = "one_time";
    title = `Tip for ${creator.displayName}`;
    const displayName = (input.supporterName?.trim() || user?.name || user?.username || "Someone").slice(0, 60);
    const coffees = Math.max(1, Math.round(amountCents / COFFEE_UNIT_CENTS));
    const support = await prisma.support.create({
      data: {
        creatorId: creator.id,
        supporterUserId: user?.id ?? null,
        supporterName: displayName,
        message: input.message?.trim() || null,
        amountCents,
        coffees,
        isPublic: input.isPublic,
        status: "PENDING",
        goalId: creator.goals[0]?.id ?? null,
      },
    });
    metadata = { kind: "tip", ref: support.id, supportId: support.id, creatorId: creator.id };
  } else if (input.kind === "shop") {
    const product = await prisma.product.findFirst({
      where: { id: input.productId, creatorId: creator.id, isActive: true },
    });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });
    amountCents = product.priceCents;
    planType = "one_time";
    title = product.title;
    const buyerName = (user?.name || user?.username || "Someone").slice(0, 60);
    const order = await prisma.order.create({
      data: {
        creatorId: creator.id,
        productId: product.id,
        buyerUserId: user?.id ?? null,
        buyerName,
        amountCents,
        status: "PENDING",
      },
    });
    if (amountCents <= 0) {
      // Free product: no payment required, fulfill immediately.
      await prisma.order.update({ where: { id: order.id }, data: { status: "COMPLETED" } });
      await prisma.product.update({ where: { id: product.id }, data: { salesCount: { increment: 1 } } });
      return NextResponse.json({ free: true, downloadUrl: product.downloadUrl ?? null });
    }
    metadata = { kind: "shop", ref: order.id, orderId: order.id, creatorId: creator.id };
  } else {
    // membership
    if (!user) return NextResponse.json({ error: "login_required" }, { status: 401 });
    const tier = await prisma.tier.findFirst({
      where: { id: input.tierId, creatorId: creator.id, isActive: true },
    });
    if (!tier) return NextResponse.json({ error: "Tier not found" }, { status: 404 });
    amountCents = tier.priceCents;
    planType = "renewal";
    title = `${tier.name} — ${creator.displayName}`;
    metadata = {
      kind: "membership",
      ref: crypto.randomUUID(),
      creatorId: creator.id,
      tierId: tier.id,
      userId: user.id,
    };
  }

  try {
    const checkout = await createCheckoutConfiguration({
      connectedCompanyId: creator.whopCompanyId,
      amountCents,
      applicationFeeCents: applicationFeeCents(amountCents),
      planType,
      title,
      redirectUrl: returnUrl,
      metadata: metadata as { kind: "tip" | "membership" | "shop" } & Record<string, string>,
    });
    return NextResponse.json({ ...checkout, ref: metadata.ref });
  } catch (err: unknown) {
    console.error("Checkout creation failed:", err);
    return NextResponse.json({ error: "Could not start checkout" }, { status: 502 });
  }
}
```

### `components/creator/SupportWidget.tsx`

The signature component: coffee presets, custom amount, name and message, then an inline `WhopCheckoutEmbed` (sandbox-aware `environment`, themed by page accent and current light/dark mode). On `onComplete` it calls `/api/checkout/confirm` with a few retries while the payment settles, then refreshes the page so the new support appears on the wall.

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WhopCheckoutEmbed } from "@whop/checkout/react";
import type { AccentColor } from "@whop/checkout/react";
import { Button, TextField, TextArea } from "@whop/react/components";
import BrandIcon from "@/components/BrandIcon";
import { ChevronLeft } from "@/components/Icons";

const COFFEE_UNIT_CENTS = 500;
const PRESETS = [1, 3, 5];

type Step = "form" | "checkout" | "done";

export default function SupportWidget({
  creatorUsername,
  creatorDisplayName,
  accentColor,
  sandbox,
  hasMemberships,
}: {
  creatorUsername: string;
  creatorDisplayName: string;
  accentColor: string;
  sandbox: boolean;
  hasMemberships: boolean;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"once" | "membership">("once");
  const [coffees, setCoffees] = useState(1);
  const [custom, setCustom] = useState("");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState<Step>("form");
  const [checkout, setCheckout] = useState<{ sessionId: string; planId: string; ref: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const confirmTriedRef = useRef(false);

  useEffect(() => {
    setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light");
  }, []);

  const customCents = custom ? Math.round(parseFloat(custom) * 100) : 0;
  const amountCents = customCents > 0 ? customCents : coffees * COFFEE_UNIT_CENTS;
  const amountLabel = `$${(amountCents / 100).toFixed(amountCents % 100 === 0 ? 0 : 2)}`;

  async function startCheckout() {
    setError(null);
    if (amountCents < 100) {
      setError("Please choose an amount of at least $1.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creatorUsername,
          kind: "tip",
          amountCents,
          supporterName: name || undefined,
          message: message || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not start checkout");
        setLoading(false);
        return;
      }
      setCheckout({ sessionId: data.sessionId, planId: data.planId, ref: data.ref });
      setStep("checkout");
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function onComplete() {
    if (!checkout || confirmTriedRef.current) return;
    confirmTriedRef.current = true;
    setStep("done");
    // Confirm against Whop (a few retries while the payment settles).
    for (let i = 0; i < 5; i++) {
      try {
        const res = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ref: checkout.ref, creatorUsername }),
        });
        const data = await res.json();
        if (data.ok) break;
      } catch {
        /* retry */
      }
      await new Promise((r) => setTimeout(r, 1500));
    }
    router.refresh();
  }

  if (step === "done") {
    return (
      <div className="kofi-card p-6 text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-positive/15">
          <BrandIcon name="confetti" className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-bold">Thank you!</h3>
        <p className="mt-1 text-sm text-muted">
          Your support means a lot to {creatorDisplayName}.
        </p>
        <Button
          size="2"
          variant="soft"
          color="gray"
          className="mt-4"
          onClick={() => {
            setStep("form");
            setCheckout(null);
            confirmTriedRef.current = false;
            setCustom("");
            setMessage("");
          }}
        >
          Send another
        </Button>
      </div>
    );
  }

  if (step === "checkout" && checkout) {
    return (
      <div className="kofi-card overflow-hidden p-4">
        <button className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-muted" onClick={() => setStep("form")}>
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <WhopCheckoutEmbed
          sessionId={checkout.sessionId}
          planId={checkout.planId}
          theme={theme}
          themeOptions={{ accentColor: accentColor as AccentColor }}
          environment={sandbox ? "sandbox" : "production"}
          returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/${creatorUsername}?status=success`}
          onComplete={onComplete}
          fallback={<div className="py-10 text-center text-sm text-muted">Loading secure checkout…</div>}
        />
      </div>
    );
  }

  return (
    <div className="kofi-card p-5">
      <h2 className="text-lg font-bold">Show {creatorDisplayName} some love</h2>

      <div className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-surface-2 p-1 text-sm font-semibold">
        <button
          onClick={() => setMode("once")}
          className={`rounded-full py-2 transition ${mode === "once" ? "bg-surface shadow-sm" : "text-muted"}`}
        >
          One time
        </button>
        <button
          onClick={() => setMode("membership")}
          className={`rounded-full py-2 transition ${mode === "membership" ? "bg-surface shadow-sm" : "text-muted"}`}
        >
          Membership
        </button>
      </div>

      {mode === "membership" ? (
        <div className="mt-5 text-center">
          <p className="text-sm text-muted">
            {hasMemberships
              ? "Join a monthly membership for exclusive perks."
              : `${creatorDisplayName} hasn't set up memberships yet.`}
          </p>
          {hasMemberships ? (
            <Link href={`/${creatorUsername}/membership`} className="btn-pill btn-accent mt-4 w-full">
              See membership options
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <p className="mt-4 text-sm font-semibold">Choose amount</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {PRESETS.map((n) => {
              const active = customCents === 0 && coffees === n;
              return (
                <button
                  key={n}
                  onClick={() => {
                    setCoffees(n);
                    setCustom("");
                  }}
                  className="btn-pill inline-flex items-center justify-center gap-1.5 border text-sm"
                  style={
                    active
                      ? { background: "var(--accent)", color: "#fff", borderColor: "var(--accent)" }
                      : { borderColor: "var(--line)" }
                  }
                >
                  <BrandIcon name="coffee" className="h-5 w-5" />
                  <span>${(n * COFFEE_UNIT_CENTS) / 100}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <span className="text-sm text-muted">or enter an amount</span>
            <div className="flex flex-1 items-center rounded-full border border-line px-3 py-1.5">
              <span className="text-muted">$</span>
              <input
                type="number"
                min={1}
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="10"
                className="w-full bg-transparent pl-1 outline-none"
              />
            </div>
          </div>

          <TextField.Root size="3" className="mt-3">
            <TextField.Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (optional)"
            />
          </TextField.Root>
          <TextArea
            className="mt-2"
            size="3"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Say something nice (optional)"
          />

          {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}

          <Button onClick={startCheckout} disabled={loading} size="3" variant="solid" className="mt-3 w-full">
            {loading ? "Starting…" : `Support ${amountLabel}`}
          </Button>
          <p className="mt-2 text-center text-xs text-muted">
            Every payment goes straight to {creatorDisplayName}.
          </p>
        </>
      )}
    </div>
  );
}
```

### `app/api/checkout/confirm/route.ts`

The local-dev fulfillment path (webhooks cannot reach localhost). Verifies against Whop before trusting anything; note a settled payment has `status: "paid"` (ReceiptStatus), with the friendly `"succeeded"` only on `substatus`.

```ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { whopsdk } from "@/lib/whop";
import { fulfillFromMetadata } from "@/lib/fulfillment";

const schema = z.object({ ref: z.string().min(1), creatorUsername: z.string().min(1) });

/**
 * Checkout-return confirmation: verify with Whop that a payment carrying this `ref`
 * actually succeeded, then fulfill. Local-dev fallback when webhooks can't reach
 * localhost; in production the webhook is the source of truth.
 */
export async function POST(req: NextRequest) {
  const body: unknown = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const creator = await prisma.creator.findUnique({
    where: { username: parsed.data.creatorUsername },
    select: { whopCompanyId: true },
  });
  if (!creator?.whopCompanyId) return NextResponse.json({ ok: false }, { status: 400 });

  let matched: { id: string; metadata?: Record<string, unknown> | null } | null = null;
  try {
    let scanned = 0;
    for await (const payment of whopsdk.payments.list({ company_id: creator.whopCompanyId, direction: "desc" })) {
      const p = payment as unknown as {
        id: string;
        status?: string;
        substatus?: string;
        metadata?: Record<string, unknown> | null;
      };
      // Whop payment `status` is a ReceiptStatus ("paid" when it settles); the
      // friendly "succeeded" lives on `substatus`. Accept either.
      const settled = p.status === "paid" || p.substatus === "succeeded";
      if (p.metadata?.ref === parsed.data.ref && settled) {
        matched = { id: p.id, metadata: p.metadata };
        break;
      }
      if (++scanned >= 40) break;
    }
  } catch (err: unknown) {
    console.error("payments.list failed during confirm:", err);
  }

  if (!matched) return NextResponse.json({ ok: false, pending: true });

  await fulfillFromMetadata(matched.metadata, matched.id);
  return NextResponse.json({ ok: true });
}
```

## Step 8: Memberships

Tiers are project-local rows; the recurring plan is created inline per checkout (`plan_type: "renewal"`, `renewal_price`, `billing_period: 30`, `initial_price: 0` in `services/whop.ts`). The CRUD is plain: `/api/tiers` POST validates name/price/description/benefits with Zod, rate-limits, requires the creator session, and `prisma.tier.create`s with the next `order`; `/api/tiers/[id]` PATCH/DELETE edits or soft-retires (`isActive: false`) an owned tier. The membership page (`/[username]/membership` rendering `MembershipTiers`) shows tier cards with member counts and benefits; Join requires login (the checkout route 401s with `login_required`, the client redirects to `/api/auth/login`), then opens the same `WhopCheckoutEmbed` in a modal with the returned session/plan ids. Supporter access is the `Membership` table: ACTIVE or CANCELING rows pass `canViewPost`, and the webhook flips statuses from there.

## Step 9: Shop

Products mirror tiers: `/api/products` POST and `/api/products/[id]` PATCH/DELETE are plain validated CRUD over title, description, price (0 allowed for free items), image URL, `DIGITAL`/`PHYSICAL` type, and an optional `downloadUrl`. The shop page (`ShopGrid`) is a card grid; Buy goes through `/api/checkout` (kind `shop`), free items return `{ free: true, downloadUrl }` immediately, and a completed order increments `salesCount` and exposes the download. Order history surfaces on the creator's supporters dashboard.

## Step 10: Posts and content gating

Posts are plain CRUD (`/api/posts`, `/api/posts/[id]`: title, content, optional image, visibility `PUBLIC` | `SUPPORTERS` | `TIER` with `minimumTierId`, pinned, published) plus a dashboard editor page. The public surfaces never leak gated content: list pages render title plus a locked teaser, and `app/[username]/post/[id]/page.tsx` re-checks `canViewPost` server-side and swaps the body for a lock card with an unlock CTA pointing at the support widget. The feed interleaving on the creator home comes from Step 6; reactions are a simple counter.

## Step 11: Webhooks and the money flow

In the Whop dashboard (Developer > Webhooks), add a webhook pointing at `https://<your-app>/api/webhooks/whop`, API version v1, and **enable connected account actions**; every payment in this app happens on a creator's connected company, and without that toggle the webhook never fires for them. Subscribe to `payment.succeeded`, `payment.failed`, `membership.activated`, `membership.deactivated`, `refund.created`, and put the signing secret in `WHOP_WEBHOOK_SECRET`. Event types arrive dotted exactly as listed.

### `app/api/webhooks/whop/route.ts`

Signature verification via `webhooks.unwrap` (it reads the Standard Webhooks headers), then idempotency on the event id through the `ProcessedWebhook` table, then the event switch. Always 200 after dedupe so Whop stops retrying.

```ts
import { NextRequest, NextResponse } from "next/server";
import { whopsdk } from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import {
  fulfillFromMetadata,
  activateMembership,
  deactivateMembership,
  markSupportRefunded,
} from "@/lib/fulfillment";

type WebhookEvent = { id?: string; type: string; data: Record<string, unknown> };

export async function POST(req: NextRequest) {
  const bodyText = await req.text();
  const headers = Object.fromEntries(req.headers);

  let event: WebhookEvent;
  try {
    event = whopsdk.webhooks.unwrap(bodyText, { headers }) as unknown as WebhookEvent;
  } catch (err: unknown) {
    console.error("Webhook signature verification failed:", err);
    return new NextResponse("invalid signature", { status: 401 });
  }

  // Idempotency: dedupe on the event id (Standard Webhooks `webhook-id`).
  const eventId = event.id ?? headers["webhook-id"];
  if (eventId) {
    const seen = await prisma.processedWebhook.findUnique({ where: { id: eventId } }).catch(() => null);
    if (seen) return new NextResponse("ok", { status: 200 });
    await prisma.processedWebhook.create({ data: { id: eventId, type: event.type } }).catch(() => {});
  }

  try {
    const data = event.data;
    switch (event.type) {
      case "payment.succeeded": {
        const id = String(data.id ?? "");
        const metadata = (data.metadata ?? null) as Record<string, unknown> | null;
        if (id) await fulfillFromMetadata(metadata, id);
        break;
      }
      case "membership.activated": {
        const meta = (data.metadata ?? {}) as Record<string, unknown>;
        if (
          typeof meta.creatorId === "string" &&
          typeof meta.userId === "string" &&
          typeof meta.tierId === "string"
        ) {
          await activateMembership({
            creatorId: meta.creatorId,
            userId: meta.userId,
            tierId: meta.tierId,
            whopMembershipId: String(data.id ?? ""),
          });
        }
        break;
      }
      case "membership.deactivated": {
        const id = String(data.id ?? "");
        if (id) await deactivateMembership(id);
        break;
      }
      case "refund.created": {
        const paymentId = String(data.payment_id ?? (data.payment as { id?: string } | undefined)?.id ?? "");
        if (paymentId) await markSupportRefunded(paymentId);
        break;
      }
      default:
        break;
    }
  } catch (err: unknown) {
    console.error(`Webhook handler error for ${event.type}:`, err);
  }

  return new NextResponse("ok", { status: 200 });
}
```

### `lib/fulfillment.ts`

All money-event fulfillment, shared by the webhook and the confirm route, idempotent everywhere: complete a tip (and push-notify the creator), heal PENDING tips against `payments.list`, mark refunds, complete orders, upsert/cancel memberships, and route by checkout metadata.

```ts
import { prisma } from "./prisma";
import { whopsdk } from "./whop";
import { formatUsd } from "./fees";
import { notifyCreator } from "@/services/whop";

type CreatorLike = { whopCompanyId: string | null };

async function notify(creator: CreatorLike, n: { title: string; subtitle?: string; content: string; iconUserId?: string }) {
  if (!creator.whopCompanyId) return;
  await notifyCreator({ companyId: creator.whopCompanyId, restPath: "/dashboard", ...n });
}

/** Complete a tip (idempotent) + notify. */
export async function markSupportCompleted(supportId: string, whopPaymentId: string) {
  const support = await prisma.support.findUnique({ where: { id: supportId }, include: { creator: true } });
  if (!support || support.status === "COMPLETED") return support;
  const updated = await prisma.support.update({
    where: { id: supportId },
    data: { status: "COMPLETED", whopPaymentId },
  });
  const word = support.coffees === 1 ? "coffee" : "coffees";
  await notify(support.creator, {
    title: "New supporter",
    subtitle: `${support.supporterName} bought you ${support.coffees} ${word}`,
    content: support.message?.trim()
      ? `"${support.message.trim()}" — ${formatUsd(support.amountCents)}`
      : `You received ${formatUsd(support.amountCents)}!`,
  });
  return updated;
}

/**
 * Best-effort healing: complete any PENDING tips whose Whop payment has settled.
 * Covers a missed webhook or a checkout-return confirm that didn't land. Idempotent
 * and safe to call on a page view; only runs when the creator has pending tips.
 */
export async function reconcilePendingSupports(creatorId: string, whopCompanyId: string) {
  const pending = await prisma.support.findMany({
    where: { creatorId, status: "PENDING" },
    select: { id: true },
  });
  if (pending.length === 0) return;
  const pendingIds = new Set(pending.map((s) => s.id));

  try {
    let scanned = 0;
    for await (const payment of whopsdk.payments.list({ company_id: whopCompanyId, direction: "desc" })) {
      const p = payment as unknown as {
        id: string;
        status?: string;
        substatus?: string;
        metadata?: Record<string, unknown> | null;
      };
      const ref = typeof p.metadata?.ref === "string" ? p.metadata.ref : null;
      const settled = p.status === "paid" || p.substatus === "succeeded";
      if (ref && settled && pendingIds.has(ref)) {
        await markSupportCompleted(ref, p.id);
        pendingIds.delete(ref);
        if (pendingIds.size === 0) break;
      }
      if (++scanned >= 60) break;
    }
  } catch (err: unknown) {
    console.error("reconcilePendingSupports failed:", err);
  }
}

export async function markSupportRefunded(whopPaymentId: string) {
  const support = await prisma.support.findUnique({ where: { whopPaymentId } });
  if (support && support.status !== "REFUNDED") {
    await prisma.support.update({ where: { id: support.id }, data: { status: "REFUNDED" } });
  }
}

/** Complete a shop order (idempotent) + bump sales + notify. */
export async function completeOrder(orderId: string, whopPaymentId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId }, include: { creator: true, product: true } });
  if (!order || order.status === "COMPLETED") return;
  await prisma.$transaction([
    prisma.order.update({ where: { id: orderId }, data: { status: "COMPLETED", whopPaymentId } }),
    prisma.product.update({ where: { id: order.productId }, data: { salesCount: { increment: 1 } } }),
  ]);
  await notify(order.creator, {
    title: "New sale",
    subtitle: order.product.title,
    content: `${order.buyerName} bought ${order.product.title} for ${formatUsd(order.amountCents)}`,
  });
}

/** Activate (or renew) a membership (idempotent upsert). */
export async function activateMembership(params: {
  creatorId: string;
  userId: string;
  tierId: string;
  whopMembershipId?: string;
}) {
  const tier = await prisma.tier.findUnique({ where: { id: params.tierId }, include: { creator: true } });
  if (!tier) return;
  const existing = await prisma.membership.findUnique({
    where: { userId_tierId: { userId: params.userId, tierId: params.tierId } },
  });
  await prisma.membership.upsert({
    where: { userId_tierId: { userId: params.userId, tierId: params.tierId } },
    update: { status: "ACTIVE", whopMembershipId: params.whopMembershipId ?? undefined },
    create: {
      creatorId: params.creatorId,
      userId: params.userId,
      tierId: params.tierId,
      status: "ACTIVE",
      whopMembershipId: params.whopMembershipId ?? null,
    },
  });
  if (!existing) {
    await notify(tier.creator, {
      title: "New member",
      subtitle: tier.name,
      content: `Someone just joined your "${tier.name}" tier (${formatUsd(tier.priceCents)}/mo)`,
    });
  }
}

export async function deactivateMembership(whopMembershipId: string) {
  const m = await prisma.membership.findUnique({ where: { whopMembershipId } });
  if (m && m.status !== "CANCELED" && m.status !== "EXPIRED") {
    await prisma.membership.update({ where: { id: m.id }, data: { status: "CANCELED" } });
  }
}

/** Unified fulfillment driven by a payment's metadata (confirm endpoint + payment.succeeded webhook). */
export async function fulfillFromMetadata(
  meta: Record<string, unknown> | null | undefined,
  paymentId: string,
) {
  if (!meta) return;
  const kind = meta.kind;
  if (kind === "tip" && typeof meta.supportId === "string") {
    return markSupportCompleted(meta.supportId, paymentId);
  }
  if (kind === "shop" && typeof meta.orderId === "string") {
    return completeOrder(meta.orderId, paymentId);
  }
  if (
    kind === "membership" &&
    typeof meta.creatorId === "string" &&
    typeof meta.userId === "string" &&
    typeof meta.tierId === "string"
  ) {
    return activateMembership({ creatorId: meta.creatorId, userId: meta.userId, tierId: meta.tierId });
  }
}
```

## Step 12: On-site payouts and the creator dashboard

Withdrawals happen on `/dashboard/payouts` through Whop's embedded payout components, which work in sandbox too as long as the Company API key has the payout scopes from Step 2 and the elements are loaded with the matching `environment`.

### `app/api/payouts/token/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { requireCreator } from "@/lib/auth";
import { createCompanyAccessToken } from "@/services/whop";
import { rateLimit, clientIp } from "@/lib/rate-limit";

// Mints a short-lived access token the embedded payout portal uses to talk to
// Whop on behalf of the creator's connected company. Guarded so a creator can
// only ever request a token for their OWN connected company.
export async function GET(req: NextRequest) {
  if (!rateLimit(`payouts-token:${clientIp(req)}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const { creator } = await requireCreator();

  const companyId = req.nextUrl.searchParams.get("companyId");
  if (!companyId) {
    return NextResponse.json({ error: "Missing companyId" }, { status: 400 });
  }

  // Hard ownership check: never mint a token for someone else's company.
  if (!creator.whopCompanyId || companyId !== creator.whopCompanyId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const token = await createCompanyAccessToken(companyId);
    return NextResponse.json({ token });
  } catch (err: unknown) {
    console.error("Payout token creation failed:", err);
    return NextResponse.json({ error: "Could not create payout token" }, { status: 502 });
  }
}
```

### `components/payouts/PayoutsPortal.tsx`

The embedded portal wiring: `loadWhopElements` per environment, a `PayoutsSession` fed by the token route, a `StatusBanner`, and (once the account is activated) the `Balance` and `Withdrawals` elements. Three hard-won details baked in: the iframes are cross-origin and self-size, so `BalanceElement` sits in a fixed-height `position: relative` wrapper per Whop's docs (anything else grows scrollbars); the un-activated state shows our own "Activate payouts" card whose button calls `session.showVerifyModal({})` to open real KYC inline (the stock `AddPayoutMethodElement` empty state is a bare "No payout account found"); and the theme tracks the `<html>` class with a MutationObserver so toggling dark mode re-themes the embeds.

```tsx
"use client";

import { useEffect, useRef, useState } from "react";
import {
  Elements,
  PayoutsSession,
  usePayoutsSession,
  StatusBannerElement,
  BalanceElement,
  WithdrawalsElement,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import { Button } from "@whop/react/components";
import { formatUsd } from "@/lib/fees";
import BrandIcon from "@/components/BrandIcon";

// Load the Whop Elements runtime once per environment. A sandbox access token must
// talk to the sandbox Elements API and a production token to production, so we pass
// the matching `environment` (the default, production, rejects a sandbox token).
const elementsByEnv: Partial<Record<"production" | "sandbox", ReturnType<typeof loadWhopElements>>> = {};
function getElements(environment: "production" | "sandbox") {
  return (elementsByEnv[environment] ??= loadWhopElements({ environment }));
}

type ThemeAccent = NonNullable<
  NonNullable<Parameters<typeof Elements>[0]["appearance"]>["theme"]
>["accentColor"];

type PortalProps = {
  companyId: string;
  accentColor: string;
  sandbox: boolean;
  earnedCents: number;
  activated: boolean;
  availableCents: number;
  pendingCents: number;
};

function Loading({ height }: { height: number }) {
  return (
    <div className="grid place-items-center text-sm text-muted" style={{ height }}>
      Loading…
    </div>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="kofi-card p-5">
      {title ? (
        <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted">{title}</h2>
      ) : null}
      {children}
    </section>
  );
}

/** Headline balance, built from our own data so it is meaningful even when Whop's
 *  sandbox ledger is empty. Shows the live withdrawable balance once the account
 *  is verified on production. */
function BalanceSummary({
  earnedCents,
  activated,
  availableCents,
  pendingCents,
  sandbox,
}: {
  earnedCents: number;
  activated: boolean;
  availableCents: number;
  pendingCents: number;
  sandbox: boolean;
}) {
  return (
    <Card title="Balance">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-3xl font-bold">{formatUsd(earnedCents)}</p>
          <p className="text-sm text-muted">Total earned from supporters</p>
        </div>
        {activated ? (
          <div className="text-right">
            <p className="text-lg font-semibold">{formatUsd(availableCents)}</p>
            <p className="text-xs text-muted">
              Available to withdraw{pendingCents > 0 ? ` · ${formatUsd(pendingCents)} pending` : ""}
            </p>
          </div>
        ) : null}
      </div>
      {sandbox ? (
        <p className="mt-3 border-t border-line pt-3 text-xs text-muted">
          You&rsquo;re in sandbox mode, so your withdrawable Whop balance stays $0 even after a
          test payment. On production, settled payments appear here once your payout account is
          verified.
        </p>
      ) : null}
    </Card>
  );
}

/** "Activate payouts" CTA. Rendered inside <PayoutsSession> so it can open Whop's
 *  real identity-verification (KYC) modal via the session. */
function ActivatePayouts() {
  const session = usePayoutsSession();
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-4">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-surface-2">
          <BrandIcon name="money" className="h-7 w-7" />
        </span>
        <div>
          <h3 className="font-bold">Activate payouts to withdraw</h3>
          <p className="mt-1 text-sm text-muted">
            Verify your identity and add a bank account or PayPal. It takes a few minutes, and you
            only do it once.
          </p>
        </div>
      </div>
      <Button
        onClick={() => session?.showVerifyModal({})}
        size="3"
        variant="solid"
        className="w-full shrink-0 sm:w-auto"
      >
        Activate payouts
      </Button>
    </div>
  );
}

/** The embedded Whop payout portal. Element sizing follows Whop's documented pattern
 *  (fixed-height, position:relative wrappers) so the iframes don't show scrollbars. */
function EmbeddedPortal({ companyId, accentColor, sandbox, activated }: {
  companyId: string;
  accentColor: string;
  sandbox: boolean;
  activated: boolean;
}) {
  const [dark, setDark] = useState(false);
  const [failed, setFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track the page's light/dark theme so the embedded elements re-theme when the
  // creator toggles it (the .dark class on <html> is flipped by ThemeToggle).
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setDark(el.classList.contains("dark"));
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  // The Whop elements mount as iframes from the remote runtime. If none appear, they
  // failed to load (token, scopes, or environment) — show a refresh hint instead of
  // blank cards. The balance summary above still gives the creator their numbers.
  useEffect(() => {
    const t = setTimeout(() => {
      if (!containerRef.current?.querySelector("iframe")) setFailed(true);
    }, 8000);
    return () => clearTimeout(t);
  }, []);

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const elements = getElements(sandbox ? "sandbox" : "production");

  return (
    <Card title={activated ? "Withdraw" : "Payouts"}>
      {failed ? (
        <p className="rounded-xl border border-line bg-surface-2 px-4 py-3 text-sm text-muted">
          We couldn&apos;t load the live payout portal. Refresh the page to try again.
        </p>
      ) : null}
      <div ref={containerRef} className={failed ? "hidden" : undefined}>
        <Elements
          elements={elements}
          appearance={{ theme: { appearance: dark ? "dark" : "light", accentColor: accentColor as ThemeAccent } }}
        >
          <PayoutsSession
            token={() =>
              fetch(`/api/payouts/token?companyId=${companyId}`)
                .then((r) => r.json())
                .then((d) => d.token as string)
            }
            companyId={companyId}
            currency="usd"
            redirectUrl={`${origin}/dashboard/payouts`}
          >
            <div className="grid gap-4">
              <StatusBannerElement fallback={<Loading height={0} />} style={{ width: "100%" }} />
              {activated ? (
                <>
                  <div style={{ position: "relative", width: "100%", height: "95.5px" }}>
                    <BalanceElement fallback={<Loading height={96} />} />
                  </div>
                  <WithdrawalsElement fallback={<Loading height={120} />} />
                </>
              ) : (
                <ActivatePayouts />
              )}
            </div>
          </PayoutsSession>
        </Elements>
      </div>
    </Card>
  );
}

export default function PayoutsPortal({
  companyId,
  accentColor,
  sandbox,
  earnedCents,
  activated,
  availableCents,
  pendingCents,
}: PortalProps) {
  return (
    <div className="grid gap-5">
      <BalanceSummary
        earnedCents={earnedCents}
        activated={activated}
        availableCents={availableCents}
        pendingCents={pendingCents}
        sandbox={sandbox}
      />
      <EmbeddedPortal companyId={companyId} accentColor={accentColor} sandbox={sandbox} activated={activated} />
    </div>
  );
}
```

### `app/dashboard/payouts/page.tsx`

Server side of the same page: requires a creator with a connected company (otherwise sends them to onboarding), heals pending tips, sums earned totals from our own database for the headline figure, and reads the live KYC status and ledger balance with `getPayoutSnapshot`. The DB-backed headline matters in sandbox: test charges record fine on the connected company, but Whop's sandbox never credits the company ledger, so the embedded balance correctly reads $0 there. On production the ledger is live.

```tsx
import Link from "next/link";
import { requireCreator } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isSandbox } from "@/lib/env";
import { reconcilePendingSupports } from "@/lib/fulfillment";
import { getPayoutSnapshot, type PayoutSnapshot } from "@/services/whop";
import PayoutsPortal from "@/components/payouts/PayoutsPortal";

export default async function PayoutsPage() {
  const { creator } = await requireCreator();

  // Heal any tips that settled but missed their webhook/confirm before tallying.
  if (creator.whopCompanyId) {
    await reconcilePendingSupports(creator.id, creator.whopCompanyId);
  }

  const earned = await prisma.support.aggregate({
    where: { creatorId: creator.id, status: "COMPLETED" },
    _sum: { amountCents: true },
  });
  const earnedCents = earned._sum.amountCents ?? 0;

  // Read the connected account's real KYC/payout status + balance (best-effort).
  let snapshot: PayoutSnapshot = { activated: false, status: null, availableCents: 0, pendingCents: 0 };
  if (creator.whopCompanyId) {
    try {
      snapshot = await getPayoutSnapshot(creator.whopCompanyId);
    } catch (err: unknown) {
      console.error("getPayoutSnapshot failed:", err);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payouts</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          Your earnings come straight from the supporters who tip you, join your
          memberships, and buy from your shop. Withdraw your available balance to
          your bank account or PayPal whenever you like.
        </p>
      </div>

      {!creator.whopCompanyId ? (
        <div className="kofi-card p-6">
          <h2 className="text-lg font-bold">Finish setting up payments</h2>
          <p className="mt-1 text-sm text-muted">
            We need to connect your payout account before you can withdraw. Complete
            your creator setup to start receiving and withdrawing support.
          </p>
          <Link href="/dashboard/start" className="btn-pill btn-accent mt-4">
            Finish setup
          </Link>
        </div>
      ) : (
        <>
          <PayoutsPortal
            companyId={creator.whopCompanyId}
            accentColor={creator.accentColor}
            sandbox={isSandbox()}
            earnedCents={earnedCents}
            activated={snapshot.activated}
            availableCents={snapshot.availableCents}
            pendingCents={snapshot.pendingCents}
          />
          <p className="text-xs text-muted">
            Identity verification (KYC) is handled securely inside the portal the first
            time you withdraw. You only need to do it once.
          </p>
        </>
      )}
    </div>
  );
}
```

The rest of the dashboard is plain UI, summarized: a grouped sidebar (`DashboardNav`: Home, Your page, Settings; Earnings: Supporters, Payouts; Grow your page: Posts, Memberships, Shop) with line icons; a home page with an onboarding checklist (steps auto-checked from data: payouts connected, profile complete, an earning option, first support), profile stats, latest support, a share card, and suggestion cards; a supporters page listing supports and orders; and a share modal (copy link, X/Facebook/WhatsApp/email, native share).

## Step 13: Homepage, discovery, and theming

Discovery is three queries over the same flags, summarized: the homepage `getFeaturedCreators` selects `where: { isActive: true, whopOnboarded: true }`, newest first, take 12, annotates supporter counts via `groupBy`, and `CreatorCategories` builds its filter pills from the creators' own tags (exact string match, capped at 9, every creator always under "All"); `/explore` paginates the same filter; `/feed` shows creators you support or follow with the same suggestions fallback. This is why `whopOnboarded: true` at creator creation matters: all three surfaces filter on it.

Theming, summarized: the inline script in `app/layout.tsx` (Step 1) applies `localStorage.theme` (light/dark/system) before paint by toggling `.dark` on `<html>`; `ThemeToggle` cycles the three states; the per-creator accent name resolves through `lib/accent.ts` into a `--accent` CSS variable on the creator layout and into the `WhopCheckoutEmbed`/payout-element props, so the embeds always match the page.

### `app/api/creator/upload/route.ts`

Avatar and cover uploads. Production pushes bytes through `whopsdk.files.upload` (create, presigned S3 PUT, poll until ready) and stores the permanent CDN URL. Whop's sandbox accepts uploads but never finishes processing them (`upload_status` stays `pending`, `url` stays null), so in sandbox the route resizes with sharp and returns a data URL instead.

```ts
import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { whopsdk } from "@/lib/whop";
import { isSandbox } from "@/lib/env";
import { requireCreator } from "@/lib/auth";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// Store a creator image and return a URL to save on their profile. In production
// we push it to Whop's Files API, whose `upload` helper creates the file, uploads
// the bytes to a presigned S3 URL, and polls until it is ready, returning a
// permanent public CDN url. Whop's sandbox accepts the upload but never finishes
// processing the file (it stays "pending" with no url), so in sandbox we resize
// the image and return it as a data URL instead.
export async function POST(req: NextRequest) {
  if (!rateLimit(`creator-upload:${clientIp(req)}`, 10, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  await requireCreator();

  let file: File | null = null;
  try {
    const form = await req.formData();
    const value = form.get("file");
    if (value instanceof File) file = value;
  } catch {
    return NextResponse.json({ error: "Invalid upload" }, { status: 400 });
  }

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!ALLOWED.includes(file.type)) {
    return NextResponse.json({ error: "Only JPG, PNG, WEBP or GIF images are allowed" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5 MB" }, { status: 400 });
  }

  try {
    if (isSandbox()) {
      const input = Buffer.from(await file.arrayBuffer());
      const out = await sharp(input)
        .rotate()
        .resize(800, 800, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78 })
        .toBuffer();
      return NextResponse.json({ url: `data:image/webp;base64,${out.toString("base64")}` });
    }

    const uploaded = await whopsdk.files.upload(file, { filename: file.name || "upload" });
    if (!uploaded.url) {
      return NextResponse.json({ error: "Upload did not finish" }, { status: 502 });
    }
    return NextResponse.json({ url: uploaded.url });
  } catch (err: unknown) {
    console.error("File upload failed:", err);
    return NextResponse.json({ error: "Could not upload the image" }, { status: 502 });
  }
}
```

Settings around it, summarized: `/api/creator/settings` PATCHes display name, bio, tags, accent (validated by `isAccentName`), and the two image fields, whose Zod type is a union of a hosted URL, a `data:image/...` URL (sandbox), or an empty string to clear; the settings form auto-saves each image the moment the upload finishes. `/api/creator/goal` PATCH upserts the one active goal (retiring any others) and DELETE retires it; the goal drives the public progress bar.

## Step 14: Go live

The switch is environment-only; no code changes:

1. Create the production Whop company and app on whop.com, register the production redirect URI `https://your-domain.com/oauth/callback`, and mint a production Company API key with the same scopes.
2. In Vercel production env: set `WHOP_SANDBOX="false"`, swap `WHOP_PLATFORM_COMPANY_ID`/`NEXT_PUBLIC_WHOP_COMPANY_ID` (`biz_...`), `WHOP_CLIENT_ID`/`NEXT_PUBLIC_WHOP_APP_ID` (`app_...`), `WHOP_CLIENT_SECRET`, `WHOP_COMPANY_API_KEY` (`apik_...`), and set `NEXT_PUBLIC_APP_URL` to the production domain.
3. Create a production webhook (Developer > Webhooks): point it at `https://your-domain.com/api/webhooks/whop`, API version v1, **enable connected account actions**, subscribe to the same five events, and set the new `WHOP_WEBHOOK_SECRET`.
4. Redeploy, then verify a real OAuth round-trip, a creator onboarding (real KYC now), a small real charge, the webhook delivery, and a payout method add plus withdrawal in the embedded portal.

Sandbox test cards while developing: `4242 4242 4242 4242` succeeds, `4000 0000 0000 0002` declines. A public demo should stay on sandbox keys permanently so nobody gets charged by clicking around.
