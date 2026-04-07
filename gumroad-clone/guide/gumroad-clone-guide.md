# Building Shelfie: A Gumroad Clone with Next.js and Whop

A multi-seller digital product marketplace where users sign up, become sellers, upload digital products (PDFs, images, videos, templates), set their own prices, and publish to a shared storefront. Buyers browse, purchase, and download what they bought. The platform takes a 5% cut of every sale.

**Demo:** https://shelfie-rust.vercel.app/
**GitHub:** https://github.com/whopio/whop-tutorials/tree/main/gumroad-clone

## Tech Stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, Whop OAuth + Whop for Platforms, Neon (Postgres), Prisma 7, UploadThing, iron-session 8, Zod 4, Vercel.

## Pages

- `/` - Landing page (hero, search, trending products, categories, seller CTA)
- `/sign-in` - Sign-in card with Whop OAuth button
- `/products` - Browse/search with category filters and pagination
- `/products/[slug]` - Product detail with purchase card and cookie ratings
- `/products/[slug]/download` - Access-gated download page
- `/sellers/[username]` - Public seller profile
- `/sell` - Become a seller (connect Whop account)
- `/sell/kyc-return` - KYC completion handler
- `/sell/dashboard` - Seller dashboard (earnings, products, bio editing)
- `/sell/products/new` - Create product form
- `/sell/products/[productId]/edit` - Edit/publish/unpublish/delete product
- `/dashboard` - Buyer purchase history

## API Routes

- `/api/auth/login` - Whop OAuth initiation with PKCE
- `/api/auth/callback` - OAuth callback, token exchange, user upsert
- `/api/auth/logout` - Session destroy (POST only)
- `/api/sell/onboard` - Create connected account + KYC
- `/api/sell/complete-kyc` - Mark KYC complete
- `/api/sell/profile` - PATCH seller headline/bio
- `/api/sell/products` - POST create product
- `/api/sell/products/[productId]` - PATCH update, DELETE remove
- `/api/sell/products/[productId]/publish` - Create Whop checkout config
- `/api/sell/products/[productId]/unpublish` - Revert to draft
- `/api/products/[productId]/purchase` - Free product purchase
- `/api/products/[productId]/like` - Toggle like
- `/api/products/[productId]/rate` - Cookie rating (0.5-5)
- `/api/uploadthing` - File upload endpoint
- `/api/webhooks/whop` - Whop payment webhooks

## Payment Flow

1. Seller clicks "Get Started" and creates a connected account through Whop's hosted KYC flow
2. Seller publishes a product - the app creates a Whop product and checkout configuration with a 5% application fee
3. Buyer clicks "Buy Now" and pays through Whop's hosted checkout
4. Whop fires a `payment.succeeded` webhook - the app creates a Purchase record
5. Seller manages payouts through Whop's dashboard

## Setup

```bash
npx create-next-app@latest shelfie --ts --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"
```

```bash
npm install @whop/sdk @prisma/client @prisma/adapter-pg pg iron-session zod lucide-react next-themes clsx tailwind-merge dotenv uploadthing @uploadthing/react
npm install -D prisma @types/pg@8.11.11
```

### Environment Variables

| Variable | Source |
|----------|--------|
| `DATABASE_URL` | Neon via Vercel integration (pooled) |
| `DATABASE_URL_UNPOOLED` | Neon via Vercel integration (direct) |
| `WHOP_CLIENT_ID` | Whop app > OAuth tab |
| `WHOP_CLIENT_SECRET` | Whop app > OAuth tab |
| `WHOP_API_KEY` | Whop app > Developer > API Keys |
| `WHOP_COMPANY_ID` | Dashboard URL (starts with `biz_`) |
| `WHOP_COMPANY_API_KEY` | Business Settings > API Keys |
| `WHOP_WEBHOOK_SECRET` | Developer > Webhooks (starts with `ws_`) |
| `SESSION_SECRET` | `openssl rand -base64 32` |
| `NEXT_PUBLIC_APP_URL` | Your Vercel URL |
| `UPLOADTHING_TOKEN` | uploadthing.com project settings |
| `WHOP_SANDBOX` | `true` for development, remove for production |
| `PLATFORM_FEE_PERCENT` | Default 5 |

### Whop App Setup

Use Whop Sandbox (`sandbox.whop.com`) for development. Create an app, copy Client ID and Client Secret from the OAuth tab, add redirect URIs: `http://localhost:3000/api/auth/callback` and `https://your-vercel-url.vercel.app/api/auth/callback`.

### Webhook Setup

In sandbox.whop.com > Developer > Webhooks, create a webhook pointing to `https://your-vercel-url.vercel.app/api/webhooks/whop`. Enable the `payment.succeeded` event. Copy the webhook secret.

## Database Schema

```prisma
generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

model User {
  id         String   @id @default(cuid())
  whopUserId String   @unique
  email      String
  name       String?
  avatar     String?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt

  sellerProfile SellerProfile?
  purchases     Purchase[]
  likes         Like[]
  ratings       Rating[]
}

model SellerProfile {
  id             String   @id @default(cuid())
  userId         String   @unique
  username       String   @unique
  headline       String?
  bio            String?
  whopCompanyId  String   @unique
  kycComplete    Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user     User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  products Product[]
}

enum Category {
  TEMPLATES
  EBOOKS
  SOFTWARE
  DESIGN
  AUDIO
  VIDEO
  PHOTOGRAPHY
  EDUCATION
  OTHER
}

enum ProductStatus {
  DRAFT
  PUBLISHED
}

model Product {
  id               String        @id @default(cuid())
  sellerProfileId  String
  title            String
  slug             String        @unique
  description      String
  price            Int           @default(0)
  category         Category      @default(OTHER)
  status           ProductStatus @default(DRAFT)
  thumbnailUrl     String?
  content          String?
  externalUrl      String?
  whopProductId    String?
  whopPlanId       String?
  whopCheckoutUrl  String?
  createdAt        DateTime      @default(now())
  updatedAt        DateTime      @updatedAt

  sellerProfile SellerProfile @relation(fields: [sellerProfileId], references: [id], onDelete: Cascade)
  files         ProductFile[]
  purchases     Purchase[]
  likes         Like[]
  ratings       Rating[]
}

model ProductFile {
  id           String @id @default(cuid())
  productId    String
  fileName     String
  fileKey      String
  fileUrl      String
  fileSize     Int
  mimeType     String
  displayOrder Int    @default(0)

  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)
}

model Purchase {
  id            String   @id @default(cuid())
  userId        String
  productId     String
  pricePaid     Int      @default(0)
  whopPaymentId String?
  createdAt     DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}

model Like {
  id        String   @id @default(cuid())
  userId    String
  productId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}

model Rating {
  id        String   @id @default(cuid())
  userId    String
  productId String
  cookies   Float
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  product Product @relation(fields: [productId], references: [id], onDelete: Cascade)

  @@unique([userId, productId])
}

model WebhookEvent {
  id          String   @id
  processedAt DateTime @default(now())
}
```

## Core Libraries

### Environment Validation (`src/lib/env.ts`)

Zod validates env vars lazily via Proxy - only throws when a variable is accessed, not at import time.

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

### Whop SDK (`src/lib/whop.ts`)

Two SDK clients: `getWhop()` with app API key for general operations, `getCompanyWhop()` with company API key for product/checkout creation. Both sandbox-aware.

```ts
import Whop from "@whop/sdk";

const isSandbox = process.env.WHOP_SANDBOX === "true";

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

### Other Libraries

- **`src/lib/prisma.ts`** - PrismaClient singleton with `PrismaPg` adapter and `Pool` from `pg`. Uses `env.DATABASE_URL` (pooled connection). Stored on `globalThis` to prevent connection exhaustion during dev hot reloads.
- **`src/lib/session.ts`** - iron-session encrypted cookie named `shelfie_session`. Stores `userId`, `whopUserId`, and `accessToken`. Uses `env.SESSION_SECRET`.
- **`src/lib/auth.ts`** - Three auth levels: `getAuthUser()` returns user or null, `requireAuth()` redirects to `/sign-in`, `requireSeller()` redirects to `/sell` if no KYC-complete SellerProfile. Also exports `completeKycIfNeeded(userId)` for KYC return flow.
- **`src/lib/utils.ts`** - `cn()` (Tailwind class merge), `formatPrice(cents)` (returns "$X.XX" or "Free"), `generateSlug(title)` and `generateUsername(name)` (append random suffix for uniqueness), `formatFileSize(bytes)`.
- **`prisma.config.ts`** - Loads `.env.local` via dotenv, uses `DATABASE_URL_UNPOOLED` for CLI operations.

## Authentication (Whop OAuth with PKCE)

### Login Route (`src/app/api/auth/login/route.ts`)

Generates PKCE challenge, stores verifier in httpOnly cookie, redirects to Whop OAuth page.

```ts
import { NextResponse } from "next/server";
import { WHOP_OAUTH_BASE } from "@/lib/whop";
import { env } from "@/lib/env";

export async function GET() {
  const clientId = env.WHOP_CLIENT_ID;
  const redirectUri = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

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

### Callback Route (`src/app/api/auth/callback/route.ts`)

Exchanges code for tokens via Whop OAuth, fetches user profile from OIDC userinfo endpoint, upserts user in database, creates session.

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
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/sign-in?error=invalid_state`);
  }

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
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/sign-in?error=token_exchange`);
  }

  const tokens = await tokenRes.json();

  const userInfoRes = await fetch(`${WHOP_OAUTH_BASE}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userInfoRes.ok) {
    return NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/sign-in?error=userinfo`);
  }

  const userInfo = await userInfoRes.json();

  const user = await prisma.user.upsert({
    where: { whopUserId: userInfo.sub },
    update: { email: userInfo.email, name: userInfo.name || userInfo.preferred_username, avatar: userInfo.picture },
    create: { whopUserId: userInfo.sub, email: userInfo.email, name: userInfo.name || userInfo.preferred_username, avatar: userInfo.picture },
  });

  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = user.whopUserId;
  session.accessToken = tokens.access_token;
  await session.save();

  const response = NextResponse.redirect(`${env.NEXT_PUBLIC_APP_URL}/dashboard`);
  response.cookies.delete("oauth_code_verifier");
  response.cookies.delete("oauth_state");
  return response;
}
```

### Other Auth Files

- **`src/app/api/auth/logout/route.ts`** - POST-only, calls `session.destroy()`, redirects to `/`.
- **`src/app/sign-in/page.tsx`** - Single "Sign in with Whop" button using `<a href="/api/auth/login">` (not `<Link>`, because the login route redirects to an external URL). Displays OAuth error messages via `?error=` query params.
- **`src/components/navbar.tsx`** - Server component that reads session. Shows "Sign In" for guests, avatar + nav links + logout form for authenticated users.

## Seller Onboarding

### Onboard Route (`src/app/api/sell/onboard/route.ts`)

Creates a Whop connected account (`companies.create`), generates KYC link (`accountLinks.create`), saves SellerProfile. In sandbox mode, KYC is skipped (set `kycComplete: true` immediately).

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getWhop } from "@/lib/whop";
import { generateUsername } from "@/lib/utils";
import { env } from "@/lib/env";

const isSandbox = process.env.WHOP_SANDBOX === "true";

export async function POST() {
  const session = await getSession();
  if (!session.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    include: { sellerProfile: true },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (user.sellerProfile?.kycComplete) {
    return NextResponse.json({ redirect: "/sell/dashboard" });
  }

  if (user.sellerProfile) {
    if (isSandbox) {
      await prisma.sellerProfile.update({ where: { id: user.sellerProfile.id }, data: { kycComplete: true } });
      return NextResponse.json({ sandbox: true });
    }
    const accountLink = await getWhop().accountLinks.create({
      company_id: user.sellerProfile.whopCompanyId,
      use_case: "account_onboarding",
      return_url: `${env.NEXT_PUBLIC_APP_URL}/sell/kyc-return`,
      refresh_url: `${env.NEXT_PUBLIC_APP_URL}/sell?refresh=true`,
    });
    return NextResponse.json({ redirect: accountLink.url });
  }

  const company = await getWhop().companies.create({
    email: user.email,
    title: `${user.name || "Seller"}'s Store`,
    parent_company_id: env.WHOP_COMPANY_ID,
  });

  const username = generateUsername(user.name);

  if (isSandbox) {
    await prisma.sellerProfile.create({
      data: { userId: user.id, username, whopCompanyId: company.id, kycComplete: true },
    });
    return NextResponse.json({ sandbox: true });
  }

  await prisma.sellerProfile.create({
    data: { userId: user.id, username, whopCompanyId: company.id, kycComplete: false },
  });

  const accountLink = await getWhop().accountLinks.create({
    company_id: company.id,
    use_case: "account_onboarding",
    return_url: `${env.NEXT_PUBLIC_APP_URL}/sell/kyc-return`,
    refresh_url: `${env.NEXT_PUBLIC_APP_URL}/sell?refresh=true`,
  });

  return NextResponse.json({ redirect: accountLink.url });
}
```

### Other Onboarding Files

- **`src/app/sell/page.tsx`** - Client component wrapped in `Suspense`. Pitches users on selling, POSTs to `/api/sell/onboard`. Shows sandbox success message or KYC incomplete warning (`?kyc=incomplete`). Button text toggles between "Get Started" and "Complete Verification".
- **`src/app/sell/kyc-return/page.tsx`** - Calls `/api/sell/complete-kyc` to flip `kycComplete = true`, then redirects to dashboard.
- **`src/app/api/sell/complete-kyc/route.ts`** - POST endpoint that calls `completeKycIfNeeded(userId)`.

## File Uploads (UploadThing)

### File Router (`src/app/api/uploadthing/core.ts`)

```ts
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { getSession } from "@/lib/session";

const f = createUploadthing();

export const ourFileRouter = {
  productFile: f({
    pdf: { maxFileSize: "16MB", maxFileCount: 10 },
    image: { maxFileSize: "16MB", maxFileCount: 10 },
    video: { maxFileSize: "16MB", maxFileCount: 10 },
  })
    .middleware(async () => {
      const session = await getSession();
      if (!session.userId) throw new UploadThingError("Unauthorized");
      return { userId: session.userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { uploadedBy: metadata.userId, name: file.name, size: file.size, key: file.key, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
```

### Route Handler (`src/app/api/uploadthing/route.ts`)

```ts
import { createRouteHandler } from "uploadthing/next";
import { ourFileRouter } from "./core";

export const { GET, POST } = createRouteHandler({ router: ourFileRouter });
```

### Client Helper (`src/lib/uploadthing.ts`)

```ts
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "@/app/api/uploadthing/core";

export const { useUploadThing } = generateReactHelpers<OurFileRouter>();
```

## Product Management

- **`src/app/api/sell/products/route.ts`** - POST endpoint. Validates input with Zod (title, description, price in cents, category enum, optional content/externalUrl/files). Generates a unique slug with random suffix. Creates product as DRAFT with nested ProductFile records. Auto-sets thumbnail from first uploaded image.
- **`src/app/api/sell/products/[productId]/route.ts`** - PATCH updates fields, adds new files, removes files by ID. Published products can't be edited (must unpublish first). DELETE removes the product entirely.
- **`src/app/sell/products/new/page.tsx`** - Client component with `useUploadThing` hook, custom drag-and-drop zone, client-side file validation (type + 16MB limit), form submission that POSTs to the create endpoint.
- **`src/app/sell/products/[productId]/edit/page.tsx`** - Server component. Shows `EditForm` for drafts, read-only view for published products. Imports `PublishButton`, `UnpublishButton`, `DeleteButton` from `@/components/`.
- **`src/components/edit-form.tsx`** - Client component for editing all product fields + managing files via UploadThing.
- **`src/components/publish-button.tsx`** - Client component, error tooltip auto-dismisses after 4 seconds.
- **`src/components/unpublish-button.tsx`** + **`src/components/delete-button.tsx`** - Both use two-click confirmation pattern (first click shows "Confirm?", resets after 3 seconds).

### Publish Route (`src/app/api/sell/products/[productId]/publish/route.ts`)

Creates Whop product on seller's connected account, then creates checkout configuration with platform fee. Uses `getCompanyWhop()` because the app API key lacks `access_pass:create` permission. Important: `company_id` goes on the `plan` object only, NOT top-level.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getCompanyWhop } from "@/lib/whop";
import { env } from "@/lib/env";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const { productId } = await params;
  const session = await getSession();
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sellerProfile = await prisma.sellerProfile.findUnique({ where: { userId: session.userId } });
  if (!sellerProfile || !sellerProfile.kycComplete) {
    return NextResponse.json({ error: "Complete seller onboarding first" }, { status: 403 });
  }

  const product = await prisma.product.findUnique({ where: { id: productId }, include: { files: true } });
  if (!product || product.sellerProfileId !== sellerProfile.id) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }
  if (product.status === "PUBLISHED") {
    return NextResponse.json({ error: "Product is already published" }, { status: 400 });
  }

  if (product.files.length === 0 && !product.content && !product.externalUrl) {
    return NextResponse.json({ error: "Product must have at least one file, text content, or external link" }, { status: 400 });
  }

  try {
    const whopProduct = await getCompanyWhop().products.create({
      company_id: sellerProfile.whopCompanyId,
      title: product.title,
      description: product.description,
    });

    const feePercent = env.PLATFORM_FEE_PERCENT;

    if (product.price === 0) {
      const updated = await prisma.product.update({
        where: { id: productId },
        data: { status: "PUBLISHED", whopProductId: whopProduct.id },
      });
      return NextResponse.json(updated);
    }

    const feeAmount = Math.round(product.price * (feePercent / 100));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const checkoutConfig = await (getCompanyWhop().checkoutConfigurations.create as any)({
      plan: {
        company_id: sellerProfile.whopCompanyId,
        currency: "usd",
        initial_price: product.price / 100,
        plan_type: "one_time",
        application_fee_amount: feeAmount / 100,
      },
    });

    const updated = await prisma.product.update({
      where: { id: productId },
      data: {
        status: "PUBLISHED",
        whopProductId: whopProduct.id,
        whopPlanId: checkoutConfig.plan?.id ?? null,
        whopCheckoutUrl: checkoutConfig.purchase_url,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("Publish error:", err);
    const message = err instanceof Error ? err.message : "Whop API error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
```

## Marketplace

- **`src/components/product-card.tsx`** - Reusable card showing thumbnail (4:3 aspect), title, seller username, price badge, like count, cookie rating display, file count, and category label. Accepts `avgRating` and `_count.ratings` for cookie display.
- **`src/app/products/page.tsx`** - Catalog page with search input (native `<form>` GET submission), category filter pills, product grid, and pagination. All state via URL search params. Includes `ratings` in Prisma query and calculates `avgRating` for each product card.
- **`src/app/products/[slug]/page.tsx`** - Product detail page. Two-column layout on desktop (content + sticky purchase card), fixed bottom bar on mobile. Shows description, file list with lock icons, seller info with headline. Purchase card has three states: "Buy Now" (paid), "Get for Free" (free), "Download" (purchased). Includes `CookieRating` component and `LikeButton`.
- **`src/components/like-button.tsx`** - Client component with optimistic updates using `useTransition`. Toggles like via POST to `/api/products/[productId]/like`.
- **`src/app/api/products/[productId]/like/route.ts`** - Toggles: if Like record exists, deletes it; otherwise creates one.
- **`src/app/api/products/[productId]/rate/route.ts`** - Validates cookies value (0.5-5 in 0.5 increments) with Zod `VALID_RATINGS` array, requires purchase, upserts Rating.
- **`src/components/cookie-rating.tsx`** - Custom SVG cookie icons (full with chocolate chips, half-bitten with crumbs, empty outline). Interactive mode for purchasers with left/right half-click zones. Display mode for read-only average. Exports `CookieDisplay` for use in product cards.
- **`src/app/sellers/[username]/page.tsx`** - Public seller profile showing avatar, name, headline, bio, product count, sales count, and published products grid.

## Payments and Webhooks

### Webhook Handler (`src/app/api/webhooks/whop/route.ts`)

Verifies webhook signature via `getWhop().webhooks.unwrap()`. Falls back to raw JSON parsing if signature verification fails. Checks idempotency via `WebhookEvent` table. Creates `Purchase` record via upsert.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getWhop } from "@/lib/whop";

type WhopEvent = {
  type: string;
  id: string;
  data: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headerObj = Object.fromEntries(request.headers);
  const whop = getWhop();

  let webhookData: WhopEvent;
  try {
    webhookData = whop.webhooks.unwrap(bodyText, { headers: headerObj }) as unknown as WhopEvent;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    try {
      webhookData = JSON.parse(bodyText) as WhopEvent;
    } catch {
      return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
    }
  }

  const eventId = webhookData.id;
  if (!eventId) return NextResponse.json({ error: "Missing event ID" }, { status: 400 });

  const existing = await prisma.webhookEvent.findUnique({ where: { id: eventId } });
  if (existing) return NextResponse.json({ status: "already_processed" });

  if (webhookData.type === "payment.succeeded") {
    const payment = webhookData.data;
    const plan = payment?.plan as Record<string, unknown> | undefined;
    const user = payment?.user as Record<string, unknown> | undefined;
    const planId = plan?.id as string | undefined;
    const whopUserId = user?.id as string | undefined;

    if (!planId || !whopUserId) {
      console.error("Missing plan or user on payment webhook:", JSON.stringify(webhookData.data, null, 2));
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const product = await prisma.product.findFirst({ where: { whopPlanId: planId } });
    if (!product) return NextResponse.json({ error: "Product not found" }, { status: 404 });

    const dbUser = await prisma.user.findUnique({ where: { whopUserId } });
    if (!dbUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    await prisma.purchase.upsert({
      where: { userId_productId: { userId: dbUser.id, productId: product.id } },
      update: {},
      create: {
        userId: dbUser.id,
        productId: product.id,
        whopPaymentId: payment.id as string,
        pricePaid: Math.round(((payment.subtotal as number) ?? 0) * 100),
      },
    });

    await prisma.webhookEvent.create({ data: { id: eventId } });
  }

  return NextResponse.json({ status: "ok" });
}
```

### Free Product Purchase

- **`src/app/api/products/[productId]/purchase/route.ts`** - POST endpoint for free products only (rejects `price !== 0`). Creates Purchase record and redirects to download page via `NextResponse.redirect`. Uses native HTML `<form>` POST from the product detail page.

## File Delivery

- **`src/app/products/[slug]/download/page.tsx`** - Server component. Calls `requireAuth()`, fetches product with files, checks for Purchase record. No purchase = redirect to product page. Renders download buttons (UploadThing CDN URLs), text content inline, and external link.

## Dashboards and Landing Page

- **`src/app/sell/dashboard/page.tsx`** - Seller dashboard. Four stat cards (net earnings, total sales, product count, total likes), product list with edit/view links, inline `ProfileEditor` component for bio/headline.
- **`src/components/profile-editor.tsx`** - Client component, toggleable inline form that PATCHes `/api/sell/profile`. Calls `router.refresh()` on save.
- **`src/app/api/sell/profile/route.ts`** - PATCH endpoint, validates with Zod (headline max 100, bio max 2000), updates SellerProfile.
- **`src/app/dashboard/page.tsx`** - Buyer dashboard. Grid of purchased products with thumbnails, seller info, purchase date, and download links.
- **`src/app/page.tsx`** - Landing page. Hero section with search form (GET to `/products?q=`), trending products (sorted by like count, includes rating calculation), category grid using `CATEGORIES` constant, seller CTA section.
- **Payouts** - Whop handles payouts via hosted portal. Generate link with `getWhop().accountLinks.create({ company_id, use_case: "payouts_portal", return_url, refresh_url })`.

## Design

- Dark cream/crimson palette: background `#1A0A10`, surface `#221218`, text `#F5F0E1`, accent `#B8293D`
- Sharp corners: all `--radius-*` tokens set to `0px`
- Tailwind v4 with `@theme` blocks in `globals.css`
- 9 product categories: TEMPLATES, EBOOKS, SOFTWARE, DESIGN, AUDIO, VIDEO, PHOTOGRAPHY, EDUCATION, OTHER
- `next.config.ts` allows remote images from `utfs.io`, `assets.whop.com`, `cdn.whop.com`

## Whop SDK Gotchas

- `application_fee_amount` goes on `checkoutConfigurations.create()` inside the `plan` object, NOT on `plans.create()`
- `company_id` goes on the `plan` object only, NOT on the top-level `checkoutConfigurations.create()` call
- The company API key (`WHOP_COMPANY_API_KEY`) is needed for `products.create` and `checkoutConfigurations.create` - the app API key lacks `access_pass:create` permission
- Webhook verification needs `webhookKey: Buffer.from(secret).toString("base64")` in the SDK constructor
- Payment webhook data uses nested objects: `payment.plan.id`, `payment.user.id` (not flat fields)
- `payment.subtotal` is in dollars (not cents) - multiply by 100 for storage
- Sandbox uses `sandbox-api.whop.com` for all endpoints (OAuth, API, webhooks)
- OAuth PKCE: store code verifier in httpOnly cookie, not the session (cookies survive cross-domain redirects)
