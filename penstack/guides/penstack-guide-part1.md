# Substack Clone with Whop Payments Network (WPN)

> **This tutorial is available in 3 parts** for easier navigation:
> - **Part 1 (this file)**: Foundation - Project overview, setup, authentication, Prisma, rate limiting (Parts 1 & 3 of the article)
> - **Part 2**: Features - Data models, writer onboarding, rich text editor, publication pages, content rendering (Parts 2-4)
> - **Part 3**: Payments & Polish - KYC, checkout, webhooks, explore page, notifications, demo mode, deployment (Parts 5-7)
>
> Use the split files if this single file is too large for your context window. Each part includes context bridges to help maintain continuity.

---

Building a platform like Substack is easier than you think thanks to the Whop Payment Network, its other infrastructure solutions (like user authentication and embedded chats), Supabase, and Vercel - which are the services we're going to use in this tutorial.
In the steps below, you'll build Penstack. A full publishing platform where writers create publications, write articles with a rich text editor (complete with a paywall break), monetize through paid subscriptions, and engage their readers through embedded chat.
You can preview the finished product [demo here](https://penstack-fresh.vercel.app/) and find the full codebase [in this GitHub repository](https://github.com/whopio/whop-tutorials/tree/main/penstack).
## Project overview
Before we dive deep into the code of the project, let's take a general look at what we're going to build. The project will have:
- A **rich text editor** with a custom paywall break node. Writers will be able to place the break wherever they want, and the server slices content at that point for non-subscribers
- **Writer onboarding** where authenticated users can become a writer, set a publication name, handle, bio, and category (from a list)
- **KYC and payment setup** via the Whop Payments Network. Writer will complete their identity verification and connect their account to receive payouts
- **Paid subscriptions with Direct Charges** where subscribers pay the writer directly. 90% goes to the writer's connected account, 10% is retained as a platform fee
- **Explore page** with a trending algorithm that surfaces popular publications and recent posts
- An **embedded Whop chat** for publication profiles where readers can chat with each other
- **Notification system** for new posts, subscribers, followers, and payment events
- **Analytics dashboard** for writers where they can see subscriber counts, post performance, and revenue
Tech stack (dropdown)
```
- **Next.js 15 (App Router)** - Server Components + API routes + Vercel deploy in one
- **Whop OAuth 2.1 + PKCE** - sign-in, tokens, identity
- **Whop Payments Network (Direct Charges)** - connected accounts, recurring billing, KYC built-in
- **Supabase (PostgreSQL via Vercel)** - cloud-only, Vercel auto-populates connection strings
- **Prisma** - type-safe queries, declarative schema, migrations
- **Zod** - runtime validation at system boundaries
- **Tiptap** - extensible ProseMirror wrapper with custom paywall break node
- **Uploadthing** - type-safe uploads
- **iron-session** - encrypted cookies, no session store, no Redis, no JWTs
- **Whop Embedded Components** - pre-built chat UI
- **Vercel** - <code>vercel.ts</code> for type-safe config
```
Pages (dropdown)
```
- <code>src/app/</code> - pages and API routes
- <code>src/components/</code> - editor, chat, dashboard, explore, post, settings, writer, and shared UI components
- <code>src/constants/</code> - app config and categories
- <code>src/hooks/</code> - custom React hooks
- <code>src/lib/</code> - auth, session, env validation, Prisma, rate limiting, Whop SDK, uploads, utilities
- <code>src/services/</code> - business logic (explore, notifications, posts, subscriptions, writers)
- <code>src/types/</code> - TypeScript type declarations
- <code>src/middleware.ts</code> - route protection
```
The payment flow (dropdown)
1. Subscribers click the "Subscribe" button
2. Our project creates a checkout session via the Whop API
3. Subscriber completes the payment with a Whop-hosted checkout
4. Whop Payments Network charges (90% to writer's connected Whop account and 10% to our platform)
5. Whop fires webhooks
6. Our project creates the subscription record and sends a notification
**Important note:** Writers must complete KYC before they can set a subscription price and start receiving payments. Until then, they can publish free content only.
## Why Whop
On a publishing platform like this, we will encounter three infrastructure problems: payment system, user authentication, and community engagement. We will solve these with the following services:
- **Whop Payments Network** will solve all payment systems for us with simple integrations and collect payments from subscribers with Direct Charge
- **Whop OAuth**'s simple "Sign in with Whop" button will allow users to easily join the project, saving us the trouble of storing passwords
- **Whop embedded chats** will be available on author profiles to enable interaction between authors and readers and keep reader communities active
## Prerequisites
Before starting, you should have:
- Working familiarity with Next.js and React (we use the App Router and Server Components)
- A Whop developer account (free to create at whop.com)
- A Vercel account (free tier)
- A Supabase account (free tier)
## Part 1: Scaffold, deploy, and authenticate
In this tutorial, we will start by laying the foundations in Vercel and then begin development, rather than transferring to Vercel after classic local development. This way, we will have the OAuth redirect URL early on and can catch any issues immediately (because Vercel will not be able to build).
### Create the project
Let's use the command below to scaffold a new Next.js app. We'll call our project "Penstack":
```bash
npx create-next-app@latest penstack --typescript --tailwind --eslint --app --src-dir --use-npm
cd penstack
```
Then, install the dependencies we'll use throughout the project:
```bash
npm install @whop/sdk @whop/embedded-components-react-js @whop/embedded-components-vanilla-js iron-session zod prisma @prisma/client @prisma/adapter-pg uploadthing @uploadthing/react @tiptap/core @tiptap/react @tiptap/starter-kit @tiptap/extension-image @tiptap/extension-placeholder @tiptap/extension-underline @tiptap/extension-link @tiptap/pm lucide-react
```
### Deploy before building
New Next.js projects will build without requiring any configuration, so you should transfer your project to a GitHub repository (use a private repo if you don't want your project to be open source) and connect it to Vercel. Then add the project's URL as an environment variable in Vercel:
```
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```
### Supabase through the Vercel integration
Now, you should add Supabase through the Vercel Integrations marketplace instead of creating a project directly in the Supabase dashboard. Vercel automatically populates `DATABASE_URL` and `DIRECT_URL` as environment variables with connection pooling pre-configured through Supavisor.
Then, pull the variables to your local development using the command below:
```bash
vercel env pull .env.local
```
This is the pattern for every environment variable in this tutorial: add to Vercel first, then `vercel env pull` to sync locally.
## Validate environment variables
Incomplete or incorrect environment variables should be presented as simple error messages, and we will use a Zod schema for this purpose. Go to `src/lib` and create a file called `env.ts` with the content:
```ts
import { z } from "zod";

const envSchema = z.object({
  WHOP_APP_ID: z.string().startsWith("app_"),
  WHOP_API_KEY: z.string().startsWith("apik_"),
  WHOP_COMPANY_ID: z.string().startsWith("biz_"),
  WHOP_WEBHOOK_SECRET: z.string().min(1),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),

  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),

  UPLOADTHING_TOKEN: z.string().min(1),

  SESSION_SECRET: z.string().min(32),

  NEXT_PUBLIC_APP_URL: z.string().url(),

  NEXT_PUBLIC_DEMO_MODE: z.string().optional(),

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

export function isDemoMode(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === "true";
}
```
## Prisma setup
Initialize Prisma and install its config dependency:

```bash
npx prisma init
npm install -D dotenv
```

Prisma 7 creates `prisma/schema.prisma` and `prisma.config.ts`. Replace the schema with a minimal User model -- just enough to store authenticated users. We'll expand it significantly in Part 2.

```prisma
// prisma/schema.prisma
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
  username    String?
  displayName String?
  avatarUrl   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```
Now, let's update the `prisma.config.ts` file in your project root with the content below:
```ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DIRECT_URL"],
  },
});
```
The `url` here is what the Prisma CLI uses for `prisma db push` and migrations. It must point at Supabase's **session mode pooler** (port 5432). The **transaction mode pooler** (port 6543) strips session-level state that schema operations depend on.

For your `.env.local`, you need two Supabase connection strings:

- `DATABASE_URL` - the **transaction mode** pooler (port 6543), used by your app for queries
- `DIRECT_URL` - the **session mode** pooler (port 5432), used by the Prisma CLI for schema operations

Both come from Supabase's connection pooler. Do **not** use the direct database connection (`db.xxx.supabase.co`) for `DIRECT_URL`.

Now, let's push the schema using the command:

```bash
npx prisma db push
```

Then create the Prisma client singleton at `src/lib` with a file called `prisma.ts` with the content below. Without the singleton pattern, Next.js hot-reloads would create a new database connection on each reload and exhaust the connection pool.

```ts
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
## Set up your Whop app
During development, we'll use the sandbox environment of Whop, which allows us to simulate payments without moving real money. Follow the steps below to create a Whop app:
1. Go to sandbox.whop.com, create a whop, and go to its dashboard
2. In the dashboard, open the Developer page and find the Apps section
3. Click the **Create your first app** button in the Apps section, give it a name, and click **Create**
4. Get the App ID, API Key, Company ID, Client ID, and Client Secret of the app
5. Go to the OAuth tab of the app and set the redirect URL to http://localhost:3000/api/auth/callback
When you're moving from development to production, you're going to have to repeat these steps **outside the sandbox**, in whop.com. We'll touch on this later at Part 7.
Next, add the line below to your `.env.local` file so that the OAuth and API calls are routed to the sandbox instead of the real environment:
```
WHOP_SANDBOX=true
```
## Whop OAuth with PKCE
In this section, we're going to take a look at authenticating users through Whop's OAuth flow with PKCE and store sessions in cookies using `iron-session`.
### Session configuration
Go to `src/lib` and create a file called `session.ts` with the content:
```ts
import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  whopUserId?: string;
  accessToken?: string;
  codeVerifier?: string;
}

const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: "penstack_session",
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
### Whop SDK and PKCE generation
Go to `src/lib` and create a file called `whop.ts` with the content:
```ts
import Whop from "@whop/sdk";

let _whop: Whop | null = null;
export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      appID: process.env.WHOP_APP_ID!,
      apiKey: process.env.WHOP_API_KEY!,
      ...(process.env.WHOP_SANDBOX === "true" && {
        baseURL: "https://sandbox-api.whop.com/api/v1",
      }),
    });
  }
  return _whop;
}

export const whop = new Proxy({} as Whop, {
  get(_target, prop, receiver) {
    return Reflect.get(getWhop(), prop, receiver);
  },
});

const isSandbox = process.env.WHOP_SANDBOX === "true";
const whopDomain = isSandbox ? "sandbox.whop.com" : "whop.com";
const whopApiDomain = isSandbox ? "sandbox-api.whop.com" : "api.whop.com";

export const WHOP_OAUTH = {
  authorizationUrl: `https://${whopApiDomain}/oauth/authorize`,
  tokenUrl: `https://${whopApiDomain}/oauth/token`,
  userInfoUrl: `https://${whopApiDomain}/oauth/userinfo`,
  clientId: process.env.WHOP_CLIENT_ID!,
  clientSecret: process.env.WHOP_CLIENT_SECRET!,
  scopes: [
    "openid",
    "profile",
    "email",
    "chat:message:create",
    "chat:read",
    "dms:read",
    "dms:message:manage",
    "dms:channel:manage",
  ],
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
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
### Rate limiting
We want each route to pass a unique key (like `auth:login` or `writers:create:{userID}`) and a limit. If the caller is under the limit, it must return `null` and the route should continue. If over, it should return a 429 response that route sends back instantly.
Let's go to `src/lib` and create a file called `rate-limit.ts` with the content:
```ts
import { NextResponse } from "next/server";

interface RateLimitConfig {
  interval: number; // ms
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
### The login route
Now, go to `src/app/api/auth/login` and create a file called `route.ts` with the content below. This will generate a PKCE challenge, store the verifier in a cookie, and redirect to Whop's user authorization page. It also accepts an optional `?returnTo=` parameter so users who click Follow or Like while logged out land back on the same page after signing in:
```ts
import { NextRequest, NextResponse } from "next/server";
import { WHOP_OAUTH, generatePKCE } from "@/lib/whop";

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function GET(request: NextRequest) {
  const returnTo = request.nextUrl.searchParams.get("returnTo");
  // Validate returnTo is a safe relative path (prevents open redirect)
  const safeReturnTo =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : null;

  const { verifier, challenge } = await generatePKCE();
  const state = randomHex(16);
  const nonce = randomHex(16);

  const authUrl = new URL(WHOP_OAUTH.authorizationUrl);
  authUrl.searchParams.set("client_id", WHOP_OAUTH.clientId);
  authUrl.searchParams.set("redirect_uri", WHOP_OAUTH.redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", WHOP_OAUTH.scopes.join(" "));
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("nonce", nonce);

  // Store PKCE data in a raw cookie on the redirect response.
  // iron-session + NextResponse.redirect() can lose cookies — this
  // pattern avoids that issue entirely.
  const cookieValue = JSON.stringify({
    codeVerifier: verifier,
    state,
    ...(safeReturnTo ? { returnTo: safeReturnTo } : {}),
  });

  const response = NextResponse.redirect(authUrl.toString());
  response.cookies.set("oauth_pkce", cookieValue, {
    httpOnly: true,
    secure: WHOP_OAUTH.redirectUri.startsWith("https"),
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10 minutes
  });

  return response;
}
```
### Callback configuration
When users log or sign up with Whop, it redirects them back with an authorization code, and we need a route that exchanges it for an access token using the PKCE verifier, fetches the user's profile, upserts them into the database, and establishes the session. If the login was triggered with a `returnTo` URL (stored in the PKCE cookie), the user is redirected back to that page instead of the home page.
To create this, go to `src/app/api/auth/callback` and create a file called `route.ts` with the content:
```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { WHOP_OAUTH } from "@/lib/whop";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    return NextResponse.json(
      { error: "Missing authorization code or state" },
      { status: 400 }
    );
  }

  const pkceCookie = request.cookies.get("oauth_pkce");
  if (!pkceCookie?.value) {
    return NextResponse.json(
      { error: "Missing PKCE cookie. Please try logging in again." },
      { status: 400 }
    );
  }

  let storedState: string;
  let codeVerifier: string;
  let returnTo: string | undefined;
  try {
    const parsed = JSON.parse(pkceCookie.value);
    storedState = parsed.state;
    codeVerifier = parsed.codeVerifier;
    returnTo = parsed.returnTo;
  } catch {
    return NextResponse.json(
      { error: "Invalid PKCE cookie." },
      { status: 400 }
    );
  }

  if (state !== storedState) {
    return NextResponse.json(
      { error: "State mismatch — possible CSRF." },
      { status: 400 }
    );
  }

  const tokenResponse = await fetch(WHOP_OAUTH.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: WHOP_OAUTH.redirectUri,
      client_id: WHOP_OAUTH.clientId,
      client_secret: WHOP_OAUTH.clientSecret,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenResponse.ok) {
    const error = await tokenResponse.text();
    console.error("Token exchange failed:", error);
    return NextResponse.json(
      {
        error: "Failed to exchange authorization code",
        detail: error,
        tokenUrl: WHOP_OAUTH.tokenUrl,
        redirectUri: WHOP_OAUTH.redirectUri,
      },
      { status: 502 }
    );
  }

  const tokenData = await tokenResponse.json();
  const accessToken: string = tokenData.access_token;

  const userInfoResponse = await fetch(WHOP_OAUTH.userInfoUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userInfoResponse.ok) {
    console.error("User info fetch failed:", await userInfoResponse.text());
    return NextResponse.json(
      { error: "Failed to fetch user info" },
      { status: 502 }
    );
  }

  const userInfo = await userInfoResponse.json();

  const user = await prisma.user.upsert({
    where: { whopUserId: userInfo.sub },
    update: {
      email: userInfo.email ?? null,
      username: userInfo.preferred_username ?? null,
      displayName: userInfo.name ?? null,
      avatarUrl: userInfo.picture ?? null,
    },
    create: {
      whopUserId: userInfo.sub,
      email: userInfo.email ?? null,
      username: userInfo.preferred_username ?? null,
      displayName: userInfo.name ?? null,
      avatarUrl: userInfo.picture ?? null,
    },
  });

  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.accessToken = accessToken;
  await session.save();

  const redirectPath =
    returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//")
      ? returnTo
      : "/";
  const response = NextResponse.redirect(new URL(redirectPath, request.url));
  response.cookies.delete("oauth_pkce");
  return response;
}
```
## Using a single authentication function
In our project, all server components and API routes need to know who the users interacting with them are. Instead of performing session and database checks everywhere, let's use a single `requireAuth` function.
Go to `src/lib` and create a file called `auth.ts` with the content:
```ts
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";

export async function requireAuth(
  options?: { redirect?: boolean }
): Promise<{
  id: string;
  whopUserId: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
} | null> {
  const session = await getSession();

  if (!session.userId) {
    if (options?.redirect === false) return null;
    redirect("/api/auth/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user) {
    session.destroy();
    if (options?.redirect === false) return null;
    redirect("/api/auth/login");
  }

  return user;
}

export async function getWriterProfile(userId: string) {
  return prisma.writer.findUnique({ where: { userId } });
}

export async function isAuthenticated(): Promise<boolean> {
  const session = await getSession();
  return !!session.userId;
}
```
### Vercel configuration
Create `vercel.ts` at the project root. The key line is `buildCommand`. It runs `prisma generate` before `next build` so the Prisma client exists when Vercel builds your app.

```ts
const config = {
  framework: "nextjs" as const,
  buildCommand: "prisma generate && next build",
  regions: ["iad1"],
  headers: [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin",
        },
      ],
    },
  ],
};

export default config;
```
### Checkpoint 1
Now that we've built the scaffolding and authentication, let's complete our first checkpoint. Deploy your changes to Vercel (push to your GitHub and Vercel should auto-build), visit your production URL and navigate to `/api/auth/login`. You should be redirected to Whop's authorization page. After granting access, you land back on the home page.
With authentication working in production, you have a solid foundation. In Part 2, we'll build out the complete data model and the writer onboarding flow.
