# Swaphause (StockX clone) Guide — Part 1: Setup, Data Model & Authentication

Build a real-time bid/ask marketplace (StockX clone) using Next.js, Supabase, and Whop. Whop handles OAuth authentication, payment processing, seller connected accounts, KYC, and embedded chat — everything else is custom code.

- **Live demo**: [stockx-clone-zeta.vercel.app](https://stockx-clone-zeta.vercel.app/)

## What you're building

**Pages:**
- `/` — Homepage with trending products, live stats, category browsing
- `/products` — Browse all products with search, category filters, pagination
- `/products/[id]` — Product detail with bid/ask forms, order book, price history, size selector
- `/dashboard` — User dashboard: active bids/asks, trade history, portfolio
- `/trades/[id]` — Trade detail with status tracking, payment, embedded buyer-seller chat

**Core features:**
- Whop OAuth (PKCE) for "Sign in with Whop"
- Bid/ask matching engine with automatic trade execution
- Real-time pricing via Supabase Realtime
- Escrow payments via Whop for Platforms (connected accounts, KYC, fee splits)
- Buyer-seller embedded chat via Whop components
- Webhooks for payment event sync
- In-app notifications, full-text search, custom pagination

## Why Whop

Whop Payments Network handles connected accounts, KYC, escrow, and refunds. Since auth and payments share one ecosystem, you get one SDK, one dashboard, one webhook system. Whop OAuth gives you "Sign in with Whop" with a standard PKCE flow — no registration forms or password resets to build. ([OAuth docs](https://docs.whop.com/developer/guides/oauth) | [Payments docs](https://docs.whop.com/developer/guides/accept-payments) | [Authentication docs](https://docs.whop.com/developer/guides/authentication))

## Money flow (escrow pattern)

1. A bid matches an ask — trade created
2. Buyer charged via Whop (direct charge on seller's connected account with `application_fee_amount` for the platform)
3. Funds held — seller hasn't been paid yet
4. Seller ships item to the platform for authentication
5. Platform verifies the item
6. **If verified**: seller payout released via their Whop connected account
7. **If failed**: buyer refunded through Whop, item returned, listing can be reposted

The platform takes a percentage on every successful transaction via `application_fee_amount`. The seller receives the remainder. Whop handles the fee split, KYC, and payout rails. ([Connected accounts docs](https://docs.whop.com/developer/platforms/enroll-connected-accounts))

## Tech stack

- **Framework**: Next.js (App Router) — server components + API routes
- **Auth**: Whop OAuth (PKCE flow)
- **Payments**: Whop for Platforms (connected accounts + escrow + KYC)
- **Database**: Supabase (PostgreSQL) — cloud-only, no local DB
- **Real-time**: Supabase Realtime (subscribe to DB changes for live bid/ask updates)
- **ORM**: Prisma (type-safe DB access + migrations)
- **Validation**: Zod (runtime validation on API routes + env vars)
- **Deployment**: Vercel (with `vercel.ts` typed config)

## Setup

1. Create a Next.js app: `npx create-next-app@latest stockx-clone` (use recommended defaults)
2. Create a Supabase project — get the connection string (Session pooler), project URL, anon key, and service role key
3. Create a Whop sandbox app at [sandbox.whop.com/dashboard/developer](https://sandbox.whop.com/dashboard/developer). Set OAuth redirect URI to `http://localhost:3000/api/auth/callback`
4. Deploy to Vercel, set all env vars (below), then pull locally: `npm i -g vercel && vercel login && vercel link && vercel env pull .env.local`
5. Enable Supabase Realtime replication on the `Bid` and `Ask` tables (Database > Replication)

Also create: `vercel.ts` in the project root for deployment config (framework, security headers on API routes) and `next.config.ts` for remote image patterns (e.g. `placehold.co`).

## Environment variables

Set in Vercel dashboard — use different values per deployment context (Production, Preview, Development):

- `WHOP_API_KEY` — **Company** API key (Settings > API Keys, not app API key — needed for `company:create_child`)
- `WHOP_APP_ID` — From Whop app dashboard
- `WHOP_CLIENT_ID` — OAuth client ID
- `WHOP_CLIENT_SECRET` — OAuth client secret
- `WHOP_WEBHOOK_SECRET` — Webhook signing secret
- `WHOP_COMPANY_ID` — The `biz_...` value from your company dashboard URL
- `WHOP_API_BASE` — `https://sandbox-api.whop.com` (dev/preview) or `https://api.whop.com` (production). Controls sandbox vs prod for the entire app
- `DATABASE_URL` — Supabase connection string (Session pooler)
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon key
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase service role key
- `NEXT_PUBLIC_APP_URL` — Your Vercel deployment URL
- `SESSION_SECRET` — Random 32+ char string: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `PLATFORM_FEE_PERCENT` — Platform fee percentage (default: 9.5)
- `NEXT_PUBLIC_WHOP_ENVIRONMENT` — `sandbox` (dev/preview) or `production` (prod). Used by embedded chat component

**Sandbox vs production:**
- Dev/preview: keys from `sandbox.whop.com/dashboard/developer`, `WHOP_API_BASE=https://sandbox-api.whop.com`
- Production: keys from `whop.com/dashboard/developer`, `WHOP_API_BASE=https://api.whop.com`
- Test cards (sandbox): `4242 4242 4242 4242` (success), `4000 0000 0000 0002` (decline)

## Environment validation — `src/lib/env.ts`

```typescript
import { z } from "zod";

const envSchema = z.object({
  WHOP_API_KEY: z.string().trim().min(1),
  WHOP_APP_ID: z.string().trim().min(1),
  WHOP_CLIENT_ID: z.string().trim().min(1),
  WHOP_CLIENT_SECRET: z.string().trim().min(1),
  WHOP_WEBHOOK_SECRET: z.string().trim().min(1),
  WHOP_COMPANY_ID: z.string().trim().min(1),
  WHOP_API_BASE: z.string().trim().url().default("https://api.whop.com"),
  DATABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().trim().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().trim().min(1),
  NEXT_PUBLIC_APP_URL: z.string().trim().url(),
  SESSION_SECRET: z.string().trim().min(32),
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(1),
  PLATFORM_FEE_PERCENT: z.coerce.number().default(9.5),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | undefined;

export const env: Env = new Proxy({} as Env, {
  get(_, prop: string) {
    if (!_env) {
      _env = envSchema.parse(process.env);
    }
    return _env[prop as keyof Env];
  },
});
```

> Uses lazy Proxy initialization so `next build` doesn't crash when env vars aren't set.

## Whop SDK initialization — `src/lib/whop.ts`

```typescript
import { Whop } from "@whop/sdk";
import { env } from "@/lib/env";

let _whopsdk: Whop | undefined;

export function getWhopSDK(): Whop {
  if (!_whopsdk) {
    _whopsdk = new Whop({
      appID: env.WHOP_APP_ID,
      apiKey: env.WHOP_API_KEY,
      webhookKey: btoa(env.WHOP_WEBHOOK_SECRET),
      baseURL: `${env.WHOP_API_BASE}/api/v1`,
    });
  }
  return _whopsdk;
}

export const whopsdk = new Proxy({} as Whop, {
  get(_, prop) {
    const sdk = getWhopSDK();
    const value = sdk[prop as keyof Whop];
    if (typeof value === "function") {
      return value.bind(sdk);
    }
    return value;
  },
});
```

> `baseURL` is built from `WHOP_API_BASE` — the same env var controlling sandbox vs production for OAuth. SDK package: `@whop/sdk@^0.0.27`.

## Data model (Prisma schema)

Schema at `prisma/schema.prisma`. Install: `npm install @prisma/client && npm install -D prisma && npx prisma init`. Push: `npx prisma db push`.

**Models:**
- **User** — `whopId` (unique), email, username, role (USER/SELLER/ADMIN), `whopAccessToken`, `whopRefreshToken`, `connectedAccountId` (for sellers)
- **Product** — name, brand, sku (unique), description, images[], category, retailPrice, releaseDate
- **ProductSize** — productId, size, cached stats: `lowestAsk`, `highestBid`, `lastSalePrice`, `salesCount`. Each size is its own independent market. `@@unique([productId, size])`
- **Bid** — userId, productSizeId, price, status (ACTIVE/MATCHED/CANCELLED/EXPIRED), expiresAt. `@@index([productSizeId, status])`
- **Ask** — same structure as Bid for the sell side
- **Trade** — buyerId, sellerId, productSizeId, bidId (unique), askId (unique), price, platformFee, `chatChannelId`, status (MATCHED > PAYMENT_PENDING > PAID > SHIPPED > AUTHENTICATING > VERIFIED > DELIVERED | FAILED > REFUNDED)
- **Payment** — tradeId (unique), `whopPaymentId` (unique), amount, platformFee, status (PENDING/SUCCEEDED/FAILED/REFUNDED), `idempotencyKey` (unique)
- **Notification** — userId, type (BID_MATCHED/ASK_MATCHED/TRADE_COMPLETED/etc.), title, message, read, metadata (JSON)

**Key design decisions:** Separate Bid/Ask tables (cleaner matching queries). ProductSize caches aggregate stats (avoids recomputing on every page load). Payment is separate from Trade (a trade can have multiple payment events). Trades reference both the bid and ask for a clear audit trail.

## Prisma client singleton — `src/lib/prisma.ts`

Standard PrismaClient singleton with `connection_limit=1` appended to `DATABASE_URL` (prevents exhausting Supabase's session pooler limit on Vercel serverless).

## Whop OAuth — Login route

`src/app/api/auth/login/route.ts` — Redirects user to Whop authorization with PKCE challenge. Uses `env.WHOP_API_BASE` for sandbox/production switching. ([OAuth docs](https://docs.whop.com/developer/guides/oauth))

```typescript
import { NextResponse } from "next/server";
import { env } from "@/lib/env";

function base64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET() {
  const codeVerifierBytes = new Uint8Array(32);
  crypto.getRandomValues(codeVerifierBytes);
  const codeVerifier = base64url(codeVerifierBytes.buffer);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier)
  );
  const codeChallenge = base64url(digest);

  const stateBytes = new Uint8Array(16);
  crypto.getRandomValues(stateBytes);
  const state = Array.from(stateBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const nonceBytes = new Uint8Array(16);
  crypto.getRandomValues(nonceBytes);
  const nonce = Array.from(nonceBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

  const authUrl = new URL(`${env.WHOP_API_BASE}/oauth/authorize`);
  authUrl.searchParams.set("client_id", env.WHOP_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);

  const cookieValue = JSON.stringify({ codeVerifier, state });

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("oauth_pkce", cookieValue, {
    httpOnly: true,
    secure: env.NEXT_PUBLIC_APP_URL.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return response;
}
```

## Whop OAuth — Callback route

`src/app/api/auth/callback/route.ts` — Exchanges authorization code for tokens, fetches user profile from Whop, upserts user in DB, creates iron-session.

```typescript
import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { type SessionData, sessionOptions } from "@/lib/auth";
import { env } from "@/lib/env";

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

interface UserInfoResponse {
  sub: string;
  email?: string;
  email_verified?: boolean;
  preferred_username?: string;
  name?: string;
  picture?: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  if (!code || !state) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=missing_params`);
  }

  const pkceCookie = request.cookies.get("oauth_pkce");
  if (!pkceCookie?.value) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=missing_pkce`);
  }

  let storedState: string;
  let codeVerifier: string;
  try {
    const parsed = JSON.parse(pkceCookie.value) as { state: string; codeVerifier: string };
    storedState = parsed.state;
    codeVerifier = parsed.codeVerifier;
  } catch {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=invalid_pkce`);
  }

  if (state !== storedState) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=state_mismatch`);
  }

  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

  // Exchange authorization code for tokens
  const tokenRes = await fetch(`${env.WHOP_API_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: env.WHOP_CLIENT_ID,
      client_secret: env.WHOP_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    const errBody = await tokenRes.text().catch(() => "no body");
    console.error("Token exchange failed:", tokenRes.status, errBody);
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=token_exchange_failed`);
  }

  const tokenData = (await tokenRes.json()) as TokenResponse;

  // Fetch user profile
  const userInfoRes = await fetch(`${env.WHOP_API_BASE}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/?error=userinfo_failed`);
  }

  const userInfo = (await userInfoRes.json()) as UserInfoResponse;

  // Upsert user in database
  const user = await prisma.user.upsert({
    where: { whopId: userInfo.sub },
    update: {
      email: userInfo.email ?? undefined,
      username: userInfo.preferred_username ?? undefined,
      displayName: userInfo.name ?? undefined,
      avatarUrl: userInfo.picture ?? undefined,
      whopAccessToken: tokenData.access_token,
      whopRefreshToken: tokenData.refresh_token,
    },
    create: {
      whopId: userInfo.sub,
      email: userInfo.email ?? "",
      username: userInfo.preferred_username ?? userInfo.sub,
      displayName: userInfo.name,
      avatarUrl: userInfo.picture,
      whopAccessToken: tokenData.access_token,
      whopRefreshToken: tokenData.refresh_token,
    },
  });

  // Create session
  const cookieStore = await cookies();
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions);
  session.userId = user.id;
  session.whopId = user.whopId;
  session.accessToken = tokenData.access_token;
  await session.save();

  const response = NextResponse.redirect(env.NEXT_PUBLIC_APP_URL);
  response.cookies.delete("oauth_pkce");
  return response;
}
```

## Session management — `src/lib/auth.ts`

Uses `iron-session` for encrypted cookie sessions (`stockx_session`, 7-day expiry). `getCurrentUser()` reads the session and fetches the user from DB. `requireAuth()` throws 401 if no session exists.

```typescript
import { getIronSession, type SessionOptions } from "iron-session";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import type { User } from "@prisma/client";

export interface SessionData {
  userId: string;
  whopId: string;
  accessToken: string;
}

export const sessionOptions: SessionOptions = {
  cookieName: "stockx_session",
  password: process.env.SESSION_SECRET!,
  cookieOptions: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    maxAge: 60 * 60 * 24 * 7,
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUser(): Promise<User | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return prisma.user.findUnique({ where: { id: session.userId } });
}

export async function requireAuth(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}
```

## Dependencies for Part 1

```bash
npm install zod iron-session @prisma/client @whop/sdk
npm install -D prisma
```

**Next**: Part 2 covers the matching engine, payments, escrow, webhooks, and product pages.
