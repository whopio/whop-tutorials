# How to build a Linktree clone with Next.js and Whop

A condensed reference for building **Linkstacks**, a Next.js Linktree clone where creators publish a customizable public link page, gate premium links behind a one-time unlock, add social icons, theme their page (accent + card style + background + auto-contrast text), upload an avatar, and withdraw earnings via an embedded Whop payout portal. The platform takes a flat application fee on every sale.

This file keeps **full code only for the security-sensitive and Whop-specific parts** — the Whop SDK calls, OAuth/PKCE (with nonce binding), the signed-unlock-cookie helpers, the magic-byte avatar validation, the rate limiter, the sandbox-bypass earnings flow, the `WebhookEvent` idempotency table, the post-checkout verification route, the embedded payout components, the sandbox-aware CSP, the theme/socials registries, and the full Prisma schema. Boring UI/CRUD is summarized.

- Demo: https://linktree-clone-theta-azure.vercel.app/
- Source: https://github.com/whopio/whop-tutorials/tree/main/linktree-clone

> **What's new in v2 (and why it matters):** theme presets + custom colors + auto-contrast (`src/lib/theme.ts`), a social-links registry built on `simple-icons` (`src/lib/socials.ts`), avatar upload to Vercel Blob with magic-byte sniffing (`src/app/api/avatar/route.ts`), plus the `SocialLink` model and the `cardStyle` / `bgKind` / `bgValue` / `textColor` Creator columns. v2 also ships a batch of **security fixes** baked into the verbatim code below: link URLs are restricted to http(s) (no `javascript:`/`data:` XSS), premium access is proved with a **signed httpOnly unlock cookie** instead of a `?unlocked=` URL param, OAuth login sets an `oauth_nonce` cookie that the callback verifies, the avatar route validates by content not by spoofable MIME type, an in-memory rate limiter guards login/avatar/checkout, and `'unsafe-eval'` is dev-only in the CSP.

---

## Overview

**Tech stack**

- Next.js 16 (App Router), React 19, TypeScript (strict)
- Tailwind CSS v4
- Whop OAuth + Whop Payments Network (`@whop/sdk`, `@whop/embedded-components-react-js`, `@whop/embedded-components-vanilla-js`)
- PostgreSQL via Prisma 5
- iron-session 8 (encrypted cookie sessions)
- Zod 4 for validation
- `@dnd-kit/core` + `@dnd-kit/sortable` + `@dnd-kit/utilities` for drag-to-reorder
- `simple-icons` for social brand SVG paths, `@vercel/blob` for avatar storage
- Vercel for deployment, ngrok for local OAuth/webhook testing

**Pages**

- `/` — Public landing: hero with floating sample profile cards (drift animation) + handle-picker CTA. Redirects to `/dashboard` if a session exists.
- `/dashboard` — Auth-gated creator dashboard: profile, avatar upload, theme picker, links editor, socials manager, earnings, and payout portal on the left; sticky live preview on the right.
- `/u/[handle]` — Public link page. Free links and social icons are visible to everyone; premium links are gated until the visitor unlocks them (proven via a signed httpOnly cookie).

**API routes**

- `/api/auth/login` — Whop OAuth initiation with PKCE. Sets `pkce_verifier`, `oauth_state`, and `oauth_nonce` httpOnly cookies; round-trips an optional `?handle=` hint as a non-httpOnly cookie. Rate limited.
- `/api/auth/callback` — Token exchange + user upsert. Verifies `state` (rejects empty cookie) and `id_token.nonce` against `oauth_nonce`, then deletes all three OAuth cookies.
- `/api/auth/logout` — `session.destroy()` then redirect home.
- `/api/avatar` — `POST` uploads an avatar to Vercel Blob (magic-byte validated, rate limited); `DELETE` clears it.
- `/api/earnings/complete` — KYC return handler; calls `whop.payoutMethods.list` to confirm a method exists before flipping `payoutEnabled`.
- `/api/checkout/verify` — Post-checkout redirect handler. Retrieves the payment, flips the unlock to `PAID`, sets a **signed httpOnly unlock cookie**, then forwards the buyer to `/u/[handle]`.
- `/api/payout-token` — Mints a short-lived Whop access token for the embedded payout portal.
- `/api/webhooks/whop` — `payment.succeeded` / `payment.failed` with `WebhookEvent` idempotency.

**Payment flow**

1. Creator clicks "Enable Earnings". In **sandbox** the click intercepts to a confirmation modal that flips `payoutEnabled` directly (Whop's hosted KYC auto-completes with placeholder data in sandbox anyway). In **production**, the action calls `whop.companies.create` (sub-company under `WHOP_PARENT_COMPANY_ID`) then `whop.accountLinks.create` for hosted KYC.
2. Production KYC returns to `/api/earnings/complete`, which calls `whop.payoutMethods.list` and only flips `payoutEnabled = true` if a method with a `destination` is on file.
3. Visitor clicks "Unlock premium for $X" → `createCheckout` (rate limited) creates a `PENDING` `Unlock` row, then calls `whop.checkoutConfigurations.create` targeting the creator's `whopCompanyId` with an `application_fee_amount` for the platform.
4. Visitor pays on Whop's hosted checkout and is redirected back to `/api/checkout/verify?handle=...&unlock_id=...&payment_id=...&checkout_status=success`. The route calls `whop.payments.retrieve`, flips the unlock to `PAID`, **sets a signed httpOnly cookie `unlock_<creatorId>` = `<unlockId>.<hmac>`**, then redirects to `/u/[handle]` (no unlock ID in the URL).
5. The public profile page reads that cookie server-side with `verifyUnlock()`, then double-checks the unlock is `PAID` and belongs to the creator before revealing premium links. Because the cookie is httpOnly and never appears in a shareable URL, a buyer can't copy their access to someone who didn't pay.
6. `payment.succeeded` webhook is the fallback if the redirect didn't complete (closed tab, dropped network). Idempotent via the `WebhookEvent` table (insert event ID; `P2002` violation = duplicate, skip).
7. Creator withdraws through the embedded payout portal on the dashboard.

---

## Step 1: Project setup

```bash
npx create-next-app@latest whop-linktree-clone --typescript --tailwind --app --src-dir
cd whop-linktree-clone
npm install -D prisma
npm install @prisma/client iron-session zod
npm install @whop/sdk @whop/embedded-components-react-js @whop/embedded-components-vanilla-js
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
npm install simple-icons @vercel/blob
npx prisma init
```

Pin `next`, `react`, and `react-dom` to current versions (`next@16.2.7`, `react@19.2.7`, `react-dom@19.2.7`, `eslint-config-next@16.2.7`).

### Database schema (Prisma)

The full v2 schema. `accentColor` accepts a preset key *or* a raw hex string (resolved in `theme.ts`). The four theme columns (`cardStyle`, `bgKind`, `bgValue`, `textColor`) and the `SocialLink` model are new in v2.

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  whopUserId String  @unique // Whop OAuth user ID
  email     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  creator   Creator?
}

model Creator {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  handle         String   @unique // URL slug e.g. "jane"
  title          String   @default("")
  bio            String   @default("")
  avatarUrl      String?
  unlockPrice    Int      @default(500) // cents, e.g. 500 = $5.00
  accentColor    String   @default("violet") // preset key OR raw hex (#xxxxxx); resolved in src/lib/theme.ts
  cardStyle      String   @default("default") // preset key; controls border-radius/shadow/border of link cards
  bgKind         String   @default("auto")    // "auto" | "solid" | "gradient" | "preset"
  bgValue        String?  // hex string when solid, gradient CSS when gradient, preset key otherwise
  textColor      String   @default("auto")    // "auto" | hex; auto picks based on bg brightness

  // Whop Connected Account
  whopCompanyId  String?  // set after "Enable Earnings" enrollment
  payoutEnabled  Boolean  @default(false) // true only after KYC onboarding is complete
  // Application fee in cents (what the platform keeps)
  applicationFee Int      @default(50) // cents

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  links          Link[]
  socials        SocialLink[]
  unlocks        Unlock[]
}

model Link {
  id         String   @id @default(cuid())
  creatorId  String
  creator    Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  title      String
  url        String
  isPremium  Boolean  @default(false)
  isVisible  Boolean  @default(true)
  sortOrder  Int      @default(0)

  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Unlock {
  id             String   @id @default(cuid())
  creatorId      String
  creator        Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)

  buyerEmail     String?
  buyerWhopUserId String?

  status         UnlockStatus @default(PENDING)
  whopPaymentId  String?  @unique // Whop charge/payment ID

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

enum UnlockStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

model WebhookEvent {
  id          String   @id // Whop event ID, used as idempotency key
  type        String
  receivedAt  DateTime @default(now())
}

model SocialLink {
  id         String   @id @default(cuid())
  creatorId  String
  creator    Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  platform   String   // platform key, must match src/lib/socials.ts
  url        String
  color      String?  // optional override (hex). When null, the platform's brand color is used.
  sortOrder  Int      @default(0)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}
```

`WebhookEvent.id` is the **idempotency key**. The webhook handler inserts the event ID first; if the row already exists Prisma throws `P2002`, caught and treated as a duplicate-replay no-op. `Unlock.whopPaymentId @unique` is a separate guard so the redirect handler and the webhook never double-flip the same unlock.

Update `DATABASE_URL` in `.env`, then run `node_modules/.bin/prisma migrate dev --name init`.

### `src/lib/prisma.ts`

Standard Prisma singleton cached on `globalThis` in dev to survive HMR without exhausting the connection pool. Skipped in production. `log: ["error", "warn"]` in dev, `["error"]` in prod.

### `src/app/globals.css`

Tailwind v4 import, neutral color tokens (`--background`, `--foreground`, `--border`, etc.), Geist Sans body font, plus four `hero-drift-*` keyframes used by the landing page floating cards. Keep the keyframes verbatim — they pair with `prefers-reduced-motion: reduce` to disable animation:

```css
@keyframes hero-drift-a {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-4deg); }
  50%      { transform: translate3d(0, -14px, 0) rotate(-2deg); }
}
@keyframes hero-drift-b {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(3deg); }
  50%      { transform: translate3d(0, 12px, 0) rotate(5deg); }
}
@keyframes hero-drift-c {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(-6deg); }
  50%      { transform: translate3d(0, -18px, 0) rotate(-8deg); }
}
@keyframes hero-drift-d {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(5deg); }
  50%      { transform: translate3d(0, 16px, 0) rotate(7deg); }
}

@media (prefers-reduced-motion: reduce) {
  .hero-drift-a, .hero-drift-b, .hero-drift-c, .hero-drift-d { animation: none !important; }
}
```

### Hero + landing components

- `src/components/HeroProfileCard.tsx` — Presentational card. Props: `name`, `handle`, `bio`, `accent`, optional `initial`, `freeLinks: readonly string[]`, optional `premium: { title, price }`. Resolves the accent via `resolveAccent` and spreads `accentVars(a)` onto its `style` so the avatar circle and price chip read `var(--accent)` / `var(--accent-bg)`.
- `src/components/HeroFloatingCards.tsx` — Hardcodes 4 sample creators (different accents) and 4 absolute-position presets with `hero-drift-*` animations. Wrapped in `pointer-events-none absolute inset-0 overflow-hidden` so it sits behind the hero copy.
- `src/components/SignupHandleInput.tsx` — Client component. Sanitizes input to `[a-z0-9_-]{0,32}` on every keystroke, shows a live URL preview, submits `<form action="/api/auth/login" method="GET">` with the cleaned value as `handle`. That `?handle=` is what the login route stuffs into `intended_handle`.
- `src/app/page.tsx` — Server component. `getCurrentUserId()` + `redirect("/dashboard")` if logged in. Strips protocol/trailing slash off `NEXT_PUBLIC_APP_URL` for a `urlHost`, composes `<HeroFloatingCards />` + headline + `<SignupHandleInput compact />` + a 3-step "How it works" grid + a final CTA.

### ngrok

Whop needs an `https://` URL for OAuth callbacks and webhook delivery; `http://localhost` won't work.

```bash
npx ngrok http 3000
```

Use the printed `https://*.ngrok-free.app` URL for `NEXT_PUBLIC_APP_URL`, `WHOP_REDIRECT_URI`, and the webhook URL.

---

## Step 2: Setting up Whop

Create an app at [whop.com/developer](https://whop.com/developer). Set the OAuth redirect URI to `https://<ngrok>/api/auth/callback` (must match `WHOP_REDIRECT_URI` exactly, including trailing slashes). Create a Company API Key with all permissions. Add a webhook at `https://<ngrok>/api/webhooks/whop` for `payment.succeeded` and `payment.failed`, and **enable "Connected account events"** so it fires on payments to creators' sub-companies.

**Env vars** (`.env`)

| Name | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `WHOP_APP_ID` / `NEXT_PUBLIC_WHOP_APP_ID` | Starts with `app_`. Same value; the public one is exposed to the client. |
| `WHOP_CLIENT_ID` / `WHOP_CLIENT_SECRET` | OAuth app credentials (`WHOP_CLIENT_ID` = the App ID) |
| `WHOP_REDIRECT_URI` | `https://<ngrok>/api/auth/callback` in dev; prod URL in prod |
| `WHOP_API_KEY` | Company API key with all permissions |
| `WHOP_PARENT_COMPANY_ID` | Starts with `biz_`. Creators' sub-companies are created under it. |
| `WHOP_OAUTH_BASE` | `https://sandbox-api.whop.com` for sandbox; **omit** in prod |
| `WHOP_BASE_URL` | `https://sandbox-api.whop.com/api/v1` for sandbox; **omit** in prod |
| `WHOP_WEBHOOK_SECRET` | Webhook signing secret |
| `NEXT_PUBLIC_WHOP_ENV` | `"sandbox"` or `"production"` — drives embedded components and the sandbox-bypass branch |
| `SESSION_SECRET` | `openssl rand -base64 32`. Also signs the unlock cookie HMAC. |
| `NEXT_PUBLIC_APP_URL` | ngrok URL in dev; real domain in prod |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token for avatar uploads (auto-injected on Vercel; set locally for dev) |

---

## Step 3: Set up the Whop SDK client

### `src/lib/whop.ts`

```ts
import Whop from "@whop/sdk";

// Whop platform-level client.
//
// Used for:
//   - Creating connected-account companies under our parent company
//   - Generating account links for KYC onboarding
//   - Creating checkout configurations
//   - Verifying webhook signatures
//   - Minting access tokens for the embedded payout portal
//
// The webhook secret must be base64-encoded before being handed to the SDK,
// because Whop's internal `standardwebhooks` library base64-decodes it back
// to derive the HMAC key. Skipping this step makes signature verification
// silently fail on every webhook delivery.
const globalForWhop = globalThis as unknown as { whop: Whop };

export const whop =
  globalForWhop.whop ??
  new Whop({
    apiKey: process.env.WHOP_API_KEY!,
    appID: process.env.WHOP_APP_ID,
    webhookKey: Buffer.from(process.env.WHOP_WEBHOOK_SECRET ?? "").toString(
      "base64"
    ),
  });

if (process.env.NODE_ENV !== "production") globalForWhop.whop = whop;

// Short-lived user-scoped client for calls made on behalf of a specific user
// using their OAuth access token.
export function whopAsUser(oauthToken: string): Whop {
  return new Whop({ apiKey: `Bearer ${oauthToken}` });
}
```

`whop` is the platform-scoped client. `whopAsUser(token)` is for calls made on behalf of a logged-in creator's OAuth token.

> **`webhookKey` is base64-encoded.** Pass `Buffer.from(secret).toString("base64")` — the raw string makes `webhooks.unwrap` reject every signature.
>
> **Sandbox.** The SDK reads `WHOP_BASE_URL` automatically. Set `WHOP_BASE_URL=https://sandbox-api.whop.com/api/v1` in dev; omit in prod.

---

## Step 4: Implement Whop OAuth (2.1 + PKCE)

OAuth is a round trip between your server, the user's browser, and Whop. Each route below handles one leg. v2 hardens it: the login route also sets an `oauth_nonce` cookie, and the callback rejects an empty `state` cookie and verifies the `id_token`'s `nonce` claim against that cookie.

### `src/lib/session.ts`

```ts
import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string; // our internal DB id
  whopUserId?: string; // Whop's user id (set after OAuth)
}

if (!process.env.SESSION_SECRET) {
  throw new Error(
    "SESSION_SECRET is required. Generate one with `openssl rand -base64 32` and add it to your environment."
  );
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET,
  cookieName: "lt_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession(): Promise<IronSession<SessionData>> {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}
```

### `src/lib/rate-limit.ts` (new in v2)

An in-memory sliding-window limiter applied to `login`, `avatar`, and `createCheckout`. Per-instance only — a basic abuse guard, not a distributed limit.

```ts
import { headers } from "next/headers";

// Minimal in-memory rate limiter. It keeps a sliding window of hit timestamps
// per key. NOTE: this is per-instance only. On serverless each function
// instance has its own Map, so treat this as a basic abuse guard, not a hard
// distributed limit. For production-grade limits use a shared store such as
// Upstash Redis.
const hits = new Map<string, number[]>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    hits.set(key, recent);
    return false;
  }
  recent.push(now);
  hits.set(key, recent);
  return true;
}

// Best-effort client IP from the proxy headers Vercel sets. Falls back to a
// constant so a missing header degrades to a shared bucket rather than no limit.
export async function clientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return h.get("x-real-ip") ?? "unknown";
}
```

### `src/app/api/auth/login/route.ts`

Generates PKCE values + `state` + `nonce`, stores `pkce_verifier` / `oauth_state` / `oauth_nonce` as httpOnly cookies, and redirects to Whop's authorize endpoint. Rate limited; optional `?handle=` hint round-tripped as a non-httpOnly cookie.

```ts
import { NextRequest, NextResponse } from "next/server";
import { randomBytes, createHash } from "crypto";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const HANDLE_PATTERN = /^[a-z0-9_-]{2,32}$/;

function generateCodeVerifier(): string {
  return randomBytes(32).toString("base64url");
}

function generateCodeChallenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export async function GET(req: NextRequest) {
  if (!rateLimit(`login:${await clientIp()}`, 20, 60_000)) {
    return NextResponse.redirect(
      `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/?error=rate_limited`
    );
  }

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  const state = randomBytes(16).toString("hex");
  const nonce = randomBytes(16).toString("hex");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: process.env.WHOP_CLIENT_ID!,
    redirect_uri: process.env.WHOP_REDIRECT_URI!,
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const whopBase = process.env.WHOP_OAUTH_BASE ?? "https://api.whop.com";
  const authorizeUrl = `${whopBase}/oauth/authorize?${params.toString()}`;

  const res = NextResponse.redirect(authorizeUrl);

  // Cookies survive a cross-site redirect (whop.com -> our domain) only when
  // both Secure and SameSite=Lax are set. Without Secure, modern browsers drop
  // the cookie during the return leg and the callback sees no verifier.
  const isProd = process.env.NODE_ENV === "production";
  const cookieOpts = {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  res.cookies.set("pkce_verifier", codeVerifier, cookieOpts);
  res.cookies.set("oauth_state", state, cookieOpts);
  // Bind this login attempt to the id_token we get back: the callback checks
  // that the token's `nonce` claim matches this cookie before trusting it.
  res.cookies.set("oauth_nonce", nonce, cookieOpts);

  // Optional: a handle hint passed in from the homepage CTA. We don't trust
  // it, we just round-trip it as a non-httpOnly cookie so the dashboard can
  // pre-fill the handle input after the user comes back from OAuth.
  const handleHint = req.nextUrl.searchParams.get("handle");
  if (handleHint && HANDLE_PATTERN.test(handleHint)) {
    res.cookies.set("intended_handle", handleHint, {
      httpOnly: false,
      secure: isProd,
      sameSite: "lax",
      path: "/",
      maxAge: 600,
    });
  }

  return res;
}
```

### `src/app/api/auth/callback/route.ts`

Exchanges the code for tokens, verifies `state` (rejecting an empty cookie) and the `id_token.nonce` claim, upserts the user, sets the session, and clears all three OAuth cookies.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function getCookie(req: NextRequest, name: string): string | null {
  return req.cookies.get(name)?.value ?? null;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const returnedState = req.nextUrl.searchParams.get("state");
  const codeVerifier = getCookie(req, "pkce_verifier");
  const expectedState = getCookie(req, "oauth_state");
  const expectedNonce = getCookie(req, "oauth_nonce");

  if (!code) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_code`);
  }
  if (!codeVerifier) {
    return NextResponse.redirect(`${APP_URL}/?error=missing_verifier`);
  }
  // Reject when no state cookie is present, not just on a mismatch: otherwise a
  // request with no cookie and no state param would pass (null === null).
  if (!expectedState || returnedState !== expectedState) {
    return NextResponse.redirect(`${APP_URL}/?error=state_mismatch`);
  }

  // 1. Exchange code for access token
  const whopBase = process.env.WHOP_OAUTH_BASE ?? "https://api.whop.com";
  const tokenRes = await fetch(`${whopBase}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      client_id: process.env.WHOP_CLIENT_ID!,
      client_secret: process.env.WHOP_CLIENT_SECRET!,
      redirect_uri: process.env.WHOP_REDIRECT_URI!,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    console.error("[auth/callback] token exchange failed:", err);
    return NextResponse.redirect(`${APP_URL}/?error=token_exchange_failed`);
  }

  const tokenData = await tokenRes.json();

  // 2. Extract user ID from the id_token JWT (openid scope gives us this)
  const idToken: string = tokenData.id_token;
  if (!idToken) {
    console.error("[auth/callback] no id_token in response", tokenData);
    return NextResponse.redirect(`${APP_URL}/?error=no_id_token`);
  }

  const payloadB64 = idToken.split(".")[1];
  const payload = JSON.parse(
    Buffer.from(payloadB64, "base64url").toString("utf-8")
  );
  const whopUserId: string = payload.sub;
  const email: string | null = payload.email ?? null;

  if (!whopUserId) {
    console.error("[auth/callback] no sub in id_token payload", payload);
    return NextResponse.redirect(`${APP_URL}/?error=no_sub_claim`);
  }

  // Verify the nonce binds this token to the login attempt we started, which
  // blocks replay of an id_token captured from a different flow.
  if (!expectedNonce || payload.nonce !== expectedNonce) {
    console.error("[auth/callback] nonce mismatch");
    return NextResponse.redirect(`${APP_URL}/?error=nonce_mismatch`);
  }

  // 3. Upsert user in DB. Always update email in case it changed.
  const user = await prisma.user.upsert({
    where: { whopUserId },
    update: { email },
    create: { whopUserId, email },
  });

  // 4. Set session
  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = whopUserId;
  await session.save();

  // 5. Clear PKCE cookies and redirect
  const res = NextResponse.redirect(`${APP_URL}/dashboard`);
  res.cookies.delete("pkce_verifier");
  res.cookies.delete("oauth_state");
  res.cookies.delete("oauth_nonce");
  return res;
}
```

### `src/app/api/auth/logout/route.ts`

One-line GET: `await getSession()` then `session.destroy()` and redirect to `/`.

### `src/app/dashboard/layout.tsx`

Server component. `getCurrentUserId()`; if null, `redirect("/")`. Guards the whole dashboard tree.

---

## Step 5: Set up the theme system

Two registries power per-creator customization: a curated palette (accents, card styles, background presets, auto-contrast text) and a social-platform registry built on `simple-icons`. Every theme value is either a preset key or a validated hex string, so nothing un-audited gets stored.

### `src/lib/theme.ts`

```ts
// Theme primitives shared across the public profile and the dashboard
// live preview. Six accent colors, six card-style presets, and a set of
// background presets (solid + gradients). All values were chosen to keep
// link card text at >= 4.5:1 contrast against the card surface.

export type AccentKey =
  | "violet"
  | "indigo"
  | "forest"
  | "crimson"
  | "slate"
  | "tangerine";

export interface Accent {
  key: AccentKey | string;
  label: string;
  hex: string;
  contrastOnWhite: number;
}

export const ACCENTS: readonly Accent[] = [
  { key: "violet", label: "Violet", hex: "#7c3aed", contrastOnWhite: 5.93 },
  { key: "indigo", label: "Indigo", hex: "#4338ca", contrastOnWhite: 8.73 },
  { key: "forest", label: "Forest", hex: "#15803d", contrastOnWhite: 4.69 },
  { key: "crimson", label: "Crimson", hex: "#be123c", contrastOnWhite: 6.49 },
  { key: "slate", label: "Slate", hex: "#1e293b", contrastOnWhite: 15.59 },
  {
    key: "tangerine",
    label: "Tangerine",
    hex: "#c2410c",
    contrastOnWhite: 4.97,
  },
] as const;

const ACCENT_BY_KEY: Record<string, Accent> = Object.fromEntries(
  ACCENTS.map((a) => [a.key, a])
);

export const DEFAULT_ACCENT_KEY: AccentKey = "violet";

const HEX_REGEX = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX_REGEX.test(value.trim());
}

export function resolveAccent(key: string | null | undefined): Accent {
  if (!key) return ACCENT_BY_KEY[DEFAULT_ACCENT_KEY];
  if (ACCENT_BY_KEY[key]) return ACCENT_BY_KEY[key];
  if (isHexColor(key)) {
    return { key, label: "Custom", hex: key, contrastOnWhite: 0 };
  }
  return ACCENT_BY_KEY[DEFAULT_ACCENT_KEY];
}

export function accentVars(accent: Accent): React.CSSProperties {
  return {
    "--accent": accent.hex,
    "--accent-bg": `${accent.hex}14`,
    "--accent-border": `${accent.hex}33`,
  } as React.CSSProperties;
}

// ---------- Card styles ----------

export type CardStyleKey =
  | "default"
  | "pill"
  | "square"
  | "soft"
  | "outline"
  | "elevated"
  | "wave";

export interface CardStyle {
  key: CardStyleKey;
  label: string;
}

export const CARD_STYLES: readonly CardStyle[] = [
  { key: "default", label: "Rounded" },
  { key: "pill", label: "Pill" },
  { key: "soft", label: "Soft" },
  { key: "square", label: "Square" },
  { key: "outline", label: "Outline" },
  { key: "elevated", label: "Elevated" },
  { key: "wave", label: "Wave" },
] as const;

export const DEFAULT_CARD_STYLE: CardStyleKey = "default";

export function isCardStyleKey(value: unknown): value is CardStyleKey {
  return CARD_STYLES.some((s) => s.key === value);
}

// ---------- Backgrounds ----------

export type BgKind = "auto" | "solid" | "gradient" | "preset";

export interface BgPreset {
  key: string;
  label: string;
  css: string; // background CSS value
  isDark: boolean; // hint for text auto-contrast
}

export const BG_PRESETS: readonly BgPreset[] = [
  { key: "white", label: "White", css: "#ffffff", isDark: false },
  { key: "cream", label: "Cream", css: "#fafaf9", isDark: false },
  { key: "stone", label: "Stone", css: "#e7e5e4", isDark: false },
  { key: "ink", label: "Ink", css: "#0a0a0c", isDark: true },
  {
    key: "lavender",
    label: "Lavender",
    css: "linear-gradient(135deg, #f3e8ff 0%, #fdf2f8 100%)",
    isDark: false,
  },
  {
    key: "peach",
    label: "Peach",
    css: "linear-gradient(135deg, #fff7ed 0%, #fee2e2 100%)",
    isDark: false,
  },
  {
    key: "mint",
    label: "Mint",
    css: "linear-gradient(135deg, #ecfdf5 0%, #e0f2fe 100%)",
    isDark: false,
  },
  {
    key: "dusk",
    label: "Dusk",
    css: "linear-gradient(135deg, #0f172a 0%, #312e81 100%)",
    isDark: true,
  },
  {
    key: "horizon",
    label: "Horizon",
    css: "linear-gradient(135deg, #fef3c7 0%, #fda4af 60%, #c4b5fd 100%)",
    isDark: false,
  },
] as const;

const BG_PRESET_BY_KEY: Record<string, BgPreset> = Object.fromEntries(
  BG_PRESETS.map((b) => [b.key, b])
);

export function getBgPreset(key: string | null | undefined): BgPreset | null {
  if (!key) return null;
  return BG_PRESET_BY_KEY[key] ?? null;
}

export interface ResolvedBackground {
  css: string; // CSS value to assign to background
  isDark: boolean; // true when the background reads dark (text should be light)
}

// Resolve a stored (bgKind, bgValue) pair into a CSS background. The "auto"
// kind falls back to the page surface (transparent so the page bg shows
// through; downstream renderers can apply var(--background-alt) instead).
export function resolveBackground(
  kind: string | null | undefined,
  value: string | null | undefined
): ResolvedBackground {
  if (kind === "preset" && value) {
    const preset = getBgPreset(value);
    if (preset) return { css: preset.css, isDark: preset.isDark };
  }
  if (kind === "solid" && isHexColor(value)) {
    return { css: value as string, isDark: isHexDark(value as string) };
  }
  if (kind === "gradient" && typeof value === "string" && value.length > 0) {
    return { css: value, isDark: false };
  }
  // Auto: use the page surface (transparent — caller decides what shows
  // through).
  return { css: "transparent", isDark: false };
}

// ---------- Text color ----------

export interface ResolvedText {
  color: string; // CSS color for primary text
  muted: string; // CSS color for secondary text
}

const DARK_TEXT: ResolvedText = { color: "#0a0a0c", muted: "#525258" };
const LIGHT_TEXT: ResolvedText = { color: "#fafafa", muted: "#cbd5e1" };

export function resolveTextColor(
  stored: string | null | undefined,
  bgIsDark: boolean
): ResolvedText {
  if (stored && isHexColor(stored)) {
    return {
      color: stored,
      muted: hexWithAlpha(stored, 0.65),
    };
  }
  return bgIsDark ? LIGHT_TEXT : DARK_TEXT;
}

// ---------- Helpers ----------

export function isHexDark(hex: string): boolean {
  const value = hex.replace("#", "");
  if (value.length !== 6 && value.length !== 3) return false;
  const expand = (s: string) =>
    s.length === 3
      ? s
          .split("")
          .map((c) => c + c)
          .join("")
      : s;
  const v = expand(value);
  const r = parseInt(v.slice(0, 2), 16);
  const g = parseInt(v.slice(2, 4), 16);
  const b = parseInt(v.slice(4, 6), 16);
  // sRGB luminance approximation
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance < 0.55;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  return `${hex}${a}`;
}
```

`accentVars(accent)` bridges TS state and CSS: spread it onto a wrapper's `style` and any descendant can use `var(--accent)` / `var(--accent-bg)` / `var(--accent-border)`. The `+ "14"` / `+ "33"` suffixes are the 8-bit hex alpha channel (~8% / ~20% opacity). `resolveBackground` + `resolveTextColor` + `isHexDark` together implement auto-contrast: a dark background auto-selects light text unless the creator overrode it.

### `src/lib/socials.ts`

Pairs a stable platform key (stored in `SocialLink.platform`) with a label, brand color, and the raw SVG `path` data from `simple-icons`. The path is emitted into an inline `<svg>` at render time, so the full simple-icons bundle never ships to the browser.

```ts
// Social platform metadata. Each entry pairs a stable key (stored in the
// SocialLink table) with a human label, the platform's brand color, and
// the SVG path data sourced from the `simple-icons` package. The path is
// emitted into an inline <svg> at render time, so we never ship the full
// simple-icons CSS / asset bundle to the browser.

import {
  siX,
  siInstagram,
  siYoutube,
  siTiktok,
  siGithub,
  siDiscord,
  siBluesky,
  siThreads,
  siSpotify,
  siTwitch,
  siFacebook,
  siGmail,
  siSubstack,
} from "simple-icons";

export interface SocialPlatform {
  key: string;
  label: string;
  brandColor: string; // hex
  path: string; // SVG path data (no leading hash, just the `d` attribute value)
  // How to compose the link's href from the user-supplied url. Most are
  // pass-through; email becomes a mailto:.
  hrefBuilder?: (url: string) => string;
}

const websiteSvgPath =
  "M12 2a10 10 0 100 20 10 10 0 000-20zm6.93 6h-2.95a15.65 15.65 0 00-1.38-3.56A8.03 8.03 0 0118.93 8zM12 4c.83 1.2 1.48 2.53 1.91 3.94H10.1A11.5 11.5 0 0112 4zM4.26 14a7.86 7.86 0 010-4H7.6a16.6 16.6 0 000 4zm.81 2h2.95c.32 1.25.78 2.45 1.38 3.56A7.99 7.99 0 015.07 16zm2.95-8H5.07a7.99 7.99 0 014.33-3.56A15.65 15.65 0 008.02 8zM12 20c-.83-1.2-1.48-2.53-1.91-3.94h3.82A11.5 11.5 0 0112 20zm2.34-5.94H9.66a14.5 14.5 0 010-4h4.68a14.5 14.5 0 010 4zm.32 5.5c.6-1.11 1.06-2.31 1.38-3.56h2.95a7.99 7.99 0 01-4.33 3.56zM16.4 14a16.6 16.6 0 000-4h3.34a7.86 7.86 0 010 4z";

export const SOCIALS: readonly SocialPlatform[] = [
  { key: "x", label: "X", brandColor: `#${siX.hex}`, path: siX.path },
  {
    key: "instagram",
    label: "Instagram",
    brandColor: `#${siInstagram.hex}`,
    path: siInstagram.path,
  },
  {
    key: "youtube",
    label: "YouTube",
    brandColor: `#${siYoutube.hex}`,
    path: siYoutube.path,
  },
  {
    key: "tiktok",
    label: "TikTok",
    brandColor: `#${siTiktok.hex}`,
    path: siTiktok.path,
  },
  {
    key: "github",
    label: "GitHub",
    brandColor: `#${siGithub.hex}`,
    path: siGithub.path,
  },
  {
    key: "discord",
    label: "Discord",
    brandColor: `#${siDiscord.hex}`,
    path: siDiscord.path,
  },
  {
    key: "bluesky",
    label: "Bluesky",
    brandColor: `#${siBluesky.hex}`,
    path: siBluesky.path,
  },
  {
    key: "threads",
    label: "Threads",
    brandColor: `#${siThreads.hex}`,
    path: siThreads.path,
  },
  {
    key: "spotify",
    label: "Spotify",
    brandColor: `#${siSpotify.hex}`,
    path: siSpotify.path,
  },
  {
    key: "twitch",
    label: "Twitch",
    brandColor: `#${siTwitch.hex}`,
    path: siTwitch.path,
  },
  {
    key: "facebook",
    label: "Facebook",
    brandColor: `#${siFacebook.hex}`,
    path: siFacebook.path,
  },
  {
    key: "substack",
    label: "Substack",
    brandColor: `#${siSubstack.hex}`,
    path: siSubstack.path,
  },
  {
    key: "email",
    label: "Email",
    brandColor: `#${siGmail.hex}`,
    path: siGmail.path,
    hrefBuilder: (url) => (url.startsWith("mailto:") ? url : `mailto:${url}`),
  },
  { key: "website", label: "Website", brandColor: "#0a0a0c", path: websiteSvgPath },
] as const;

const SOCIAL_BY_KEY: Record<string, SocialPlatform> = Object.fromEntries(
  SOCIALS.map((s) => [s.key, s])
);

export function getSocialPlatform(key: string): SocialPlatform | null {
  return SOCIAL_BY_KEY[key] ?? null;
}

export function isSocialPlatformKey(value: unknown): value is string {
  return typeof value === "string" && value in SOCIAL_BY_KEY;
}
```

---

## Step 6: Build the shared profile renderer

### `src/components/ProfileRender.tsx`

The shared renderer used by both the dashboard's live preview and the public `/u/[handle]` page. Props:

- `creator`: `Pick<Creator, "handle" | "title" | "bio" | "avatarUrl" | "accentColor" | "unlockPrice" | "cardStyle" | "bgKind" | "bgValue" | "textColor">`
- `links`: `Pick<Link, "id" | "title" | "url" | "isPremium" | "isVisible">[]`
- `socials?`: `Pick<SocialLink, "id" | "platform" | "url" | "color">[]` — rendered as a row of inline-SVG icon links between the bio and the first link card
- `hasPaidUnlock: boolean` — flips premium link cards from "blurred placeholder + price chip" to real `<a>` tags
- `hasEarnings: boolean` — controls whether the unlock CTA renders or shows a "Premium links coming soon" hint
- `unlockSlot?: ReactNode` — slot the public page uses to inject the real `<UnlockButton>`; the dashboard preview leaves it empty so `UnlockPreviewButton` renders instead
- `scale?: "full" | "preview"` — toggles sizes and disables `<a>` interactivity in preview mode

It resolves the accent (`resolveAccent`), background (`resolveBackground`), and text color (`resolveTextColor`) up front, then builds a `wrapperStyle` that spreads `accentVars(accent)` and sets `background`, `color`, plus `--card-bg` / `--card-border` / `--text-color` / `--text-muted` CSS vars. A `CARD_STYLE_CLASSES` lookup maps each `cardStyle` key to Tailwind classes (the `wave` style uses a radial-gradient `mask-image`). Links are split into `freeLinks` / `premiumLinks` after filtering on `isVisible`; the premium block renders real `LinkCard` rows when `hasPaidUnlock`, otherwise `PremiumPlaceholderCard` rows (greyed title + price chip) followed by `unlockSlot ?? UnlockPreviewButton` when `hasEarnings`. Social icons render as `<a target="_blank" rel="noopener noreferrer">` in `full` scale and inert `<div>`s in `preview` scale, colored by `s.color ?? platform.brandColor`, with `href` built via `platform.hrefBuilder?.(s.url) ?? s.url`.

> Avatars render with a plain `<img>` (with `// eslint-disable-next-line @next/next/no-img-element`) because the URL is an arbitrary Vercel Blob host.

---

## Step 7: Build the creator dashboard

Forms wire to **Next.js Server Actions** via `<form action={action}>`; client components use `useActionState` for inline validation errors. Every mutating action re-checks ownership against the session-derived creator row before touching the DB.

### `src/app/actions/creator.ts`

Profile + theme actions, all guarded by `getCurrentUserId()` and "Save your profile first" when no creator row exists:

- `saveProfile` — Zod-validates `handle` (`/^[a-z0-9_-]+$/`, 2–32), `title` (≤80), `bio` (≤300), `unlockPrice` (number 1–1000 dollars → cents). Rejects a handle taken by another user, then upserts the `Creator`.
- `setAccent` — Accepts a preset key (`z.enum`-style `ACCENT_KEYS` check) **or** a validated hex string; stores it on `accentColor`.
- `setCardStyle` — Validates against `isCardStyleKey`; stores on `cardStyle`.
- `setBackground` — Branches on `kind` (`auto` / `preset` / `solid` / `gradient`). Presets must match a known key; solid must be hex; gradient must be `<= 500` chars and start with `linear-gradient(`. Stores `bgKind` + `bgValue`.
- `setTextColor` — `"auto"` or a validated hex; stores on `textColor`.
- `setAvatarUrl` — Accepts `""`/null (clear) or a URL matching `^https:\/\/[^/]+\.public\.blob\.vercel-storage\.com\/` only, so an attacker can't point `avatarUrl` at an arbitrary host. (The dashboard uses the `/api/avatar` route below for the actual upload; this action is the URL-recording fallback.)

All call `revalidatePath("/dashboard")`.

### `src/app/actions/socials.ts`

CRUD + reorder for `SocialLink`, each ownership-checked:

- `addSocialLink` — Requires `isSocialPlatformKey(platform)`. For `email`, validates an address shape; for everything else, prepends `https://` if no scheme is present. Appends at the next `sortOrder`.
- `deleteSocialLink` / `setSocialColor` — Delete, or set an optional hex `color` override (or clear it).
- `reorderSocialLinks(orderedIds)` — Verifies every ID belongs to the creator, then rewrites `sortOrder` in one `prisma.$transaction`.

### `src/app/actions/links.ts`

Five link actions, each guarded by a `getCreatorForUser()` helper plus a `link.creatorId === creator.id` ownership check. **Security note:** `LinkSchema` now refines `z.url()` to reject non-http(s) schemes — `z.url()` alone accepts `javascript:` and `data:` URLs, which would become stored XSS once rendered as `<a href>` on the public page.

```ts
"use server";

import { prisma } from "@/lib/prisma";
import { getCurrentUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";

// z.string().url() accepts javascript: and data: URLs, which would become a
// stored-XSS vector once rendered as <a href> on the public profile. Restrict
// to http/https explicitly.
const LinkSchema = z.object({
  title: z.string().min(1).max(100),
  url: z
    .string()
    .url("Must be a valid URL")
    .refine(
      (u) => /^https?:\/\//i.test(u),
      "URL must start with http:// or https://"
    ),
  isPremium: z.coerce.boolean(),
});

type ActionResult = { error?: string; success?: boolean };

async function getCreatorForUser() {
  const userId = await getCurrentUserId();
  if (!userId) return null;
  return prisma.creator.findUnique({ where: { userId } });
}

export async function addLink(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "No creator profile found" };

  const parsed = LinkSchema.safeParse({
    title: formData.get("title"),
    url: formData.get("url"),
    isPremium: formData.get("isPremium") === "on",
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const count = await prisma.link.count({ where: { creatorId: creator.id } });

  await prisma.link.create({
    data: {
      creatorId: creator.id,
      title: parsed.data.title,
      url: parsed.data.url,
      isPremium: parsed.data.isPremium,
      sortOrder: count,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteLink(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  const linkId = formData.get("linkId") as string;
  const link = await prisma.link.findUnique({ where: { id: linkId } });

  if (!link || link.creatorId !== creator.id) {
    return { error: "Link not found" };
  }

  await prisma.link.delete({ where: { id: linkId } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function togglePremium(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  const linkId = formData.get("linkId") as string;
  const link = await prisma.link.findUnique({ where: { id: linkId } });

  if (!link || link.creatorId !== creator.id) {
    return { error: "Link not found" };
  }

  await prisma.link.update({
    where: { id: linkId },
    data: { isPremium: !link.isPremium },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function toggleVisibility(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  const linkId = formData.get("linkId") as string;
  const link = await prisma.link.findUnique({ where: { id: linkId } });

  if (!link || link.creatorId !== creator.id) {
    return { error: "Link not found" };
  }

  await prisma.link.update({
    where: { id: linkId },
    data: { isVisible: !link.isVisible },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Reorder a creator's links by their new positional order. Accepts an array
// of link IDs (in the desired display order) and rewrites every sortOrder
// in a single transaction. Bulk write avoids N round trips.
export async function reorderLinks(orderedIds: string[]): Promise<ActionResult> {
  const creator = await getCreatorForUser();
  if (!creator) return { error: "Not authenticated" };

  // Validate every ID belongs to this creator before touching the DB.
  const owned = await prisma.link.findMany({
    where: { creatorId: creator.id, id: { in: orderedIds } },
    select: { id: true },
  });
  if (owned.length !== orderedIds.length) {
    return { error: "One or more links could not be found" };
  }

  await prisma.$transaction(
    orderedIds.map((id, sortOrder) =>
      prisma.link.update({ where: { id }, data: { sortOrder } })
    )
  );

  revalidatePath("/dashboard");
  return { success: true };
}
```

### Dashboard UI components

- `src/app/dashboard/ProfileForm.tsx` — Client form for handle, display name, bio, unlock price (dollars). Takes an optional `intendedHandle` prop (from the `intended_handle` cookie). `useActionState(saveProfile, {})` with inline error / "Profile saved" states.
- `src/app/dashboard/ThemePicker.tsx` — Client component composing four sub-pickers wired to `setAccent` / `setCardStyle` / `setBackground` / `setTextColor`. Renders accent swatches (six presets + a custom hex input), card-style chips from `CARD_STYLES`, background presets from `BG_PRESETS` plus solid/gradient/auto modes, and an auto/custom text-color toggle. Uses `useTransition` + optimistic local state so a pick "sticks" before the server confirms.
- `src/app/dashboard/AvatarUpload.tsx` — Client widget. `POST`s the selected file to `/api/avatar` as `multipart/form-data`, shows an optimistic local `URL.createObjectURL` preview while in flight, then `router.refresh()` on success so the SSR preview picks up the new blob URL. A "Remove" button `DELETE`s. Accepts only JPG/PNG/WEBP/GIF, 4 MB max (mirrored server-side).

```tsx
"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

// Client-side avatar upload widget. Posts the selected file to /api/avatar
// which writes to the Vercel Blob store and updates Creator.avatarUrl in
// one round trip. On success we router.refresh() so the dashboard's
// server-rendered live preview picks up the new image immediately.

export function AvatarUpload({
  current,
  hasProfile,
  displayName,
}: {
  current: string | null;
  hasProfile: boolean;
  displayName: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(current);

  const initial = (displayName || "?").charAt(0).toUpperCase();

  async function upload(file: File) {
    setError(null);
    // Optimistic local preview while the upload is in flight.
    const localUrl = URL.createObjectURL(file);
    setPreview(localUrl);

    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch("/api/avatar", { method: "POST", body: fd });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Upload failed");
      }
      const data = (await res.json()) as { url: string };
      setPreview(data.url);
      startTransition(() => router.refresh());
    } catch (err) {
      setPreview(current);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      URL.revokeObjectURL(localUrl);
    }
  }

  async function clear() {
    setError(null);
    try {
      const res = await fetch("/api/avatar", { method: "DELETE" });
      if (!res.ok) throw new Error("Couldn't remove avatar");
      setPreview(null);
      startTransition(() => router.refresh());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't remove avatar");
    }
  }

  return (
    <div className="flex items-center gap-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={displayName}
          className="h-16 w-16 rounded-full object-cover border border-neutral-200"
        />
      ) : (
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-neutral-100 text-xl font-semibold text-neutral-500 border border-neutral-200">
          {initial}
        </div>
      )}

      <div className="flex flex-col items-start gap-1.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={!hasProfile || pending}
            className="rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-900 transition-colors hover:border-neutral-400 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {preview ? "Replace" : "Upload avatar"}
          </button>
          {preview && (
            <button
              type="button"
              onClick={clear}
              disabled={!hasProfile || pending}
              className="text-xs font-medium text-neutral-500 hover:text-red-600 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Remove
            </button>
          )}
        </div>
        <p className="text-[11px] text-neutral-400">JPG, PNG, WEBP, or GIF. 4 MB max.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={!hasProfile || pending}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload(file);
            e.target.value = "";
          }}
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}
```

- `src/app/dashboard/LinkForm.tsx` — Two exports. `AddLinkForm`: title + URL + "Mark as premium" checkbox bound to `addLink`, resets via a `key` bump on success. `LinksList`: wraps rows in `<DndContext>` (`closestCenter`, `PointerSensor` 4px activation + `KeyboardSensor`), holds local order in `useState`, resyncs via `useEffect` on the server `links` prop, and on `onDragEnd` calls `arrayMove` + `startTransition(() => reorderLinks(next))`. Each `SortableLinkRow` has a drag handle plus separate `<form>` toggles (visibility / premium / delete), each with its own `useActionState`.
- `src/app/dashboard/SocialsManager.tsx` — `useActionState(addSocialLink)` form with a platform `<select>` (from `SOCIALS`) + URL input, plus a dnd-kit sortable list of existing socials. Each row shows the platform icon, a delete `<form>`, and an optional color override that calls `setSocialColor`. Reorder persists via `reorderSocialLinks`.
- `src/app/dashboard/page.tsx` — Server component. Loads the creator + links + socials (each `orderBy sortOrder asc`), reads `intended_handle`, builds a placeholder `previewCreator` when no row exists yet, and composes sectioned panels: Profile (`AvatarUpload` + `ProfileForm`), Theme (`ThemePicker`), Links (`LinksList` + `AddLinkForm`), Socials (`SocialsManager`), Earnings (`EarningsButton`), and Payouts (`PayoutPortal`, only when `payoutEnabled`). The right column (`hidden lg:block`) is a sticky `<ProfileRender scale="preview" hasPaidUnlock={false} hasEarnings={!!whopCompanyId}>`.

### `src/app/api/avatar/route.ts` (new in v2)

`POST` uploads to Vercel Blob; `DELETE` clears the avatar. **Security:** the browser-supplied `file.type` and `file.name` are spoofable, so the route never trusts them — it sniffs the leading magic bytes and derives the extension/content-type from the real format. SVG is intentionally unsupported (it can carry `<script>`). Rate limited per user, 4 MB cap.

```ts
import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";

// Maximum avatar upload size in bytes. Vercel Blob's free tier handles
// much larger files; this cap is to prevent abuse and keep load times sane.
const MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export const dynamic = "force-dynamic";

// The browser-supplied file.type and file.name are both spoofable, so we never
// trust them. Sniff the leading magic bytes and derive the extension and
// content-type from the real format. SVG is intentionally unsupported (it can
// carry <script>). Returns the canonical extension, or null if unrecognized.
function sniffImage(bytes: Uint8Array): "jpg" | "png" | "webp" | "gif" | null {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpg";
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  )
    return "png";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) return "gif";
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  )
    return "webp";
  return null;
}

export async function POST(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`avatar:${userId}`, 10, 60_000)) {
    return NextResponse.json(
      { error: "Too many uploads. Try again in a minute." },
      { status: 429 }
    );
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) {
    return NextResponse.json(
      { error: "Save your profile first" },
      { status: 400 }
    );
  }

  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Image must be smaller than 4 MB" },
      { status: 413 }
    );
  }

  // Validate by content, not by the spoofable file.type / file.name.
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const ext = sniffImage(head);
  if (!ext) {
    return NextResponse.json(
      { error: "Use a real JPG, PNG, WEBP, or GIF image" },
      { status: 415 }
    );
  }
  const contentType = ext === "jpg" ? "image/jpeg" : `image/${ext}`;

  // Object key includes the creator ID so each creator only ever owns their
  // own slot. `addRandomSuffix` ensures repeated uploads don't collide
  // with the same cached URL.
  const blob = await put(`avatars/${creator.id}.${ext}`, file, {
    access: "public",
    addRandomSuffix: true,
    contentType,
  });

  await prisma.creator.update({
    where: { id: creator.id },
    data: { avatarUrl: blob.url },
  });

  return NextResponse.json({ url: blob.url });
}

export async function DELETE() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator) {
    return NextResponse.json(
      { error: "Save your profile first" },
      { status: 400 }
    );
  }

  await prisma.creator.update({
    where: { id: creator.id },
    data: { avatarUrl: null },
  });

  return NextResponse.json({ ok: true });
}
```

---

## Step 8: Enroll creators as connected accounts

The first call creates a **sub-company** (Whop's "connected account") under your platform's `parent_company_id`. The sandbox bypass keeps the demo testable without forcing every reader through KYC.

### `src/app/actions/earnings.ts`

```ts
"use server";

import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";
import { getCurrentUserId } from "@/lib/session";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const IS_SANDBOX = process.env.NEXT_PUBLIC_WHOP_ENV === "sandbox";

export type EnableEarningsResult = {
  error?: string;
  success?: boolean;
};

export async function enableEarnings(): Promise<EnableEarningsResult> {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" };

  const creator = await prisma.creator.findUnique({
    where: { userId },
    include: { user: true },
  });

  if (!creator) return { error: "Create a profile first" };

  // Already enrolled. Re-generate the onboarding link in case they need to finish KYC.
  let companyId = creator.whopCompanyId;

  if (!companyId) {
    if (!creator.user.email) {
      return {
        error:
          "Your Whop account has no email address. Please add one at whop.com/settings before enabling earnings.",
      };
    }

    // Create a connected account company under the platform
    const company = await whop.companies.create({
      title: creator.title || creator.handle,
      parent_company_id: process.env.WHOP_PARENT_COMPANY_ID!,
      email: creator.user.email,
    });

    companyId = company.id;

    await prisma.creator.update({
      where: { id: creator.id },
      data: { whopCompanyId: companyId },
    });
  }

  // Sandbox bypass: skip Whop's hosted KYC flow and mark the creator as
  // payout-ready immediately. Whop's sandbox doesn't enforce real KYC, so the
  // hosted onboarding screen would just auto-complete with placeholder data
  // anyway. The client-side button confirms this with a popup before calling.
  if (IS_SANDBOX) {
    if (!creator.payoutEnabled) {
      await prisma.creator.update({
        where: { id: creator.id },
        data: { payoutEnabled: true },
      });
    }
    revalidatePath("/dashboard");
    return { success: true };
  }

  // Production flow: send the creator to Whop's hosted KYC onboarding.
  const accountLink = await whop.accountLinks.create({
    company_id: companyId,
    use_case: "account_onboarding",
    return_url: `${APP_URL}/api/earnings/complete`,
    refresh_url: `${APP_URL}/dashboard?refresh=true`,
  });

  redirect(accountLink.url);
}
```

> First call creates the sub-company; subsequent calls reuse `whopCompanyId` and just mint a fresh `accountLinks` URL. It's safe to call `accountLinks.create` repeatedly (e.g., to update bank/KYC details) — don't create a new company per click.

### `src/app/dashboard/EarningsButton.tsx`

Three states driven by `enrolled` (`whopCompanyId` set) + `payoutEnabled`: (1) "Enable Earnings"; (2) amber "KYC not complete" + "Complete onboarding" (re-runs the action; the dashboard also lands here with `?kyc_incomplete=true`); (3) green checkmark + "Manage account onboarding". In sandbox the click is intercepted by a confirmation popup explaining the bypass before the action fires.

### `src/app/api/earnings/complete/route.ts`

```ts
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.redirect(`${APP_URL}/`);

  const creator = await prisma.creator.findUnique({ where: { userId } });

  if (!creator?.whopCompanyId) {
    return NextResponse.redirect(`${APP_URL}/dashboard`);
  }

  let payoutReady = false;
  try {
    const methods = await whop.payoutMethods.list({
      company_id: creator.whopCompanyId,
    });
    for await (const method of methods) {
      if (method.destination) {
        payoutReady = true;
        break;
      }
    }
  } catch (err) {
    console.error("[earnings/complete] payout-methods lookup failed:", err);
  }

  if (payoutReady && !creator.payoutEnabled) {
    await prisma.creator.update({
      where: { userId },
      data: { payoutEnabled: true },
    });
  }

  const status = payoutReady ? "enrolled=true" : "kyc_incomplete=true";
  return NextResponse.redirect(`${APP_URL}/dashboard?${status}`);
}
```

> `whop.payoutMethods.list` returns an **async iterator** (not an array). Use `for await ... of` and break on the first method with a `destination`. Don't trust the return path alone — a logged-in user can navigate to `/api/earnings/complete` directly; the `payoutMethods` lookup is what actually decides whether to flip `payoutEnabled = true`.

---

## Step 9: Build the public profile page

### `src/app/u/[handle]/page.tsx`

Server component. Loads the creator + links + socials (ordered by `sortOrder`), 404s if not found. **Premium access is now proven by the signed httpOnly unlock cookie**, not a `?unlocked=` URL param: it reads `unlock_<creatorId>`, runs it through `verifyUnlock()`, and only then loads the unlock row and checks it's `PAID` and belongs to this creator. Renders `<ProfileRender scale="full">` with `<UnlockButton>` as `unlockSlot`.

```tsx
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { ProfileRender } from "@/components/ProfileRender";
import { UnlockButton } from "./UnlockButton";
import { unlockCookieName, verifyUnlock } from "@/lib/unlock";

interface Props {
  params: Promise<{ handle: string }>;
}

export default async function PublicProfilePage({ params }: Props) {
  const { handle } = await params;

  const creator = await prisma.creator.findUnique({
    where: { handle },
    include: {
      links: { orderBy: { sortOrder: "asc" } },
      socials: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!creator) notFound();

  // Premium access is proved by a signed httpOnly cookie set after a verified
  // payment, then confirmed against the database.
  let hasPaidUnlock = false;
  const cookieStore = await cookies();
  const unlockId = verifyUnlock(
    cookieStore.get(unlockCookieName(creator.id))?.value
  );
  if (unlockId) {
    const unlock = await prisma.unlock.findUnique({ where: { id: unlockId } });
    hasPaidUnlock = unlock?.creatorId === creator.id && unlock?.status === "PAID";
  }

  return (
    <div className="min-h-screen bg-white">
      <ProfileRender
        creator={creator}
        links={creator.links}
        socials={creator.socials}
        hasPaidUnlock={hasPaidUnlock}
        hasEarnings={!!creator.whopCompanyId}
        unlockSlot={
          <UnlockButton
            creatorId={creator.id}
            priceInCents={creator.unlockPrice}
          />
        }
        scale="full"
      />

      <footer className="text-center text-xs text-neutral-300 py-6">
        <a href="/" className="hover:text-neutral-500 transition-colors">
          Built with Linkstacks
        </a>
      </footer>
    </div>
  );
}
```

### `src/lib/unlock.ts` (new in v2)

Signed, httpOnly unlock-cookie helpers. The cookie value is `<unlockId>.<hmac>`, signed with `SESSION_SECRET`; the public page verifies it with a constant-time `timingSafeEqual` before trusting the unlock ID.

```ts
import { createHmac, timingSafeEqual } from "crypto";

// A paid unlock is proved with a signed, httpOnly cookie rather than a value in
// the URL. The buyer's browser receives `unlock_<creatorId>` after a verified
// payment; the public profile page reads it server-side. Because it is httpOnly
// and never appears in a shareable link, one buyer's access cannot be copied
// from a URL and handed to someone who did not pay.

export function unlockCookieName(creatorId: string): string {
  return `unlock_${creatorId}`;
}

function sign(unlockId: string): string {
  const secret = process.env.SESSION_SECRET ?? "";
  return createHmac("sha256", secret).update(unlockId).digest("base64url");
}

// token shape: "<unlockId>.<hmac>"
export function signUnlock(unlockId: string): string {
  return `${unlockId}.${sign(unlockId)}`;
}

// Returns the unlockId if the token is well-formed and the signature matches,
// otherwise null. The caller still confirms the unlock is PAID and belongs to
// the creator before granting access.
export function verifyUnlock(token: string | undefined | null): string | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const unlockId = token.slice(0, dot);
  const provided = token.slice(dot + 1);
  const expected = sign(unlockId);
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return unlockId;
}
```

---

## Step 10: Create the unlock checkout

### `src/app/actions/checkout.ts`

Rate limited. Creates a `PENDING` `Unlock`, then a Whop checkout configuration targeting the creator's connected company with an `application_fee_amount` for the platform. `redirect_url` carries only `handle` and `unlock_id`; Whop appends `payment_id` and `checkout_status` itself.

```ts
"use server";

import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { redirect } from "next/navigation";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export async function createCheckout(
  creatorId: string
): Promise<{ error: string }> {
  if (!rateLimit(`checkout:${await clientIp()}`, 20, 60_000)) {
    return { error: "Too many attempts. Try again in a minute." };
  }

  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
  });

  if (!creator) return { error: "Creator not found" };
  if (!creator.whopCompanyId) return { error: "Creator has not enabled earnings" };

  const priceInDollars = creator.unlockPrice / 100;
  const feeInDollars = creator.applicationFee / 100;

  // Create a pending Unlock record so the webhook can find it by payment ID
  const unlock = await prisma.unlock.create({
    data: {
      creatorId: creator.id,
      status: "PENDING",
    },
  });

  const checkout = await whop.checkoutConfigurations.create({
    plan: {
      company_id: creator.whopCompanyId,
      currency: "usd",
      plan_type: "one_time",
      initial_price: priceInDollars,
      application_fee_amount: feeInDollars,
    },
    redirect_url: `${APP_URL}/api/checkout/verify?handle=${encodeURIComponent(
      creator.handle
    )}&unlock_id=${unlock.id}`,
    metadata: { unlock_id: unlock.id, creator_id: creator.id },
  });

  redirect(checkout.purchase_url);
}
```

> `initial_price` and `application_fee_amount` are **dollars**, not cents. The DB stores cents; divide by 100.
>
> `metadata.unlock_id` is the fallback the webhook uses when no unlock matches by `whopPaymentId`.

### `src/app/api/checkout/verify/route.ts`

The redirect handler. It retrieves the payment, flips the unlock to `PAID`, and — instead of forwarding an unlock ID in the URL — **sets a signed httpOnly cookie `unlock_<creatorId>`** and redirects to the bare profile URL. Failed verification falls through; the webhook is the authoritative catch-up.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";
import { unlockCookieName, signUnlock } from "@/lib/unlock";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

// Whop redirects buyers here after a successful checkout. We verify the payment
// against Whop and mark the unlock as PAID. The webhook handler is the
// authoritative source for state changes; this is only the optimistic
// "they probably just paid" path that lets the buyer see their content
// immediately. Failed verifications do not flip status to FAILED. They fall
// through to the public profile page, where the webhook will catch up.
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  const unlockId = req.nextUrl.searchParams.get("unlock_id");
  const paymentId = req.nextUrl.searchParams.get("payment_id");
  const checkoutStatus = req.nextUrl.searchParams.get("checkout_status");

  if (!handle) {
    return NextResponse.redirect(`${APP_URL}/`);
  }

  const profileUrl = `${APP_URL}/u/${handle}`;

  if (checkoutStatus !== "success" || !unlockId || !paymentId) {
    return NextResponse.redirect(profileUrl);
  }

  let unlockedCreatorId: string | null = null;
  try {
    const payment = await whop.payments.retrieve(paymentId);
    if (payment.status === "paid") {
      const unlock = await prisma.unlock.findUnique({
        where: { id: unlockId },
        include: { creator: true },
      });

      if (unlock && unlock.creator.handle === handle) {
        await prisma.unlock.updateMany({
          where: { id: unlockId, status: "PENDING" },
          data: { status: "PAID", whopPaymentId: paymentId },
        });
        unlockedCreatorId = unlock.creatorId;
      }
    }
  } catch (err) {
    // Non-fatal: the webhook is the safety net.
    console.error("[checkout/verify] payment retrieve failed:", err);
  }

  const res = NextResponse.redirect(profileUrl);
  // Grant access via a signed httpOnly cookie rather than a URL parameter, so a
  // paid unlock cannot be shared by copying the link.
  if (unlockedCreatorId) {
    res.cookies.set(unlockCookieName(unlockedCreatorId), signUnlock(unlockId), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
```

### `src/app/u/[handle]/UnlockButton.tsx`

```tsx
"use client";

import { useActionState } from "react";
import { createCheckout } from "@/app/actions/checkout";

export function UnlockButton({
  creatorId,
  priceInCents,
}: {
  creatorId: string;
  priceInCents: number;
}) {
  const action = createCheckout.bind(null, creatorId);
  const [state, formAction, pending] = useActionState(action, { error: "" });

  const dollars = (priceInCents / 100).toFixed(2);

  return (
    <div>
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-xl py-3 px-4 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ background: "var(--accent)" }}
        >
          {pending
            ? "Redirecting to checkout..."
            : `Unlock premium for $${dollars}`}
        </button>
      </form>
      {state?.error && (
        <p className="text-sm text-red-600 mt-2 text-center">{state.error}</p>
      )}
    </div>
  );
}
```

---

## Step 11: Handle payment webhooks

### `src/app/api/webhooks/whop/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { whop } from "@/lib/whop";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Next.js must not parse the body. We need the raw string for signature verification.
export const dynamic = "force-dynamic";

type WhopEventEnvelope = {
  id: string;
  type: string;
  data: { id?: unknown; metadata?: unknown } & Record<string, unknown>;
};

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // Convert Next.js headers to a plain object for the SDK's unwrap()
  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // Verify signature and parse event (throws if invalid)
  let event: WhopEventEnvelope;
  try {
    event = whop.webhooks.unwrap(rawBody, {
      headers,
    }) as unknown as WhopEventEnvelope;
  } catch (err) {
    console.error("[webhook] signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Idempotency. Whop retries on non-2xx, so we must short-circuit replays.
  // Insert the event ID first; a P2002 unique-violation means we've already
  // processed this exact event and can return 200 immediately.
  try {
    await prisma.webhookEvent.create({
      data: { id: event.id, type: event.type },
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      console.log(`[webhook] duplicate ${event.id}, skipping`);
      return NextResponse.json({ received: true, deduped: true });
    }
    throw err;
  }

  console.log(`[webhook] received: ${event.type} (${event.id})`);

  if (event.type === "payment.succeeded") {
    const paymentId = event.data.id as string;
    await handlePaymentSucceeded(paymentId);
  }

  if (event.type === "payment.failed") {
    const paymentId = event.data.id as string;
    await handlePaymentFailed(paymentId);
  }

  return NextResponse.json({ received: true });
}

async function handlePaymentSucceeded(paymentId: string) {
  // Find unlock by whop payment ID (set when checkout was created or on redirect)
  const existing = await prisma.unlock.findUnique({
    where: { whopPaymentId: paymentId },
  });

  if (existing) {
    if (existing.status !== "PAID") {
      await prisma.unlock.update({
        where: { id: existing.id },
        data: { status: "PAID" },
      });
      console.log(`[webhook] unlock ${existing.id} marked PAID`);
    }
    return;
  }

  // No unlock matched by payment ID yet. Find a PENDING unlock without a payment ID.
  // This handles the case where the redirect didn't fire
  const payment = await whop.payments.retrieve(paymentId);
  const unlockId = (payment.metadata as Record<string, string> | null)
    ?.unlock_id;

  if (unlockId) {
    await prisma.unlock.updateMany({
      where: { id: unlockId, status: "PENDING" },
      data: { status: "PAID", whopPaymentId: paymentId },
    });
    console.log(`[webhook] unlock ${unlockId} marked PAID via metadata`);
  } else {
    console.warn(
      `[webhook] payment.succeeded: no unlock found for payment ${paymentId}`
    );
  }
}

async function handlePaymentFailed(paymentId: string) {
  const existing = await prisma.unlock.findUnique({
    where: { whopPaymentId: paymentId },
  });

  if (existing) {
    await prisma.unlock.update({
      where: { id: existing.id },
      data: { status: "FAILED" },
    });
    console.log(`[webhook] unlock ${existing.id} marked FAILED`);
  }
}
```

> **Two-layer idempotency.** Outer: insert `WebhookEvent` keyed on the Whop event ID; `P2002` short-circuits Whop's at-least-once retries. Inner: `Unlock.whopPaymentId @unique` prevents the redirect verifier and webhook from each flipping the same unlock. You need both.
>
> Note: the webhook marks the unlock `PAID` in the DB, but the *buyer's browser* only gains the signed unlock cookie from the redirect leg (`/api/checkout/verify`). If the redirect never fired, the buyer re-visiting after the webhook still has a `PAID` unlock in the DB — but premium content only reveals once a verified cookie is present, so they'd return through the redirect on their next purchase confirmation.

### Webhook setup in the Whop dashboard

Endpoint `https://<ngrok>/api/webhooks/whop`, events `payment.succeeded` + `payment.failed`, and **enable "Connected account events"** so the webhook fires for payments to creators' sub-companies, not just your parent company.

---

## Step 12: Add security headers

### `next.config.ts`

The CSP is sandbox-aware *and* environment-aware: `'unsafe-eval'` is now emitted **only in dev** (the dev bundler's HMR needs it), keeping it out of production.

```ts
import type { NextConfig } from "next";

const isSandbox = process.env.NEXT_PUBLIC_WHOP_ENV === "sandbox";
// 'unsafe-eval' is only needed for the dev bundler's HMR. Keep it out of the
// production CSP so it can't be abused there.
const isDev = process.env.NODE_ENV !== "production";

// Whop's embedded components and hosted checkout pages need explicit allowance
// in the Content-Security-Policy. Sandbox traffic loads from the sandbox host
// equivalents.
const whopFrame = isSandbox
  ? "https://*.whop.com https://sandbox-js.whop.com"
  : "https://*.whop.com";
const whopScript = isSandbox
  ? "https://js.whop.com https://sandbox-js.whop.com"
  : "https://js.whop.com";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${isDev ? "'unsafe-eval' " : ""}${whopScript}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.whop.com https://sandbox-api.whop.com",
  `frame-src ${whopFrame}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
```

> `sandbox-js.whop.com` is needed in dev for the embedded portal to load; copying the production list to dev makes the iframe silently fail. `img-src ... https:` allows the Vercel Blob avatar URLs.

---

## Step 13: Embed the payout portal

### `src/app/api/payout-token/route.ts`

```ts
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

// Mints a short-lived access token scoped to the creator's connected company.
// Only the authenticated creator can call this for their own company.
export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const creator = await prisma.creator.findUnique({ where: { userId } });
  if (!creator?.whopCompanyId) {
    return NextResponse.json({ error: "No connected account" }, { status: 400 });
  }

  const token = await whop.accessTokens.create({
    company_id: creator.whopCompanyId,
  });

  return NextResponse.json({ token: token.token });
}
```

### `src/app/dashboard/PayoutPortal.tsx`

```tsx
"use client";

import { useMemo } from "react";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  VerifyElement,
  WithdrawButtonElement,
  WithdrawalsElement,
  StatusBannerElement,
} from "@whop/embedded-components-react-js";

const environment =
  process.env.NEXT_PUBLIC_WHOP_ENV === "sandbox" ? "sandbox" : "production";

async function fetchPayoutToken(): Promise<string | null> {
  const res = await fetch("/api/payout-token");
  if (!res.ok) return null;
  const data = await res.json();
  return data.token ?? null;
}

export function PayoutPortal({ companyId }: { companyId: string }) {
  // loadWhopElements returns a promise that the Elements component accepts directly
  const elementsPromise = useMemo(
    () => loadWhopElements({ environment }),
    []
  );

  return (
    <Elements elements={elementsPromise}>
      <PayoutsSession
        companyId={companyId}
        token={fetchPayoutToken}
        currency="usd"
        redirectUrl={typeof window !== "undefined" ? window.location.href : "/dashboard"}
      >
        <div className="space-y-4">
          <StatusBannerElement />
          <VerifyElement />
          <BalanceElement />
          <WithdrawButtonElement />
          <WithdrawalsElement />
        </div>
      </PayoutsSession>
    </Elements>
  );
}
```

> `token` is a **function**, not a string — the SDK calls it whenever it needs a fresh token, re-running `whop.accessTokens.create`. `environment` is resolved at module level (no `window` access) so it's SSR-safe. The `loadWhopElements` promise is `useMemo`-cached so it isn't recreated each render.

---

## Step 14: Test the full flow

1. Set `NEXT_PUBLIC_WHOP_ENV=sandbox` and the sandbox base URLs. Run ngrok + `npm run dev`.
2. Sign in via `/api/auth/login`, save a profile, pick a theme, upload an avatar, add free + premium links and socials.
3. Click "Enable Earnings" → confirm the sandbox bypass → `payoutEnabled` flips, the payout portal appears.
4. Open `/u/<handle>` in a fresh/incognito window, click "Unlock premium", complete the sandbox checkout, and confirm the redirect lands you back on the profile with premium links revealed (and **no** unlock ID in the URL — it's the cookie).
5. Confirm the webhook fires (`payment.succeeded`) and that a replay is deduped.

---

## Step 15: Deploy to Vercel

Push to GitHub, import into Vercel, set all env vars (omit `WHOP_OAUTH_BASE` / `WHOP_BASE_URL` for production, set `NEXT_PUBLIC_WHOP_ENV=production`). The Vercel Blob integration injects `BLOB_READ_WRITE_TOKEN` automatically. Update the Whop dashboard's OAuth redirect URI and webhook URL to the production domain, and point `NEXT_PUBLIC_APP_URL` / `WHOP_REDIRECT_URI` at it. `build` runs `prisma generate && next build`.

---

## Whop SDK + security gotchas

1. **Raw body before parse.** `whop.webhooks.unwrap` needs the raw text body to verify the HMAC — call `await req.text()` first and `export const dynamic = "force-dynamic"`.
2. **`webhookKey` is base64-encoded.** Pass `Buffer.from(secret).toString("base64")` to the SDK constructor, not the raw secret.
3. **Two-layer webhook idempotency.** `WebhookEvent` row on the event ID (`P2002` trick) for retries; `Unlock.whopPaymentId @unique` for the redirect-vs-webhook race. Use both.
4. **Sandbox base URLs.** Dev: `WHOP_OAUTH_BASE=https://sandbox-api.whop.com`, `WHOP_BASE_URL=https://sandbox-api.whop.com/api/v1`. Prod: omit both.
5. **OAuth redirect URI must match exactly** across the Whop dashboard, `WHOP_REDIRECT_URI`, and the authorize URL — trailing slashes included.
6. **Nonce + state binding (v2).** Login sets `oauth_nonce`; the callback rejects an empty `state` cookie (no `null === null` bypass) and verifies `id_token.nonce` against the cookie before trusting the token.
7. **Restrict link URLs to http(s) (v2).** `z.url()` alone allows `javascript:` / `data:` — refine it, or you ship stored XSS through `<a href>`.
8. **Signed unlock cookie, not a URL param (v2).** Grant premium access via the httpOnly `unlock_<creatorId>` = `<unlockId>.<hmac>` cookie set in `/api/checkout/verify`; verify it with `verifyUnlock()` + a DB `PAID` check on the public page. A URL param would let a buyer share paid access by copying the link.
9. **Validate uploads by content (v2).** Sniff magic bytes in `/api/avatar`; never trust `file.type` / `file.name`. Reject SVG (script-carrying) and spoofed types. Rate limit it.
10. **`'unsafe-eval'` is dev-only in the CSP (v2).** It's needed for HMR; keep it out of production.
11. **Application fee + price are dollars.** `initial_price` and `application_fee_amount` take dollar amounts; divide stored cents by 100.
12. **Sub-company creation via `parent_company_id`.** `whop.companies.create({ parent_company_id, title, email })` — skip it and you can't take an `application_fee_amount`. `accountLinks.create` is reusable for re-running KYC.
13. **`payoutMethods.list` is an async iterator.** `for await ... of`, break on the first `destination`. Always re-check on KYC return — don't trust the redirect alone.
14. **Sandbox KYC bypass.** Hosted KYC auto-completes with placeholder data in sandbox; the dashboard intercepts with a confirmation modal and flips `payoutEnabled` directly when `NEXT_PUBLIC_WHOP_ENV === "sandbox"`.
15. **Embedded components need the env hint + token function.** `loadWhopElements({ environment })` reads `NEXT_PUBLIC_WHOP_ENV`; `<PayoutsSession token={fetchPayoutToken}>` takes the async function so the SDK can refresh `accessTokens.create`.
16. **CSP must allowlist `js.whop.com` (+ `sandbox-js.whop.com` in dev)** for `script-src` and `frame-src`, and `img-src https:` for Blob avatar URLs, or the portal/avatars silently fail.
17. **"Connected account events" toggle.** Enable it on the webhook or payments to creators' sub-companies never reach your handler.
18. **`redirect_url` and `payment_id`.** Whop appends `payment_id` and `checkout_status=success` automatically — no `{PAYMENT_ID}` template token needed. Include your own params (`handle`, `unlock_id`) and read them alongside.
