# Patreon Clone with Whop Payments Network (WPN)

> **This tutorial is also available in 3 parts** for easier navigation:
> - **Part 1 (this file, https://whop.com/blog/content/files/2026/02/patreon-clone-guide-part1.md)**: Foundation - Project setup, database, authentication, SDK setup, creator registration (Steps 1-5)
> - **Part 2 (https://whop.com/blog/content/files/2026/02/patreon-clone-guide-part2.md)**: Monetization - Subscription tiers, content management, checkouts, webhooks (Steps 6-9)
> - **Part 3 (https://whop.com/blog/content/files/2026/02/patreon-clone-guide-part3.md)**: Access & Growth - Content gating, payouts, homepage, deployment (Steps 10-14)
>
> Use the split files if this single file is too large for your context window. Each part includes context bridges to help maintain continuity.

---

## What We're Building
A **Patreon-style creator subscription platform** where:
- Users sign in with their Whop accounts
- Creators register and receive their own connected payment accounts
- Creators create subscription tiers and gated content
- Subscribers pay creators directly through Whop checkout
- Creators withdraw earnings through Whop's payout portal

## Why Whop?
Building a creator platform traditionally requires stitching together 3-4 services: Stripe Connect for payments, Auth0/Clerk for authentication, a webhook processor, and custom KYC flows. **Whop replaces all of this with one SDK.**

With Whop Payments Network (WPN), you get:
- **OAuth + user identity** - No separate auth service needed
- **Connected accounts** - Creators get payment accounts in one API call
- **Hosted checkout + webhooks** - PCI-compliant payments out of the box
- **KYC + payouts** - Whop handles creator verification and withdrawals

This tutorial builds a complete Patreon clone using only `@whop/sdk` and standard Next.js tooling.

## Success Criteria
- [ ] Users can sign in via Whop OAuth
- [ ] Users can register as creators (creates WPN connected account)
- [ ] Creators can create subscription tiers (creates Whop plans)
- [ ] Creators can publish gated content
- [ ] Users can subscribe to creators via Whop checkout
- [ ] Payments trigger webhooks that create subscription records
- [ ] Content is gated based on subscription tier
- [ ] Users can cancel subscriptions (at period end)
- [ ] Creators can access payout portal
- [ ] App deploys to production with real payments

---

## What is WPN (Whop Payments Network)?

**WPN** is Whop's platform infrastructure for building marketplaces and creator platforms. Similar to Stripe Connect, it enables you to:

1. **Create Connected Accounts**: Each creator gets their own Whop company (`biz_xxx`) as a child of your platform company. Payments go directly to creators.

2. **Process Payments**: Create checkout configurations on creator accounts. When users pay, money goes to the creator's balance (minus optional platform fees).

3. **Handle Webhooks**: Whop sends `payment.succeeded` events when payments complete. Your app listens for these to update subscription records.

4. **Manage Payouts**: Creators complete KYC through Whop's hosted onboarding, then withdraw earnings through the payout portal.

**Key WPN Concepts Used**:
- **Connected Accounts**: `whop.companies.create()` with `parent_company_id`
- **Products & Plans**: `whop.products.create()` and `whop.plans.create()` - the purchasable items
- **Checkout Configurations**: `whop.checkoutConfigurations.create()` - generates payment URLs
- **Account Links**: `whop.accountLinks.create()` - for KYC onboarding and payout portal
- **Webhooks**: `whop.webhooks.unwrap()` - verifies and parses webhook payloads
- **Memberships**: `whop.memberships.cancel()` - manages subscription lifecycle

## Sandbox vs Production

Whop provides a **sandbox environment** for development and testing. This tutorial uses sandbox throughout development, then switches to production for deployment.

| Environment | Dashboard | API Base URL | Payments |
|-------------|-----------|--------------|----------|
| **Sandbox** | sandbox.whop.com | sandbox-api.whop.com | Test cards only (no real charges) |
| **Production** | whop.com | api.whop.com | Real payments |

### Where to get Whop sandbox credentials?
Whop sandbox acts like the live version of Whop and the UX is the same. Users can get their Whop sandbox credentials by using https://sandbox.whop.com/.

### How to get sandbox credentials
Users find keys they will use like the company ID (`biz_XXXX`), webhook secret (`ws_XXXX`), company API key (`apik_XXXX`), and others by:

1. Going to https://sandbox.whop.com/
2. Opening the Whop dashboard
3. Going to the Developer page (at the bottom) of the Whop dashboard

The Developer page of the Whop dashboard allows users to create company API keys, webhooks, and Whop apps. They can also find their company ID in the URL of their dashboard (https://sandbox.whop.com/dashboard/biz_XXXX/).

**Important**: Sandbox and production are completely separate. Credentials, webhooks, connected accounts, and data do not transfer between them. You'll need to:
- Create a sandbox account at **sandbox.whop.com** for development
- Create a production account at **whop.com** for deployment
- Set `WHOP_SANDBOX="true"` in your `.env` during development (SDK uses sandbox API)
- Remove or set `WHOP_SANDBOX="false"` for production (SDK uses production API)

**Documentation**:
- [Platforms Overview](https://docs.whop.com/whop-apps/platforms.md)
- [Enroll Connected Accounts](https://docs.whop.com/developer/platforms/enroll-connected-accounts.md)
- [Collect Payments for Connected Accounts](https://docs.whop.com/developer/platforms/collect-payments-for-connected-accounts.md)
- [Webhooks Guide](https://docs.whop.com/developer/guides/webhooks.md)
- [Account Links API](https://docs.whop.com/api-reference/account-links/create-account-link.md)
- [Sandbox Testing](https://docs.whop.com/developer/guides/sandbox.md)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        YOUR PLATFORM                            │
│                     (Next.js + Prisma)                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User signs in ──► Whop OAuth ──► Store whopUserId              │
│                                                                 │
│  User becomes creator ──► whop.companies.create() ──►           │
│                           Store whopCompanyId (connected acct)  │
│                                                                 │
│  Creator adds tier ──► whop.plans.create() ──►                  │
│                        Store whopPlanId                         │
│                                                                 │
│  User subscribes ──► whop.checkoutConfigurations.create() ──►   │
│                      Redirect to Whop checkout                  │
│                                                                 │
│  Payment succeeds ──► Webhook POST /api/webhooks/whop ──►       │
│                       Create Subscription with whopMembershipId │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## WPN ID Format Reference
- **Company**: `biz_xxxxxxxxxxxxx` (platform and connected accounts)
- **App**: `app_xxxxxxxxxxxxx` (OAuth client ID)
- **API Key**: `apik_xxxxxxxxxxxxx` (server-side authentication)
- **User**: `user_xxxxxxxxxxxxx` (from OAuth)
- **Product**: `prod_xxxxxxxxxxxxx` (container for plans)
- **Plan**: `plan_xxxxxxxxxxxxx` (purchasable item)
- **Membership**: `mem_xxxxxxxxxxxxx` (active subscription)
- **Webhook Secret**: `ws_xxxxxxxxxxxxx` (for signature verification)

---

## Environment Variables (Complete List)

### Development (.env)
```
DATABASE_URL="postgresql://user:password@localhost:5432/patreon_clone?schema=public"

SESSION_SECRET="your-64-char-hex-secret"
AUTH_URL="http://localhost:3000"

WHOP_SANDBOX="true"
WHOP_APP_ID="app_xxxxxxxxxxxxx"
WHOP_API_KEY="apik_xxxxxxxxxxxxx"
WHOP_COMPANY_ID="biz_xxxxxxxxxxxxx"
WHOP_WEBHOOK_SECRET="ws_xxxxxxxxxxxxx"
```

### Production (Vercel)
```
SESSION_SECRET="different-64-char-hex-secret"
AUTH_URL="https://your-project.vercel.app"

WHOP_APP_ID="app_xxxxxxxxxxxxx"
WHOP_API_KEY="apik_xxxxxxxxxxxxx"
WHOP_COMPANY_ID="biz_xxxxxxxxxxxxx"
WHOP_WEBHOOK_SECRET="ws_xxxxxxxxxxxxx"

POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLED="postgres://..."
```

**Note**: Omit `WHOP_SANDBOX` in production - its absence means production mode.

---

## Test Cards (Sandbox)
- `4242 4242 4242 4242` - Successful payment
- `4000 0000 0000 0002` - Declined payment
- `5385 3083 6013 5181` - Requires 3D Secure (enter `Checkout1!`)
- Any future expiration date (e.g., 12/34)
- Any 3-digit CVC (e.g., 123)

---

# Step 1: Project Setup

## Why This Step Matters
This establishes the foundation for a WPN-powered application. The tech stack choices are intentional:
- **Next.js 16**: Server components for secure API calls to Whop, App Router for modern routing
- **Prisma 5**: Type-safe database access for storing users, creators, subscriptions
- **PostgreSQL**: Relational DB to maintain referential integrity between users/creators/tiers/subscriptions
- **@whop/sdk**: Official SDK for WPN API calls (connected accounts, checkouts, webhooks)
- **iron-session**: Secure cookie-based sessions to persist Whop OAuth user identity

Without this setup, you cannot: authenticate users via Whop OAuth, create connected accounts, or process payments.

## Prerequisites
- Node.js (v18+)
- npm
- PostgreSQL
- Git

## Database Setup
Create a PostgreSQL user and database:
```
psql -U postgres -d postgres -c "CREATE USER patreon_user WITH ENCRYPTED PASSWORD 'yourpassword';"
psql -U postgres -d postgres -c "CREATE DATABASE patreon_clone OWNER patreon_user;"
```

On Linux with peer auth errors, prefix with `sudo -u postgres`.

## Create Next.js Project
```
npx create-next-app@latest patreon-clone
cd patreon-clone
```
Select "Yes, use recommended defaults" (includes TypeScript, ESLint, Tailwind).

## Install Dependencies
```
npm install @whop/sdk iron-session @prisma/client@5 zod
npm install -D prisma@5
```

**Why Zod?** We use Zod for type-safe input validation on API routes, preventing invalid data from reaching your database or Whop API.

**Why Prisma 5?** Prisma 7 has breaking changes. Prisma 5 is stable and works with this tutorial.

## Initialize Prisma
```
npx prisma init
```
Creates: `.env`, `prisma/schema.prisma`, `prisma.config.ts`

## Generate Session Secret
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
This 64-character hex string encrypts user sessions. Keep it secret.

## Environment Variables (.env)
```
DATABASE_URL="postgresql://patreon_user:yourpassword@localhost:5432/patreon_clone?schema=public"

SESSION_SECRET="your-generated-64-char-hex-secret"
AUTH_URL="http://localhost:3000"

WHOP_SANDBOX="true"
```

**Critical**: For sandbox development, create your Whop account at **sandbox.whop.com** (not whop.com). Whop credentials (WHOP_APP_ID, WHOP_API_KEY, WHOP_COMPANY_ID) are added in Step 4.

## Verify Setup
```
npm run dev
```
- No terminal errors
- http://localhost:3000 shows Next.js welcome page
- CTRL+C stops the server

## Testing This Step
1. Run `npm run dev` - should start without errors
2. Visit http://localhost:3000 - should see Next.js default page
3. Check `.env` file exists with DATABASE_URL and SESSION_SECRET

---

# Step 2: Database Schema

## Why This Step Matters
The database schema defines how your platform data relates to WPN (Whop Payments Network) entities. Key mappings:
- **User.whopUserId** → Links to Whop's user identity from OAuth (format: `user_xxxxxxxxxxxxx`)
- **Creator.whopCompanyId** → Links to WPN connected account (format: `biz_xxxxxxxxxxxxx`) - this is how creators receive payments
- **Creator.whopProductId** → Links to Whop product containing all tiers (format: `prod_xxxxxxxxxxxxx`) - added in Step 6
- **Tier.whopPlanId** → Links to Whop plan for checkout (format: `plan_xxxxxxxxxxxxx`)
- **Subscription.whopMembershipId** → Links to Whop membership for cancellation (format: `mem_xxxxxxxxxxxxx`)

Without these links, payments would process in Whop but your app wouldn't know who paid for what.

**Docs**: [Enroll Connected Accounts](https://docs.whop.com/developer/platforms/enroll-connected-accounts.md)

## lib/prisma.ts
Singleton Prisma client prevents connection exhaustion during hot reloads.

```
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

export default prisma
```

## prisma/schema.prisma - FINAL VERSION
This is the complete schema including updates from Step 6 (whopProductId) and Step 12 (CANCELING status).

```
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLED")
}

model User {
  id            String    @id @default(cuid())
  whopUserId    String    @unique
  whopUsername  String
  email         String    @unique
  name          String?
  avatarUrl     String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  creator       Creator?
  subscriptions Subscription[]
}

model Creator {
  id              String   @id @default(cuid())
  userId          String   @unique
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  whopCompanyId   String?  @unique
  whopProductId   String?  @unique   // ← This is the only new field
  whopOnboarded   Boolean  @default(false)
  
  username        String   @unique
  displayName     String
  bio             String?
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  tiers           Tier[]
  posts           Post[]
  subscriptions   Subscription[]
}

model Tier {
  id            String   @id @default(cuid())
  creatorId     String
  creator       Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  
  whopPlanId    String?  @unique
  
  name          String
  description   String?
  priceInCents  Int
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  posts         Post[]   @relation("TierPosts")
  subscriptions Subscription[]
}

model Post {
  id            String   @id @default(cuid())
  creatorId     String
  creator       Creator  @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  
  title         String
  content       String
  published     Boolean  @default(false)
  
  minimumTierId String?
  minimumTier   Tier?    @relation("TierPosts", fields: [minimumTierId], references: [id])
  
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
}

model Subscription {
  id                String             @id @default(cuid())
  userId            String
  user              User               @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  creatorId         String
  creator           Creator            @relation(fields: [creatorId], references: [id], onDelete: Cascade)
  
  tierId            String
  tier              Tier               @relation(fields: [tierId], references: [id], onDelete: Cascade)
  
  whopMembershipId  String?            @unique
  status            SubscriptionStatus @default(ACTIVE)
  
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt

  @@unique([userId, creatorId])
}

enum SubscriptionStatus {
  ACTIVE
  CANCELING
  CANCELED
  PAST_DUE
  EXPIRED
}
```

## Data Model Relationships
- **User 1:1 Creator**: Any user can become a creator (gets WPN connected account)
- **Creator 1:N Tier**: Creator defines subscription tiers (each tier = Whop plan)
- **Creator 1:N Post**: Creator publishes content
- **Post N:1 Tier**: Post requires minimum tier for access (content gating)
- **Subscription**: Links User + Creator + Tier (enforced unique per user-creator pair)
- **whopMembershipId**: Tracks Whop's membership record for cancellation API calls

## Migrations
Initial migration:
```
npx prisma migrate dev --name init
```

After Step 6 (add whopProductId to Creator):
```
npx prisma migrate dev --name add_whop_product_id
```

After Step 12 (add CANCELING status):
```
npx prisma migrate dev --name add_canceling_status
```

**Troubleshooting**: If you get a `dotenv/config` error, delete `prisma.config.ts` and retry.

## Testing This Step
```
npx prisma studio
```
Verify all 5 models appear: User, Creator, Tier, Post, Subscription

---

# Step 3: Authentication with Whop OAuth

## Why This Step Matters
Whop OAuth with PKCE enables users to sign in with their Whop accounts. This is essential for WPN because:
1. **User Identity**: The `userInfo.sub` from OAuth is the Whop user ID (`user_xxxxxxxxxxxxx`) - this links your database user to Whop's identity
2. **No Password Storage**: Whop handles authentication, you just store the user reference
3. **Payment Readiness**: The Whop user ID is required when creating checkouts - it tells WPN who is making the purchase

Without OAuth, you cannot create checkouts because WPN needs to know which Whop user is paying.

**Docs**: [OAuth Guide](https://docs.whop.com/developer/guides/oauth.md) | [Authentication Guide](https://docs.whop.com/developer/guides/authentication.md)

## OAuth Flow Overview
1. User clicks "Sign in with Whop" → redirects to Whop's OAuth page
2. User authorizes → Whop redirects back with authorization code
3. Your server exchanges code for tokens → fetches user info
4. User info contains `sub` (Whop user ID) → upsert user in your database
5. Create session with user ID → user is logged in

## lib/session.ts
Defines session structure. Stores both your database `userId` and `whopUserId` for convenience.

```
import { SessionOptions } from 'iron-session'

export interface SessionData {
  userId?: string       // Your database user ID
  whopUserId?: string   // Whop's user ID (user_xxx)
  isLoggedIn: boolean
}

export const sessionOptions: SessionOptions = {
  password: process.env.SESSION_SECRET!,
  cookieName: 'patreon-clone-session',
  cookieOptions: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7, // 1 week
  },
}

export const defaultSession: SessionData = {
  isLoggedIn: false,
}
```

## lib/oauth.ts
OAuth helper functions. Handles sandbox vs production API URLs automatically.

**Key endpoints**:
- Sandbox: `https://sandbox-api.whop.com/oauth/*`
- Production: `https://api.whop.com/oauth/*`

```
import crypto from 'crypto'

const isSandbox = process.env.WHOP_SANDBOX === 'true'
const API_BASE = isSandbox
  ? 'https://sandbox-api.whop.com'
  : 'https://api.whop.com'

const WHOP_AUTHORIZE_URL = `${API_BASE}/oauth/authorize`
const WHOP_TOKEN_URL = `${API_BASE}/oauth/token`
const WHOP_USERINFO_URL = `${API_BASE}/oauth/userinfo`

export function generatePKCE() {
  const codeVerifier = crypto.randomBytes(32).toString('base64url')
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url')

  return { codeVerifier, codeChallenge }
}

export function generateState() {
  return crypto.randomBytes(16).toString('hex')
}

export function buildAuthorizeUrl(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
}) {
  const searchParams = new URLSearchParams({
    response_type: 'code',
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    scope: 'openid profile email',
    state: params.state,
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    nonce: crypto.randomBytes(16).toString('hex'),
  })

  return `${WHOP_AUTHORIZE_URL}?${searchParams.toString()}`
}

export async function exchangeCodeForTokens(params: {
  code: string
  codeVerifier: string
  clientId: string
  redirectUri: string
}) {
  const response = await fetch(WHOP_TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code: params.code,
      redirect_uri: params.redirectUri,
      client_id: params.clientId,
      code_verifier: params.codeVerifier,
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to exchange code for tokens')
  }

  return response.json() as Promise<{
    access_token: string
    refresh_token: string
    id_token?: string
    token_type: string
    expires_in: number
  }>
}

export async function fetchUserInfo(accessToken: string) {
  const response = await fetch(WHOP_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch user info')
  }

  return response.json() as Promise<{
    sub: string // Whop user ID (user_xxxxxxxxxxxxx) - THIS IS THE KEY VALUE
    name?: string
    preferred_username?: string
    picture?: string
    email?: string
    email_verified?: boolean
  }>
}
```

## app/api/auth/login/route.ts
Initiates OAuth flow. Stores PKCE verifier in cookie (needed for callback).

```
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { generatePKCE, generateState, buildAuthorizeUrl } from '@/lib/oauth'

export async function GET() {
  const { codeVerifier, codeChallenge } = generatePKCE()
  const state = generateState()

  const clientId = process.env.WHOP_APP_ID!
  const redirectUri = `${process.env.AUTH_URL}/api/auth/callback`

  const cookieStore = await cookies()
  cookieStore.set('oauth_code_verifier', codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })
  cookieStore.set('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10,
    path: '/',
  })

  const authorizeUrl = buildAuthorizeUrl({
    clientId,
    redirectUri,
    codeChallenge,
    state,
  })

  return NextResponse.redirect(authorizeUrl)
}
```

## app/api/auth/callback/route.ts
Handles OAuth callback. This is where the Whop user ID gets stored in your database.

**Critical**: `userInfo.sub` is the Whop user ID - store this as `whopUserId` in your User model.

```
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { exchangeCodeForTokens, fetchUserInfo } from '@/lib/oauth'
import { sessionOptions, SessionData } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get('code')
  const state = searchParams.get('state')
  const error = searchParams.get('error')

  if (error) {
    return NextResponse.redirect(new URL(`/signin?error=${error}`, process.env.AUTH_URL))
  }

  if (!code || !state) {
    return NextResponse.redirect(new URL('/signin?error=missing_params', process.env.AUTH_URL))
  }

  const cookieStore = await cookies()
  const storedState = cookieStore.get('oauth_state')?.value
  const codeVerifier = cookieStore.get('oauth_code_verifier')?.value

  if (!storedState || state !== storedState) {
    return NextResponse.redirect(new URL('/signin?error=invalid_state', process.env.AUTH_URL))
  }

  if (!codeVerifier) {
    return NextResponse.redirect(new URL('/signin?error=missing_verifier', process.env.AUTH_URL))
  }

  try {
    const tokens = await exchangeCodeForTokens({
      code,
      codeVerifier,
      clientId: process.env.WHOP_APP_ID!,
      redirectUri: `${process.env.AUTH_URL}/api/auth/callback`,
    })

    const userInfo = await fetchUserInfo(tokens.access_token)

    // CRITICAL: userInfo.sub is the Whop user ID (user_xxx format)
    // This links your database user to Whop's identity for payments
    const user = await prisma.user.upsert({
      where: { whopUserId: userInfo.sub },
      update: {
        email: userInfo.email || '',
        name: userInfo.name,
        whopUsername: userInfo.preferred_username || '',
        avatarUrl: userInfo.picture,
      },
      create: {
        whopUserId: userInfo.sub,
        whopUsername: userInfo.preferred_username || '',
        email: userInfo.email || '',
        name: userInfo.name,
        avatarUrl: userInfo.picture,
      },
    })

    const response = NextResponse.redirect(new URL('/dashboard', process.env.AUTH_URL))

    const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
    session.userId = user.id
    session.whopUserId = user.whopUserId
    session.isLoggedIn = true
    await session.save()

    cookieStore.delete('oauth_code_verifier')
    cookieStore.delete('oauth_state')

    return response
  } catch (error) {
    console.error('OAuth callback error:', error)
    return NextResponse.redirect(new URL('/signin?error=auth_failed', process.env.AUTH_URL))
  }
}
```

## app/api/auth/logout/route.ts
```
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function POST() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)
  session.destroy()
  return NextResponse.redirect(new URL('/', process.env.AUTH_URL))
}
```

## app/api/auth/me/route.ts
Returns current user data to frontend (for client components that need user info).

```
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function GET() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.isLoggedIn || !session.userId) {
    return NextResponse.json({ user: null }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, email: true, name: true, whopUsername: true, avatarUrl: true },
  })

  return NextResponse.json({ user })
}
```

## lib/auth.ts
Server-side helpers for authentication in Server Components and API routes.

This file provides three levels of auth helpers:
- `getCurrentUser()` - Returns user or null (for Server Components)
- `requireAuth()` - Returns `{ user, error }` for API routes needing authentication
- `requireCreator()` - Returns `{ user, creator, error }` for creator-only API routes

```
import { cookies } from 'next/headers'
import { getIronSession } from 'iron-session'
import { NextResponse } from 'next/server'
import { sessionOptions, SessionData, defaultSession } from '@/lib/session'
import { prisma } from '@/lib/prisma'

export async function getSession() {
  const cookieStore = await cookies()
  const session = await getIronSession<SessionData>(cookieStore, sessionOptions)

  if (!session.isLoggedIn) {
    return defaultSession
  }

  return session
}

export async function getCurrentUser() {
  const session = await getSession()

  if (!session.isLoggedIn || !session.userId) {
    return null
  }

  return prisma.user.findUnique({
    where: { id: session.userId },
  })
}

export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) }
  }

  return { user, error: null }
}

export async function requireCreator() {
  const { user, error } = await requireAuth()

  if (error) {
    return { user: null, creator: null, error }
  }

  const creator = await prisma.creator.findUnique({
    where: { userId: user!.id },
  })

  if (!creator) {
    return { user, creator: null, error: NextResponse.json({ error: 'Creator account not found' }, { status: 404 }) }
  }

  return { user, creator, error: null }
}
```

## lib/ratelimit.ts
In-memory rate limiter to protect API routes from abuse. Limits to 20 requests per minute per user.

```
import { NextResponse } from 'next/server'

const rateLimit = new Map<string, { count: number; lastReset: number }>()

const WINDOW_MS = 60 * 1000 // 1 minute
const MAX_REQUESTS = 20 // 20 requests per minute

export function checkRateLimit(identifier: string) {
  const now = Date.now()
  const record = rateLimit.get(identifier)

  if (!record || now - record.lastReset > WINDOW_MS) {
    rateLimit.set(identifier, { count: 1, lastReset: now })
    return { success: true, error: null }
  }

  if (record.count >= MAX_REQUESTS) {
    return {
      success: false,
      error: NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      ),
    }
  }

  record.count++
  return { success: true, error: null }
}
```

**Production Note**: The in-memory rate limiter works well for development and simple deployments. For production applications with serverless functions (like Vercel), use **Upstash Redis** or a similar persistent store, since in-memory state doesn't persist across serverless function invocations. When an AI builds an app using this tutorial, it should use Upstash instead of the in-memory rate limiter for production deployments.

## middleware.ts - FINAL VERSION
Protects routes. Updated in Step 12 to include `/subscriptions`.

```
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getIronSession } from 'iron-session'
import { sessionOptions, SessionData } from '@/lib/session'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const session = await getIronSession<SessionData>(
    request.cookies as any,
    sessionOptions
  )

  const isProtected =
    request.nextUrl.pathname.startsWith('/dashboard') ||
    request.nextUrl.pathname.startsWith('/creator') ||
    request.nextUrl.pathname.startsWith('/subscriptions')  // [ADDED:Step12]

  if (isProtected && !session.isLoggedIn) {
    return NextResponse.redirect(new URL('/signin', request.url))
  }

  return response
}

export const config = {
  matcher: ['/dashboard/:path*', '/creator/:path*', '/subscriptions/:path*'],
}
```

## app/signin/page.tsx
Client component with "Sign in with Whop" button. Uses Suspense for searchParams.
- Links to `/api/auth/login` to start OAuth flow
- Shows error if `?error=` param present
- Link to whop.com for account creation

## Environment Variables Required
```
WHOP_APP_ID="app_xxxxxxxxxxxxx"  # From Step 4
```

## Testing This Step
1. Visit `/signin` - should see sign in page
2. Click "Sign in with Whop" - should redirect to Whop OAuth
3. Authorize - should redirect back to `/dashboard`
4. Check Prisma Studio - should see new User with `whopUserId` populated
5. Visit `/api/auth/me` - should return user JSON
6. POST to `/api/auth/logout` - should clear session

---

# Step 4: Whop SDK Setup

## Why This Step Matters
The Whop SDK (`@whop/sdk`) is your interface to WPN (Whop Payments Network). It handles:
- **Connected Accounts**: Creating sub-merchant accounts for creators (`whop.companies.create`)
- **Products & Plans**: Creating sellable items (`whop.products.create`, `whop.plans.create`)
- **Checkouts**: Generating payment links (`whop.checkoutConfigurations.create`)
- **Webhooks**: Verifying payment notifications (`whop.webhooks.unwrap`)
- **Account Links**: Onboarding and payout portals (`whop.accountLinks.create`)

Without the SDK configured, none of the payment functionality works.

**Docs**: [Getting Started](https://docs.whop.com/developer/api/getting-started.md) | [OAuth](https://docs.whop.com/developer/guides/oauth.md)

## Getting Whop Credentials (Sandbox)

### 1. Company ID
1. Go to **sandbox.whop.com** and create an account
2. Create a new business using the **New business** button
3. Copy `biz_xxxxxxxxxxxxx` from the URL

### 2. API Key
1. Developer page → Company API Keys → Create
2. **Required permissions**:
   - `company:create_child` - Create connected accounts
   - `company:basic:read` - Read company info
   - `checkout_configuration:create` - Create checkouts
   - `checkout_configuration:basic:read` - Read checkout config
   - `plan:create`, `plan:basic:read`, `plan:update` - Manage plans
   - `access_pass:create`, `access_pass:basic:read`, `access_pass:update` - Manage products
   - `payment:basic:read` - Read payment info
   - `member:basic:read`, `member:email:read` - Read member info
   - `webhook_receive:payments`, `webhook_receive:memberships` - Receive webhooks
   - `payout:destination:read` - Read payout info
3. Copy `apik_xxxxxxxxxxxxx`

### 3. App ID (for OAuth)
1. Developer page → Apps → Create app
2. Copy `app_xxxxxxxxxxxxx`
3. Click app → OAuth tab → Create redirect URL: `http://localhost:3000/api/auth/callback`

## Environment Variables (.env)
```
DATABASE_URL="your-database-url"

SESSION_SECRET="your-generated-secret-here"
AUTH_URL="http://localhost:3000"

WHOP_SANDBOX="true"

WHOP_APP_ID="app_xxxxxxxxxxxxx"
WHOP_API_KEY="apik_xxxxxxxxxxxxx"
WHOP_COMPANY_ID="biz_xxxxxxxxxxxxx"
```

Note: `WHOP_WEBHOOK_SECRET` is added in Step 9 after creating a webhook.

## lib/whop.ts - FINAL VERSION
This file is updated in Step 9 to include `webhookKey`. Here's the final version:

```
import Whop from "@whop/sdk"

const isSandbox = process.env.WHOP_SANDBOX === 'true'

export const whop = new Whop({
  appID: process.env.WHOP_APP_ID,
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: Buffer.from(process.env.WHOP_WEBHOOK_SECRET || "").toString('base64'),  // [ADDED:Step9]
  ...(isSandbox && { baseURL: "https://sandbox-api.whop.com/api/v1" }),
})
```

**Why base64 for webhookKey?** The Whop SDK expects the webhook secret to be base64 encoded. The raw secret starts with `ws_`.

**Sandbox vs Production**:
- Sandbox: `baseURL: "https://sandbox-api.whop.com/api/v1"`
- Production: Remove `baseURL` (SDK defaults to production)

## Testing This Step
1. Visit http://localhost:3000/signin
2. Click "Sign in with Whop"
3. Login with your **sandbox** account (not production whop.com)
4. After authorizing, you'll be redirected to `/dashboard` (404 expected - page not created yet)
5. Check Prisma Studio → User table should have new user with `whopUserId`

---

# Step 5: Creator Registration Flow

## Why This Step Matters
This step creates the **connected account** system - the core of WPN (Whop Payments Network). When a user becomes a creator:
1. A new Whop company is created as a **child** of your platform company
2. This connected account (`whopCompanyId`) is where creator payments are processed
3. The creator must complete KYC before receiving payouts

Without connected accounts, you cannot process payments on behalf of creators - all money would go to your platform account only.

**Docs**: [Enroll Connected Accounts](https://docs.whop.com/developer/platforms/enroll-connected-accounts.md)

## WPN Connected Account Model
```
Your Platform (biz_xxx - parent)
  └── Creator 1 (biz_yyy - child connected account)
  └── Creator 2 (biz_zzz - child connected account)
```

When a subscriber pays Creator 1, the payment goes directly to Creator 1's connected account (with optional platform fee).

## app/api/creator/register/route.ts
Creates a WPN connected account when user becomes a creator.

**Key WPN call**: `whop.companies.create()` with `parent_company_id` pointing to your platform.

Uses `requireAuth()` for authentication, Zod for validation, and rate limiting.

```
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

const registerSchema = z.object({
  username: z
    .string()
    .min(1, 'Username is required')
    .max(30, 'Username must be 30 characters or less')
    .regex(/^[a-z0-9_]+$/, 'Username can only contain lowercase letters, numbers, and underscores'),
  displayName: z
    .string()
    .min(1, 'Display name is required')
    .max(50, 'Display name must be 50 characters or less'),
  bio: z
    .string()
    .max(500, 'Bio must be 500 characters or less')
    .optional(),
})

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user.id)
  if (rateLimitError) return rateLimitError

  // Check if user is already a creator
  const existingCreator = await prisma.creator.findUnique({
    where: { userId: user.id },
  })

  if (existingCreator) {
    return NextResponse.json(
      { error: 'You are already registered as a creator' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const parsed = registerSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { username, displayName, bio } = parsed.data

  // Check if username is taken
  const usernameTaken = await prisma.creator.findUnique({
    where: { username },
  })

  if (usernameTaken) {
    return NextResponse.json(
      { error: 'Username is already taken' },
      { status: 400 }
    )
  }

  try {
    // CREATE WPN CONNECTED ACCOUNT
    // This creates a child company under your platform
    const whopCompany = await whop.companies.create({
      email: user.email,
      parent_company_id: process.env.WHOP_COMPANY_ID!,
      title: displayName,
      metadata: {
        platform_user_id: user.id,
        platform_username: username,
      },
    })

    // Store the connected account ID in your database
    const creator = await prisma.creator.create({
      data: {
        userId: user.id,
        username,
        displayName,
        bio: bio || null,
        whopCompanyId: whopCompany.id,
      },
    })

    return NextResponse.json({ creator })
  } catch (error) {
    console.error('Creator registration error:', error)
    return NextResponse.json(
      { error: 'Failed to register as creator' },
      { status: 500 }
    )
  }
}
```

## app/api/creator/onboarding/route.ts
Generates a link to Whop's hosted KYC/onboarding page. Creators must complete this before receiving payouts.

**Key WPN call**: `whop.accountLinks.create()` with `use_case: 'account_onboarding'`

Uses `requireCreator()` which checks both authentication and creator status in one call.

**Docs**: [Account Links API](https://docs.whop.com/api-reference/account-links/create-account-link.md)

```
import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/auth'
import { whop } from '@/lib/whop'

export async function POST() {
  const { creator, error } = await requireCreator()
  if (error) return error

  if (!creator.whopCompanyId) {
    return NextResponse.json(
      { error: 'Creator account not set up for payments' },
      { status: 400 }
    )
  }

  try {
    // Whop requires https URLs, so use a placeholder for local development
    const baseUrl = process.env.AUTH_URL || 'http://localhost:3000'
    const useHttps = baseUrl.startsWith('https://')

    const accountLink = await whop.accountLinks.create({
      company_id: creator.whopCompanyId,
      use_case: 'account_onboarding',
      return_url: useHttps
        ? `${baseUrl}/creator/dashboard?onboarding=complete`
        : 'https://example.com/onboarding-complete',
      refresh_url: useHttps
        ? `${baseUrl}/creator/dashboard?onboarding=refresh`
        : 'https://example.com/onboarding-refresh',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Onboarding link error:', error)
    return NextResponse.json(
      { error: 'Failed to generate onboarding link' },
      { status: 500 }
    )
  }
}
```

**Note**: Whop requires HTTPS for `return_url` and `refresh_url`. For local development, use placeholder URLs - the user will be redirected but won't return to your app. In production, these work correctly.

## UI Pages (Logic Descriptions)

### app/creator/register/page.tsx
Client component form:
- Fields: username (pattern="[a-z0-9_]+"), displayName, bio (optional)
- POST to `/api/creator/register`
- On success: redirect to `/creator/dashboard`

### app/creator/dashboard/page.tsx
Server component:
- Data: `getCurrentUser()`, `prisma.creator.findUnique({ include: { tiers, _count: { select: { subscriptions } } } })`
- Redirect: !user → /signin, !creator → /creator/register
- Show: If !whopOnboarded → yellow warning with OnboardingButton
- Stats: subscriber count, tier count, onboarding status
- Links: /creator/tiers, /creator/posts, /creator/{username} (public profile)

### app/creator/dashboard/OnboardingButton.tsx
Client button:
- POST to `/api/creator/onboarding`
- On success: `window.location.href = data.url` (redirects to Whop)

### app/dashboard/page.tsx
Server component (main user dashboard):
- Data: `getCurrentUser()`, `prisma.creator.findUnique({ where: { userId } })`
- Redirect: !user → /signin
- Show: Welcome message, links to creator dashboard or become-a-creator, link to /subscriptions

## Testing This Step
1. Sign in at http://localhost:3000/signin
2. Go to http://localhost:3000/creator/register
3. Fill out form with username, display name
4. Submit - should redirect to /creator/dashboard
5. Check Prisma Studio → Creator table should have `whopCompanyId` starting with `biz_`
6. (Optional) Click onboarding button - redirects to Whop KYC page

---

# Step 6: Subscription Tier Management

## Why This Step Matters
Tiers are the **sellable items** in your platform. In WPN, the hierarchy is:
- **Product** (`prod_xxx`): A container that groups related plans (one per creator)
- **Plan** (`plan_xxx`): A specific price point within a product (one per tier)

When a user subscribes, they purchase a **plan**. The plan determines the price, billing period, and which product (creator) they're subscribing to. Without plans, there's nothing for users to buy.

**Docs**: [Accept Payments](https://docs.whop.com/developer/guides/accept-payments.md) | [Create Plan API](https://docs.whop.com/api-reference/plans/create-plan.md)

## WPN Product/Plan Model
```
Creator's Connected Account (biz_xxx)
  └── Product: "Creator's Membership" (prod_xxx)
       └── Plan: "Basic Tier" - $5/month (plan_xxx)
       └── Plan: "Premium Tier" - $15/month (plan_xxx)
       └── Plan: "VIP Tier" - $50/month (plan_xxx)
```

Each creator has ONE product containing multiple plans (tiers). This is stored as:
- `Creator.whopProductId` → The product container
- `Tier.whopPlanId` → Individual purchasable plans

## Schema Update (Step 2 reference)
Add `whopProductId` to Creator model if not already present:
```
model Creator {
  // ... existing fields
  whopProductId   String?  @unique  // Whop product for tiers - prod_xxx format
}
```

Run migration:
```
npx prisma migrate dev --name add_whop_product_id
```

## app/api/creator/tiers/route.ts
Creates Whop products and plans when creators add tiers.

**Key WPN calls**:
- `whop.products.create()` - Creates the product container (once per creator)
- `whop.plans.create()` - Creates a purchasable plan for each tier

Uses `requireCreator()` for authentication, Zod for validation, and rate limiting.

```
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreator } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

const tierSchema = z.object({
  name: z
    .string()
    .min(1, 'Tier name is required')
    .max(50, 'Tier name must be 50 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  priceInCents: z
    .number()
    .int('Price must be a whole number')
    .min(100, 'Price must be at least $1.00'),
})

export async function GET() {
  const { creator, error } = await requireCreator()
  if (error) return error

  const creatorWithTiers = await prisma.creator.findUnique({
    where: { id: creator.id },
    include: { tiers: true },
  })

  return NextResponse.json({ tiers: creatorWithTiers?.tiers || [] })
}

export async function POST(request: NextRequest) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  if (!creator.whopCompanyId) {
    return NextResponse.json(
      { error: 'Creator account not set up for payments' },
      { status: 400 }
    )
  }

  const body = await request.json()
  const parsed = tierSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { name, description, priceInCents } = parsed.data

  try {
    // Create a product (access pass) in Whop for this creator if they don't have one
    let whopProductId = creator.whopProductId

    if (!whopProductId) {
      const product = await whop.products.create({
        company_id: creator.whopCompanyId,
        title: `${creator.displayName}'s Membership`,
        visibility: 'visible',
      })
      whopProductId = product.id

      // Save the product ID to the creator
      await prisma.creator.update({
        where: { id: creator.id },
        data: { whopProductId },
      })
    }

    // Create a plan for this tier
    const priceInDollars = priceInCents / 100

    const plan = await whop.plans.create({
      company_id: creator.whopCompanyId,
      product_id: whopProductId,
      plan_type: 'renewal',
      initial_price: 0,
      renewal_price: priceInDollars,
      billing_period: 30,
    } as Parameters<typeof whop.plans.create>[0])

    // Save the tier to your database
    const tier = await prisma.tier.create({
      data: {
        creatorId: creator.id,
        name,
        description: description || null,
        priceInCents,
        whopPlanId: plan.id,
      },
    })

    return NextResponse.json({ tier })
  } catch (error) {
    console.error('Tier creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create tier' },
      { status: 500 }
    )
  }
}
```

## app/api/creator/tiers/[tierId]/route.ts
Updates and deletes tiers (and their Whop plans).

**Key WPN calls**:
- `whop.plans.update()` - Updates plan pricing
- `whop.plans.delete()` - Removes plan from Whop

Uses `requireCreator()` for authentication, Zod for validation, and rate limiting.

```
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreator } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

const tierSchema = z.object({
  name: z
    .string()
    .min(1, 'Tier name is required')
    .max(50, 'Tier name must be 50 characters or less'),
  description: z
    .string()
    .max(500, 'Description must be 500 characters or less')
    .optional(),
  priceInCents: z
    .number()
    .int('Price must be a whole number')
    .min(100, 'Price must be at least $1.00'),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string }> }
) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const { tierId } = await params

  const tier = await prisma.tier.findUnique({
    where: { id: tierId },
  })

  if (!tier || tier.creatorId !== creator.id) {
    return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = tierSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { name, description, priceInCents } = parsed.data

  try {
    // Update the plan in Whop
    if (tier.whopPlanId) {
      const priceInDollars = priceInCents / 100
      await whop.plans.update(tier.whopPlanId, {
        initial_price: priceInDollars,
        renewal_price: priceInDollars,
        internal_notes: `Tier: ${name}`,
      })
    }

    // Update the tier in your database
    const updatedTier = await prisma.tier.update({
      where: { id: tierId },
      data: {
        name,
        description: description || null,
        priceInCents,
      },
    })

    return NextResponse.json({ tier: updatedTier })
  } catch (error) {
    console.error('Tier update error:', error)
    return NextResponse.json(
      { error: 'Failed to update tier' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ tierId: string }> }
) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const { tierId } = await params

  const tier = await prisma.tier.findUnique({
    where: { id: tierId },
  })

  if (!tier || tier.creatorId !== creator.id) {
    return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
  }

  try {
    // Delete the plan from Whop
    if (tier.whopPlanId) {
      await whop.plans.delete(tier.whopPlanId)
    }

    // Delete the tier from your database
    await prisma.tier.delete({
      where: { id: tierId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Tier deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete tier' },
      { status: 500 }
    )
  }
}
```

## UI Pages (Logic Descriptions)

### app/creator/tiers/page.tsx
Server component:
- Data: `getCurrentUser()`, `prisma.creator.findUnique({ include: { tiers: { orderBy: { priceInCents: 'asc' } } } })`
- Redirect: !user → /signin, !creator → /creator/register
- Show: TierForm for creating new tiers, list of TierCards

### app/creator/tiers/TierForm.tsx
Client component form:
- Fields: name, description (optional), price (minimum $1)
- POST to `/api/creator/tiers` (create) or PUT to `/api/creator/tiers/[id]` (edit)
- On success: `router.refresh()`

### app/creator/tiers/TierCard.tsx
Client component:
- Displays tier name, description, price
- Edit button → shows TierForm inline
- Delete button → DELETE to `/api/creator/tiers/[id]` with confirmation

## Testing This Step
1. Sign in and go to http://localhost:3000/creator/dashboard
2. Click "Manage tiers" button
3. Create a tier with name, description, and price (minimum $1)
4. Check Prisma Studio → Tier table should have `whopPlanId` starting with `plan_`
5. Check Creator table → should now have `whopProductId` starting with `prod_`
6. Try editing the tier - changes should persist
7. Try deleting a tier - should remove from both database and Whop

---

# Step 7: Creator Profiles and Content

## Why This Step Matters
This step builds the **content system** - what subscribers are actually paying for. Key pieces:
- **Public profile**: Where users discover creators and see available tiers (with Subscribe buttons)
- **Posts**: The gated content that subscribers pay to access
- **minimumTierId**: Links each post to a tier, enabling content gating (implemented in Step 10)

Without this, there's nothing for subscribers to access after they pay.

**Docs**: [Locked Content and Upsells](https://docs.whop.com/manage-your-business/products/locked-premium-content.md)

## Content Gating Preview
Posts use a `minimumTierId` to specify the cheapest tier that can access the content. In Step 10, the access logic compares the user's subscription tier price against the post's minimum tier price - higher-paying subscribers can access all lower-tier content.

## app/creator/[username]/page.tsx
Public creator profile - displays creator info and tier "Subscribe" buttons.

**Note**: Subscribe buttons link to `/subscribe/[username]/[tierId]` which triggers Whop checkout (Step 8).

```
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'

interface ProfilePageProps {
  params: Promise<{ username: string }>
}

export default async function CreatorProfilePage({ params }: ProfilePageProps) {
  const { username } = await params

  const creator = await prisma.creator.findUnique({
    where: { username },
    include: {
      tiers: {
        orderBy: { priceInCents: 'asc' },
        include: { _count: { select: { subscriptions: true } } },
      },
      _count: { select: { subscriptions: true } },
    },
  })

  if (!creator) {
    notFound()
  }

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{creator.displayName}</h1>
        <p className="text-gray-600">@{creator.username}</p>
        {creator.bio && <p className="mt-4 text-gray-700">{creator.bio}</p>}
        <p className="mt-2 text-sm text-gray-500">
          {creator._count.subscriptions} subscriber{creator._count.subscriptions !== 1 ? 's' : ''}
        </p>
      </div>

      <div>
        <h2 className="text-xl font-bold mb-4">Subscribe</h2>
        {creator.tiers.length === 0 ? (
          <p className="text-gray-500">No subscription tiers available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {creator.tiers.map((tier) => (
              <div key={tier.id} className="p-6 border rounded-lg flex flex-col justify-between">
                <div>
                  <h3 className="text-lg font-medium">{tier.name}</h3>
                  {tier.description && <p className="text-sm text-gray-600 mt-1">{tier.description}</p>}
                  <p className="text-2xl font-bold mt-4">
                    ${(tier.priceInCents / 100).toFixed(2)}
                    <span className="text-sm font-normal text-gray-500">/month</span>
                  </p>
                </div>
                <Link
                  href={`/subscribe/${creator.username}/${tier.id}`}
                  className="mt-4 block text-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
                >
                  Subscribe
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
```

## app/api/creator/posts/route.ts
CRUD for creator posts. Posts require a `minimumTierId` for content gating.

Uses `requireCreator()` for authentication, Zod for validation, and rate limiting.

```
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreator } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'

const postSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be 10,000 characters or less'),
  minimumTierId: z
    .string()
    .min(1, 'You must select a minimum tier for this post'),
  published: z.boolean().optional(),
})

export async function GET() {
  const { creator, error } = await requireCreator()
  if (error) return error

  const creatorWithPosts = await prisma.creator.findUnique({
    where: { id: creator.id },
    include: {
      posts: {
        orderBy: { createdAt: 'desc' },
        include: { minimumTier: true },
      },
    },
  })

  return NextResponse.json({ posts: creatorWithPosts?.posts || [] })
}

export async function POST(request: NextRequest) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const creatorWithTiers = await prisma.creator.findUnique({
    where: { id: creator.id },
    include: { tiers: true },
  })

  const body = await request.json()
  const parsed = postSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { title, content, minimumTierId, published } = parsed.data

  // Verify the tier belongs to this creator
  const tierExists = creatorWithTiers?.tiers.some((t) => t.id === minimumTierId)
  if (!tierExists) {
    return NextResponse.json(
      { error: 'Invalid tier selected' },
      { status: 400 }
    )
  }

  try {
    const post = await prisma.post.create({
      data: {
        creatorId: creator.id,
        title,
        content,
        minimumTierId,
        published: published || false,
      },
    })

    return NextResponse.json({ post })
  } catch (error) {
    console.error('Post creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create post' },
      { status: 500 }
    )
  }
}
```

## app/api/creator/posts/[postId]/route.ts
Update and delete posts.

Uses `requireCreator()` for authentication, Zod for validation, and rate limiting.

```
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireCreator } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'

const postSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200, 'Title must be 200 characters or less'),
  content: z
    .string()
    .min(1, 'Content is required')
    .max(10000, 'Content must be 10,000 characters or less'),
  minimumTierId: z
    .string()
    .min(1, 'You must select a minimum tier for this post'),
  published: z.boolean().optional(),
})

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const { postId } = await params

  const creatorWithTiers = await prisma.creator.findUnique({
    where: { id: creator.id },
    include: { tiers: true },
  })

  const post = await prisma.post.findUnique({
    where: { id: postId },
  })

  if (!post || post.creatorId !== creator.id) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  const body = await request.json()
  const parsed = postSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { title, content, minimumTierId, published } = parsed.data

  // Verify the tier belongs to this creator
  const tierExists = creatorWithTiers?.tiers.some((t) => t.id === minimumTierId)
  if (!tierExists) {
    return NextResponse.json(
      { error: 'Invalid tier selected' },
      { status: 400 }
    )
  }

  try {
    const updatedPost = await prisma.post.update({
      where: { id: postId },
      data: {
        title,
        content,
        minimumTierId,
        published,
      },
    })

    return NextResponse.json({ post: updatedPost })
  } catch (error) {
    console.error('Post update error:', error)
    return NextResponse.json(
      { error: 'Failed to update post' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ postId: string }> }
) {
  const { user, creator, error: authError } = await requireCreator()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user!.id)
  if (rateLimitError) return rateLimitError

  const { postId } = await params

  const post = await prisma.post.findUnique({
    where: { id: postId },
  })

  if (!post || post.creatorId !== creator.id) {
    return NextResponse.json({ error: 'Post not found' }, { status: 404 })
  }

  try {
    await prisma.post.delete({
      where: { id: postId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Post deletion error:', error)
    return NextResponse.json(
      { error: 'Failed to delete post' },
      { status: 500 }
    )
  }
}
```

## UI Pages (Logic Descriptions)

### app/creator/posts/page.tsx
Server component:
- Data: `getCurrentUser()`, `prisma.creator.findUnique({ include: { tiers, posts: { include: { minimumTier } } } })`
- Redirect: !user → /signin, !creator → /creator/register
- If no tiers: Show warning prompting to create tiers first
- Show: PostForm for creating, list of PostCards

### app/creator/posts/PostForm.tsx
Client component form:
- Fields: title, content (textarea), minimumTierId (select from tiers), published (checkbox)
- POST to `/api/creator/posts` (create) or PUT to `/api/creator/posts/[id]` (edit)
- On success: `router.refresh()`

### app/creator/posts/PostCard.tsx
Client component:
- Displays title, content preview (line-clamp-2), draft badge if unpublished, minimum tier, date
- Edit button → shows PostForm inline
- Delete button → DELETE to `/api/creator/posts/[id]` with confirmation

## Testing This Step
1. Sign in as a creator and go to http://localhost:3000/creator/dashboard
2. Click "View public profile" - should see your profile with tiers and Subscribe buttons
3. Go back to dashboard and click "Create content"
4. If no tiers exist, create one first (you'll be prompted)
5. Create a post with title, content, select a minimum tier, and publish
6. Check Prisma Studio → Post table should have your post with `minimumTierId` set
7. Try editing and deleting posts

---

# Step 8: Checkouts

## Why This Step Matters
This step creates the **payment flow** - how users actually pay for subscriptions. The key WPN concept here is **checkout configurations**:
- A checkout configuration generates a `purchase_url` that redirects users to Whop's hosted checkout
- The checkout is created on the creator's **connected account** using their `plan_id`
- Metadata passes through to webhooks, linking the payment to your database records

Without checkouts, users can browse tiers but cannot purchase them.

**Docs**: [Collect Payments for Connected Accounts](https://docs.whop.com/developer/platforms/collect-payments-for-connected-accounts.md) | [Checkout Configuration API](https://docs.whop.com/api-reference/checkout-configurations/create-checkout-configuration.md)

## Payment Flow
```
User clicks "Subscribe" → /subscribe/[username]/[tierId] page
  → Clicks "Continue to checkout" → POST /api/checkout
    → whop.checkoutConfigurations.create() with creator's plan_id + metadata
      → Returns purchase_url → User redirected to Whop checkout
        → User pays → Whop sends webhook (Step 9)
          → Your app creates Subscription record
```

## app/subscribe/[username]/[tierId]/page.tsx
Pre-checkout page showing tier details before payment.

```
import { redirect, notFound } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import CheckoutButton from './CheckoutButton'

interface SubscribePageProps {
  params: Promise<{ username: string; tierId: string }>
}

export default async function SubscribePage({ params }: SubscribePageProps) {
  const { username, tierId } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect(`/signin?redirect=/subscribe/${username}/${tierId}`)
  }

  const creator = await prisma.creator.findUnique({
    where: { username },
    include: {
      tiers: { orderBy: { priceInCents: 'asc' } },
      _count: { select: { subscriptions: true } },
    },
  })

  if (!creator) notFound()

  const tier = creator.tiers.find((t) => t.id === tierId)
  if (!tier) notFound()

  // Check if already subscribed
  const existingSubscription = await prisma.subscription.findUnique({
    where: { userId_creatorId: { userId: user.id, creatorId: creator.id } },
  })

  if (existingSubscription) {
    redirect(`/creator/${username}?already_subscribed=true`)
  }

  // Count accessible posts for this tier
  const tierIndex = creator.tiers.findIndex((t) => t.id === tierId)
  const accessibleTierIds = creator.tiers.slice(0, tierIndex + 1).map((t) => t.id)
  const postCount = await prisma.post.count({
    where: { creatorId: creator.id, published: true, minimumTierId: { in: accessibleTierIds } },
  })

  return (
    <main className="min-h-screen p-8 max-w-xl mx-auto">
      <Link href={`/creator/${username}`} className="text-sm text-blue-600 hover:underline">
        ← Back to {creator.displayName}'s profile
      </Link>

      <div className="mt-6 p-6 border rounded-lg">
        <h1 className="text-2xl font-bold mb-1">Subscribe to {creator.displayName}</h1>
        <p className="text-gray-600 mb-6">@{creator.username}</p>

        <div className="p-4 bg-gray-50 rounded-lg mb-6">
          <h2 className="font-medium text-lg">{tier.name}</h2>
          {tier.description && <p className="text-sm text-gray-600 mt-1">{tier.description}</p>}
          <p className="text-3xl font-bold mt-4">
            ${(tier.priceInCents / 100).toFixed(2)}
            <span className="text-base font-normal text-gray-500">/month</span>
          </p>
        </div>

        <div className="mb-6 text-sm text-gray-600">
          <p>✓ Access to {postCount} post{postCount !== 1 ? 's' : ''}</p>
          <p>✓ Support {creator.displayName} directly</p>
          <p>✓ Cancel anytime</p>
        </div>

        <CheckoutButton creatorId={creator.id} tierId={tier.id} creatorUsername={creator.username} />

        <p className="text-xs text-gray-500 mt-4 text-center">
          Payments are securely processed by Whop
        </p>
      </div>
    </main>
  )
}
```

## app/subscribe/[username]/[tierId]/CheckoutButton.tsx
Client component that triggers checkout creation.

```
'use client'

import { useState } from 'react'

interface CheckoutButtonProps {
  creatorId: string
  tierId: string
  creatorUsername: string
}

export default function CheckoutButton({ creatorId, tierId, creatorUsername }: CheckoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCheckout() {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creatorId, tierId, creatorUsername }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to create checkout')
        return
      }

      // Redirect to Whop's hosted checkout
      window.location.href = data.checkoutUrl
    } catch (err) {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {error && (
        <div className="p-3 mb-4 bg-red-100 border border-red-300 rounded text-red-700 text-sm">
          {error}
        </div>
      )}
      <button
        onClick={handleCheckout}
        disabled={loading}
        className="w-full p-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition font-medium"
      >
        {loading ? 'Loading...' : 'Continue to checkout'}
      </button>
    </div>
  )
}
```

## app/api/checkout/route.ts
Creates a Whop checkout configuration on the creator's connected account.

**Key WPN call**: `whop.checkoutConfigurations.create()` with:
- `plan_id`: The tier's Whop plan (created in Step 6)
- `redirect_url`: Where to send user after payment (HTTPS required)
- `metadata`: Your database IDs - passed through to webhooks

Uses `requireAuth()` for authentication, Zod for validation, and rate limiting.

**Docs**: [Checkout Configuration API](https://docs.whop.com/api-reference/checkout-configurations/create-checkout-configuration.md)

```
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { requireAuth } from '@/lib/auth'
import { checkRateLimit } from '@/lib/ratelimit'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

const checkoutSchema = z.object({
  creatorId: z.string().min(1, 'Creator ID is required'),
  tierId: z.string().min(1, 'Tier ID is required'),
  creatorUsername: z.string().min(1, 'Creator username is required'),
})

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireAuth()
  if (authError) return authError

  const { error: rateLimitError } = checkRateLimit(user.id)
  if (rateLimitError) return rateLimitError

  const body = await request.json()
  const parsed = checkoutSchema.safeParse(body)

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 }
    )
  }

  const { creatorId, tierId, creatorUsername } = parsed.data

  // Get the creator and tier
  const creator = await prisma.creator.findUnique({
    where: { id: creatorId },
    include: { tiers: true },
  })

  if (!creator || !creator.whopCompanyId) {
    return NextResponse.json(
      { error: 'Creator not found or not set up for payments' },
      { status: 404 }
    )
  }

  const tier = creator.tiers.find((t) => t.id === tierId)

  if (!tier) {
    return NextResponse.json({ error: 'Tier not found' }, { status: 404 })
  }

  if (!tier.whopPlanId) {
    return NextResponse.json(
      { error: 'Tier not properly configured for payments' },
      { status: 400 }
    )
  }

  // Check if user is already subscribed
  const existingSubscription = await prisma.subscription.findUnique({
    where: {
      userId_creatorId: {
        userId: user.id,
        creatorId: creator.id,
      },
    },
  })

  if (existingSubscription) {
    return NextResponse.json(
      { error: 'You are already subscribed to this creator' },
      { status: 400 }
    )
  }

  try {
    // Use the existing plan that was created when the tier was set up
    const baseUrl = process.env.AUTH_URL || 'http://localhost:3000'
    const redirectUrl = baseUrl.startsWith('https://')
      ? `${baseUrl}/creator/${creatorUsername}?subscribed=true`
      : undefined // Whop requires https for redirect URLs

    // CREATE CHECKOUT on creator's connected account
    const checkoutConfig = await whop.checkoutConfigurations.create({
      plan_id: tier.whopPlanId,
      ...(redirectUrl && { redirect_url: redirectUrl }),
      metadata: {
        // These values come back in the webhook
        platform_user_id: user.id,
        platform_creator_id: creator.id,
        platform_tier_id: tier.id,
      },
    })

    return NextResponse.json({ checkoutUrl: checkoutConfig.purchase_url })
  } catch (error) {
    console.error('Checkout creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create checkout' },
      { status: 500 }
    )
  }
}
```

## Testing This Step
1. Sign in with a **different** Whop account (to simulate a subscriber)
2. Go to a creator's profile and click a tier's "Subscribe" button
3. On the tier details page, click "Continue to checkout"
4. Complete payment using test card `4242 4242 4242 4242`
5. After payment, you'll stay on Whop's page (redirect only works with HTTPS)
6. Check Whop sandbox dashboard → Connected accounts → [Creator's company] → Customers
7. The subscription won't appear in your database yet - that happens via webhooks (Step 9)

**Note**: Redirect back to your app only works with HTTPS URLs. For localhost testing, manually verify payment in Whop dashboard. After deployment (Step 13), redirects work automatically.

---

# Step 9: Handling Webhooks

## Why This Step Matters
Webhooks are **how your app knows a payment succeeded**. The flow is:
1. User completes checkout on Whop's hosted page
2. Whop sends a webhook to your server with payment details
3. Your server verifies the signature and creates the Subscription record

Without webhooks, your database never learns about successful payments - users would pay but get no access.

**Docs**: [Webhooks Guide](https://docs.whop.com/developer/guides/webhooks.md) | [Payment Succeeded Event](https://docs.whop.com/api-reference/payments/payment-succeeded.md)

## Webhook Architecture
```
Whop Checkout Completed
  → Whop sends POST to /api/webhooks/whop
    → whop.webhooks.unwrap() verifies signature
      → Extract metadata (user_id, creator_id, tier_id)
        → Create Subscription record in database
```

**Important**: Use **Company webhooks** (not App webhooks) for connected account payments. Company webhooks receive events for all child connected accounts automatically.

## ngrok Setup (Local Development)
Whop can't reach localhost, so use ngrok to tunnel:

```
npm install -g ngrok
ngrok http 3000
```

You'll get a URL like `https://abc123.ngrok-free.app` - use this for your webhook endpoint.

## Whop Webhook Configuration
1. Go to **sandbox.whop.com** → Developer page
2. In Webhooks section, click **Create webhook**
3. URL: `https://[your-ngrok-url]/api/webhooks/whop`
4. Enable `payment_succeeded` event
5. **Check "Connected account events"** checkbox (critical for platform payments)
6. Click Save
7. Copy the webhook secret (starts with `ws_`)

## Environment Variable
Add to `.env`:
```
WHOP_WEBHOOK_SECRET="ws_xxxxxxxxxxxxx"
```

## lib/whop.ts (Updated)
Add the `webhookKey` for signature verification:

```
import Whop from "@whop/sdk"

const isSandbox = process.env.WHOP_SANDBOX === 'true'

export const whop = new Whop({
  appID: process.env.WHOP_APP_ID,
  apiKey: process.env.WHOP_API_KEY,
  webhookKey: Buffer.from(process.env.WHOP_WEBHOOK_SECRET || "").toString('base64'),
  ...(isSandbox && { baseURL: "https://sandbox-api.whop.com/api/v1" }),
})
```

**Note**: The SDK requires base64-encoded webhook secret. The raw secret starts with `ws_`.

## app/api/webhooks/whop/route.ts
Receives and processes Whop webhooks.

**Key WPN call**: `whop.webhooks.unwrap()` - Verifies the webhook signature and returns parsed data.

```
import { NextRequest, NextResponse } from 'next/server'
import { whop } from '@/lib/whop'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const headers = Object.fromEntries(request.headers)

  try {
    // VERIFY WEBHOOK SIGNATURE
    // This ensures the webhook actually came from Whop
    const webhookData = whop.webhooks.unwrap(rawBody, { headers })

    const { type, data } = webhookData as any

    if (type === 'payment.succeeded') {
      await handlePaymentSucceeded(data)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }
}

async function handlePaymentSucceeded(data: any) {
  // Extract metadata passed from checkout configuration
  const metadata = data.checkout_configuration?.metadata || data.metadata

  const platformUserId = metadata?.platform_user_id
  const platformCreatorId = metadata?.platform_creator_id
  const platformTierId = metadata?.platform_tier_id
  const membershipId = data.membership?.id || data.id

  if (!platformUserId || !platformCreatorId || !platformTierId) {
    console.error('Missing platform metadata in payment:', { metadata })
    return
  }

  // Check for existing subscription (reactivation case)
  const existingSubscription = await prisma.subscription.findFirst({
    where: {
      userId: platformUserId,
      creatorId: platformCreatorId,
    },
  })

  if (existingSubscription) {
    // Reactivate existing subscription
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: { status: 'ACTIVE', whopMembershipId: membershipId },
    })
    return
  }

  // Create new subscription
  await prisma.subscription.create({
    data: {
      userId: platformUserId,
      creatorId: platformCreatorId,
      tierId: platformTierId,
      whopMembershipId: membershipId,  // Store for cancellation API
      status: 'ACTIVE',
    },
  })
}
```

## Webhook Events Reference
Events you can listen for:

| Event | When it fires | Use case |
|-------|---------------|----------|
| `payment.succeeded` | Payment completed | Create/activate subscription |
| `payment.failed` | Recurring payment failed | Mark as PAST_DUE |
| `membership.canceled` | Subscription ended | Mark as CANCELED |
| `refund_created` | Refund issued | Handle refunds |

This tutorial uses `payment.succeeded` as the primary event. Additional events can be added for production robustness.

## Testing This Step
1. Make sure ngrok is running: `ngrok http 3000`
2. Update webhook URL in Whop dashboard with new ngrok URL
3. Sign in with a **different** Whop account
4. Go to creator profile → Subscribe to a tier → Complete checkout with test card
5. Check your terminal for webhook log
6. Check Prisma Studio → Subscription table should have new record with:
   - `userId`: Your test user's ID
   - `creatorId`: The creator's ID
   - `tierId`: The tier's ID
   - `whopMembershipId`: Starting with `mem_`
   - `status`: ACTIVE

**Troubleshooting**:
- Webhook not received? Check ngrok is running and URL is correct in Whop dashboard
- Signature verification failed? Ensure `WHOP_WEBHOOK_SECRET` matches dashboard secret
- Missing metadata? Check that checkout was created with metadata in Step 8

---

# Step 10: Gating Creator Content

## Why This Step Matters
Content gating is **why users pay** - they're buying access to exclusive content. This step implements:
- Price-based tier hierarchy: Higher-priced tiers access all lower-tier content
- Blurred preview for locked content
- Full content display for authorized subscribers

Without gating, all content would be visible to everyone, removing the incentive to subscribe.

**Docs**: [Check Access API](https://docs.whop.com/api-reference/users/check-access.md)

## Tier Hierarchy Logic
Tiers are sorted by price. A $15/month subscriber can access:
- All $15/month tier content
- All $10/month tier content
- All $5/month tier content

```
$50 VIP Tier    → Access: VIP + Premium + Basic
$15 Premium Tier → Access: Premium + Basic
$5 Basic Tier   → Access: Basic only
```

## lib/access.ts
Helper function that determines if a user can view a post based on their subscription tier.

```
import { Tier } from '@prisma/client'

interface AccessCheckParams {
  postMinimumTierId: string | null
  userTierId: string | null
  allTiers: Tier[]
}

export function canAccessPost({
  postMinimumTierId,
  userTierId,
  allTiers,
}: AccessCheckParams): boolean {
  // Public posts (no minimum tier) are accessible to everyone
  if (!postMinimumTierId) {
    return true
  }

  // No subscription means no access to gated content
  if (!userTierId) {
    return false
  }

  // Sort tiers by price to determine hierarchy
  const sortedTiers = [...allTiers].sort((a, b) => a.priceInCents - b.priceInCents)

  const userTierIndex = sortedTiers.findIndex(t => t.id === userTierId)
  const postTierIndex = sortedTiers.findIndex(t => t.id === postMinimumTierId)

  // User can access if their tier is equal or higher than the post's minimum
  return userTierIndex >= postTierIndex
}
```

## app/creator/[username]/page.tsx (Updated)
Full creator profile with content gating. Locked posts show blurred preview.

```
import { notFound } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { canAccessPost } from '@/lib/access'
import Link from 'next/link'

interface ProfilePageProps {
  params: Promise<{ username: string }>
  searchParams: Promise<{ subscribed?: string; already_subscribed?: string }>
}

export default async function CreatorProfilePage({
  params,
  searchParams,
}: ProfilePageProps) {
  const { username } = await params
  const { subscribed, already_subscribed } = await searchParams
  const user = await getCurrentUser()

  const creator = await prisma.creator.findUnique({
    where: { username },
    include: {
      tiers: { orderBy: { priceInCents: 'asc' } },
      posts: {
        where: { published: true },
        orderBy: { createdAt: 'desc' },
        include: { minimumTier: true },
      },
      _count: { select: { subscriptions: true } },
    },
  })

  if (!creator) notFound()

  // Check user's subscription
  let userSubscription = null
  if (user) {
    userSubscription = await prisma.subscription.findUnique({
      where: { userId_creatorId: { userId: user.id, creatorId: creator.id } },
      include: { tier: true },
    })
  }

  const isActiveSubscriber = userSubscription?.status === 'ACTIVE'

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      {subscribed === 'true' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-medium">
            Thanks for subscribing! Your subscription is being processed.
          </p>
          <p className="text-green-700 text-sm mt-1">
            You'll have access to exclusive content once the payment is confirmed.
          </p>
        </div>
      )}

      {already_subscribed === 'true' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-blue-800">You're already subscribed to this creator!</p>
        </div>
      )}

      {/* Creator info */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{creator.displayName}</h1>
        <p className="text-gray-600">@{creator.username}</p>
        {creator.bio && <p className="mt-4 text-gray-700">{creator.bio}</p>}
        <p className="mt-2 text-sm text-gray-500">
          {creator._count.subscriptions} subscriber{creator._count.subscriptions !== 1 ? 's' : ''}
        </p>
        {isActiveSubscriber && userSubscription && (
          <p className="mt-2 text-sm text-green-600 font-medium">
            ✓ Subscribed to {userSubscription.tier.name}
          </p>
        )}
      </div>

      {/* Posts section with gating */}
      <div className="mb-12">
        <h2 className="text-xl font-bold mb-4">Posts</h2>
        {creator.posts.length === 0 ? (
          <p className="text-gray-500">No posts yet.</p>
        ) : (
          <div className="space-y-4">
            {creator.posts.map((post) => {
              // CHECK ACCESS using tier hierarchy
              const hasAccess = canAccessPost({
                postMinimumTierId: post.minimumTierId,
                userTierId: isActiveSubscriber ? userSubscription.tierId : null,
                allTiers: creator.tiers,
              })

              return (
                <div key={post.id} className="p-6 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-lg font-medium">{post.title}</h3>
                    {post.minimumTier && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                        {post.minimumTier.name}
                      </span>
                    )}
                  </div>

                  {hasAccess ? (
                    // UNLOCKED: Show full content
                    <p className="text-gray-700 whitespace-pre-wrap">{post.content}</p>
                  ) : (
                    // LOCKED: Show blurred preview
                    <div className="relative">
                      <p className="text-gray-400 blur-sm select-none">
                        {post.content.substring(0, 150)}...
                      </p>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <p className="text-gray-600 font-medium">Subscribe to unlock</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {post.minimumTier?.name} tier or higher
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-gray-400 mt-4">
                    {new Date(post.createdAt).toLocaleDateString()}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Subscription tiers */}
      <div>
        <h2 className="text-xl font-bold mb-4">
          {isActiveSubscriber ? 'Subscription Tiers' : 'Subscribe'}
        </h2>
        {creator.tiers.length === 0 ? (
          <p className="text-gray-500">No subscription tiers available yet.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {creator.tiers.map((tier) => {
              const isCurrentTier = userSubscription?.tierId === tier.id

              return (
                <div
                  key={tier.id}
                  className={`p-6 border rounded-lg flex flex-col justify-between ${
                    isCurrentTier ? 'border-green-500 bg-green-50' : ''
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-medium">{tier.name}</h3>
                      {isCurrentTier && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                          Current
                        </span>
                      )}
                    </div>
                    {tier.description && (
                      <p className="text-sm text-gray-600 mt-1">{tier.description}</p>
                    )}
                    <p className="text-2xl font-bold mt-4">
                      ${(tier.priceInCents / 100).toFixed(2)}
                      <span className="text-sm font-normal text-gray-500">/month</span>
                    </p>
                  </div>
                  {!isActiveSubscriber && (
                    <Link
                      href={`/subscribe/${creator.username}/${tier.id}`}
                      className="mt-4 block text-center px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
                    >
                      Subscribe
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}
```

## Testing This Step
1. As a creator: Create posts with different minimum tiers
2. Sign out and view creator profile - all posts should show "Subscribe to unlock"
3. Sign in as a subscriber with Basic tier - see Basic posts, Premium posts still locked
4. Sign in as a subscriber with Premium tier - see both Basic and Premium posts
5. Verify blurred preview shows partial content with lock overlay

---

# Step 11: Creator Payouts

## Why This Step Matters
When subscribers pay, money goes to the creator's **Whop balance** (their connected account). Creators need a way to:
1. View their balance
2. Complete identity verification (KYC)
3. Add bank accounts
4. Withdraw earnings

This step uses Whop's **hosted payout portal** - a simple redirect to Whop's page where creators manage all payout settings.

**Docs**: [Enable Connected Account Payouts](https://docs.whop.com/developer/platforms/render-payout-portal.md) | [Account Links API](https://docs.whop.com/api-reference/account-links/create-account-link.md)

## Payout Portal vs Embedded Components
- **Hosted portal** (this tutorial): Simple redirect, no extra dependencies
- **Embedded components**: Payout UI embedded directly in your app (requires additional setup)

## app/api/creator/payouts/route.ts
Generates a temporary link to Whop's hosted payout portal.

**Key WPN call**: `whop.accountLinks.create()` with `use_case: 'payouts_portal'`

Uses `requireCreator()` which checks both authentication and creator status in one call.

```
import { NextResponse } from 'next/server'
import { requireCreator } from '@/lib/auth'
import { whop } from '@/lib/whop'

export async function POST() {
  const { creator, error } = await requireCreator()
  if (error) return error

  if (!creator.whopCompanyId) {
    return NextResponse.json(
      { error: 'Creator account not set up for payments' },
      { status: 400 }
    )
  }

  const baseUrl = process.env.AUTH_URL || 'http://localhost:3000'

  // GENERATE PAYOUT PORTAL LINK
  const accountLink = await whop.accountLinks.create({
    company_id: creator.whopCompanyId,
    use_case: 'payouts_portal',
    return_url: `${baseUrl}/creator/payouts?returned=true`,
    refresh_url: `${baseUrl}/creator/payouts`,
  })

  return NextResponse.json({ url: accountLink.url })
}
```

## Account Link Use Cases
The `accountLinks.create()` API has two primary use cases:
- `'account_onboarding'` - KYC verification (Step 5)
- `'payouts_portal'` - Balance and withdrawal management (this step)

Both generate temporary URLs that expire, so generate fresh links each time.

## app/creator/payouts/page.tsx
Server component showing payout options.

```
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import Link from 'next/link'
import PayoutButton from './PayoutButton'

interface PayoutsPageProps {
  searchParams: Promise<{ returned?: string }>
}

export default async function PayoutsPage({ searchParams }: PayoutsPageProps) {
  const { returned } = await searchParams
  const user = await getCurrentUser()

  if (!user) redirect('/signin')

  const creator = await prisma.creator.findUnique({
    where: { userId: user.id },
  })

  if (!creator) redirect('/creator/register')

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">Payouts</h1>
          <p className="text-gray-600">Manage your earnings and withdrawals</p>
        </div>
        <Link href="/creator/dashboard" className="text-sm text-blue-600 hover:underline">
          ← Back to dashboard
        </Link>
      </div>

      {returned === 'true' && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800">Payout settings updated successfully.</p>
        </div>
      )}

      {!creator.whopOnboarded ? (
        <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h2 className="font-medium mb-2">Complete account setup first</h2>
          <p className="text-sm text-gray-600 mb-4">
            You need to complete your creator onboarding before you can access payouts.
          </p>
          <Link
            href="/creator/dashboard"
            className="inline-block px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition"
          >
            Go to dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="p-6 border rounded-lg">
            <h2 className="text-lg font-medium mb-2">Payout Portal</h2>
            <p className="text-gray-600 mb-4">
              Access Whop's payout portal to view your balance, complete identity verification,
              add payout methods, and withdraw your earnings.
            </p>
            <PayoutButton />
          </div>

          <div className="p-6 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">How payouts work</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Subscriber payments go to your Whop company balance</li>
              <li>• Complete identity verification (KYC) to enable withdrawals</li>
              <li>• Add a bank account or other payout method</li>
              <li>• Withdraw funds manually or set up automatic payouts</li>
            </ul>
          </div>
        </div>
      )}
    </main>
  )
}
```

## app/creator/payouts/PayoutButton.tsx
Client component that fetches and redirects to payout portal.

```
'use client'

import { useState } from 'react'

export default function PayoutButton() {
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    setLoading(true)

    try {
      const response = await fetch('/api/creator/payouts', { method: 'POST' })

      if (!response.ok) {
        throw new Error('Failed to get payout portal link')
      }

      const { url } = await response.json()
      window.location.href = url
    } catch (error) {
      console.error('Error:', error)
      alert('Failed to open payout portal. Please try again.')
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition disabled:opacity-50"
    >
      {loading ? 'Opening...' : 'Open Payout Portal'}
    </button>
  )
}
```

## Add Link to Creator Dashboard
Update `app/creator/dashboard/page.tsx` to include a Payouts link:

```
<Link
  href="/creator/payouts"
  className="block p-4 border rounded-lg hover:bg-gray-50 transition"
>
  <h3 className="font-medium">Payouts</h3>
  <p className="text-sm text-gray-600">View balance and withdraw earnings</p>
</Link>
```

## Testing This Step
1. Sign in as a creator who has completed onboarding
2. Go to http://localhost:3000/creator/dashboard
3. Click "Payouts" link
4. Click "Open Payout Portal"
5. You'll be redirected to Whop's hosted payout page
6. After returning, you should see the success message

---

# Step 12: Homepage, Subscriptions Dashboard, and Creator Discovery

## Why This Step Matters
This step completes the user-facing app with:
- **Homepage**: Landing page with creator discovery
- **Subscriptions dashboard**: Users manage and cancel subscriptions
- **Cancel flow**: Schedules cancellation at period end via WPN

The cancellation feature introduces a new WPN concept: `membership.cancel()` with `cancellation_mode: 'at_period_end'`.

**Docs**: [Cancel Membership API](https://docs.whop.com/api-reference/memberships/cancel-membership.md) | [Membership Cancel Event](https://docs.whop.com/api-reference/memberships/membership-cancel-at-period-end-changed.md)

## Schema Update: CANCELING Status
Add a status for subscriptions scheduled for cancellation:

```
enum SubscriptionStatus {
  ACTIVE
  CANCELING    // Scheduled to cancel at period end
  CANCELED
  PAST_DUE
  EXPIRED
}
```

Run migration:
```
npx prisma migrate dev --name add_canceling_status
```

## app/api/subscriptions/[id]/cancel/route.ts
Cancels subscription at period end using WPN membership API.

**Key WPN call**: `whop.memberships.cancel()` with `cancellation_mode: 'at_period_end'`

Uses `requireAuth()` for authentication.

```
import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { whop } from '@/lib/whop'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { user, error } = await requireAuth()
  if (error) return error

  const { id } = await params

  const subscription = await prisma.subscription.findUnique({
    where: { id },
  })

  if (!subscription) {
    return NextResponse.json({ error: 'Subscription not found' }, { status: 404 })
  }

  if (subscription.userId !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  if (subscription.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Subscription is not active' },
      { status: 400 }
    )
  }

  if (!subscription.whopMembershipId) {
    return NextResponse.json(
      { error: 'Subscription is not linked to Whop' },
      { status: 400 }
    )
  }

  try {
    await whop.memberships.cancel(subscription.whopMembershipId, {
      cancellation_mode: 'at_period_end',
    })

    await prisma.subscription.update({
      where: { id },
      data: { status: 'CANCELING' },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Cancel subscription error:', error)
    return NextResponse.json(
      { error: 'Failed to cancel subscription' },
      { status: 500 }
    )
  }
}
```

## app/api/webhooks/whop/route.ts (Updated)
Add handlers for cancellation webhooks.

```
import { NextRequest, NextResponse } from 'next/server'
import { whop } from '@/lib/whop'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const headers = Object.fromEntries(request.headers)

  try {
    const webhookData = whop.webhooks.unwrap(rawBody, { headers })
    const { type, data } = webhookData as any

    if (type === 'payment.succeeded') {
      await handlePaymentSucceeded(data)
    } else if (type === 'membership.cancel_at_period_end_changed') {
      await handleCancelAtPeriodEndChanged(data)
    } else if (type === 'membership.deactivated') {
      await handleMembershipDeactivated(data)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook verification failed:', error)
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 })
  }
}

async function handlePaymentSucceeded(data: any) {
  const metadata = data.checkout_configuration?.metadata || data.metadata
  const platformUserId = metadata?.platform_user_id
  const platformCreatorId = metadata?.platform_creator_id
  const platformTierId = metadata?.platform_tier_id
  const membershipId = data.membership?.id || data.id

  if (!platformUserId || !platformCreatorId || !platformTierId) {
    console.error('Missing platform metadata in payment:', { metadata })
    return
  }

  const existingSubscription = await prisma.subscription.findFirst({
    where: { userId: platformUserId, creatorId: platformCreatorId },
  })

  if (existingSubscription) {
    await prisma.subscription.update({
      where: { id: existingSubscription.id },
      data: { status: 'ACTIVE', whopMembershipId: membershipId },
    })
    return
  }

  await prisma.subscription.create({
    data: {
      userId: platformUserId,
      creatorId: platformCreatorId,
      tierId: platformTierId,
      whopMembershipId: membershipId,
      status: 'ACTIVE',
    },
  })
}

async function handleCancelAtPeriodEndChanged(data: any) {
  const membershipId = data.id
  if (!membershipId) return

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
  })

  if (!subscription) return

  // Toggle between CANCELING and ACTIVE based on cancel_at_period_end flag
  const newStatus = data.cancel_at_period_end ? 'CANCELING' : 'ACTIVE'

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: newStatus },
  })
}

async function handleMembershipDeactivated(data: any) {
  const membershipId = data.id

  const subscription = await prisma.subscription.findUnique({
    where: { whopMembershipId: membershipId },
  })

  if (!subscription) return

  await prisma.subscription.update({
    where: { id: subscription.id },
    data: { status: 'CANCELED' },
  })
}
```

## Update Whop Webhook Settings
Add the new event to your webhook in Whop dashboard:
1. Developer page → Edit webhook
2. Enable `membership_cancel_at_period_end_changed` event
3. Enable `membership_deactivated` event (optional, for final cancellation)
4. Save

## UI Components

### app/subscriptions/page.tsx
Server component:
- Data: `prisma.subscription.findMany({ where: { userId, status: { in: ['ACTIVE', 'CANCELING'] } }, include: { creator, tier } })`
- Shows subscription cards with cancel button (if ACTIVE) or "Cancels at period end" badge (if CANCELING)

### app/subscriptions/CancelButton.tsx
Client component:
- Shows confirmation dialog before canceling
- POST to `/api/subscriptions/[id]/cancel`
- On success: `router.refresh()`

### app/LogoutButton.tsx
Client component for sign out functionality.

```
'use client'

export default function LogoutButton() {
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    window.location.href = '/'
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-600 hover:text-red-600 transition"
    >
      Sign out
    </button>
  )
}
```

### app/Header.tsx
Server component with navigation and authentication state.

```
import Link from 'next/link'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import LogoutButton from './LogoutButton'

export default async function Header() {
  const user = await getCurrentUser()

  let creator = null
  if (user) {
    creator = await prisma.creator.findUnique({
      where: { userId: user.id },
      select: { username: true },
    })
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="max-w-4xl mx-auto px-8 py-4 flex items-center justify-between">
        <Link href="/" className="font-bold text-lg text-gray-900">
          Creator Platform
        </Link>

        <nav className="flex items-center gap-6">
          {user ? (
            <>
              <Link
                href="/subscriptions"
                className="text-sm text-gray-600 hover:text-green-600 transition"
              >
                Subscriptions
              </Link>
              {creator ? (
                <Link
                  href={`/creator/${creator.username}`}
                  className="text-sm text-gray-600 hover:text-green-600 transition"
                >
                  My Profile
                </Link>
              ) : (
                <Link
                  href="/dashboard"
                  className="text-sm text-gray-600 hover:text-green-600 transition"
                >
                  Dashboard
                </Link>
              )}
              <LogoutButton />
            </>
          ) : (
            <Link
              href="/signin"
              className="text-sm px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  )
}
```

### app/page.tsx (Homepage)
Server component with pagination support.

```
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import Link from 'next/link'
import CreatorSearch from './CreatorSearch'

const CREATORS_PER_PAGE = 12

interface HomePageProps {
  searchParams: Promise<{ page?: string }>
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const { page } = await searchParams
  const user = await getCurrentUser()

  const currentPage = Math.max(1, parseInt(page || '1', 10))
  const skip = (currentPage - 1) * CREATORS_PER_PAGE

  const [creators, totalCount] = await Promise.all([
    prisma.creator.findMany({
      select: {
        id: true,
        username: true,
        displayName: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: CREATORS_PER_PAGE,
    }),
    prisma.creator.count(),
  ])

  const totalPages = Math.ceil(totalCount / CREATORS_PER_PAGE)

  return (
    <main className="min-h-screen">
      <div className="py-20 px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6 text-gray-900">
            Support creators you love
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Subscribe to your favorite creators and get access to exclusive content. Join a community of fans and creators.
          </p>
          {user ? (
            <Link
              href="/dashboard"
              className="inline-block px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
            >
              Go to Dashboard
            </Link>
          ) : (
            <Link
              href="/signin"
              className="inline-block px-6 py-3 bg-green-500 text-white font-medium rounded-lg hover:bg-green-600 transition"
            >
              Get started
            </Link>
          )}
        </div>
      </div>

      <div className="py-16 px-8 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-12 text-gray-900">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <img
                src="/FindCreators.svg"
                alt="Find creators"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h3 className="font-semibold mb-2 text-gray-900">Find creators</h3>
              <p className="text-gray-600 text-sm">
                Discover creators who share content you care about.
              </p>
            </div>
            <div className="text-center">
              <img
                src="/Subscribe.svg"
                alt="Subscribe"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h3 className="font-semibold mb-2 text-gray-900">Subscribe</h3>
              <p className="text-gray-600 text-sm">
                Choose a tier that fits your budget and subscribe monthly.
              </p>
            </div>
            <div className="text-center">
              <img
                src="/EnjoyContent.svg"
                alt="Enjoy content"
                width={48}
                height={48}
                className="mx-auto mb-4"
              />
              <h3 className="font-semibold mb-2 text-gray-900">Enjoy content</h3>
              <p className="text-gray-600 text-sm">
                Get access to exclusive posts and support creators directly.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8 text-gray-900">Find creators</h2>
          <CreatorSearch
            creators={creators}
            currentPage={currentPage}
            totalPages={totalPages}
          />
        </div>
      </div>
    </main>
  )
}
```

### app/CreatorSearch.tsx
Client component with search and pagination.

```
'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Creator {
  id: string
  username: string
  displayName: string
}

interface CreatorSearchProps {
  creators: Creator[]
  currentPage: number
  totalPages: number
}

export default function CreatorSearch({ creators, currentPage, totalPages }: CreatorSearchProps) {
  const router = useRouter()
  const [search, setSearch] = useState('')

  const filteredCreators = creators.filter((creator) => {
    const searchLower = search.toLowerCase()
    return (
      creator.displayName.toLowerCase().includes(searchLower) ||
      creator.username.toLowerCase().includes(searchLower)
    )
  })

  function goToPage(page: number) {
    router.push(`/?page=${page}`)
  }

  return (
    <div>
      <input
        type="text"
        placeholder="Search by name or username..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full p-3 border border-gray-300 rounded-lg mb-6 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
      />

      {filteredCreators.length === 0 ? (
        <p className="text-center text-gray-500">
          {search ? 'No creators found.' : 'No creators yet.'}
        </p>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCreators.map((creator) => (
              <Link
                key={creator.id}
                href={`/creator/${creator.username}`}
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:border-green-300 hover:shadow-sm transition"
              >
                <p className="font-medium text-gray-900">{creator.displayName}</p>
                <p className="text-sm text-gray-500">@{creator.username}</p>
              </Link>
            ))}
          </div>

          {totalPages > 1 && !search && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage <= 1}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
```

## Testing This Step
1. Visit http://localhost:3000 - see homepage with creator search
2. Search for creators - filter works on name/username
3. Log in and go to /subscriptions
4. If you have active subscriptions, click Cancel
5. Confirm cancellation - status changes to "Cancels at period end"
6. Check Prisma Studio - subscription status should be CANCELING
7. Verify webhook receives `membership.cancel_at_period_end_changed` event

---

# Step 13: Deploying the Project

## Why This Step Matters
Moving from sandbox to production involves:
1. **Production Whop credentials**: Real API keys from whop.com (not sandbox.whop.com)
2. **Cloud database**: Vercel Postgres/Neon instead of local PostgreSQL
3. **HTTPS**: Required for OAuth redirects and webhook URLs
4. **Production webhook**: New webhook pointing to deployed URL

Without deployment, your app only works locally - no real payments, no OAuth redirects.

**Docs**: [Sandbox Testing Guide](https://docs.whop.com/developer/guides/sandbox.md)

## Production vs Sandbox
| Aspect | Sandbox | Production |
|--------|---------|------------|
| Dashboard | sandbox.whop.com | whop.com |
| API | sandbox-api.whop.com | api.whop.com |
| Payments | Test cards only | Real payments |
| OAuth | Works on localhost | Requires HTTPS |

## 1. Get Production Whop Credentials
Go to **whop.com** (not sandbox):

### Company ID
- Dashboard URL contains `biz_xxxxxxxxxxxxx`

### API Key
Developer page → Company API Keys → Create with same permissions as sandbox (see Step 4).

### App ID
Developer page → Apps → Create app → Copy `app_xxxxxxxxxxxxx`

## 2. Generate New Session Secret
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Use a NEW secret for production (don't reuse development secret).

## 3. Update Prisma for Vercel Postgres
Update `prisma/schema.prisma` datasource:

```
datasource db {
  provider  = "postgresql"
  url       = env("POSTGRES_PRISMA_URL")
  directUrl = env("POSTGRES_URL_NON_POOLED")
}
```

Add to `package.json` scripts:
```
"postinstall": "prisma generate"
```

## 4. Push to GitHub
```
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/your-username/project-name.git
git branch -M main
git push -u origin main
```

## 5. Deploy to Vercel

### Initial Deployment
1. Vercel.com → Add new → Project
2. Import your GitHub repository
3. Add environment variables (see Environment Variables section at top)
4. Deploy (will fail until database is set up)

### Create Database
1. Vercel project → Storage tab
2. Create Database → Neon
3. Select region, plan, name
4. Connect to your project

### Run Migrations
Add Vercel Postgres URLs to local `.env`, then run:
```
npx prisma migrate deploy
```

### Configure Whop for Production
1. Update OAuth redirect: `https://your-project.vercel.app/api/auth/callback`
2. Create production webhook: `https://your-project.vercel.app/api/webhooks/whop`
3. Enable "Connected account events" and required webhook events
4. Update `WHOP_WEBHOOK_SECRET` in Vercel

### Redeploy
Deployments → Context menu → Redeploy

## Testing Production
Verify these all work:
1. Sign in with Whop OAuth
2. Register as a creator
3. Complete KYC onboarding
4. Create tiers and posts
5. Subscribe to a creator (real payment)
6. View gated content
7. Cancel subscription
8. Access payout portal

---

# Step 14: What's Next

## Extension Ideas

### Payment & Subscription Features (WPN)
- **Promo codes**: [Create Promo Code API](https://docs.whop.com/api-reference/promo-codes/create-promo-code.md)
- **Free trials**: [Free Trials Guide](https://docs.whop.com/manage-your-business/products/free-trials.md)
- **Annual memberships**: Create yearly billing plans with different `billing_period`
- **Tier upgrades/downgrades**: [Update Membership API](https://docs.whop.com/api-reference/memberships/update-membership.md)
- **Embedded checkouts**: [Embed Checkout Guide](https://docs.whop.com/payments/checkout-embed.md)
- **Failed payment handling**: [Payment Failed Event](https://docs.whop.com/api-reference/payments/payment-failed.md)
- **Refunds**: [Refund Payment API](https://docs.whop.com/api-reference/payments/refund-payment.md)

### Creator Tools
- **Analytics dashboard**: Revenue trends, subscriber growth
- **File attachments**: Storage system for post attachments
- **Scheduled posts**: Future-dated publishing
- **Subscriber management**: View/manage subscriber list
- **Custom profiles**: Colors, banners, profile pictures

### Subscriber Experience
- **Comments/likes**: Engagement features on posts
- **Content search**: Search within creator's posts

### Growth
- **Creator categories/tags**: Browsable categories
- **Featured creators**: Homepage highlights
- **SEO**: Meta tags, Open Graph, structured data

### Technical
- **Rate limiting**: Protect API routes
- **Error monitoring**: Sentry or similar
- **Caching**: Redis/edge caching for performance
- **Mobile app**: [Whop iOS SDK](https://docs.whop.com/developer/guides/ios/overview.md) | [React Native Guide](https://docs.whop.com/developer/guides/react-native.md)
- **AI integration**: [AI and MCP Guide](https://docs.whop.com/developer/guides/ai_and_mcp.md)
