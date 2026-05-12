# Soundify: Music Platform Tutorial (LLM Context)

Condensed reference for building Soundify, a Spotify-style music platform on Whop where independent artists publish songs, gate premium tracks behind one-time payments, and withdraw earnings through an embedded payout portal. Non-obvious code (Whop SDK calls, OAuth/PKCE, embedded components, webhook handler, signed Supabase uploads) is included in full. Standard React/Next.js UI files are described in prose so the LLM can generate them.

**Demo:** https://whop-spotify-clone.vercel.app/
**GitHub:** https://github.com/paulayuk/whop-spotify-clone

---

## 1. Overview

**Product:** Soundify, a multi-artist music distribution platform. Artists sign in with Whop OAuth, set up a public handle, upload audio + cover art directly to Supabase, mark songs free or premium with a per-song price, and enable earnings (Whop connected account + KYC). Listeners browse, play free songs inline, pay to unlock premium songs, and save anything to their own playlists.

**Business model:** Direct charges with application fees via Whop for Platforms.

- One-time payment per premium song (no subscriptions)
- Platform takes a 50¢ application fee per sale (configurable via `Artist.applicationFee`)
- Artists withdraw through the embedded Whop payout portal on their dashboard

**Tech stack**

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16 (App Router), React 19, React Compiler enabled |
| Styling | Tailwind CSS v4, inline styles for the Spotify-ish dark theme |
| Auth | Whop OAuth 2.1 (PKCE + nonce) + iron-session 8 |
| Payments | Whop direct charges via `checkoutConfigurations.create` with `application_fee_amount`; Whop hosted checkout + redirect verification + webhooks |
| Payouts | Whop embedded components (`@whop/embedded-components-react-js` + `@whop/embedded-components-vanilla-js`) with short-lived access tokens |
| Database | PostgreSQL (Neon/Supabase/Railway) |
| ORM | Prisma 7 with `@prisma/adapter-pg` (Pg driver adapter, no native binary) |
| File storage | Supabase Storage with three public buckets (signed-upload-URL pattern, browser → Supabase direct) |
| Validation | Zod 4 |
| Local HTTPS | ngrok (Whop OAuth + webhook delivery require HTTPS) |
| Deployment | Vercel |

**Pages**

- `/`: public landing page with trending songs, popular artists, and new releases.
- `/a/[handle]`: public artist page; free songs play inline, premium songs show a price badge + "Unlock for $X.XX" button.
- `/dashboard`: auth-gated artist dashboard (profile, songs, earnings status, embedded payout portal).
- `/library`: auth-gated listener library with playlist cards.
- `/library/[id]`: playlist detail; free songs play inline, premium songs link back to the artist page to unlock.

**API routes**

- `GET /api/auth/login`: generates PKCE verifier + challenge + state + nonce, sets short-lived cookies, redirects to Whop's `/oauth/authorize`.
- `GET /api/auth/callback`: verifies state, exchanges the code for tokens, decodes the `id_token` JWT, upserts the User by `whopUserId`, saves the iron-session cookie.
- `POST /api/auth/logout`: destroys the session, redirects home.
- `POST /api/upload`: mints a signed Supabase upload URL for `songs`, `covers`, or `previews`.
- `GET /api/earnings/complete`: KYC return handler; flips `Artist.payoutEnabled` to `true`.
- `GET /api/payout-token`: mints a short-lived `accessTokens` scoped to the artist's company for the embedded payout portal.
- `POST /api/webhooks/whop`: verifies the Whop signature, processes `payment.succeeded` and `payment.failed`, flips `Unlock` rows accordingly.

**End-to-end flow**

1. Artist signs in with Whop OAuth → User row created. Fills in handle + display name → Artist row created via the `saveProfile` server action.
2. Artist uploads a song: the browser asks the server for a signed Supabase URL, PUTs the file directly to Supabase, then the server action stores the resulting public URLs in the Song row.
3. Artist clicks "Enable Earnings" → `whop.companies.create({ parent_company_id })` creates a sub-company under the platform, `whop.accountLinks.create` returns a Whop-hosted KYC link, artist completes onboarding, redirect lands on `/api/earnings/complete` which sets `payoutEnabled = true`.
4. Listener clicks "Unlock for $X.XX" → server action creates a `PENDING` Unlock + `whop.checkoutConfigurations.create` with `application_fee_amount` + `metadata: { unlock_id, song_id, artist_id }`, redirects to the Whop hosted checkout.
5. Whop redirects back to `/a/[handle]?checkout_status=success&payment_id={PAYMENT_ID}&unlocked=<id>&song=<id>`. Page calls `whop.payments.retrieve(payment_id)`, flips the Unlock to `PAID`, and the audio player renders for the buyer.
6. Whop fires `payment.succeeded` webhook as a fallback in case the redirect didn't complete. The handler looks up the Unlock by `metadata.unlock_id` and flips it to `PAID`. The `whopPaymentId` unique constraint prevents double-processing.
7. Artist visits `/dashboard` → the embedded `PayoutsSession` (balance, verify, withdraw button, withdrawal history) renders inside the app, authenticated via the short-lived token from `/api/payout-token`.

---

## 2. Setup

### Scaffold

```bash
npx create-next-app@latest soundify --typescript --tailwind --app --src-dir
cd soundify
```

### Dependencies

```bash
npm install -D prisma
npm install @prisma/client @prisma/adapter-pg pg
npm install iron-session zod @supabase/supabase-js
npm install @whop/sdk @whop/embedded-components-react-js @whop/embedded-components-vanilla-js
```

### Initialize Prisma

```bash
npx prisma init
```

Apply the schema from Section 3, then `npx prisma migrate dev --name init`.

### Local HTTPS

Whop's OAuth callbacks and webhooks require HTTPS. Run ngrok against the dev server so both work locally:

```bash
npx ngrok http 3000
```

Copy the printed `https://*.ngrok-free.app` URL. It's used as `NEXT_PUBLIC_APP_URL`, in the Whop OAuth redirect URI, and as the webhook URL.

### Environment variables

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `WHOP_CLIENT_ID` | OAuth client ID (Whop developer app) |
| `WHOP_CLIENT_SECRET` | OAuth client secret |
| `WHOP_REDIRECT_URI` | Must match the Whop dashboard exactly, e.g. `https://<ngrok>.ngrok-free.app/api/auth/callback` |
| `WHOP_API_KEY` | Platform API key with all permissions enabled (used by the SDK for company creation, account links, checkout, access tokens, payment lookups, webhook verification) |
| `WHOP_PARENT_COMPANY_ID` | Platform's parent company ID (starts with `biz_`); every artist company is created under it |
| `WHOP_WEBHOOK_SECRET` | Webhook signing secret (starts with `whsec_`) |
| `WHOP_OAUTH_BASE` | `https://sandbox-api.whop.com` for dev; omit for production |
| `WHOP_BASE_URL` | `https://sandbox-api.whop.com/api/v1` for dev; omit for production |
| `NEXT_PUBLIC_WHOP_ENV` | `sandbox` or `production` (read by the embedded components) |
| `SESSION_SECRET` | 32+ char random string for iron-session (`openssl rand -base64 32`) |
| `NEXT_PUBLIC_APP_URL` | App origin; the ngrok URL in dev |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (server-side only) |

### Whop developer app setup

1. Create a Whop developer app at `whop.com/developer`.
2. Under OAuth, add the redirect URI: `https://<ngrok>.ngrok-free.app/api/auth/callback`. Copy Client ID + Client Secret.
3. Create an API key with all permissions enabled. Copy to `WHOP_API_KEY`.
4. From the platform company dashboard, copy the Company ID (starts with `biz_`) to `WHOP_PARENT_COMPANY_ID`.
5. Under Webhooks, add `https://<ngrok>.ngrok-free.app/api/webhooks/whop`. Enable `payment.succeeded` and `payment.failed`. Copy the signing secret to `WHOP_WEBHOOK_SECRET`.

### Supabase storage setup

In the Supabase dashboard, create three buckets: `songs`, `covers`, and `previews`. Open each bucket's settings and enable **Public bucket**. Without public access, audio URLs resolve but return 400 silently.

### Next.js config

`next.config.ts` enables the React compiler, allowlists ngrok dev origins, and whitelists Supabase public storage URLs for `next/image`:

```ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  allowedDevOrigins: ["*.ngrok-free.app", "*.ngrok.io"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
};

export default nextConfig;
```

`src/app/layout.tsx` registers Geist, Geist Mono, and Bricolage Grotesque from `next/font/google` as CSS variables (`--font-bricolage` is used throughout for display type) and sets `bg-white text-black antialiased` on the body. Dark theme is applied per-page via inline styles, not via a global class.

---

## 3. Database schema

Six models. `Artist` is the creator profile keyed off `userId` with the public `handle`. `Song` is owned by the artist; `isPremium = true` means buyers must unlock. `Unlock` is the payment record (PENDING → PAID / FAILED / REFUNDED). `UserPlaylist` + `UserPlaylistSong` is the listener's saved-songs graph with positional ordering and a unique constraint that prevents duplicates per playlist.

`prisma/schema.prisma`:

```prisma
generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id         String         @id @default(cuid())
  whopUserId String         @unique
  email      String?
  createdAt  DateTime       @default(now())
  updatedAt  DateTime       @updatedAt
  creator    Artist?
  playlists  UserPlaylist[]
}

model Artist {
  id             String   @id @default(cuid())
  userId         String   @unique
  user           User     @relation(fields: [userId], references: [id])
  handle         String   @unique
  displayName    String
  bio            String?
  avatarUrl      String?
  whopCompanyId  String?
  payoutEnabled  Boolean  @default(false)
  applicationFee Int      @default(50)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  songs          Song[]
  unlocks        Unlock[]
}

model Song {
  id            String             @id @default(cuid())
  artistId      String
  artist        Artist             @relation(fields: [artistId], references: [id])
  title         String
  description   String?
  coverUrl      String?
  audioUrl      String
  previewUrl    String?
  duration      Int                @default(0)
  isPremium     Boolean            @default(false)
  price         Int                @default(199)
  plays         Int                @default(0)
  createdAt     DateTime           @default(now())
  updatedAt     DateTime           @updatedAt
  unlocks       Unlock[]
  playlistSongs UserPlaylistSong[]
}

model UserPlaylist {
  id        String             @id @default(cuid())
  userId    String
  user      User               @relation(fields: [userId], references: [id])
  name      String
  createdAt DateTime           @default(now())
  updatedAt DateTime           @updatedAt
  songs     UserPlaylistSong[]
}

model UserPlaylistSong {
  id         String       @id @default(cuid())
  playlistId String
  playlist   UserPlaylist @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  songId     String
  song       Song         @relation(fields: [songId], references: [id], onDelete: Cascade)
  position   Int
  addedAt    DateTime     @default(now())

  @@unique([playlistId, songId])
}

model Unlock {
  id              String       @id @default(cuid())
  artistId        String
  artist          Artist       @relation(fields: [artistId], references: [id])
  songId          String
  song            Song         @relation(fields: [songId], references: [id])
  buyerWhopUserId String?
  buyerEmail      String?
  status          UnlockStatus @default(PENDING)
  whopPaymentId   String?      @unique
  createdAt       DateTime     @default(now())
  updatedAt       DateTime     @updatedAt
}

enum UnlockStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}
```

`price` and `applicationFee` are integer cents. The `whopPaymentId @unique` is what makes the redirect-vs-webhook race idempotent: both paths flip the row to PAID, the second writer just finds it already filled in.

---

## 4. Core libraries

### `src/lib/prisma.ts`

PrismaClient singleton with the `PrismaPg` driver adapter (no native binary). Stored on `globalThis` in dev so HMR doesn't pile up connections.

```ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL as string });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

### `src/lib/whop.ts`

Two Whop SDK clients: a platform-scoped one (`whop`) used by all server code, and a per-user one (`whopAsUser`) for calls made on behalf of a logged-in creator's OAuth token.

```ts
import { Whop } from "@whop/sdk";

const WHOP_API_BASE = "https://api.whop.com/api/v1";

export const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY,
  baseURL: WHOP_API_BASE,
});

export function whopAsUser(oauthToken: string) {
  return new Whop({
    apiKey: oauthToken,
    baseURL: WHOP_API_BASE,
  });
}
```

### `src/lib/session.ts`

iron-session encrypted cookie (`snd_session`) storing `userId` (DB) and `whopUserId` (OAuth sub).

```ts
import { getIronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  userId?: string;
  whopUserId?: string;
}

const sessionOptions: SessionOptions = {
  cookieName: "snd_session",
  password: process.env.SESSION_SECRET as string,
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};

export async function getSession() {
  const cookieStore = await cookies();
  return getIronSession<SessionData>(cookieStore, sessionOptions);
}

export async function getCurrentUserId(): Promise<string | null> {
  const session = await getSession();
  return session.userId ?? null;
}
```

### `src/lib/supabase.ts`

Supabase service-role client used server-side to mint signed upload URLs. Lazy singleton.

```ts
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for file uploads.");
    }
    _client = createClient(url, key);
  }
  return _client;
}
```

---

## 5. Authentication

Whop uses OAuth 2.1 + PKCE. The login route generates a `code_verifier`, stores it in a short-lived httpOnly cookie (not the session, so the cross-domain redirect doesn't drop it), and sends the hashed `code_challenge` to Whop. The callback exchanges the code for tokens, decodes the `id_token` JWT to get `sub` (the Whop user ID) + email, upserts the User, and writes the session cookie.

### `src/app/api/auth/login/route.ts`

```ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import crypto from "crypto";

function base64url(buf: Buffer) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}

export async function GET() {
  const codeVerifier = base64url(crypto.randomBytes(32));
  const codeChallenge = base64url(
    crypto.createHash("sha256").update(codeVerifier).digest()
  );
  const state = base64url(crypto.randomBytes(16));
  const nonce = base64url(crypto.randomBytes(16));

  const cookieStore = await cookies();
  cookieStore.set("pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });
  cookieStore.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: process.env.WHOP_CLIENT_ID as string,
    redirect_uri: process.env.WHOP_REDIRECT_URI as string,
    response_type: "code",
    scope: "openid profile email",
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  const authUrl = `${process.env.WHOP_OAUTH_BASE}/oauth/authorize?${params}`;
  return NextResponse.redirect(authUrl);
}
```

### `src/app/api/auth/callback/route.ts`

```ts
import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

function decodeJwt(token: string) {
  const payload = token.split(".")[1];
  const decoded = Buffer.from(payload, "base64url").toString("utf-8");
  return JSON.parse(decoded) as { sub: string; email?: string };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const returnedState = searchParams.get("state");

  const cookieStore = await cookies();
  const storedState = cookieStore.get("oauth_state")?.value;
  const codeVerifier = cookieStore.get("pkce_verifier")?.value;

  if (!code || !returnedState || returnedState !== storedState || !codeVerifier) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  const tokenEndpoint = `${process.env.WHOP_BASE_URL}/oauth/token`;
  const tokenRes = await fetch(tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.WHOP_CLIENT_ID as string,
      client_secret: process.env.WHOP_CLIENT_SECRET as string,
      redirect_uri: process.env.WHOP_REDIRECT_URI as string,
      code,
      code_verifier: codeVerifier,
    }),
  });

  const rawText = await tokenRes.text();

  if (!tokenRes.ok) {
    console.error("Token exchange failed:", tokenRes.status, rawText);
    return NextResponse.json(
      { error: "Token exchange failed", detail: rawText },
      { status: 400 }
    );
  }

  let tokens: { id_token: string; access_token: string };
  try {
    tokens = JSON.parse(rawText);
  } catch {
    return NextResponse.json({ error: "Invalid token response" }, { status: 500 });
  }
  const { sub, email } = decodeJwt(tokens.id_token);

  const user = await prisma.user.upsert({
    where: { whopUserId: sub },
    update: { email },
    create: { whopUserId: sub, email },
  });

  const session = await getSession();
  session.userId = user.id;
  session.whopUserId = sub;
  await session.save();

  cookieStore.delete("pkce_verifier");
  cookieStore.delete("oauth_state");

  return NextResponse.redirect(new URL("/dashboard", process.env.NEXT_PUBLIC_APP_URL as string));
}
```

### `src/app/api/auth/logout/route.ts`

POST-only so link prefetchers don't log the user out by accident.

```ts
import { NextResponse } from "next/server";
import { getSession } from "@/lib/session";

export async function POST() {
  const session = await getSession();
  session.destroy();
  return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL as string));
}
```

### Dashboard auth guard

`src/app/dashboard/layout.tsx` runs `getCurrentUserId()` and `redirect("/")` if unauthenticated. Every dashboard page inherits the guard from the layout.

---

## 6. Dashboard (server actions full, UI described)

The dashboard has three sections (**Profile**, **Songs**, **Earnings**) plus the embedded Payout Portal once `payoutEnabled` is true. All mutations run through Next.js Server Actions with `useActionState` on the client side for inline validation messages.

### `src/app/actions/artist.ts`: profile

Validates handle (lowercase alphanumeric + `_` + `-`, 2–32 chars), display name, and bio with Zod. Checks the handle isn't already taken by another user before upserting.

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

const profileSchema = z.object({
  handle: z
    .string()
    .min(2, "Handle must be at least 2 characters")
    .max(32, "Handle must be at most 32 characters")
    .regex(/^[a-z0-9_-]+$/, "Handle must be lowercase alphanumeric, dash, or underscore"),
  displayName: z.string().min(1, "Display name required").max(80, "Display name max 80 characters"),
  bio: z.string().max(300, "Bio max 300 characters").optional(),
});

export type ProfileFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

export async function saveProfile(
  _prev: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const raw = {
    handle: formData.get("handle")?.toString().toLowerCase() ?? "",
    displayName: formData.get("displayName")?.toString() ?? "",
    bio: formData.get("bio")?.toString() ?? "",
  };

  const result = profileSchema.safeParse(raw);
  if (!result.success) return { errors: result.error.flatten().fieldErrors };

  const { handle, displayName, bio } = result.data;

  const existing = await prisma.artist.findUnique({ where: { handle } });
  if (existing && existing.userId !== userId) {
    return { errors: { handle: ["Handle already taken"] } };
  }

  await prisma.artist.upsert({
    where: { userId },
    update: { handle, displayName, bio: bio || null },
    create: { userId, handle, displayName, bio: bio || null },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
```

### `src/app/actions/songs.ts`: uploads, toggles, deletes, price updates

`uploadSong` receives URLs from a browser-direct Supabase upload (see Section 7); it never streams the file through the server. Every action verifies ownership via the Artist row before writing.

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export type SongFormState = {
  errors?: Record<string, string[]>;
  success?: boolean;
  message?: string;
};

export async function uploadSong(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist) return { message: "Create a profile first" };

  const title = formData.get("title")?.toString() ?? "";
  const description = formData.get("description")?.toString() ?? "";
  const priceStr = formData.get("price")?.toString() ?? "1.99";
  const isPremium = formData.get("isFree") !== "on";
  const audioUrl = formData.get("audioUrl")?.toString() ?? "";
  const coverUrl = formData.get("coverUrl")?.toString() || null;

  const schema = z.object({
    title: z.string().min(1, "Title required").max(100, "Title max 100 chars"),
    price: z.number().min(0.99, "Minimum price $0.99").max(50, "Maximum price $50"),
  });

  const priceNum = parseFloat(priceStr);
  const result = schema.safeParse({ title, price: priceNum });
  if (!result.success) return { errors: result.error.flatten().fieldErrors };
  if (!audioUrl) return { errors: { audioFile: ["Audio file required"] } };

  await prisma.song.create({
    data: {
      artistId: artist.id,
      title,
      description: description || null,
      audioUrl,
      coverUrl,
      previewUrl: null,
      duration: 0,
      isPremium,
      price: Math.round(result.data.price * 100),
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteSong(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const songId = formData.get("songId")?.toString();
  if (!songId) return { message: "Missing song ID" };

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist) return { message: "Artist not found" };

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.artistId !== artist.id) return { message: "Not authorized" };

  await prisma.song.delete({ where: { id: songId } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function togglePremium(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const songId = formData.get("songId")?.toString();
  if (!songId) return { message: "Missing song ID" };

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist) return { message: "Artist not found" };

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.artistId !== artist.id) return { message: "Not authorized" };

  await prisma.song.update({
    where: { id: songId },
    data: { isPremium: !song.isPremium },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateSongPrice(
  _prev: SongFormState,
  formData: FormData
): Promise<SongFormState> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const songId = formData.get("songId")?.toString();
  const priceStr = formData.get("price")?.toString() ?? "";
  const priceNum = parseFloat(priceStr);

  if (!songId) return { message: "Missing song ID" };
  if (isNaN(priceNum) || priceNum < 0.99 || priceNum > 50) {
    return { errors: { price: ["Price must be between $0.99 and $50.00"] } };
  }

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist) return { message: "Artist not found" };

  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.artistId !== artist.id) return { message: "Not authorized" };

  await prisma.song.update({
    where: { id: songId },
    data: { price: Math.round(priceNum * 100) },
  });

  revalidatePath("/dashboard");
  return { success: true };
}
```

### Dashboard UI (described)

All client components, all in `src/app/dashboard/` (or `src/app/components/` for the shared shell). They drive the server actions above with `useActionState`.

- `AppShell.tsx` (server, in `src/app/components/`): sidebar layout used by every authenticated page. Black `220px` left sidebar with logo, Home/Library/Dashboard/My Artist Page links, and either Sign-in buttons or a Log-out form. Main column scrolls. Dark theme via inline styles (`#121212` background, `#7c3aed` purple accent).
- `ProfileForm.tsx` (client): handle (with `/a/` prefix in a left addon), display name, bio. Wires `saveProfile` via `useActionState`. Inline red error text under each field; emerald success line with a checkmark.
- `SongForm.tsx` (client): title, price (dollars, `$0.99` to `$50`), description, audio + cover file inputs, "Mark as Free" checkbox. Intercepts `onSubmit`, uploads audio and cover to Supabase first (see Section 7), injects the resulting public URLs into the FormData, then calls the `uploadSong` server action.
- `SongRow.tsx` (client): one row per existing song. Each row has two independent forms: a toggle form (`togglePremium`) and a delete form (`deleteSong`), both with a hidden `songId` input. Format: thumbnail, title, duration, Free / `$X.XX` badge, "Set Free / Set Premium" button, "Delete" button.
- `EarningsButton.tsx` (client): three-state UI driven by `enrolled` (`!!whopCompanyId`) + `payoutEnabled`. Not enrolled shows an "Enable Earnings" pitch button; enrolled but KYC incomplete shows an amber warning + "Complete onboarding" button; ready shows a green check + "Manage" button. All states submit the same `enableEarnings` action (which idempotently re-issues a Whop onboarding link if a company already exists).
- `page.tsx` (server): loads the user + nested artist + songs, redirects to `/` if unauthenticated, and composes the four sections into `<AppShell>`. The Songs and Earnings sections only render once a profile exists; the Payout Portal section only renders once `payoutEnabled` is true.

---

## 7. File uploads (browser → Supabase direct)

The browser asks the server for a signed upload URL, PUTs the file directly to Supabase, then passes the resulting public URL to the `uploadSong` server action. The server never streams the file.

### `src/app/api/upload/route.ts`

Validates the bucket against an allowlist, generates a unique file path, mints a signed upload URL with `createSignedUploadUrl`, and returns the signed URL alongside the public URL the client will store after the upload succeeds.

```ts
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { getSupabase } from "@/lib/supabase";

const ALLOWED_BUCKETS = ["songs", "covers", "previews"] as const;
type Bucket = (typeof ALLOWED_BUCKETS)[number];

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session.userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const body = await req.json();
    const { bucket, filename, contentType } = body;

    if (!ALLOWED_BUCKETS.includes(bucket as Bucket)) {
      return NextResponse.json({ error: "Invalid bucket" }, { status: 400 });
    }

    const ext = (filename as string).split(".").pop();
    const filePath = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const supabase = getSupabase();
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUploadUrl(filePath);

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message ?? "Failed to create signed URL" },
        { status: 500 }
      );
    }

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return NextResponse.json({
      signedUrl: data.signedUrl,
      token: data.token,
      path: filePath,
      publicUrl: urlData.publicUrl,
      contentType,
    });
  } catch (err) {
    console.error("[/api/upload]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
```

### Client upload helper

Inside `SongForm.tsx`, the helper PUTs the file straight to the signed URL and returns the public URL, which then gets injected into the FormData before calling the server action:

```ts
async function uploadToSupabase(file: File, bucket: string): Promise<string> {
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket, filename: file.name, contentType: file.type }),
  });

  const json = (await res.json()) as Record<string, string>;
  if (!res.ok) throw new Error(json.error ?? `Failed to get upload URL (${res.status})`);

  const { signedUrl, publicUrl } = json;
  const uploadRes = await fetch(signedUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });
  if (!uploadRes.ok) throw new Error(`File upload failed (${uploadRes.status})`);

  return publicUrl;
}
```

---

## 8. Artist page and payments

### Artist page (`src/app/a/[handle]/page.tsx`)

Server component. Loads the artist + songs, the visitor's session, and (if logged in) the visitor's playlists in parallel. If the URL carries `checkout_status=success&payment_id=...&unlocked=...&song=...`, it calls `whop.payments.retrieve(payment_id)` and, if `payment.status === "paid"`, updates the matching PENDING Unlock to PAID. Then it figures out whether the visitor has a PAID Unlock for `song=...` and passes `unlockedSongId` down to the client `SongList`. Renders an artist header (avatar, name, `@handle`, bio, track count) then `<SongList songs={...} artist={...} userId={...} unlockedSongId={...} initialPlaylists={...} />`.

The verification-on-redirect block:

```ts
if (checkout_status === "success" && payment_id && unlocked) {
  try {
    const payment = await whop.payments.retrieve(payment_id);
    if (payment.status === "paid") {
      await prisma.unlock.updateMany({
        where: { id: unlocked, status: "PENDING" },
        data: { status: "PAID", whopPaymentId: payment_id },
      });
    }
  } catch {
    // Non-fatal: the webhook handles it if this fails
  }
}
```

### Artist page UI (described)

- `AudioPlayer.tsx` (client): wraps `<audio controls src>` with a title row (song title, artist, optional `PREVIEW` badge). `colorScheme: "dark"` styles the native player.
- `UnlockButton.tsx` (client): gradient purple button bound to the `createCheckout` action. Hidden inputs carry `songId` + `artistId`. Shows a spinner while pending and renders `state.message` (the rejection text from the action) below.
- `SongList.tsx` (client): holds `sharedPlaylists` in state (initialized from `initialPlaylists`) so a playlist created from one song's `+` dropdown appears in every other song's dropdown instantly. Renders each song row with cover, title, description, optional `AudioPlayer` (free songs, or premium songs the visitor has unlocked) or `UnlockButton` (premium and locked), and an `AddToPlaylistButton` for logged-in visitors.

### `src/app/actions/checkout.ts`: create checkout

Validates the song, confirms the artist has enabled earnings (`whopCompanyId` set), creates a PENDING Unlock, then constructs a Whop hosted checkout with `application_fee_amount` and a `redirect_url` that includes the `{PAYMENT_ID}` template variable plus the unlock + song IDs so the artist page can verify on return.

```ts
"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export async function createCheckout(
  _prev: { message: string },
  formData: FormData
): Promise<{ message: string }> {
  const songId = formData.get("songId")?.toString();
  const artistId = formData.get("artistId")?.toString();

  if (!songId || !artistId) return { message: "Missing song or artist" };

  const song = await prisma.song.findUnique({
    where: { id: songId },
    include: { artist: true },
  });

  if (!song) return { message: "Song not found" };
  if (song.artistId !== artistId) return { message: "Invalid artist" };
  if (!song.artist.whopCompanyId) return { message: "Artist has not enabled earnings" };

  const unlock = await prisma.unlock.create({
    data: { artistId: song.artistId, songId: song.id, status: "PENDING" },
  });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL as string;
  const handle = song.artist.handle;
  // {PAYMENT_ID} is a Whop template variable replaced with the real ID on redirect
  const redirectUrl = `${appUrl}/a/${handle}?checkout_status=success&payment_id={PAYMENT_ID}&unlocked=${unlock.id}&song=${song.id}`;

  const checkout = await whop.checkoutConfigurations.create({
    plan: {
      company_id: song.artist.whopCompanyId,
      currency: "usd",
      plan_type: "one_time",
      initial_price: song.price / 100,
      application_fee_amount: song.artist.applicationFee / 100,
    },
    redirect_url: redirectUrl,
    metadata: {
      unlock_id: unlock.id,
      song_id: song.id,
      artist_id: song.artistId,
    },
  });

  redirect(checkout.purchase_url);
}
```

### `src/app/api/webhooks/whop/route.ts`: webhook handler

Always call `req.text()` first; `unwrap()` needs the raw body for HMAC. Use `payment.metadata.unlock_id` to find the Unlock. The handler also short-circuits on `whopPaymentId` already set so replays don't double-process.

```ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  const headers: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let event;
  try {
    event = whop.webhooks.unwrap(rawBody, {
      headers,
      key: process.env.WHOP_WEBHOOK_SECRET,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  if (event.type === "payment.succeeded") {
    const payment = event.data;
    const paymentId = payment.id;

    try {
      const existing = await prisma.unlock.findUnique({
        where: { whopPaymentId: paymentId },
      });

      if (!existing) {
        const metadata = payment.metadata as Record<string, string> | null;
        const unlockId = metadata?.unlock_id;

        if (unlockId) {
          await prisma.unlock.updateMany({
            where: { id: unlockId, status: "PENDING" },
            data: { status: "PAID", whopPaymentId: paymentId },
          });

          const unlock = await prisma.unlock.findUnique({ where: { id: unlockId } });
          if (unlock) {
            await prisma.song.update({
              where: { id: unlock.songId },
              data: { plays: { increment: 1 } },
            });
          }
        }
      }
    } catch (err) {
      console.error("Webhook payment.succeeded error:", err);
    }
  }

  if (event.type === "payment.failed") {
    const payment = event.data;
    const paymentId = payment.id;

    try {
      await prisma.unlock.updateMany({
        where: { whopPaymentId: paymentId },
        data: { status: "FAILED" },
      });
    } catch (err) {
      console.error("Webhook payment.failed error:", err);
    }
  }

  return NextResponse.json({ received: true });
}
```

---

## 9. Artist earnings and embedded payout portal

### `src/app/actions/earnings.ts`: enable earnings

Idempotent: first call creates a Whop sub-company under the platform's parent and saves the ID; later calls (e.g., to re-do bank details) skip company creation and just generate a fresh onboarding URL.

```ts
"use server";

import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export async function enableEarnings(): Promise<{ message: string }> {
  const userId = await getCurrentUserId();
  if (!userId) return { message: "Not authenticated" };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { creator: true },
  });

  const artist = user?.creator;
  if (!artist) return { message: "Create a profile first" };

  let companyId = artist.whopCompanyId;

  if (!companyId) {
    if (!user.email) return { message: "No email on account" };

    const suffix = Math.random().toString(36).slice(2, 6);
    const company = await whop.companies.create({
      title: `${artist.displayName || artist.handle}-${suffix}`,
      parent_company_id: process.env.WHOP_PARENT_COMPANY_ID as string,
      email: user.email,
    });
    companyId = company.id;

    await prisma.artist.update({
      where: { id: artist.id },
      data: { whopCompanyId: companyId },
    });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL as string;
  const accountLink = await whop.accountLinks.create({
    company_id: companyId,
    use_case: "account_onboarding",
    return_url: `${appUrl}/api/earnings/complete`,
    refresh_url: `${appUrl}/dashboard?refresh=true`,
  });

  redirect(accountLink.url);
}
```

### `src/app/api/earnings/complete/route.ts`: KYC return handler

```ts
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL as string));
  }

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (artist?.whopCompanyId) {
    await prisma.artist.update({
      where: { id: artist.id },
      data: { payoutEnabled: true },
    });
  }

  return NextResponse.redirect(
    new URL("/dashboard?enrolled=true", process.env.NEXT_PUBLIC_APP_URL as string)
  );
}
```

### `src/app/api/payout-token/route.ts`: mint a short-lived access token

The embedded components need a per-request access token scoped to the artist's company.

```ts
import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { whop } from "@/lib/whop";

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const artist = await prisma.artist.findUnique({ where: { userId } });
  if (!artist?.whopCompanyId) {
    return NextResponse.json({ error: "Earnings not enabled" }, { status: 400 });
  }

  const token = await whop.accessTokens.create({
    company_id: artist.whopCompanyId,
  });

  return NextResponse.json({ token: token.token });
}
```

### `src/app/dashboard/PayoutPortal.tsx`: embedded components

`Elements` loads Whop's web components. `PayoutsSession` authenticates the children with the token from `/api/payout-token`. Children render balance, verification status, withdraw button, and withdrawal history inline.

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

interface PayoutPortalProps {
  companyId: string;
}

async function fetchPayoutToken(): Promise<string> {
  const res = await fetch("/api/payout-token");
  const data = await res.json();
  return data.token as string;
}

export function PayoutPortal({ companyId }: PayoutPortalProps) {
  const environment = process.env.NEXT_PUBLIC_WHOP_ENV as string | undefined;

  const whopElementsPromise = useMemo(
    () => loadWhopElements({ environment: environment as "production" | "sandbox" | undefined }),
    [environment]
  );

  const redirectUrl = typeof window !== "undefined" ? window.location.href : "";

  return (
    <Elements elements={whopElementsPromise}>
      <PayoutsSession
        companyId={companyId}
        token={fetchPayoutToken}
        currency="usd"
        redirectUrl={redirectUrl}
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

`NEXT_PUBLIC_WHOP_ENV` determines whether the elements load the sandbox or production scripts (`latest.elements.whop.com` vs the sandbox equivalent). The browser bypasses CSP issues automatically as long as `*.whop.com` is reachable.

---

## 10. Listener playlists

### `src/app/actions/playlists.ts`

Four actions, each ownership-checked. `createPlaylist` optionally takes a `songId` so a brand-new playlist can include its first song in a single write. That's what makes "create + add" feel instant in the UI.

```ts
"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUserId } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function createPlaylist(name: string, songId?: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" as const };

  const trimmed = name.trim().slice(0, 100);
  if (!trimmed) return { error: "Name required" as const };

  const playlist = await prisma.userPlaylist.create({
    data: {
      userId,
      name: trimmed,
      ...(songId ? { songs: { create: { songId, position: 0 } } } : {}),
    },
  });

  revalidatePath("/library");
  return { playlist: { id: playlist.id, name: playlist.name } };
}

export async function addSongToPlaylist(playlistId: string, songId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" as const };

  const playlist = await prisma.userPlaylist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) return { error: "Not authorized" as const };

  const agg = await prisma.userPlaylistSong.aggregate({
    where: { playlistId },
    _max: { position: true },
  });
  const position = (agg._max.position ?? -1) + 1;

  await prisma.userPlaylistSong.upsert({
    where: { playlistId_songId: { playlistId, songId } },
    update: {},
    create: { playlistId, songId, position },
  });

  revalidatePath("/library");
  return { success: true as const };
}

export async function removeSongFromPlaylist(playlistId: string, songId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" as const };

  const playlist = await prisma.userPlaylist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) return { error: "Not authorized" as const };

  await prisma.userPlaylistSong.deleteMany({ where: { playlistId, songId } });

  revalidatePath("/library");
  return { success: true as const };
}

export async function deletePlaylist(playlistId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { error: "Not authenticated" as const };

  const playlist = await prisma.userPlaylist.findUnique({ where: { id: playlistId } });
  if (!playlist || playlist.userId !== userId) return { error: "Not authorized" as const };

  await prisma.userPlaylist.delete({ where: { id: playlistId } });

  revalidatePath("/library");
  return { success: true as const };
}
```

### Playlist UI (described)

- `AddToPlaylistButton.tsx` (client, in `src/app/a/[handle]/`): `+` button on every song row. Dropdown with existing playlists (checkboxes for membership) and a "New playlist" input. Controlled by parent `SongList`: receives `playlists` (with per-song `hasSong` derived) and calls `onToggle` / `onPlaylistCreated` callbacks. Closes on outside-click via a `mousedown` listener and on Enter/Escape inside the input.
- `SongList.tsx` (client): owns the shared `sharedPlaylists` state. Derives per-song `hasSong` for each `AddToPlaylistButton`, handles `onPlaylistCreated` by appending to state, and handles `onToggle` by mapping the affected playlist's `songIds`. This is what makes a freshly-created playlist appear in every other song's dropdown instantly.
- `/library/page.tsx` (server): fetches the visitor's playlists with the first four cover URLs (for the 2x2 cover mosaic) and the song count. Hands the shape to `<PlaylistList>`.
- `PlaylistList.tsx` (client): optimistically removes a playlist on delete, snaps back if the server returns an error. Each card links to `/library/[id]` and has a trash icon that calls `deletePlaylist`.
- `/library/[id]/page.tsx` (server): verifies `playlist.userId === userId` (returns 404 otherwise), renders songs in `position` order. Free songs play inline with `<AudioPlayer>`; premium songs show a "Premium track" pill and an "Unlock on artist page" link (because the redirect-verification logic lives on the artist page, not the playlist page).

---

## 11. Landing page

`/` is a server component with `revalidate = 60`. It loads three lists in parallel:

- `trendingSongs`: top 6 songs by `plays`.
- `newReleases`: most recent 6 songs by `createdAt`.
- `artists`: most recent 6 artists with `_count.songs`.

It renders the shared sidebar (inline, not via `AppShell`, because the landing page can be viewed logged-out) with a "Sign up free / Log in" pair when there's no session, and a Home/Library/Dashboard nav otherwise. The main column is three sections of card grids (`SongCard`, `ArtistCard`) at `grid-template-columns: repeat(6, 1fr)`. Empty state shows a "Be the first artist to share your music" CTA pointing to `/api/auth/login`.

---

## 12. Going to production

1. Remove `WHOP_OAUTH_BASE` and `WHOP_BASE_URL` from env entirely so both the OAuth fetches and the SDK default to the live Whop API.
2. Set `NEXT_PUBLIC_WHOP_ENV="production"` so the embedded payout components load the production scripts.
3. Update `NEXT_PUBLIC_APP_URL` and `WHOP_REDIRECT_URI` to the production domain.
4. In the Whop developer dashboard: update the OAuth redirect URI and webhook URL to the production domain. The OAuth redirect URI must match `WHOP_REDIRECT_URI` exactly; any mismatch and logins silently fail.
5. Run `npx prisma migrate deploy` before deploying.
6. Supabase bucket settings carry over automatically (configured in the Supabase dashboard, not in code).

---

## 13. Whop SDK + integration gotchas

1. **OAuth 2.1 mandates PKCE + state + nonce.** Store the code verifier and state in short-lived httpOnly cookies (`maxAge: 600`), not the session. `NextResponse.redirect` + a fresh session cookie can drop session cookies on cross-domain redirects. The `nonce` is required when the scope includes `openid`.
2. **Whop expects `client_secret` in the token exchange even with PKCE.** Send `client_id`, `client_secret`, `code`, `code_verifier`, `redirect_uri`, and `grant_type` in an `application/x-www-form-urlencoded` body to `${WHOP_BASE_URL}/oauth/token`.
3. **`id_token` is a JWT.** Decode the second segment (`base64url`) to read `sub` (Whop user ID) and `email`. There's no need to call a separate `userinfo` endpoint in this tutorial.
4. **`whop.companies.create` is how you create a sub-account.** Pass `parent_company_id: process.env.WHOP_PARENT_COMPANY_ID`. The resulting `company.id` is what every later call (`accountLinks.create`, `checkoutConfigurations.create`, `accessTokens.create`) keys off.
5. **`whop.accountLinks.create` requires HTTPS for `return_url` / `refresh_url`.** Localhost callbacks won't work; that's why ngrok is mandatory in dev. `use_case: "account_onboarding"` is the right one for KYC.
6. **`whop.checkoutConfigurations.create` with an application fee.** Pass an inline `plan` with `company_id`, `currency`, `plan_type: "one_time"`, `initial_price` (dollars), `application_fee_amount` (dollars). Top-level `redirect_url` and `metadata` are sibling fields, not nested under `plan`.
7. **`{PAYMENT_ID}` is a Whop template variable.** Embed it literally in `redirect_url` (e.g. `?payment_id={PAYMENT_ID}`). Whop substitutes the real payment ID before redirecting.
8. **Verify the redirect with `whop.payments.retrieve(payment_id)`.** Only flip the Unlock to PAID if `payment.status === "paid"`. This is the primary success path; the webhook is a fallback.
9. **Use `metadata` on the checkout to find the Unlock from the webhook.** Without it, you'd have to keep a separate lookup table between plan IDs and Unlock rows.
10. **Webhook verification needs the raw body.** Call `req.text()` first; `req.json()` consumes the stream and breaks HMAC. Then convert headers with `req.headers.forEach(...)` because the Whop SDK wants a plain `Record<string, string>`.
11. **`Unlock.whopPaymentId` is the dedup key.** Both the redirect path and the webhook race to write it; the `@unique` constraint guarantees only one wins. Don't compute idempotency from `eventId` alone.
12. **`whop.accessTokens.create({ company_id })` mints a short-lived token** for the embedded payout components. Re-fetch it via `/api/payout-token` on every render; never cache it client-side.
13. **`@whop/embedded-components-react-js` is the React layer; the vanilla package loads the underlying web components.** Pass the promise from `loadWhopElements({ environment })` to `<Elements>`. Children go inside `<PayoutsSession>`; the session handles authentication via the `token` async function prop.
14. **Image hosts go in `next.config.ts` `images.remotePatterns`.** Supabase public storage URLs use the path `/storage/v1/object/public/**` under `*.supabase.co`.
15. **Supabase buckets must be Public.** Without "Public bucket" on, the audio/cover URLs resolve but return 400. Service-role keys mint signed upload URLs server-side; the browser uses them with a plain `PUT` (no auth header).
16. **OAuth callback / webhook URL must match the Whop dashboard exactly.** A trailing slash, http vs https, or a stale ngrok URL all cause silent failure. Re-check after every ngrok restart in dev.
17. **iron-session cookie name and secret are configuration, not constants.** `cookieName: "snd_session"`, `password: process.env.SESSION_SECRET` (32+ chars).
