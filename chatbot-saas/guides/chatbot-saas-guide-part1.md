# ChatForge: AI Chatbot SaaS — Part 1: Foundation

Build a multi-bot AI chatbot SaaS with authentication, payments, tiered subscriptions, and a custom bot builder. Users sign in via Whop OAuth, chat with Claude or GPT models, upgrade through Whop Payments, and create their own bots.

> This is file 1 of 2. This file covers architecture + project setup + authentication + data models. File 2 covers chat, payments, custom bots, and production deploy.

---


## Tech Stack

- **Next.js 16** (App Router) — server components, API routes, Vercel deployment
- **Whop OAuth 2.1 + PKCE** — authentication (no registration forms, no password resets)
- **Whop Payments Network** — checkout links, subscription plans, membership webhooks
- **Neon (PostgreSQL)** — serverless Postgres via Vercel integration, PgBouncer pooling
- **Prisma 7** — type-safe ORM, generates client to `src/generated/prisma` (not node_modules)
- **Anthropic Claude + OpenAI GPT + Vercel AI SDK** — multi-model streaming chat
- **Zod** — runtime validation (env vars, API inputs, form data)
- **iron-session** — encrypted cookie sessions, fully stateless
- **Vercel** — hosting with `vercel.ts` config

## Routes

| Route | Description |
|-------|-------------|
| `/` | Redirects to `/chat` |
| `/chat` | New chat — bot selector, conversation sidebar, streaming chat |
| `/chat/[conversationId]` | Resume existing conversation |
| `/admin/bots` | Create/manage system bots, assign plans |
| `/admin/plans` | Create/manage paid plans via Whop API |
| `/bots/new` | Create custom bot (requires plan with `allowCustomBots`) |
| `/bots/[botId]/edit` | Edit custom bot prompt and knowledge |

## Data Model (Prisma Schema)

This is the final schema. Parts 1-6 build it incrementally (Part 1: User only, Part 2: all 7 models).

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
  email       String?
  name        String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  membership    Membership?
  bots          Bot[]
  conversations Conversation[]
}

model Plan {
  id              String   @id @default(cuid())
  name            String
  price           Int      // cents per month
  whopProductId   String   @unique
  whopPlanId      String   @unique
  checkoutUrl     String
  allowCustomBots Boolean  @default(false)
  isActive        Boolean  @default(true)
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  bots        Bot[]
  memberships Membership[]
}

enum MembershipStatus {
  ACTIVE
  CANCELLED
  PAST_DUE
}

model Membership {
  id                 String           @id @default(cuid())
  userId             String           @unique
  user               User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  planId             String?
  plan               Plan?            @relation(fields: [planId], references: [id])
  whopMembershipId   String?          @unique
  status             MembershipStatus @default(ACTIVE)
  periodStart        DateTime?
  periodEnd          DateTime?
  lastWebhookEventId String?
  createdAt          DateTime         @default(now())
  updatedAt          DateTime         @updatedAt
}

enum BotType {
  SYSTEM  // curated bots created by admin
  USER    // private bots created by subscribers
  MODEL   // raw LLM access (Claude, GPT) — always requires paid plan
}

model Bot {
  id           String   @id @default(cuid())
  name         String
  description  String
  avatarUrl    String?
  systemPrompt String
  knowledge    String?  // plain text, appended to system prompt
  model        String?  // e.g. "claude-haiku-4-5-20251001", "gpt-4o-mini"
  type         BotType  @default(SYSTEM)
  planId       String?  // null = free, set = requires this plan
  plan         Plan?    @relation(fields: [planId], references: [id])
  createdById  String?  // null for SYSTEM/MODEL, set for USER
  createdBy    User?    @relation(fields: [createdById], references: [id], onDelete: Cascade)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  conversations Conversation[]
}

model Conversation {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  botId     String
  bot       Bot      @relation(fields: [botId], references: [id], onDelete: Cascade)
  title     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages Message[]
}

enum Role {
  USER
  ASSISTANT
}

model Message {
  id             String       @id @default(cuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role           Role
  content        String
  tokenCount     Int          @default(0)
  createdAt      DateTime     @default(now())
}

model WebhookEvent {
  id        String   @id // Whop event ID — primary key for idempotency
  createdAt DateTime @default(now())
}
```

## Access Rules

| Feature | Free (no plan) | Paid plan |
|---------|---------------|-----------|
| System bots | Bots with no plan assigned | Bots at or below plan's price |
| Model bots (raw Claude/GPT) | No | Yes (any paid plan) |
| Messages per day | 20 | 50 |
| Conversation history | Last 10 | Unlimited |
| Custom bots | No | Only if plan has `allowCustomBots` |

**Price hierarchy:** A $19/month subscriber can access $9 and $19 bots but not $29 ones. MODEL bots require any paid plan (no price comparison). USER bots are private to their creator.

## Payment Flow

1. Admin creates a plan in `/admin/plans` — server calls `whop.products.create()` + `whop.plans.create()` to provision on Whop
2. User clicks "Upgrade" in the sidebar settings popover
3. App redirects to Whop's hosted checkout page (URL stored in Plan.checkoutUrl)
4. User completes payment on Whop
5. Whop fires `membership.activated` webhook to `/api/webhooks/whop`
6. Handler looks up Plan by `whopProductId`, upserts Membership as ACTIVE
7. Cancellations arrive as `membership.deactivated` — handler sets status to CANCELLED

## Environment Variables (Final)

| Variable | Source | Description |
|----------|--------|-------------|
| `DATABASE_URL` | Neon via Vercel | Pooled connection (PgBouncer) |
| `DATABASE_URL_UNPOOLED` | Neon via Vercel | Direct connection for Prisma CLI |
| `WHOP_APP_ID` | Whop dashboard | Starts with `app_` |
| `WHOP_API_KEY` | Whop dashboard | App API key, starts with `apik_` |
| `WHOP_COMPANY_ID` | Whop dashboard URL | Starts with `biz_` |
| `WHOP_CLIENT_ID` | Whop OAuth tab | OAuth client identifier |
| `WHOP_CLIENT_SECRET` | Whop OAuth tab | OAuth client secret |
| `WHOP_COMPANY_API_KEY` | Whop Business Settings > API Keys | Company-level key for product/plan creation (added Part 4) |
| `SESSION_SECRET` | Generated (`openssl rand -base64 32`) | At least 32 chars for iron-session |
| `NEXT_PUBLIC_APP_URL` | Set manually | Production Vercel URL; `http://localhost:3000` locally |
| `ANTHROPIC_API_KEY` | console.anthropic.com | Claude API key (added Part 3) |
| `OPENAI_API_KEY` | platform.openai.com | GPT API key (added Part 3) |
| `WHOP_WEBHOOK_SECRET` | Whop webhook settings | Starts with `ws_` (added Part 4) |
| `WHOP_SANDBOX` | Set manually | `true` during development, remove for production |

## Configurable Constants

Defined in `src/lib/membership.ts` — adjust to match your business model:

| Constant | Default | Purpose |
|----------|---------|---------|
| `FREE_DAILY_LIMIT` | 20 | Messages per day for free users |
| `PAID_DAILY_LIMIT` | 50 | Messages per day for paid users |
| `FREE_CONVERSATION_LIMIT` | 10 | Max conversations for free users |
| `USER_BOT_LIMIT` | 2 | Max custom bots per user |
| `MAX_KNOWLEDGE_LENGTH` | 50,000 | Max characters in bot knowledge field |
| `MAX_OUTPUT_TOKENS` | 1,024 | Max tokens per LLM response (in route.ts) |

## File Tree

```
chatforge/
  prisma/
    schema.prisma
    seed.ts                         # optional: seeds system + model bots
  src/
    middleware.ts                    # route protection, publicPaths
    lib/
      env.ts                        # Zod validation + lazy Proxy
      prisma.ts                     # PrismaPg singleton
      session.ts                    # iron-session config
      whop.ts                       # Whop SDK (app + company clients), OAuth config, PKCE
      auth.ts                       # requireAuth(), isAuthenticated()
      admin.ts                      # isAdmin() via whop.users.checkAccess()
      ai.ts                         # SUPPORTED_MODELS, getModel()
      membership.ts                 # getUserPlan(), canAccessBot(), limits
      rate-limit.ts                 # in-memory rate limiter for auth routes
    app/
      layout.tsx                    # root layout (Geist fonts, dark mode)
      page.tsx                      # redirect("/chat")
      sign-in/page.tsx              # sign-in card with Whop button
      error.tsx                     # error boundary with reset
      not-found.tsx                 # 404 page
      checkout-action.ts            # server action for Whop checkout redirect
      api/
        auth/login/route.ts         # PKCE + OAuth redirect to Whop
        auth/callback/route.ts      # token exchange, user upsert, session set
        auth/logout/route.ts        # session destroy
        chat/route.ts               # POST: auth, access check, streamText, persist
        webhooks/whop/route.ts      # webhook verification, membership sync
      admin/
        bots/actions.ts             # createBot, updateBotPrompt, deleteBot
        bots/page.tsx               # bot management UI
        plans/actions.ts            # createPlan (Whop API), togglePlanActive, deletePlan
        plans/page.tsx              # plan management UI
      bots/
        actions.ts                  # user bot CRUD with Zod validation
        page.tsx                    # user's custom bots list
        new/page.tsx                # bot creation form
        [botId]/edit/page.tsx       # bot edit form
      chat/
        layout.tsx                  # fetches user plan, conversations, sidebar props
        page.tsx                    # new chat (bot selector, smart default)
        loading.tsx                 # loading spinner
        actions.ts                  # renameConversation, deleteConversation
        [conversationId]/page.tsx   # resume conversation
        _components/
          chat-area.tsx             # main chat UI (bot dropdown, messages, input)
          sidebar.tsx               # conversation list, settings popover
          chat-shell.tsx            # mobile sidebar toggle context
          sign-in-modal.tsx         # modal for unauthenticated users
  vercel.ts                         # build command, security headers
  next.config.ts                    # remote image patterns
```

## Why Whop

Whop solves two of the three hard problems in a chatbot SaaS: **payments** (Whop Payments Network — checkout, subscriptions, webhooks) and **authentication** (Whop OAuth — sign-in, identity, no credential storage). The third problem, the AI chat itself, uses Anthropic + OpenAI via the Vercel AI SDK.

---

> Files created: all `src/lib/` files, auth routes, sign-in page, layout, middleware, Prisma setup, Vercel config.

## Scaffold

```bash
npx create-next-app@latest chatforge --typescript --tailwind --eslint --app --src-dir --use-npm
```

Install all dependencies upfront (includes packages used in later parts):

```bash
npm install @whop/sdk @ai-sdk/anthropic @ai-sdk/openai @ai-sdk/react ai @prisma/client @prisma/adapter-pg zod iron-session lucide-react react-markdown
npm install -D prisma dotenv
```

## Deploy to Vercel

Push to GitHub, connect to Vercel. Set `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app` in Vercel env vars.

## Neon Database

Add the Neon integration from Vercel's marketplace. It auto-populates `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) as env vars.

## Whop App Setup

Use **Whop Sandbox** (`sandbox.whop.com`) for development — no real money moves.

1. Go to `sandbox.whop.com`, create a whop
2. Go to Developer page (bottom left) > **Create app**
3. From the app details page, extract:
   - **App ID** (App details tab) → `WHOP_APP_ID`
   - **API Key** (App details tab) → `WHOP_API_KEY`
   - **Client ID** (OAuth tab) → `WHOP_CLIENT_ID`
   - **Client Secret** (OAuth tab) → `WHOP_CLIENT_SECRET`
4. Copy **Company ID** from your whop dashboard URL (starts with `biz_`) → `WHOP_COMPANY_ID`
5. In the OAuth tab, add redirect URIs:
   - `http://localhost:3000/api/auth/callback`
   - `https://your-app.vercel.app/api/auth/callback`

## Environment Variables

Add all variables to Vercel first, then pull locally:

```bash
vercel link
vercel env pull .env.local
```

Add locally in `.env.local` (not on Vercel):

```
WHOP_SANDBOX=true
```

Override `NEXT_PUBLIC_APP_URL` locally:

```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Part 1 env vars: `WHOP_APP_ID`, `WHOP_API_KEY`, `WHOP_COMPANY_ID`, `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`, `WHOP_SANDBOX`. Parts 3-4 add AI keys, webhook secret, and company API key (see the architecture section above for full list).

## Environment Validation

`src/lib/env.ts` — Zod validates env vars lazily via Proxy (not at build time). This is the Part 1 version; see intro for final version with all vars added in Parts 3-4.

```ts
// src/lib/env.ts
import { z } from "zod";

const envSchema = z.object({
  WHOP_APP_ID: z.string().startsWith("app_"),
  WHOP_API_KEY: z.string().startsWith("apik_"),
  WHOP_COMPANY_ID: z.string().startsWith("biz_"),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  DATABASE_URL: z.string().url(),
  DATABASE_URL_UNPOOLED: z.string().url(),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  WHOP_SANDBOX: z.string().optional(),
});

let _env: z.infer<typeof envSchema> | null = null;

export function getEnv() {
  if (!_env) {
    _env = envSchema.parse(process.env);
  }
  return _env;
}

export const env = new Proxy({} as z.infer<typeof envSchema>, {
  get(_target, prop: string) {
    return getEnv()[prop as keyof z.infer<typeof envSchema>];
  },
});
```

## Prisma Setup

Schema is in the architecture section above. Part 1 starts with only the `User` model — add remaining models in Part 2.

```ts
// prisma.config.ts — uses unpooled URL for CLI operations (migrations, push)
import { config } from "dotenv";
config({ path: ".env.local" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL_UNPOOLED"],
  },
});
```

```ts
// src/lib/prisma.ts — singleton with PrismaPg adapter, uses pooled URL at runtime
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query"] : [],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Generate the client and push schema:

```bash
npx prisma generate
npx prisma db push
```

## Session Configuration

```ts
// src/lib/session.ts
import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  whopUserId?: string;
  accessToken?: string;
  codeVerifier?: string;
  oauthState?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "chatforge_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}
```

## Whop SDK and OAuth Configuration

Two SDK clients: `getWhop()` (app key, used for most operations) and `getCompanyWhop()` (company key, added in Part 4 for product/plan creation). Sandbox-aware URL routing. PKCE generation for OAuth.

```ts
// src/lib/whop.ts
import Whop from "@whop/sdk";

let _whop: Whop | null = null;
export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      appID: process.env.WHOP_APP_ID!,
      apiKey: process.env.WHOP_API_KEY!,
      webhookKey: Buffer.from(process.env.WHOP_WEBHOOK_SECRET || "").toString("base64"),
      ...(process.env.WHOP_SANDBOX === "true" && {
        baseURL: "https://sandbox-api.whop.com/api/v1",
      }),
    });
  }
  return _whop;
}

// Added in Part 4 — company API key client for higher-permission operations
let _companyWhop: Whop | null = null;
export function getCompanyWhop(): Whop {
  if (!_companyWhop) {
    _companyWhop = new Whop({
      apiKey: process.env.WHOP_COMPANY_API_KEY!,
      ...(process.env.WHOP_SANDBOX === "true" && {
        baseURL: "https://sandbox-api.whop.com/api/v1",
      }),
    });
  }
  return _companyWhop;
}

const isSandbox = () => process.env.WHOP_SANDBOX === "true";
const whopApiDomain = () =>
  isSandbox() ? "sandbox-api.whop.com" : "api.whop.com";

export const WHOP_OAUTH = {
  get authorizationUrl() {
    return `https://${whopApiDomain()}/oauth/authorize`;
  },
  get tokenUrl() {
    return `https://${whopApiDomain()}/oauth/token`;
  },
  get userInfoUrl() {
    return `https://${whopApiDomain()}/oauth/userinfo`;
  },
  get clientId() {
    return process.env.WHOP_CLIENT_ID!;
  },
  get clientSecret() {
    return process.env.WHOP_CLIENT_SECRET!;
  },
  scopes: ["openid", "profile", "email"],
  get redirectUri() {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
  },
};

export async function generatePKCE() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const verifier = base64UrlEncode(array);

  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const challenge = base64UrlEncode(new Uint8Array(digest));

  return { verifier, challenge };
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (const byte of buffer) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
```

## Rate Limiter

```ts
// src/lib/rate-limit.ts
import { NextResponse } from "next/server";

interface RateLimitConfig {
  interval: number;
  maxRequests: number;
}

const rateLimitMap = new Map<string, { count: number; lastReset: number }>();

export function rateLimit(
  key: string,
  config: RateLimitConfig = { interval: 60_000, maxRequests: 30 }
): NextResponse | null {
  const now = Date.now();
  const entry = rateLimitMap.get(key);

  if (!entry || now - entry.lastReset > config.interval) {
    rateLimitMap.set(key, { count: 1, lastReset: now });
    return null;
  }

  if (entry.count >= config.maxRequests) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      {
        status: 429,
        headers: {
          "Retry-After": String(
            Math.ceil((config.interval - (now - entry.lastReset)) / 1000)
          ),
        },
      }
    );
  }

  entry.count++;
  return null;
}

// Cleanup stale entries every 5 minutes to prevent memory leaks
if (typeof globalThis !== "undefined") {
  const CLEANUP_INTERVAL = 5 * 60 * 1000;
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap.entries()) {
      if (now - entry.lastReset > 10 * 60 * 1000) {
        rateLimitMap.delete(key);
      }
    }
  }, CLEANUP_INTERVAL).unref?.();
}
```

Note: In-memory storage resets on serverless cold starts. For production, consider Redis-backed rate limiting.

## Login Route

```ts
// src/app/api/auth/login/route.ts
import { NextResponse, NextRequest } from "next/server";
import { getSession } from "@/lib/session";
import { WHOP_OAUTH, generatePKCE } from "@/lib/whop";
import { rateLimit } from "@/lib/rate-limit";
import { headers } from "next/headers";

export async function GET(request: NextRequest) {
  const headersList = await headers();
  const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

  const limited = rateLimit(`auth:login:${ip}`, {
    interval: 60_000,
    maxRequests: 10,
  });
  if (limited) return limited;

  const { verifier, challenge } = await generatePKCE();

  const nonceArray = new Uint8Array(16);
  crypto.getRandomValues(nonceArray);
  const nonce = Array.from(nonceArray, (b) => b.toString(16).padStart(2, "0")).join("");

  const stateArray = new Uint8Array(16);
  crypto.getRandomValues(stateArray);
  const state = Array.from(stateArray, (b) => b.toString(16).padStart(2, "0")).join("");

  const session = await getSession();
  session.codeVerifier = verifier;
  session.oauthState = state;
  await session.save();

  const params = new URLSearchParams({
    client_id: WHOP_OAUTH.clientId,
    redirect_uri: WHOP_OAUTH.redirectUri,
    response_type: "code",
    scope: WHOP_OAUTH.scopes.join(" "),
    code_challenge: challenge,
    code_challenge_method: "S256",
    state,
    nonce,
  });

  return NextResponse.redirect(
    `${WHOP_OAUTH.authorizationUrl}?${params.toString()}`
  );
}
```

## Callback Route

```ts
// src/app/api/auth/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { WHOP_OAUTH } from "@/lib/whop";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const session = await getSession();

  // Clear PKCE and state early so they can't be reused on error
  const codeVerifier = session.codeVerifier;
  const savedState = session.oauthState;
  delete session.codeVerifier;
  delete session.oauthState;
  await session.save();

  try {
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");

    if (!code) {
      return NextResponse.redirect(new URL("/sign-in?error=missing_code", request.url));
    }
    if (!codeVerifier) {
      return NextResponse.redirect(new URL("/sign-in?error=missing_verifier", request.url));
    }
    if (!savedState || savedState !== state) {
      return NextResponse.redirect(new URL("/sign-in?error=invalid_state", request.url));
    }

    // Exchange authorization code for access token
    const tokenResponse = await fetch(WHOP_OAUTH.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "authorization_code",
        code,
        redirect_uri: WHOP_OAUTH.redirectUri,
        client_id: WHOP_OAUTH.clientId,
        client_secret: WHOP_OAUTH.clientSecret,
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenResponse.status);
      return NextResponse.redirect(new URL("/sign-in?error=token_exchange", request.url));
    }

    const tokenData = await tokenResponse.json();
    const accessToken: string = tokenData.access_token;

    // Fetch user info — Whop's /oauth/userinfo returns OIDC fields: sub, name, preferred_username, picture, email
    const userInfoResponse = await fetch(WHOP_OAUTH.userInfoUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!userInfoResponse.ok) {
      return NextResponse.redirect(new URL("/sign-in?error=userinfo", request.url));
    }

    const userInfo = await userInfoResponse.json();

    const avatarUrl =
      typeof userInfo.picture === "string" && userInfo.picture.startsWith("https://")
        ? userInfo.picture
        : null;
    const name =
      typeof userInfo.name === "string" ? userInfo.name.slice(0, 100) : null;

    // Upsert user — whopUserId (sub) is the unique key
    const user = await prisma.user.upsert({
      where: { whopUserId: userInfo.sub },
      update: { email: userInfo.email ?? null, name, avatarUrl },
      create: { whopUserId: userInfo.sub, email: userInfo.email ?? null, name, avatarUrl },
    });

    session.userId = user.id;
    session.whopUserId = user.whopUserId;
    session.accessToken = accessToken;
    await session.save();

    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("OAuth callback error:", error);
    return NextResponse.redirect(new URL("/sign-in?error=unknown", request.url));
  }
}
```

## Logout Route

`src/app/api/auth/logout/route.ts` — GET handler that calls `session.destroy()` then redirects to `/sign-in`.

## Auth Helpers

```ts
// src/lib/auth.ts
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";

export async function requireAuth(
  options?: { redirect?: boolean }
): Promise<{
  id: string;
  whopUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
} | null> {
  const session = await getSession();

  if (!session.userId) {
    if (options?.redirect === false) return null;
    redirect("/sign-in");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    session.destroy();
    if (options?.redirect === false) return null;
    redirect("/sign-in");
  }

  return user;
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.userId;
}
```

## Middleware

```ts
// src/middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Part 6 adds "/chat" to publicPaths for unauthenticated browsing
const publicPaths = ["/sign-in", "/api/auth/", "/api/webhooks/", "/chat"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (publicPaths.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const session = request.cookies.get("chatforge_session");
  if (!session) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
```

## UI Pages

Build these standard Next.js pages (no Whop-specific code):

- **`src/app/sign-in/page.tsx`**: Dark-themed centered card with app logo/name, tagline "Your AI chat, your rules", and a "Sign in with Whop" button that links to `/api/auth/login`.
- **`src/app/page.tsx`**: Temporary welcome page showing user avatar, name, and logout button. Replaced in Part 3 with `redirect("/chat")`.
- **`src/app/layout.tsx`**: Root layout with Geist Sans + Geist Mono fonts, dark background (`bg-zinc-950 text-zinc-100`), metadata (title: "ChatForge", description: "Multi-bot AI chat platform").

## Vercel Configuration

```ts
// vercel.ts — Vercel build config (TypeScript export, not vercel.json)
const config = {
  framework: "nextjs" as const,
  buildCommand: "prisma generate && next build",
  regions: ["iad1"],
  headers: [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        {
          key: "Content-Security-Policy",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' https://*.whop.com https://ui-avatars.com data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'",
        },
      ],
    },
  ],
};

export default config;
```

`next.config.ts`: Allow remote images from `*.whop.com` (user avatars) via `images.remotePatterns`.

## Checkpoint

1. Run `npm run dev`, visit `http://localhost:3000` — should see the sign-in page
2. Click "Sign in with Whop" — redirects to Whop's sandbox OAuth page
3. Authorize the app — redirects back to the home page with your avatar and name
4. Check the database — a User row exists with your `whopUserId`
5. Check browser cookies — `chatforge_session` cookie is present (encrypted, httpOnly)
6. Click "Sign out" — redirects to sign-in, session cookie cleared

---

> Files modified: `prisma/schema.prisma`

## Schema

The full Prisma schema is in the architecture section above. Part 1 started with only the `User` model. Now add all 7 models: User, Plan, Membership, Bot, Conversation, Message, WebhookEvent.

Key design decisions:
- **No membership = free user** — `getUserPlan()` returns null
- **Bot access via planId** — null planId = free for everyone, set planId = requires that plan
- **WebhookEvent** prevents duplicate webhook processing (Whop event ID is the primary key)
- **BotType enum**: SYSTEM (admin-created), USER (subscriber-created, private), MODEL (raw LLM access, requires any paid plan)
- **Bot.model** is nullable — null falls back to Claude Haiku 4.5 via `getModel()` in Part 3

Push the updated schema:

```bash
npx prisma db push
```

## Admin Access

Admin detection uses `whop.users.checkAccess()` to check team permissions. The app must be **installed** on the company first.

Install URL: `https://sandbox.whop.com/apps/{YOUR_APP_ID}/install`

```ts
// src/lib/admin.ts
import { getSession } from "./session";
import { getWhop } from "./whop";

export async function isAdmin(): Promise<boolean> {
  const session = await getSession();
  if (!session.whopUserId) return false;

  try {
    const whop = getWhop();
    const access = await whop.users.checkAccess(
      process.env.WHOP_COMPANY_ID!,
      { id: session.whopUserId }
    );
    return access.access_level === "admin";
  } catch {
    return false;
  }
}
```

## Bot Management Server Actions

```ts
// src/app/admin/bots/actions.ts
"use server";

import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function createBot(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const name = (formData.get("name") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const systemPrompt = (formData.get("systemPrompt") as string)?.trim();
  const knowledge = (formData.get("knowledge") as string)?.trim() || null;
  const planId = (formData.get("planId") as string)?.trim() || null;
  const model = (formData.get("model") as string)?.trim() || null;

  if (!name || !description || !systemPrompt) {
    throw new Error("Name, description, and system prompt are required.");
  }

  await prisma.bot.create({
    data: { name, description, systemPrompt, knowledge, planId, model, type: "SYSTEM" },
  });

  redirect("/admin/bots");
}

export async function updateBotPrompt(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const botId = formData.get("botId") as string;
  const systemPrompt = (formData.get("systemPrompt") as string)?.trim();
  const model = (formData.get("model") as string)?.trim() || null;

  if (!botId || !systemPrompt) {
    throw new Error("Bot ID and system prompt are required.");
  }

  await prisma.bot.update({
    where: { id: botId },
    data: { systemPrompt, model },
  });

  redirect("/admin/bots");
}

export async function deleteBot(formData: FormData) {
  if (!(await isAdmin())) throw new Error("Unauthorized");

  const botId = formData.get("botId") as string;
  if (!botId) throw new Error("Bot ID is required.");

  await prisma.bot.delete({ where: { id: botId } });
  redirect("/admin/bots");
}
```

## Bot Admin Page

Build `src/app/admin/bots/page.tsx` — server component:

- **Data fetching**: Fetch all bots with `type: { in: ["SYSTEM", "MODEL"] }`, include `plan` relation. Also fetch active plans for the planId selector.
- **Create form**: Fields — name (text), description (text), systemPrompt (textarea), knowledge (textarea, optional), model (select from `SUPPORTED_MODELS` imported from `@/lib/ai`), planId (optional select from active plans). Form action: `createBot`.
- **Bot list**: Each bot shows name, model badge (e.g., "Claude Haiku 4.5"), type badge ("Raw Model" for MODEL, plan name or "Free" for SYSTEM), and a delete button.
- **MODEL bot editing**: MODEL bots have an inline form to edit systemPrompt and model, using `updateBotPrompt` action.
- **Admin guard**: Check `isAdmin()` at the top, redirect to `/` if not admin.

Import `SUPPORTED_MODELS` from `@/lib/ai` (created in Part 3) for the model dropdown options. Until Part 3, you can hardcode the model options or skip the model selector.

## Home Page Update

Update `src/app/page.tsx` to show a "Manage bots" link if `isAdmin()` returns true. This is temporary — Part 3 replaces the home page with `redirect("/chat")`.

## Checkpoint

1. Visit `/admin/bots` as the app owner — see the empty bot list with create form
2. Create a bot with a name, description, and system prompt — it appears in the list
3. Delete the bot — it disappears
4. Visit `/admin/bots` as a non-admin user — redirected to `/`
5. Create several test bots before moving to Part 3 (the chat interface needs bots to exist)
