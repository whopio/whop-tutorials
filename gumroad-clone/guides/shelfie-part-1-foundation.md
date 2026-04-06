# How to Build a Gumroad Clone with Next.js and Whop

Building a multi-seller digital product marketplace with Next.js and Whop's infrastructure is simpler than you'd expect. While you focus on the product experience — uploading files, browsing listings, downloading purchases — Whop handles the hardest parts: payments, seller onboarding, and payouts.

In this tutorial, we're going to build a Gumroad clone (which we'll call Shelfie). A marketplace where users sign up, become sellers, upload digital products (PDFs, images, videos, templates), set their own prices, and publish to a shared storefront. Buyers browse, purchase, and instantly download what they bought. The platform takes a 5% cut of every sale.

You can preview the [demo of our project here](https://shelfie-rust.vercel.app/), and see the full [GitHub repository here](https://github.com/east-6/shelfie).

## Project overview

Before we dive deep into coding, let's take a general look at our project:

* **Multi-seller marketplace** where any user can become a seller through Whop's connected account flow
* **Product creation with file uploads** where sellers upload files via UploadThing, add descriptions, set prices, and publish when ready
* **Marketplace discovery** with search, category filters, pagination, and trending products
* **One-time purchases** where sellers set a price and buyers pay through the Whop Payments Network
* **Access-gated downloads** where buyers get instant access to files, text content, and external links after purchase
* **Cookie rating system** where buyers rate products on a 1-5 cookie scale (with half-cookie support)
* **Seller and buyer dashboards** with earnings, product management, bio editing, and purchase history

#### Tech stack

* **Next.js 16** (App Router, Turbopack). Server Components, API routes, and Vercel deployment in one framework
* **React 19.** Server Components for data fetching, Client Components for interactivity
* **Tailwind CSS v4.** CSS-first configuration with `@theme` blocks, no config file
* **Whop OAuth 2.1 + PKCE.** Sign-in and identity for both sellers and buyers
* **Whop for Platforms.** Connected accounts for seller onboarding, direct charges with application fees for payment splits
* **Neon.** Serverless Postgres via the Vercel integration. Auto-populated connection strings
* **Prisma 7.** ESM-only ORM with `@prisma/adapter-pg` for Neon compatibility. Client generated into `src/generated/prisma`
* **UploadThing.** File uploads with typed routes, auth middleware, and CDN delivery
* **Zod 4.** Runtime validation for env vars, API inputs, and form data
* **iron-session 8.** Encrypted cookie sessions. No session store, no Redis
* **Vercel.** Deployment with automatic builds from GitHub

#### Pages

**Pages:**
- `/` — Landing page (hero, search, trending products, categories, seller CTA)
- `/sign-in` — Sign-in card with Whop button
- `/products` — Browse/search products with category filter, pagination
- `/products/[slug]` — Product detail: description, file list, seller info, purchase card, cookie ratings
- `/products/[slug]/download` — Post-purchase download page (access-gated)
- `/sellers/[username]` — Seller profile: bio, stats, published products
- `/sell` — Become a seller: pitch + connect Whop account
- `/sell/kyc-return` — KYC completion handler (redirects to dashboard)
- `/sell/dashboard` — Seller dashboard: products, earnings, bio editing, payout portal
- `/sell/products/new` — Create new product form
- `/sell/products/[productId]/edit` — Edit product: info, files, thumbnail, publish/unpublish/delete
- `/dashboard` — Buyer dashboard: purchased products, download links

**API routes:**
- `/api/auth/login` — OAuth initiation (PKCE)
- `/api/auth/callback` — OAuth callback + user upsert
- `/api/auth/logout` — Session destroy
- `/api/sell/onboard` — Create connected account Company + KYC (sandbox: auto-complete)
- `/api/sell/complete-kyc` — Mark KYC as complete (called from kyc-return page)
- `/api/sell/profile` — PATCH: update seller headline and bio
- `/api/sell/products` — POST: create product
- `/api/sell/products/[productId]` — PATCH: update (with file add/remove), DELETE: remove product
- `/api/sell/products/[productId]/publish` — POST: publish product (create Whop checkout config)
- `/api/sell/products/[productId]/unpublish` — POST: revert to draft
- `/api/products/[productId]/purchase` — POST: free product purchase
- `/api/products/[productId]/like` — POST: toggle like
- `/api/products/[productId]/rate` — POST: cookie rating (0.5-5)
- `/api/uploadthing` — UploadThing file upload endpoint
- `/api/webhooks/whop` — POST: Whop payment webhooks

#### Payment flow

1. Seller clicks "Get Started" and creates a connected account through Whop's hosted KYC flow
2. Seller publishes a product. The app creates a Whop product and checkout configuration with a 5% application fee
3. Buyer clicks "Buy Now" and pays through Whop's hosted checkout
4. Whop fires a `payment.succeeded` webhook. The app creates a Purchase record
5. Seller manages payouts through Whop's dashboard

### Why we use Whop

Whop helps us solve two of the biggest problems we face building this project: the payments system, and user authentication:

* The **Whop Payments Network** provides an out-of-the-box solution for marketplace payments. It's a technology layer built on best-in-class payment rails, giving sellers access to intelligently routed transactions through Whop's partner network of leading payment processors. Sellers get their own connected accounts with automatic payment splits — no Stripe Connect setup, no manual payouts.
* **Whop OAuth** integrates a user authentication system for both sellers and buyers, allowing us to focus on development instead of authentication security, credential storage, and password reset flows.

### What you need first

Before starting, make sure you have:

* Working familiarity with Next.js and React (App Router, Server Components)
* A Whop sandbox account (free, sign up at [sandbox.whop.com](https://sandbox.whop.com/))
* A Vercel account (free tier works)
* A Neon account (free, provisioned through the Vercel integration)
* An UploadThing account (free tier, no credit card required)

---


---

## Part 1: Scaffold, Deploy, and Authenticate

Deploy-first means you get a real production URL before writing features. This avoids the "it works on localhost" trap — OAuth redirect URIs, webhook endpoints, and cookie settings all need a real domain. Vercel gives you that in under a minute.

## Scaffold

```bash
npx create-next-app@latest shelfie --ts --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"
```

Install all dependencies upfront (includes packages used in later parts):

```bash
npm install @whop/sdk @prisma/client @prisma/adapter-pg pg iron-session zod lucide-react next-themes clsx tailwind-merge dotenv uploadthing @uploadthing/react
npm install -D prisma @types/pg@8.11.11
```

Why everything up front? Fewer interruptions in later parts, and `package.json` stays stable across the series. Every package is used — nothing is aspirational.

## Deploy to Vercel

Push to GitHub, connect to Vercel. You need the production URL before configuring OAuth.

1. `git init && git add . && git commit -m "scaffold"`
2. Push to a new GitHub repo (private repos work fine — Vercel connects via GitHub OAuth and can access both public and private repos)
3. Import the repo at vercel.com/new
4. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g. `https://shelfie-xyz.vercel.app`)

The first deploy will succeed with the default Next.js starter. You'll add the real env vars and redeploy as you go.

## Neon Database

We're going to use the Neon integration on Vercel so that we don't have to locally set up Postgres, connection strings auto-populate in every Vercel environment (dev, preview, production), and preview deployments get their own database branches.

Add the Neon integration from Vercel's marketplace (Settings > Integrations > Browse Marketplace > Neon). It auto-populates `DATABASE_URL` (pooled) and `DATABASE_URL_UNPOOLED` (direct) across all environments.

Pull the env vars locally:

```bash
vercel link
vercel env pull .env.local
```

## Whop App Setup

Use **Whop Sandbox** (`sandbox.whop.com`) for development. The sandbox is a separate environment with its own accounts and data — nothing touches production.

1. Go to `sandbox.whop.com`, create a whop
2. Go to Developer page (bottom left) > **Create app**
3. From the app details page, copy:
   - **Client ID** (OAuth tab) → `WHOP_CLIENT_ID`
   - **Client Secret** (OAuth tab) → `WHOP_CLIENT_SECRET`
4. In the OAuth tab, add redirect URIs:
   - `http://localhost:3000/api/auth/callback`
   - `https://your-vercel-url.vercel.app/api/auth/callback`

For now, we only need the OAuth client ID and client secret. We'll grab the company API key and company ID later when we build seller onboarding.

## Environment Variables

Here's every variable you need for this section and where to get it:

<table>
<tr><th>Variable</th><th>Where to get it</th></tr>
<tr><td><code>DATABASE_URL</code></td><td>Auto-populated by the Neon integration</td></tr>
<tr><td><code>DATABASE_URL_UNPOOLED</code></td><td>Auto-populated by the Neon integration</td></tr>
<tr><td><code>WHOP_CLIENT_ID</code></td><td>Whop app > OAuth tab > Client ID</td></tr>
<tr><td><code>WHOP_CLIENT_SECRET</code></td><td>Whop app > OAuth tab > Client Secret</td></tr>
<tr><td><code>SESSION_SECRET</code></td><td>Generate with <code>openssl rand -base64 32</code></td></tr>
<tr><td><code>NEXT_PUBLIC_APP_URL</code></td><td>Your Vercel URL (e.g. <code>https://shelfie-xyz.vercel.app</code>)</td></tr>
</table>

Add `WHOP_CLIENT_ID`, `WHOP_CLIENT_SECRET`, `SESSION_SECRET`, and `NEXT_PUBLIC_APP_URL` to Vercel (the Neon variables are already there from the integration). Then pull everything locally:

```bash
vercel env pull .env.local
```

Then add these two to your `.env.local` only (not on Vercel — they're for local development):

```
WHOP_SANDBOX=true
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

The local `NEXT_PUBLIC_APP_URL` override points to `localhost:3000` so OAuth redirects work during development. On Vercel, it stays as your production URL.

## Global CSS (Tailwind v4)

We're going to set up a dark cream/crimson color scheme with sharp corners. You can customize the entire look by changing the color values and `--radius-*` tokens in this file.

Go to `src/app` and create a file called `globals.css` with the content:

```css
@import "tailwindcss";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  /* Cream / black / crimson palette */
  --color-background: #1A0A10;
  --color-surface: #221218;
  --color-surface-elevated: #2D1A22;
  --color-border: #3D2830;
  --color-text-primary: #F5F0E1;
  --color-text-secondary: #A89890;
  --color-accent: #B8293D;
  --color-accent-hover: #D4324A;
  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-error: #F87171;

  --font-sans: "Inter", system-ui, sans-serif;
  --font-mono: "JetBrains Mono", monospace;

  /* Sharp corners — editorial/brutalist direction */
  --radius-xs: 0px;
  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-lg: 0px;
  --radius-xl: 0px;
  --radius-2xl: 0px;
  --radius-3xl: 0px;
}

.dark {
  --color-background: #1A0A10;
  --color-surface: #221218;
  --color-surface-elevated: #2D1A22;
  --color-border: #3D2830;
  --color-text-primary: #F5F0E1;
  --color-text-secondary: #A89890;
  --color-accent: #B8293D;
  --color-accent-hover: #D4324A;
  --color-success: #4ADE80;
  --color-warning: #FBBF24;
  --color-error: #F87171;
}

/* Focus ring for keyboard navigation */
:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
}

/* Respect reduced motion preferences */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## Root Layout

We need a root layout that sets up theming, navigation, and a skip-to-content link for accessibility. `suppressHydrationWarning` on the `<html>` tag prevents a React hydration mismatch when `next-themes` adds the `class` attribute on the client.

Go to `src/app` and create a file called `layout.tsx` with the content:

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Shelfie — Sell What You Create",
  description:
    "The marketplace for digital products — templates, ebooks, design assets, and more.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} font-sans antialiased bg-background text-text-primary`}
      >
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
          >
            Skip to main content
          </a>
          <Navbar />
          <main id="main-content" className="min-h-[calc(100vh-4rem)]">{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

## Environment Validation

When an environment variable is missing, the error can be hard to track. We'll use Zod to validate them at access time — not at import time, so variables added in later sections don't crash the app before they're needed. Every file imports from `env.ts` and accesses `env.DATABASE_URL` instead of `process.env.DATABASE_URL!`.

Go to `src/lib` and create a file called `env.ts` with the content:

```ts
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DATABASE_URL_UNPOOLED: z.string().min(1),
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  WHOP_API_KEY: z.string().min(1),
  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_COMPANY_ID: z.string().min(1),
  WHOP_WEBHOOK_SECRET: z.string().min(1),
  UPLOADTHING_TOKEN: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  NEXT_PUBLIC_APP_URL: z.string().url(),
  PLATFORM_FEE_PERCENT: z.coerce.number().min(0).max(100).default(5),
  WHOP_SANDBOX: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

export const env = new Proxy({} as Env, {
  get(_, key: string) {
    const value = process.env[key];
    const field = envSchema.shape[key as keyof typeof envSchema.shape];
    if (field) return field.parse(value);
    return value;
  },
});
```

## Utility Helpers

We'll need a few utility functions throughout the app — class merging, price formatting, slug generation, and username generation.

Go to `src/lib` and create a file called `utils.ts` with the content:

```ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number): string {
  if (cents === 0) return "Free";
  return `$${(cents / 100).toFixed(2)}`;
}

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${suffix}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function generateUsername(name: string | null | undefined): string {
  const base = (name || "seller")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const suffix = Math.random().toString(36).substring(2, 6);
  return `${base}-${suffix}`;
}
```

## Prisma Setup

We need two files for Prisma: a config file that tells the CLI where to find the database, and a client singleton that our app uses at runtime.

In the project root, create a file called `prisma.config.ts` with the content:

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

Now we need a Prisma client singleton so every file reuses the same database connection instead of opening new ones on each hot reload.

Go to `src/lib` and create a file called `prisma.ts` with the content:

```ts
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { env } from "@/lib/env";

const pool = new Pool({ connectionString: env.DATABASE_URL });
const adapter = new PrismaPg(pool);

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Generate the client and push the schema:

```bash
npx prisma generate
npx prisma db push
```

`prisma db push` applies the schema directly without creating migration files. It's fast for development. When you're ready for production, switch to `prisma migrate dev` for versioned migrations.

## Session Configuration

We need to track who's logged in. We'll store session data in an encrypted browser cookie using `iron-session` — no session store, no Redis, no database table. We chose iron-session over JWT because JWTs require refresh token rotation and can't be revoked without a blocklist.

Go to `src/lib` and create a file called `session.ts` with the content:

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
  cookieName: "shelfie_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax" as const,
  },
};

export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
```

## Whop SDK and OAuth Configuration

We need a Whop SDK client that's sandbox-aware — when `WHOP_SANDBOX=true`, API calls go to `sandbox-api.whop.com` instead of production.

Go to `src/lib` and create a file called `whop.ts` with the content:

```ts
import Whop from "@whop/sdk";

const isSandbox = process.env.WHOP_SANDBOX === "true";

// App API key client — used for general operations (companies, accountLinks).
let _whop: Whop | null = null;

export function getWhop(): Whop {
  if (!_whop) {
    _whop = new Whop({
      apiKey: process.env.WHOP_API_KEY!,
      webhookKey: process.env.WHOP_WEBHOOK_SECRET
        ? Buffer.from(process.env.WHOP_WEBHOOK_SECRET).toString("base64")
        : undefined,
      ...(isSandbox && { baseURL: "https://sandbox-api.whop.com/api/v1" }),
    });
  }
  return _whop;
}

// Company API key client — used for operations that need company-level permissions
// (products.create, checkoutConfigurations.create on child companies).
let _companyWhop: Whop | null = null;

export function getCompanyWhop(): Whop {
  if (!_companyWhop) {
    _companyWhop = new Whop({
      apiKey: process.env.WHOP_COMPANY_API_KEY!,
      ...(isSandbox && { baseURL: "https://sandbox-api.whop.com/api/v1" }),
    });
  }
  return _companyWhop;
}

export const WHOP_OAUTH_BASE = isSandbox
  ? "https://sandbox-api.whop.com"
  : "https://api.whop.com";
```

## Auth Helpers

We need three levels of auth gating: optional (for pages like product detail), required (for the buyer dashboard), and seller-only (for product management). Each level builds on the previous one.

Go to `src/lib` and create a file called `auth.ts` with the content:

```ts
import { redirect } from "next/navigation";
import { getSession } from "./session";
import { prisma } from "./prisma";

export async function getAuthUser() {
  const session = await getSession();
  if (!session.userId) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { sellerProfile: true },
  });

  return user;
}

export async function requireAuth() {
  const user = await getAuthUser();
  if (!user) redirect("/sign-in");
  return user;
}

export async function requireSeller() {
  const user = await requireAuth();
  if (!user.sellerProfile) redirect("/sell");
  if (!user.sellerProfile.kycComplete) redirect("/sell?kyc=incomplete");
  return { user, sellerProfile: user.sellerProfile };
}

/**
 * Complete KYC for a seller whose profile exists but kycComplete is false.
 * Called from the sell dashboard when the seller returns from Whop's KYC flow.
 */
export async function completeKycIfNeeded(userId: string): Promise<boolean> {
  const profile = await prisma.sellerProfile.findUnique({
    where: { userId },
  });
  if (!profile || profile.kycComplete) return !!profile?.kycComplete;

  await prisma.sellerProfile.update({
    where: { id: profile.id },
    data: { kycComplete: true },
  });
  return true;
}
```

## Login Route

When a user clicks "Sign in with Whop," we need to generate a PKCE challenge, store the verifier in a cookie, and redirect to Whop's OAuth page.

Go to `src/app/api/auth/login` and create a file called `route.ts` with the content:

```ts
import { NextResponse } from "next/server";
import { WHOP_OAUTH_BASE } from "@/lib/whop";
import { env } from "@/lib/env";

export async function GET() {
  const clientId = env.WHOP_CLIENT_ID;
  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

  // Generate PKCE code verifier and challenge
  const codeVerifier = crypto.randomUUID() + crypto.randomUUID();
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const codeChallenge = btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const state = crypto.randomUUID();
  const nonce = crypto.randomUUID();

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile email",
    state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
    nonce,
  });

  const authUrl = `${WHOP_OAUTH_BASE}/oauth/authorize?${params}`;

  const response = NextResponse.redirect(authUrl);

  // Store PKCE verifier and state in cookies for the callback
  response.cookies.set("oauth_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  return response;
}
```

## Callback Route

When Whop redirects the user back to our app, we need to exchange the authorization code for tokens, fetch the user's profile, and create or update their database record. First-time users get a new row; returning users get their info updated.

Go to `src/app/api/auth/callback` and create a file called `route.ts` with the content:

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { WHOP_OAUTH_BASE } from "@/lib/whop";
import { env } from "@/lib/env";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const storedState = request.cookies.get("oauth_state")?.value;
  const codeVerifier = request.cookies.get("oauth_code_verifier")?.value;

  if (!code || !state || state !== storedState || !codeVerifier) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/sign-in?error=invalid_state`
    );
  }

  // Exchange code for tokens
  const tokenRes = await fetch(`${WHOP_OAUTH_BASE}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      code,
      redirect_uri: `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`,
      client_id: env.WHOP_CLIENT_ID,
      client_secret: env.WHOP_CLIENT_SECRET,
      code_verifier: codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/sign-in?error=token_exchange`
    );
  }

  const tokens = await tokenRes.json();

  // Fetch user info from OIDC userinfo endpoint
  const userInfoRes = await fetch(`${WHOP_OAUTH_BASE}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(
      `${env.NEXT_PUBLIC_APP_URL}/sign-in?error=userinfo`
    );
  }

  const userInfo = await userInfoRes.json();

  // Upsert user in database
  const user = await prisma.user.upsert({
    where: { whopUserId: userInfo.sub },
    update: {
      email: userInfo.email,
      name: userInfo.name || userInfo.preferred_username,
      avatar: userInfo.picture,
    },
    create: {
      whopUserId: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || userInfo.preferred_username,
      avatar: userInfo.picture,
    },
  });

  // Create session
  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.accessToken = tokens.access_token;
  await session.save();

  const response = NextResponse.redirect(
    `${env.NEXT_PUBLIC_APP_URL}/dashboard`
  );

  // Clear OAuth cookies
  response.cookies.delete("oauth_code_verifier");
  response.cookies.delete("oauth_state");

  return response;
}
```

## Logout Route

The logout route destroys the session cookie. We make it POST-only so it can't be triggered by a rogue `<img>` tag on another site.

Go to `src/app/api/auth/logout` and create a file called `route.ts` with the content:

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { env } from "@/lib/env";

export async function POST() {
  const session = await getSession();
  session.destroy();

  return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/`);
}
```

## Sign-In Page

We need a sign-in page with a single "Sign in with Whop" button.

Go to `src/app/sign-in` and create a file called `page.tsx` with the content:

```tsx
import { Store } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_state: "Sign-in session expired. Please try again.",
  token_exchange: "Could not complete sign-in. Please try again.",
  userinfo: "Could not retrieve your profile. Please try again.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const errorMessage = error ? ERROR_MESSAGES[error] || "Something went wrong. Please try again." : null;

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Store className="mx-auto h-12 w-12 text-accent" aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-bold text-text-primary">
          Welcome to Shelfie
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Sign in with your Whop account to buy and sell digital products.
        </p>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-lg bg-error/10 p-3 text-sm text-error"
          >
            {errorMessage}
          </div>
        )}

        <a
          href="/api/auth/login"
          className="mt-8 block w-full rounded-lg bg-accent px-6 py-3 text-center text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
        >
          Sign in with Whop
        </a>
      </div>
    </div>
  );
}
```

## Navbar

We need a navbar that shows "Sign In" for guests and the user's avatar, navigation links, and a logout button for authenticated users.

Go to `src/components` and create a file called `navbar.tsx` with the content:

```tsx
import Link from "next/link";
import { getAuthUser } from "@/lib/auth";
import { Store, ShoppingBag, LogOut, LogIn } from "lucide-react";

export async function Navbar() {
  const user = await getAuthUser();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-surface/80 backdrop-blur-md">
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-text-primary">
          <Store className="h-6 w-6 text-accent" aria-hidden="true" />
          <span className="hidden sm:inline">Shelfie</span>
        </Link>

        <div className="flex items-center gap-3 sm:gap-6">
          <Link
            href="/products"
            className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
          >
            Browse
          </Link>

          {user ? (
            <>
              <Link
                href="/sell/dashboard"
                className="text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                Sell
              </Link>
              <Link
                href="/dashboard"
                aria-label="My purchases"
                className="p-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden="true" />
              </Link>
              <div className="flex items-center gap-2 sm:gap-3">
                {user.avatar && (
                  <img
                    src={user.avatar}
                    alt={user.name || "User avatar"}
                    className="h-8 w-8 rounded-full"
                  />
                )}
                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    aria-label="Sign out"
                    className="p-2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
            >
              <LogIn className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Sign In</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}
```

## Category Constants

We need a list of product categories that we'll reuse across the app.

Go to `src/constants` and create a file called `categories.ts` with the content:

```ts
import {
  FileText,
  BookOpen,
  Code,
  Palette,
  Music,
  Video,
  Camera,
  GraduationCap,
  Package,
  type LucideIcon,
} from "lucide-react";

export const CATEGORIES = [
  { value: "TEMPLATES", label: "Templates", icon: FileText },
  { value: "EBOOKS", label: "Ebooks", icon: BookOpen },
  { value: "SOFTWARE", label: "Software", icon: Code },
  { value: "DESIGN", label: "Design", icon: Palette },
  { value: "AUDIO", label: "Audio", icon: Music },
  { value: "VIDEO", label: "Video", icon: Video },
  { value: "PHOTOGRAPHY", label: "Photography", icon: Camera },
  { value: "EDUCATION", label: "Education", icon: GraduationCap },
  { value: "OTHER", label: "Other", icon: Package },
] as const satisfies readonly { value: string; label: string; icon: LucideIcon }[];

export const CATEGORY_MAP = Object.fromEntries(
  CATEGORIES.map((c) => [c.value, c])
) as Record<string, (typeof CATEGORIES)[number]>;
```

## Next.js Config

We need to allow remote images from UploadThing and Whop's CDNs.

In the project root, create a file called `next.config.ts` with the content:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { hostname: "utfs.io" },
      { hostname: "assets.whop.com" },
      { hostname: "cdn.whop.com" },
    ],
  },
};

export default nextConfig;
```

## Error and 404 Pages

We need custom error and 404 pages so crashes and missing pages match Shelfie's design instead of showing Next.js defaults. The error page is a client component (Next.js passes a `reset` function), while the 404 page is a server component.

Go to `src/app` and create a file called `not-found.tsx` with the content:

```tsx
import Link from "next/link";
import { Store } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <Store className="h-16 w-16 text-text-secondary/20" />
      <h1 className="mt-6 text-4xl font-extrabold text-text-primary">404</h1>
      <p className="mt-2 text-lg text-text-secondary">
        This page doesn&apos;t exist.
      </p>
      <div className="mt-8 flex gap-4">
        <Link href="/"
          className="rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors">
          Go Home
        </Link>
        <Link href="/products"
          className="rounded-lg border border-border px-6 py-2.5 text-sm font-semibold text-text-primary hover:bg-surface-elevated transition-colors">
          Browse Products
        </Link>
      </div>
    </div>
  );
}
```

Go to `src/app` and create a file called `error.tsx` with the content:

```tsx
"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <AlertTriangle className="h-16 w-16 text-error/40" />
      <h1 className="mt-6 text-2xl font-bold text-text-primary">
        Something went wrong
      </h1>
      <p className="mt-2 text-sm text-text-secondary">
        An unexpected error occurred. Please try again.
      </p>
      <button
        onClick={reset}
        className="mt-8 rounded-lg bg-accent px-6 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
```

## Favicon

Next.js App Router automatically serves any `icon.svg` in the `app` directory as the site favicon — no `<link>` tag needed.

Go to `src/app` and create a file called `icon.svg` with the content:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#1A0A10"/>
  <path d="M21 9.5C21 7 18.5 5 15.5 5S10 7 10 9.5c0 2.8 2 4 5.5 5.2 3.2 1.1 5.5 2.4 5.5 5.3 0 3-2.5 5-5.5 5s-5.5-2-5.5-5" stroke="#B8293D" stroke-width="3.5" stroke-linecap="square" fill="none"/>
</svg>
```

## Checkpoint

At this point you have:

- A Next.js 16 app deployed to Vercel
- Neon Postgres connected via Vercel integration
- Full Prisma schema (7 models) pushed to the database
- Whop OAuth login and logout working end-to-end
- Session management via encrypted cookies
- A server-rendered navbar that shows guest/authenticated state
- A sign-in page with a single "Sign in with Whop" button
- Tailwind v4 configured with a light-first color system and dark mode

Test the auth flow: visit `/sign-in`, click the Whop button, authorize the app in the sandbox, and verify you land on `/dashboard` (which will be blank until we build the buyer dashboard). Check the navbar shows your avatar. Click logout. Confirm the session is cleared.

Next up — **Part 2: Seller Onboarding** — where sellers connect their Whop account, complete KYC, and get ready to list products.
