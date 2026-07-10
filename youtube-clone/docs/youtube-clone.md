# How to build a YouTube clone with Next.js and Whop

A condensed reference for building **Wavora**, a Next.js YouTube clone where anyone signs in with Whop, starts a channel, and uploads videos, and viewers watch, subscribe, like, comment, save to playlists, and scroll Waves (vertical short-form video). Creators monetize directly: monthly **channel memberships** and one-time **Cheers** tips, both charged on the creator's own Whop **connected account** with a platform application fee taken off the top, withdrawn through an embedded payout portal with KYC handled by Whop. The platform never touches the money.

This file keeps **full code only for the security-sensitive, Whop-specific, and non-obvious parts**: the lazy-validated env module, OAuth 2.1/PKCE login + callback (with every Whop OAuth gotcha), iron-session helpers and the edge route guard, the CSP config, the full Prisma schema, the Vercel Blob direct-upload pair (token route + capture-and-upload client), the Zod validators, the race-guarded social actions (the pattern every toggle in the app follows), the Whop SDK client, connected-account enrollment, membership product/plan creation, both checkout actions, the embedded checkout and payout wiring, the webhook dispatcher with idempotent handlers, the Whop Files upload pair, the earnings ledger reads, and the rate limiter. Standard React/Next UI (feeds, cards, tabs, forms, players) is described in a line or two so you can generate it in your own style.

- Demo: https://wavora-ruddy.vercel.app
- Source: https://github.com/whopio/whop-tutorials/tree/main/youtube-clone

---

## Overview

**Tech stack**

- Next.js 16 (App Router, Turbopack), React 19, TypeScript
- Tailwind CSS v4 (CSS-first `@theme`, no config file), custom no-flash dark/light ThemeProvider, Roboto via `next/font`, lucide-react icons
- Whop OAuth 2.1 + PKCE for sign-in, `@whop/sdk` for payments, `@whop/checkout` for the embedded checkout, `@whop/embedded-components-react-js` + `-vanilla-js` for the on-site payout portal
- PostgreSQL (Neon via the Vercel integration) with Prisma 7 (`prisma.config.ts`, `@prisma/adapter-pg` driver adapter, client generated into `src/generated/prisma`)
- iron-session 8 (encrypted httpOnly cookie session, no session store; the PKCE verifier lives in its own short-lived cookie)
- Vercel Blob for video storage (browser-direct uploads, H.264 MP4, no transcoding; a production system would add Mux/Cloudinary)
- Zod 4 at every boundary (env, forms, server actions, API routes)
- Vercel for deployment; Whop **sandbox** during development (`WHOP_SANDBOX=true`), flipped to production at ship time

**Pages**

- `/` — home feed: category chips, Continue-watching shelf, Waves shelf, responsive video grid.
- `/results?search_query=` — search across titles, channel names, and @handles, ranked by views then recency.
- `/watch?v=` — watch page: player with resume, view counting, like/dislike, Save menu, Subscribe, Cheers button, description, threaded comments, related rail; members-only gate when the video requires a membership.
- `/waves` (+ `?v=` deep link) — vertical snap-scroll short-form feed with per-clip like/subscribe/share rail.
- `/@handle` — channel layout with banner/avatar/subscribe/Join, tabbed: Home, Videos, Waves, About, Membership.
- `/feed/subscriptions`, `/feed/history`, `/feed/you`, `/feed/playlists` — subscriptions feed, watch history with pause/clear, library hub (History + Watch later + Liked + Playlists shelves), playlists grid.
- `/playlist?list=WL|LL|<id>` — Watch later, Liked videos, or a custom playlist detail.
- `/explore/trending` and `/explore/[category]` — browse surfaces.
- `/create-channel` — become-a-channel form with a live debounced @handle availability check.
- `/sign-in` — one button pointing at the OAuth login route.
- `/studio/videos`, `/studio/upload`, `/studio/video/[id]`, `/studio/customize`, `/studio/monetization` — creator studio: content table, uploader, per-video edit/delete, channel customization (avatar/banner via Whop Files), monetization (enable, tiers, earnings, embedded payouts, members).

**API routes**

- `/api/auth/login` — rate-limited; generates PKCE verifier/state/nonce, stores them (plus a validated `next` path) in an httpOnly cookie, redirects to Whop's authorize URL.
- `/api/auth/callback` — verifies state, exchanges the code (PKCE verifier **and** `client_secret`, JSON body), fetches userinfo, upserts the User, writes the iron-session cookie onto the redirect response.
- `/api/auth/logout` — destroys the session.
- `/api/blob/upload` — `handleUpload` token route that authorizes signed-in channel owners for browser-direct Vercel Blob uploads.
- `/api/handle-check` — auth-gated, rate-limited live @handle availability check.
- `/api/whop/upload` — owner-gated image upload (avatar/banner) to Whop's Files API; magic-byte sniffed, 4 MB cap.
- `/api/payout-token` — mints a short-lived company access token for the embedded payout portal (ownership-checked).
- `/api/webhooks/whop` — `payment.succeeded`, `payment.failed`, `membership.activated`, `membership.deactivated`, `refund.created`; signature-verified, idempotent, 5xx on failure so Whop retries.
- `/api/notifications` — the signed-in user's in-app notification list + mark-read.
- `/api/dev/seed` — dev-only (`NODE_ENV !== "production"`) demo-data seeder: 6 channels, 36 videos.

**Payment flow**

1. A creator enables monetization in the studio. The server calls `companies.create` with `parent_company_id` — the channel becomes a Whop **connected account** (a child company under the platform) and its id is stored on the Channel row.
2. The creator adds a membership tier. The first tier lazily creates one shared Whop **product** on the connected account (`products.create`); each tier creates a **renewal plan** (`plans.create`, price in **dollars**, `visibility: "hidden"` so joins can only go through our checkout). Ids are stored on the MembershipTier row.
3. A viewer clicks Join and picks a tier. The server action calls `checkoutConfigurations.create` with an **inline plan on the creator's company**: `company_id`, `plan_type: "renewal"`, the price, and `application_fee_amount` (our cut) all nested inside `plan`, plus `metadata` (kind, channelId, tierId, viewerUserId, amounts) that the webhook will read back. The client renders `WhopCheckoutEmbed` with the returned session id.
4. Cheers (tips) are the same shape with `plan_type: "one_time"` and a tip message in the metadata. The video stays free — a tip is never a paywall.
5. The viewer pays (test card `4242 4242 4242 4242` in sandbox). The charge lands on the **creator's connected balance**; Whop deducts the platform's application fee automatically. The creator is the merchant of record.
6. Whop calls `/api/webhooks/whop`. The handler verifies the signature (`webhooks.unwrap` with the raw body text), then processes exactly once: the **first write inside every handler's transaction is the WebhookEvent id row**, so a replayed delivery hits the unique constraint and the whole handler rolls back. `membership.activated`/`.deactivated` upsert/deactivate the ChannelMember (the members-only entitlement); a tip `payment.succeeded` writes the Tip, an EarningsLedger row, a highlighted comment, and a creator notification in one transaction; `refund.created` writes a one-per-payment negative ledger offset.
7. The creator withdraws on `/studio/monetization` through the embedded `PayoutsSession` portal (KYC happens inline on first withdrawal), authenticated by `/api/payout-token`.

---

## Part 1: Foundation, deployment, and authentication

Scaffold with `npx create-next-app@latest wavora --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"`, then install: `@whop/sdk @whop/checkout @whop/embedded-components-react-js @whop/embedded-components-vanilla-js @prisma/client @prisma/adapter-pg pg iron-session zod @vercel/blob clsx tailwind-merge lucide-react` and dev deps `prisma @types/pg`. Add `"postinstall": "prisma generate"` to package.json scripts (the generated client is gitignored; Vercel builds need it regenerated).

Next 16 notes that matter here: the middleware file is `proxy.ts` exporting `proxy()`; `cookies()`, `headers()`, `params`, and `searchParams` are all async; pin `turbopack.root` when parent folders contain stray lockfiles.

### `next.config.ts`

```ts
import type { NextConfig } from "next";

// Single-line CSP. Permissive where the app legitimately needs it — the inline
// no-flash theme script + Next/Turbopack ('unsafe-inline'/'unsafe-eval'); images
// and video from many hosts incl. Vercel Blob, Whop media, and the seed CDNs
// (https:); the embedded Whop checkout/payout (frames + scripts from *.whop.com);
// HMR websockets (ws:/wss:) — while still pinning frame-ancestors (clickjacking),
// object-src, base-uri, and blocking non-https schemes. Production hardening can
// tighten script-src with a nonce and narrow the image/connect allow-lists.
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'self'",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.whop.com https://whop.com",
  "frame-src 'self' https://*.whop.com https://whop.com",
  "connect-src 'self' https: wss: ws:",
  "form-action 'self' https://*.whop.com https://whop.com",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Pin the workspace root to this app so Next doesn't infer a parent
  // directory from stray lockfiles higher up the tree.
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
```

> The CSP allow-lists both `https://*.whop.com` **and** apex `https://whop.com` — a CSP host wildcard does not match the apex domain, and the checkout/payout embeds need both.

### Environment variables

Two Whop API keys with different powers: the **Company API key** (Business Settings → API keys, needs the `access_pass:create` scope) creates products/plans/checkouts/connected accounts/payout tokens; the **App API key** (Developer → your app) does OAuth token exchange and webhook verification. In the Whop dashboard create an app with the `oauth:token_exchange` permission and the `openid profile email` scopes, and register `http://localhost:3000/api/auth/callback` (plus your production URL later) as redirect URIs.

### `src/lib/env.ts`

```ts
import "server-only";
import { z } from "zod";

const schema = z.object({
  WHOP_CLIENT_ID: z.string().min(1),
  WHOP_CLIENT_SECRET: z.string().min(1),
  WHOP_COMPANY_API_KEY: z.string().min(1),
  WHOP_PLATFORM_COMPANY_ID: z.string().min(1),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  NEXT_PUBLIC_APP_URL: z.url(),
  WHOP_SANDBOX: z.enum(["true", "false"]).default("false"),
  WHOP_WEBHOOK_SECRET: z.string().optional(),
  DATABASE_URL: z.string().optional(),
});

type Env = z.infer<typeof schema>;

let cached: Env | null = null;

function load(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = JSON.stringify(parsed.error.flatten().fieldErrors, null, 2);
    throw new Error(`Invalid environment variables:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** Lazily-validated, typed env. Throws on first access if anything required is missing. */
export const env = new Proxy({} as Env, {
  get(_target, key: string) {
    return load()[key as keyof Env];
  },
});

export const isSandbox = () => env.WHOP_SANDBOX === "true";

/**
 * Gate for the temporary /api/dev/* test routes. Local development ONLY — Vercel
 * (and any `next build`/`next start`) sets NODE_ENV=production, so these routes
 * return 403 on every deploy and are never reachable on the public URL. They're
 * fully removed at the production cutover (PLATFORM-11).
 */
export const devRoutesEnabled = () => process.env.NODE_ENV !== "production";
```

### `.env.example`

```bash
# Wavora environment template. Copy to `.env.local` and fill in.
# Pull from Vercel in CI/other machines with: vercel env pull .env.local

# Whop OAuth (app): Whop dashboard > Developer > Apps > [App] > OAuth
WHOP_CLIENT_ID=app_xxxxxxxxxxxx
WHOP_CLIENT_SECRET=xxxxxxxxxxxxxxxxxxxx

# Whop platform (company): Business Settings > API Keys
WHOP_COMPANY_API_KEY=apik_xxxxxxxxxxxx
WHOP_PLATFORM_COMPANY_ID=biz_xxxxxxxxxxxx

# Webhook signing secret: added in Part 4 (dashboard > Webhooks)
WHOP_WEBHOOK_SECRET=

# Session: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
SESSION_SECRET=

# App URL: http://localhost:3000 in dev; stable Vercel URL in prod
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Database (Neon): added when provisioned
DATABASE_URL=
DATABASE_URL_UNPOOLED=

# Vercel Blob (video): Vercel dashboard > Storage > Blob (auto-adds this)
BLOB_READ_WRITE_TOKEN=

# Mode: "true" for the Whop sandbox during development
WHOP_SANDBOX=true
# Sandbox apps authenticate via the sandbox OAuth host. Leave unset in
# production (defaults to https://api.whop.com).
WHOP_OAUTH_BASE_URL=https://sandbox-api.whop.com
```

> Sandbox apps MUST use the sandbox OAuth host: set `WHOP_OAUTH_BASE_URL=https://sandbox-api.whop.com`. Production `api.whop.com` rejects sandbox client ids with `invalid_request: client_id is invalid`. Remove the var entirely in production.

Deploy early: push to Vercel, add the Neon Postgres integration (it injects `DATABASE_URL`), set every env var in the Vercel dashboard, and use the stable `*.vercel.app` domain as the OAuth redirect base — deployment-specific URLs break the exact-match redirect check.

### The data model

Prisma 7 uses `prisma.config.ts` (points at the schema, loads dotenv) and a driver adapter. `src/lib/prisma.ts` is the usual global-cached singleton: `new PrismaClient({ adapter: new PrismaPg({ connectionString: env.DATABASE_URL }) })`. The full schema — every model up front:

### `prisma/schema.prisma`

```prisma
// Wavora data model. All models defined upfront; some are used in later phases.
// Firehose tables (View, WatchHistory, WebhookEvent) are kept lean + prunable —
// see the "Database Scale" notes in CLAUDE.md.

generator client {
  provider = "prisma-client"
  output   = "../src/generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ─── Enums ──────────────────────────────────────────────────────────────────

enum Visibility {
  PUBLIC
  UNLISTED
  PRIVATE
}

enum VideoStatus {
  UPLOADING
  PROCESSING
  READY
  ERRORED
}

enum VideoCategory {
  MUSIC
  GAMING
  NEWS
  SPORTS
  COMEDY
  EDUCATION
  ENTERTAINMENT
  TECH
  PODCASTS
  COOKING
  OTHER
}

enum ReactionType {
  LIKE
  DISLIKE
}

enum CommentStatus {
  PUBLISHED
  HELD
  REMOVED
  DELETED
}

enum MemberStatus {
  ACTIVE
  INACTIVE
}

enum LedgerSource {
  MEMBERSHIP
  SUPER_THANKS
}

enum NotificationType {
  NEW_SUBSCRIBER
  NEW_MEMBER
  SUPER_THANKS
  NEW_UPLOAD
  COMMENT_REPLY
}

// NOTIFY-1/2: per-subscription bell level. ALL = every upload (the column
// default: subscribing opts into upload notifications), PERSONALIZED = some,
// NONE = muted.
enum NotifyLevel {
  ALL
  PERSONALIZED
  NONE
}

// ─── Core identity ──────────────────────────────────────────────────────────

model User {
  id         String   @id @default(cuid())
  whopUserId String   @unique
  username   String
  name          String?
  email         String?
  avatarUrl     String?
  historyPaused Boolean  @default(false) // LIB-5: pause watch history
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  channel          Channel?
  subscriptions    Subscription[]
  reactions        Reaction[]
  comments         Comment[]
  commentReactions CommentReaction[]
  watchHistory     WatchHistory[]
  views            View[]
  watchLater       WatchLater[]
  playlists        Playlist[]
  memberships      ChannelMember[]
  tips             Tip[]             @relation("TipSupporter")
  notifications    Notification[]
}

model Channel {
  id                 String   @id @default(cuid())
  userId             String   @unique
  handle             String   @unique
  name               String
  description        String?
  avatarUrl          String?
  bannerUrl          String?
  whopCompanyId      String? // connected account (biz_xxx)
  payoutEnabled      Boolean  @default(false)
  superThanksEnabled Boolean  @default(false)
  membershipsEnabled Boolean  @default(false)
  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  user            User             @relation(fields: [userId], references: [id], onDelete: Cascade)
  videos          Video[]
  subscribers     Subscription[]
  membershipTiers MembershipTier[]
  members         ChannelMember[]
  tips            Tip[]
  earnings        EarningsLedger[]
}

// ─── Video ──────────────────────────────────────────────────────────────────

model Video {
  id              String        @id @default(cuid())
  channelId       String
  title           String
  description     String?
  category        VideoCategory @default(OTHER)
  visibility      Visibility    @default(PUBLIC)
  status          VideoStatus   @default(UPLOADING)
  isShort         Boolean       @default(false)
  membersOnly     Boolean       @default(false)
  commentsEnabled Boolean       @default(true)

  // Vercel Blob (object storage; no transcoding — H.264 MP4 for the demo).
  // Production would add a transcoding/CDN layer (Mux/Cloudinary) for any-format
  // ingest + adaptive streaming + signed playback. See CLAUDE.md.
  videoUrl        String? // Blob URL of the uploaded file
  videoPathname   String? // Blob pathname (for deletion)
  durationSeconds Int     @default(0)
  thumbnailUrl    String? // Blob URL of a client-captured poster frame

  // Denormalized aggregate (kept in sync); raw events live in View (prunable).
  viewCount   Int       @default(0)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  channel       Channel        @relation(fields: [channelId], references: [id], onDelete: Cascade)
  reactions     Reaction[]
  comments      Comment[]
  watchHistory  WatchHistory[]
  views         View[]
  watchLater    WatchLater[]
  playlistItems PlaylistItem[]
  tips          Tip[]

  @@index([channelId])
  @@index([visibility, status, publishedAt])
  @@index([category])
}

// ─── Engagement ─────────────────────────────────────────────────────────────

model Subscription {
  id           String      @id @default(cuid())
  subscriberId String
  channelId    String
  notify       NotifyLevel @default(ALL)
  createdAt    DateTime    @default(now())

  subscriber User    @relation(fields: [subscriberId], references: [id], onDelete: Cascade)
  channel    Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@unique([subscriberId, channelId])
  @@index([channelId])
}

model Reaction {
  id        String       @id @default(cuid())
  userId    String
  videoId   String
  type      ReactionType
  createdAt DateTime     @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@unique([userId, videoId])
  @@index([videoId, type])
}

model Comment {
  id                String        @id @default(cuid())
  videoId           String
  authorId          String
  parentId          String?
  body              String
  status            CommentStatus @default(PUBLISHED)
  isPinned          Boolean       @default(false)
  heartedByCreator  Boolean       @default(false)
  isSuperThanks     Boolean       @default(false)
  superThanksAmount Int? // cents
  createdAt         DateTime      @default(now())
  updatedAt         DateTime      @updatedAt

  video     Video             @relation(fields: [videoId], references: [id], onDelete: Cascade)
  author    User              @relation(fields: [authorId], references: [id], onDelete: Cascade)
  parent    Comment?          @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies   Comment[]         @relation("CommentReplies")
  reactions CommentReaction[]

  @@index([videoId, status, createdAt])
  @@index([parentId])
}

model CommentReaction {
  id        String   @id @default(cuid())
  userId    String
  commentId String
  createdAt DateTime @default(now())

  user    User    @relation(fields: [userId], references: [id], onDelete: Cascade)
  comment Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([userId, commentId])
}

// ─── Library / history (firehose — keep lean) ───────────────────────────────

model WatchHistory {
  id              String   @id @default(cuid())
  userId          String
  videoId         String
  positionSeconds Int      @default(0)
  completed       Boolean  @default(false)
  lastWatchedAt   DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@unique([userId, videoId]) // one upserted row per (user, video), not per event
  @@index([userId, lastWatchedAt])
}

// Dedup rows for view counting. sessionKey carries a debounce bucket
// (e.g. "<userOrAnonHash>:<dayBucket>"). Prunable on a retention window.
model View {
  id         String   @id @default(cuid())
  videoId    String
  userId     String?
  sessionKey String
  createdAt  DateTime @default(now())

  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)
  user  User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@unique([videoId, sessionKey])
  @@index([videoId])
  @@index([createdAt])
}

model WatchLater {
  id      String   @id @default(cuid())
  userId  String
  videoId String
  addedAt DateTime @default(now())

  user  User  @relation(fields: [userId], references: [id], onDelete: Cascade)
  video Video @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@unique([userId, videoId])
}

model Playlist {
  id          String     @id @default(cuid())
  ownerId     String
  title       String
  description String?
  visibility  Visibility @default(PRIVATE)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  owner User           @relation(fields: [ownerId], references: [id], onDelete: Cascade)
  items PlaylistItem[]

  @@index([ownerId])
}

model PlaylistItem {
  id         String   @id @default(cuid())
  playlistId String
  videoId    String
  position   Int
  addedAt    DateTime @default(now())

  playlist Playlist @relation(fields: [playlistId], references: [id], onDelete: Cascade)
  video    Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)

  @@unique([playlistId, videoId])
  @@index([playlistId, position])
}

// ─── Monetization ───────────────────────────────────────────────────────────

model MembershipTier {
  id            String   @id @default(cuid())
  channelId     String
  name          String
  description   String?
  priceCents    Int
  whopPlanId    String?
  whopProductId String?
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  channel Channel         @relation(fields: [channelId], references: [id], onDelete: Cascade)
  members ChannelMember[]

  @@index([channelId])
}

model ChannelMember {
  id               String       @id @default(cuid())
  userId           String
  channelId        String
  tierId           String?
  status           MemberStatus @default(ACTIVE)
  whopMembershipId String?      @unique
  startedAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  user    User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  channel Channel         @relation(fields: [channelId], references: [id], onDelete: Cascade)
  tier    MembershipTier? @relation(fields: [tierId], references: [id], onDelete: SetNull)

  @@unique([userId, channelId])
  @@index([channelId, status])
}

model Tip {
  id            String   @id @default(cuid())
  supporterId   String
  channelId     String
  videoId       String?
  amountCents   Int
  feeCents      Int
  netCents      Int
  currency      String   @default("usd")
  message       String?
  whopPaymentId String   @unique
  createdAt     DateTime @default(now())

  supporter User    @relation("TipSupporter", fields: [supporterId], references: [id], onDelete: Cascade)
  channel   Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)
  video     Video?  @relation(fields: [videoId], references: [id], onDelete: SetNull)

  @@index([channelId])
}

model EarningsLedger {
  id            String       @id @default(cuid())
  channelId     String
  source        LedgerSource
  grossCents    Int
  feeCents      Int
  netCents      Int
  currency      String       @default("usd")
  whopPaymentId String       @unique
  videoId       String?
  createdAt     DateTime     @default(now())

  channel Channel @relation(fields: [channelId], references: [id], onDelete: Cascade)

  @@index([channelId, createdAt])
}

// ─── Notifications / platform ───────────────────────────────────────────────

model Notification {
  id          String           @id @default(cuid())
  recipientId String
  type        NotificationType
  title       String
  body        String?
  data        Json?
  readAt      DateTime?
  createdAt   DateTime         @default(now())

  recipient User @relation(fields: [recipientId], references: [id], onDelete: Cascade)

  @@index([recipientId, createdAt])
}

// Idempotency keys for Whop + Mux webhooks. Prunable after a retention window.
model WebhookEvent {
  id          String   @id // external event id
  source      String // "whop" | "mux"
  processedAt DateTime @default(now())

  @@index([processedAt])
}
```

Push with `npx prisma db push` (demo scale; use migrations for a real product). Note the idempotency shapes: `WebhookEvent.id` is the Whop event id, `Tip.whopPaymentId` and `EarningsLedger` rows key money records to Whop payment ids, and `ChannelMember` has one row per (user, channel).

### Signing in with Whop (OAuth 2.1 + PKCE)

The flow: `/api/auth/login` generates a PKCE verifier + state + nonce, stores them in a separate short-lived httpOnly cookie (iron-session drops cookies set during cross-site redirects, so the verifier never goes in the session), and redirects to Whop. The callback verifies state, exchanges the code, upserts the user, and writes the session cookie directly onto the redirect response.

### `src/lib/pkce.ts`

```ts
/** PKCE + random-token helpers (OAuth 2.1). Node 22 global Web Crypto. */

export function randomToken(bytes = 32): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Buffer.from(arr).toString("base64url");
}

export async function pkceChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(new Uint8Array(digest)).toString("base64url");
}
```

### `src/lib/session-config.ts`

```ts
/**
 * Session constants shared between server code and middleware.
 * Kept free of `server-only` / `next/headers` so middleware can import it.
 */
export const SESSION_COOKIE = "wavora_session";
export const PKCE_COOKIE = "wavora_pkce";

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/** Route prefixes that require an authenticated session. */
export const PROTECTED_PREFIXES = [
  "/studio",
  "/feed/history",
  "/feed/subscriptions",
  "/feed/you",
];
```

### `src/lib/session.ts`

```ts
import "server-only";
import { cache } from "react";
import { getIronSession, sealData } from "iron-session";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import { prisma } from "./prisma";
import { env } from "./env";
import { SESSION_COOKIE, sessionCookieOptions } from "./session-config";

export type SessionUser = {
  id: string; // DB User.id (cuid)
  whopUserId: string; // Whop user id (sub)
  username: string;
  name: string | null;
  email: string | null;
  avatarUrl: string | null;
};

export interface SessionData {
  user?: SessionUser;
  accessToken?: string;
}

const sessionOptions = {
  password: env.SESSION_SECRET,
  cookieName: SESSION_COOKIE,
  cookieOptions: sessionCookieOptions,
};

/** Read/mutate the session via the cookie store (server components, logout). */
export async function getSession() {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const user = (await getSession()).user;
  // No id (a pre-AUTH-6 cookie) → logged-out, before it can reach any query.
  if (!user || typeof user.id !== "string" || user.id.length === 0) return null;
  // The id is well-formed but may be ORPHANED: a cookie can outlive its User row
  // (a DB reset, a re-seed that deleted+recreated the user with a new id, or a
  // removed account). An orphaned id passes the string check yet FK-violates
  // every write keyed to it (reaction/subscription/comment/channel) — exactly
  // the "reads work, all writes crash" failure. Verify the row exists; a missing
  // row means "sign in again", not a Prisma foreign-key crash on the next write.
  // cache() memoizes this per request, so it costs one lookup, not one per call.
  const exists = await prisma.user.findUnique({
    where: { id: user.id },
    select: { id: true },
  });
  return exists ? user : null;
});

/**
 * Seal the session and write it directly onto a response. Used in the OAuth
 * callback because mutating the cookie store and returning NextResponse.redirect
 * can silently drop the Set-Cookie (Whop OAuth gotcha 16).
 */
export async function writeSessionCookie(res: NextResponse, data: SessionData) {
  const sealed = await sealData(data, { password: env.SESSION_SECRET });
  res.cookies.set(SESSION_COOKIE, sealed, sessionCookieOptions);
}
```

### `src/lib/whop-oauth.ts`

```ts
import "server-only";
import { env } from "./env";

/**
 * Whop OAuth 2.1 + PKCE. Per the Whop docs, OAuth endpoints live at
 * https://api.whop.com/oauth/ for BOTH sandbox and production apps (the
 * sandbox flag only changes the SDK data-API base, not OAuth). Override with
 * WHOP_OAUTH_BASE_URL only if a sandbox test proves it needs a different host.
 *
 * All four gotchas are encoded below:
 *  - `nonce` is sent because we request the `openid` scope.
 *  - `client_secret` is sent in the token exchange even though we use PKCE
 *    (confidential server client — Whop returns 401 invalid_client without it).
 *  - the token body is JSON, not form-urlencoded.
 *  - `redirect_uri` is the exact registered callback.
 */
const OAUTH_BASE = (
  process.env.WHOP_OAUTH_BASE_URL ?? "https://api.whop.com"
).replace(/\/$/, "");

export const REDIRECT_URI = `${env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;
export const OAUTH_SCOPE = "openid profile email";

export function buildAuthorizeUrl(params: {
  state: string;
  nonce: string;
  codeChallenge: string;
}): string {
  const url = new URL(`${OAUTH_BASE}/oauth/authorize`);
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: env.WHOP_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    scope: OAUTH_SCOPE,
    state: params.state,
    nonce: params.nonce,
    code_challenge: params.codeChallenge,
    code_challenge_method: "S256",
  }).toString();
  return url.toString();
}

type TokenResponse = {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  token_type?: string;
  expires_in?: number;
};

export async function exchangeCodeForTokens(
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const res = await fetch(`${OAUTH_BASE}/oauth/token`, {
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
    throw new Error(`Token exchange failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as TokenResponse;
}

type UserInfo = {
  sub: string;
  preferred_username?: string;
  name?: string;
  email?: string;
  picture?: string;
};

export async function fetchUserInfo(accessToken: string): Promise<UserInfo> {
  const res = await fetch(`${OAUTH_BASE}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`userinfo failed (${res.status}): ${await res.text()}`);
  }
  return (await res.json()) as UserInfo;
}
```

> The four Whop OAuth gotchas baked into that file: (1) `nonce` is REQUIRED when the scope includes `openid`; (2) the token exchange REQUIRES `client_secret` even with PKCE; (3) the token body must be JSON, not form-encoded; (4) `redirect_uri` must exactly match a registered URI.

### `src/lib/auth.ts`

```ts
import "server-only";
import { redirect } from "next/navigation";
import { prisma } from "./prisma";
import { getCurrentUser } from "./session";

/** Return the signed-in user or redirect to the sign-in surface (AUTH-9). */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** The current user's channel, or null if they haven't created one yet. */
export async function getMyChannel() {
  const user = await getCurrentUser();
  if (!user) return null;
  return prisma.channel.findUnique({ where: { userId: user.id } });
}

/**
 * Require a signed-in user who owns a channel. Redirects to sign-in if logged
 * out, or to the create-channel flow if they have no channel yet. Used to gate
 * the studio + upload (CHANNEL-8 / VIDEO ownership).
 */
export async function requireChannel() {
  const user = await requireUser();
  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
  });
  if (!channel) redirect("/create-channel");
  return { user, channel };
}
```

### `src/app/api/auth/login/route.ts`

```ts
import { type NextRequest, NextResponse } from "next/server";
import { randomToken, pkceChallenge } from "@/lib/pkce";
import { buildAuthorizeUrl } from "@/lib/whop-oauth";
import { PKCE_COOKIE, sessionCookieOptions } from "@/lib/session-config";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/** Only a local path is allowed as a post-login target. The URL parser strips
 * tabs/newlines and treats "\" like "/", so we validate the RESOLVED target
 * against a placeholder origin instead of pattern-matching the raw string. */
export function safeNext(raw: string | null | undefined): string | undefined {
  if (!raw || !raw.startsWith("/")) return undefined;
  try {
    const resolved = new URL(raw, "http://internal");
    if (resolved.origin !== "http://internal") return undefined;
    return resolved.pathname + resolved.search;
  } catch {
    return undefined;
  }
}

export async function GET(request: NextRequest) {
  const rl = rateLimit(`auth-login:${clientIp(request)}`, 20, 60_000);
  if (!rl.ok) {
    return new NextResponse("Too many requests - try again shortly.", {
      status: 429,
      headers: { "Retry-After": String(rl.retryAfterSeconds) },
    });
  }

  const verifier = randomToken(32);
  const state = randomToken(16);
  const nonce = randomToken(16);
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const codeChallenge = await pkceChallenge(verifier);

  const res = NextResponse.redirect(
    buildAuthorizeUrl({ state, nonce, codeChallenge }),
  );

  // PKCE lives in its OWN short-lived httpOnly cookie (gotcha 16): the
  // iron-session cookie can be dropped across the cross-site redirect to Whop.
  // We also stash the (validated) post-login destination here.
  res.cookies.set(
    PKCE_COOKIE,
    JSON.stringify({ verifier, state, nonce, next }),
    { ...sessionCookieOptions, maxAge: 600 },
  );

  return res;
}
```

> `safeNext` validates the RESOLVED URL, not the raw string. The URL parser strips tabs/newlines and treats `\` as `/`, so a naive `startsWith("/")` check can be tricked into an open redirect (`/%09/evil.com`).

### `src/app/api/auth/callback/route.ts`

```ts
import { type NextRequest, NextResponse } from "next/server";
import { exchangeCodeForTokens, fetchUserInfo } from "@/lib/whop-oauth";
import { safeNext } from "../login/route";
import { writeSessionCookie } from "@/lib/session";
import { PKCE_COOKIE } from "@/lib/session-config";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/sign-in?error=${reason}`, origin));

  if (oauthError) return fail(oauthError);
  if (!code || !state) return fail("missing_code");

  const pkceRaw = request.cookies.get(PKCE_COOKIE)?.value;
  if (!pkceRaw) return fail("missing_pkce");

  let pkce: { verifier: string; state: string; nonce: string; next?: string };
  try {
    pkce = JSON.parse(pkceRaw);
  } catch {
    return fail("bad_pkce");
  }
  if (pkce.state !== state) return fail("state_mismatch");

  try {
    const tokens = await exchangeCodeForTokens(code, pkce.verifier);
    const info = await fetchUserInfo(tokens.access_token);

    // AUTH-6: upsert the Whop user into our DB, keyed by their Whop user id.
    const profile = {
      username: info.preferred_username ?? info.sub,
      name: info.name ?? null,
      email: info.email ?? null,
      avatarUrl: info.picture ?? null,
    };
    const user = await prisma.user.upsert({
      where: { whopUserId: info.sub },
      create: { whopUserId: info.sub, ...profile },
      update: profile,
    });

    const res = NextResponse.redirect(new URL(safeNext(pkce.next) ?? "/", origin));
    await writeSessionCookie(res, {
      user: {
        id: user.id,
        whopUserId: user.whopUserId,
        username: user.username,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
      },
      accessToken: tokens.access_token,
    });
    res.cookies.delete(PKCE_COOKIE);
    return res;
  } catch (err) {
    console.error("OAuth callback failed:", err);
    return fail("token_exchange_failed");
  }
}
```

### `src/app/api/auth/logout/route.ts`

```ts
import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-config";

function destroy(url: string) {
  const res = NextResponse.redirect(new URL("/", new URL(url).origin));
  res.cookies.delete(SESSION_COOKIE);
  return res;
}

export async function POST(request: Request) {
  return destroy(request.url);
}

export async function GET(request: Request) {
  return destroy(request.url);
}
```

### `src/proxy.ts`

```ts
import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, PROTECTED_PREFIXES } from "@/lib/session-config";

// Next.js 16 request proxy (formerly "middleware"). Route-level auth guard.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isProtected) return NextResponse.next();

  if (request.cookies.has(SESSION_COOKIE)) return NextResponse.next();

  const signIn = new URL("/sign-in", request.url);
  signIn.searchParams.set("next", pathname);
  return NextResponse.redirect(signIn);
}

export const config = {
  matcher: [
    "/studio/:path*",
    "/feed/history/:path*",
    "/feed/subscriptions/:path*",
    "/feed/you/:path*",
  ],
};
```

`/sign-in` is a simple page: logo, one "Continue with Whop" button linking to `/api/auth/login` (forwarding a validated `?next=`), and an error banner keyed by `?error=`.

### The design system and app shell

All described — generate in your own style:

- `globals.css`: CSS-variable theme tokens (`--canvas/--surface/--hover/--fg/--fg-muted/--border/--accent/--brand/--chip`) with a `.dark` block, mapped into Tailwind via `@theme inline`; a separate static `@theme` block overrides `--radius-lg/xl/2xl` (radius overrides silently no-op inside `@theme inline`). Light canvas is a warm off-white `#faf8f3`; dark base is `#0f0f0f`.
- `components/theme-provider.tsx` + `theme-toggle.tsx`: a ~40-line context ThemeProvider (localStorage + class toggle) with a server-rendered inline no-flash script in the root layout. (next-themes renders a script tag inside a client component, which React 19 warns about.)
- `components/layout/top-bar.tsx`: fixed 56px bar — hamburger (desktop: pins the sidebar via `window.matchMedia("(min-width: 1024px)")`; mobile: opens a drawer), wordmark, a single rounded-full search form with a leading icon that grows on focus (GET to `/results`), Create link, notification bell, theme toggle, avatar/Sign-in.
- `components/layout/sidebar-context.tsx`: React context with `pinned` + `mobileOpen`.
- `components/layout/guide-sidebar.tsx`: a 72px icon rail that expands to 240px on hover (pinned = stays open); sections Home/Waves/Subscriptions, You (History/Playlists/Your videos/Watch later/Liked), subscribed channels, Explore. Active-state matching is query-aware (`/playlist?list=WL` vs `?list=LL`) via `useSearchParams`. Includes a slide-in MobileDrawer variant.
- `components/layout/mobile-nav.tsx`: fixed bottom nav (Home/Waves/Subscriptions/You) under `lg`.
- `components/layout/app-shell.tsx`: composes provider + bar + sidebar + drawer + main (margin follows `pinned`) + bottom nav; used by the `(main)` route-group layout, which loads the session user and subscribed channels server-side.
- `lib/utils.ts`: the standard `cn()` (clsx + tailwind-merge).

## Part 2: Channels and video

### Validators and formatters

### `src/lib/validators.ts`

```ts
import { z } from "zod";

/** Visibility + category values mirror the Prisma enums (schema.prisma). */
export const VISIBILITIES = ["PUBLIC", "UNLISTED", "PRIVATE"] as const;
export const CATEGORIES = [
  "MUSIC",
  "GAMING",
  "NEWS",
  "SPORTS",
  "COMEDY",
  "EDUCATION",
  "ENTERTAINMENT",
  "TECH",
  "PODCASTS",
  "COOKING",
  "OTHER",
] as const;

/**
 * CHANNEL-2: a unique, lowercase @handle. We accept an optional leading "@",
 * lowercase it, and allow letters, digits, underscore, dot, and hyphen.
 */
export const handleSchema = z
  .string()
  .trim()
  .transform((v) => v.replace(/^@/, "").toLowerCase())
  .pipe(
    z
      .string()
      .min(3, "Handle must be at least 3 characters")
      .max(30, "Handle must be 30 characters or fewer")
      .regex(
        /^[a-z0-9_.-]+$/,
        "Use only letters, numbers, and . _ -",
      ),
  );

export const createChannelSchema = z.object({
  name: z.string().trim().min(1, "Add a channel name").max(50),
  handle: handleSchema,
});

/** CHANNEL-6/7: editable channel profile (name, @handle, bio, avatar, banner). */
export const updateChannelSchema = z.object({
  name: z.string().trim().min(1, "Add a channel name").max(50),
  description: z.string().trim().max(1000).optional().or(z.literal("")),
  handle: handleSchema,
  avatarUrl: z.url().optional().or(z.literal("")),
  bannerUrl: z.url().optional().or(z.literal("")),
});

/** VIDEO-5: Zod-validated upload metadata. */
export const videoMetaSchema = z.object({
  title: z.string().trim().min(1, "Add a title").max(100),
  description: z.string().trim().max(5000).optional().or(z.literal("")),
  visibility: z.enum(VISIBILITIES).default("PUBLIC"),
  category: z.enum(CATEGORIES).default("OTHER"),
  // MEMBERSHIP-6 / VIDEO-11: playback restricted to active channel members.
  membersOnly: z.boolean().default(false),
  // VIDEO-10: vertical short-form clip; lives in the Shorts feed, not the grid.
  isShort: z.boolean().default(false),
});

/**
 * Payload the client sends after a Vercel Blob upload finishes. The Blob URLs
 * are produced by the browser-direct upload; we validate them as our own
 * blob-store URLs before persisting.
 */
const blobUrl = z
  .url()
  .refine(
    (u) => u.includes(".blob.vercel-storage.com"),
    "Expected a Vercel Blob URL",
  );

export const createVideoSchema = videoMetaSchema.extend({
  videoUrl: blobUrl,
  videoPathname: z.string().min(1),
  thumbnailUrl: blobUrl.optional(),
  // The browser reports a fractional duration (e.g. 5.31s); we accept any
  // non-negative number here and round to whole seconds when persisting.
  durationSeconds: z.number().min(0).max(60 * 60 * 12),
});

/** VIDEO-7: editing reuses the metadata schema, keyed by video id. */
export const updateVideoSchema = videoMetaSchema.extend({
  id: z.string().min(1),
});

/** SOCIAL-6: a comment (or reply) body. */
export const commentBodySchema = z
  .string()
  .trim()
  .min(1, "Write something")
  .max(10000);

export type CreateChannelInput = z.infer<typeof createChannelSchema>;
export type UpdateChannelInput = z.infer<typeof updateChannelSchema>;
export type CreateVideoInput = z.infer<typeof createVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
```

> `durationSeconds` is `z.number().min(0)`, not `.int()` — browsers report fractional media durations, and an int check rejects every real upload. Round before persisting.

`lib/format.ts` (described): `formatViews`/`formatCompact` (Intl compact notation), `formatTimeAgo`, `formatDuration` (m:ss / h:mm:ss).

### Become a channel

Described: `/create-channel` renders a form (name, lowercase @handle, optional bio) with a 450 ms debounced availability check against `GET /api/handle-check` (auth-gated, rate-limited, validates with `handleSchema` + a `findUnique`); the submit button stays disabled until the check says available. The server action re-validates, creates the Channel, and catches Prisma `P2002` for the check→submit race. The public channel page lives at `/@handle` — the folder is a `[handle]` dynamic segment and the code requires the `@` prefix at runtime (a literal `@[handle]` folder would parse as a parallel-route slot).

### Upload a video (Vercel Blob, browser-direct)

Videos never touch the server: the client asks the token route for a signed upload, PUTs the file straight to Blob, captures the duration and poster frames from a local `<video>` element, uploads the chosen poster the same way, then calls the `createVideo` server action, which lands the row directly in `READY` (no transcoding, so no processing webhook).

### `src/app/api/blob/upload/route.ts`

```ts
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// Demo cap. Vercel Blob supports up to 5TB via multipart; we keep uploads small
// for the free tier. Production would also add a transcoding step (see CLAUDE.md).
const MAX_BYTES = 512 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "image/jpeg",
  "image/png",
  "image/webp",
];

/**
 * VIDEO-1: mint a short-lived client-upload token so the browser uploads the
 * file directly to Vercel Blob (bypassing the 4.5MB server-body limit). We
 * authorize here: only a signed-in user who owns a channel may upload.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = (await request.json()) as HandleUploadBody;
    const json = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const user = await getCurrentUser();
        if (!user) throw new Error("You must be signed in to upload.");
        const channel = await prisma.channel.findUnique({
          where: { userId: user.id },
          select: { id: true },
        });
        if (!channel) throw new Error("Create a channel before uploading.");

        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: true,
          tokenPayload: JSON.stringify({ channelId: channel.id }),
        };
      },
      onUploadCompleted: async () => {
        // Vercel only calls this over a public HTTPS URL (never localhost), so
        // we persist the Video row from the client after upload finishes
        // instead — see src/app/studio/actions.ts (createVideo).
      },
    });

    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
```

### `src/app/studio/upload/uploader.tsx`

```tsx
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { upload } from "@vercel/blob/client";
import { ImagePlus, UploadCloud } from "lucide-react";
import { CATEGORIES, VISIBILITIES } from "@/lib/validators";
import { cn } from "@/lib/utils";
import { createVideo } from "../actions";

type Captured = {
  durationSeconds: number;
  width: number;
  height: number;
  posters: Blob[];
};

/**
 * VIDEO-2/6: read duration + dimensions and grab three candidate poster frames
 * (at 15% / 50% / 85% of the clip), entirely client-side, so the creator can
 * pick a thumbnail without a server round-trip.
 */
function captureFromVideo(file: File): Promise<Captured> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "auto";
    video.muted = true;
    video.src = url;

    let settled = false;
    let w = 0;
    let h = 0;
    let duration = 0;
    const posters: Blob[] = [];

    const finish = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve({ durationSeconds: duration, width: w, height: h, posters });
    };
    // Never hang the publish flow if a file never fires loadedmetadata/seeked.
    const timeout = setTimeout(finish, 12000);

    const seekAndShoot = (t: number) =>
      new Promise<void>((res) => {
        const onSeeked = () => {
          video.removeEventListener("seeked", onSeeked);
          try {
            const maxW = 1280;
            const scale = video.videoWidth > maxW ? maxW / video.videoWidth : 1;
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
            canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
            const ctx = canvas.getContext("2d");
            if (!ctx) return res();
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            canvas.toBlob(
              (blob) => {
                if (blob) posters.push(blob);
                res();
              },
              "image/jpeg",
              0.82,
            );
          } catch {
            res();
          }
        };
        video.addEventListener("seeked", onSeeked);
        try {
          video.currentTime = t;
        } catch {
          video.removeEventListener("seeked", onSeeked);
          res();
        }
      });

    video.onloadedmetadata = async () => {
      w = video.videoWidth;
      h = video.videoHeight;
      duration = Number.isFinite(video.duration) ? video.duration : 0;
      const fractions = duration > 0 ? [0.15, 0.5, 0.85] : [0];
      for (const f of fractions) {
        const t =
          duration > 0 ? Math.min(duration * f, Math.max(0, duration - 0.1)) : 0;
        await seekAndShoot(t);
      }
      finish();
    };
    video.onerror = () => finish();
  });
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "video";
}

export function Uploader() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] =
    useState<(typeof VISIBILITIES)[number]>("PUBLIC");
  const [category, setCategory] =
    useState<(typeof CATEGORIES)[number]>("OTHER");
  const [membersOnly, setMembersOnly] = useState(false);
  const [detectedShort, setDetectedShort] = useState(false);

  // VIDEO-6: thumbnail candidates + the chosen one (index, or -1 = custom).
  const [posterUrls, setPosterUrls] = useState<string[]>([]);
  const [selectedPoster, setSelectedPoster] = useState(0);
  const [customThumb, setCustomThumb] = useState<File | null>(null);
  const [customThumbUrl, setCustomThumbUrl] = useState<string | null>(null);

  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const captured = useRef<Captured | null>(null);

  async function onPick(picked: File) {
    setFile(picked);
    setTitle(picked.name.replace(/\.[^.]+$/, "").slice(0, 100));
    setError(null);
    captured.current = null;
    setPosterUrls([]);
    setSelectedPoster(0);
    setCustomThumb(null);
    setCustomThumbUrl(null);

    const result = await captureFromVideo(picked);
    captured.current = result;
    // VIDEO-10: a portrait clip ≤ 3 min is auto-classified as a Short.
    setDetectedShort(
      result.height > result.width && result.durationSeconds <= 180,
    );
    setPosterUrls(result.posters.map((p) => URL.createObjectURL(p)));
  }

  function onCustomThumb(picked: File) {
    setCustomThumb(picked);
    setCustomThumbUrl(URL.createObjectURL(picked));
    setSelectedPoster(-1);
  }

  function chosenThumb(): Blob | null {
    if (selectedPoster === -1) return customThumb;
    return captured.current?.posters[selectedPoster] ?? null;
  }

  const selectedUrl =
    selectedPoster === -1 ? customThumbUrl : (posterUrls[selectedPoster] ?? null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file || busy) return;
    setBusy(true);
    setError(null);
    try {
      const base = sanitize(file.name);
      const videoBlob = await upload(`videos/${base}`, file, {
        access: "public",
        handleUploadUrl: "/api/blob/upload",
        contentType: file.type,
        onUploadProgress: (p) => setProgress(p.percentage),
      });

      let thumbnailUrl: string | undefined;
      const poster = chosenThumb();
      if (poster) {
        const thumb = await upload(
          `thumbnails/${base}.jpg`,
          new File([poster], `${base}.jpg`, { type: "image/jpeg" }),
          {
            access: "public",
            handleUploadUrl: "/api/blob/upload",
            contentType: "image/jpeg",
          },
        );
        thumbnailUrl = thumb.url;
      }

      const res = await createVideo({
        title,
        description,
        visibility,
        category,
        membersOnly,
        isShort: detectedShort,
        videoUrl: videoBlob.url,
        videoPathname: videoBlob.pathname,
        thumbnailUrl,
        durationSeconds: captured.current?.durationSeconds ?? 0,
      });

      if (res.error || !res.id) {
        setError(res.error ?? "Something went wrong.");
        setBusy(false);
        return;
      }
      router.push(`/watch?v=${res.id}`);
    } catch (err) {
      setError((err as Error).message || "Upload failed.");
      setBusy(false);
    }
  }

  if (!file) {
    return (
      <label className="mx-auto flex max-w-lg cursor-pointer flex-col items-center gap-4 rounded-2xl border border-dashed border-border px-6 py-16 text-center hover:bg-hover">
        <span className="grid h-20 w-20 place-items-center rounded-full bg-hover">
          <UploadCloud className="h-9 w-9 text-fg-muted" />
        </span>
        <span className="text-base font-medium">Select a video to upload</span>
        <span className="text-sm text-fg-muted">
          MP4 or WebM, up to 512 MB. It plays as-is (no transcoding) in this demo.
        </span>
        <input
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onPick(f);
          }}
        />
      </label>
    );
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto grid max-w-3xl gap-6 md:grid-cols-[1fr_300px]">
      <div className="flex flex-col gap-4">
        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">Title (required)</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={100}
            className="w-full rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-fg-muted">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={5000}
            className="w-full resize-y rounded-lg border border-border bg-transparent px-3 py-2.5 outline-none focus:border-accent"
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="block">
            <span className="mb-1 block text-xs text-fg-muted">Visibility</span>
            <select
              value={visibility}
              onChange={(e) =>
                setVisibility(e.target.value as (typeof VISIBILITIES)[number])
              }
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 outline-none focus:border-accent"
            >
              {VISIBILITIES.map((v) => (
                <option key={v} value={v}>
                  {v.charAt(0) + v.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-xs text-fg-muted">Category</span>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof CATEGORIES)[number])
              }
              className="w-full rounded-lg border border-border bg-canvas px-3 py-2.5 outline-none focus:border-accent"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.charAt(0) + c.slice(1).toLowerCase()}
                </option>
              ))}
            </select>
          </label>
        </div>

        {detectedShort ? (
          <p className="rounded-lg bg-brand/10 px-3 py-2 text-sm text-brand">
            Vertical video detected - this will publish as a Wave.
          </p>
        ) : null}

        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-border p-3">
          <input
            type="checkbox"
            checked={membersOnly}
            onChange={(e) => setMembersOnly(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-accent"
          />
          <span className="text-sm">
            Members-only
            <span className="block text-xs text-fg-muted">
              Only your channel members can watch. Requires memberships enabled.
            </span>
          </span>
        </label>

        {error ? <p className="text-sm text-red-500">{error}</p> : null}

        {busy ? (
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-hover">
            <div
              className="h-full bg-accent transition-[width]"
              style={{ width: `${Math.max(5, progress)}%` }}
            />
          </div>
        ) : null}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={busy || !title.trim()}
            className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
          >
            {busy ? `Uploading… ${Math.round(progress)}%` : "Publish"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setFile(null);
              setProgress(0);
            }}
            className="rounded-full border border-border px-5 py-2.5 font-medium hover:bg-hover disabled:opacity-60"
          >
            Cancel
          </button>
        </div>
      </div>

      <aside className="flex flex-col gap-3">
        <span className="text-xs text-fg-muted">Thumbnail</span>
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-hover">
          {selectedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={selectedUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full place-items-center text-xs text-fg-muted">
              Generating thumbnails…
            </div>
          )}
        </div>

        {posterUrls.length > 0 ? (
          <div className="grid grid-cols-3 gap-2">
            {posterUrls.map((u, i) => (
              <button
                type="button"
                key={u}
                onClick={() => setSelectedPoster(i)}
                className={cn(
                  "aspect-video overflow-hidden rounded-lg border-2",
                  selectedPoster === i ? "border-accent" : "border-transparent",
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        ) : null}

        <label
          className={cn(
            "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-xs hover:bg-hover",
            selectedPoster === -1
              ? "border-accent text-accent"
              : "border-border text-fg-muted",
          )}
        >
          <ImagePlus className="h-4 w-4" />
          {customThumbUrl ? "Custom thumbnail selected" : "Upload custom thumbnail"}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onCustomThumb(f);
            }}
          />
        </label>

        <p className="truncate text-xs text-fg-muted">{file.name}</p>
      </aside>
    </form>
  );
}
```

The `createVideo` server action (described): requires the signed-in user's channel, validates with `createVideoSchema`, rounds the fractional duration, auto-detects portrait clips ≤ 3 minutes as Waves (`isShort`), coerces `membersOnly` off when the channel has no memberships, and redirects to the studio.

### Watch, feed, channel, search, studio

All standard queries + UI — described:

- **Watch** (`/watch?v=`): loads the video with channel info (404 unless READY and visible to the viewer), renders `WatchPlayer` (native `<video>` with poster + controls) keyed by `key={video.id}` — keying makes watch→watch navigation discard the element so effect cleanup reads the OLD video's true position instead of a reset one. `ViewTracker` fires a `recordView` server action per videoId (one View row per viewer-or-anon per day, bumping the denormalized `viewCount`). Related rail = recent videos excluding Waves. Normalize `searchParams` that may arrive as arrays (`?v=a&v=b`) before Prisma lookups.
- **Home feed** (`/`): PUBLIC + READY, newest first, in a responsive card grid; category chips filter server-side via `?chip=` — guard the lookup with `Object.hasOwn` so `?chip=constructor` can't walk the prototype chain into a Prisma error.
- **Channel page** (`/@handle`): banner, avatar, name/@handle/subs/count, bio, video grid.
- **Search** (`/results`): case-insensitive contains-match on title, channel name, or handle; wide list rows.
- **Studio** (`/studio/videos` + `/studio/video/[id]`): owner's content table (thumb, title, visibility, date, views) and an edit form (title/description/category/visibility/thumbnail/Wave flag/members-only) plus delete, which also removes the backing Blob asset (`del(pathname)`) for blob-store URLs.

## Part 3: Engagement and library

### Subscribe and reactions — the race-guard pattern

Every optimistic toggle in the app guards both sides of its create/delete race the same way. This file is the exemplar (kept in full); the same pattern repeats in the watch-later, playlist-item, and comment-like actions:

### `src/lib/social-actions.ts`

```ts
"use server";

import { prisma } from "./prisma";
import { getCurrentUser } from "./session";
import type { NotifyLevel } from "@/generated/prisma/client";

/** The Prisma error code, for spotting the lost side of a concurrent toggle
 * (P2002 create, P2025 delete/update). */
function prismaCode(e: unknown): string | undefined {
  return e && typeof e === "object" && "code" in e
    ? (e as { code?: string }).code
    : undefined;
}

export type SubscribeResult =
  | { subscribed: boolean; count: number }
  | { error: "sign_in" | "own_channel" };

/**
 * SOCIAL-1: toggle a free subscription to a channel. Idempotent via the
 * (subscriberId, channelId) unique constraint; you can't subscribe to your own
 * channel.
 */
export async function toggleSubscribe(
  channelId: string,
): Promise<SubscribeResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { userId: true },
  });
  if (!channel) return { error: "sign_in" };
  if (channel.userId === user.id) return { error: "own_channel" };

  const existing = await prisma.subscription.findUnique({
    where: {
      subscriberId_channelId: { subscriberId: user.id, channelId },
    },
    select: { id: true },
  });

  if (existing) {
    try {
      await prisma.subscription.delete({ where: { id: existing.id } });
    } catch (e) {
      // A concurrent click already removed it.
      if (prismaCode(e) !== "P2025") throw e;
    }
  } else {
    try {
      await prisma.subscription.create({
        data: { subscriberId: user.id, channelId },
      });
    } catch (e) {
      // A concurrent click already created it — treat as subscribed.
      if (prismaCode(e) !== "P2002") throw e;
    }
  }

  const count = await prisma.subscription.count({ where: { channelId } });
  return { subscribed: !existing, count };
}

/**
 * NOTIFY-1/2: set the per-subscription bell level (ALL / PERSONALIZED / NONE).
 * Only affects an existing subscription.
 */
export async function setNotifyLevel(
  channelId: string,
  level: NotifyLevel,
): Promise<{ ok: true } | { error: "sign_in" | "not_subscribed" }> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const res = await prisma.subscription.updateMany({
    where: { subscriberId: user.id, channelId },
    data: { notify: level },
  });
  if (res.count === 0) return { error: "not_subscribed" };
  return { ok: true };
}

export type ReactionResult =
  | { reaction: "LIKE" | "DISLIKE" | null; likeCount: number }
  | { error: "sign_in" };

/**
 * SOCIAL-3/4: toggle a like or dislike on a video. A second click on the same
 * type clears it; the opposite type replaces it (mutually exclusive, one row
 * per user+video).
 */
export async function toggleReaction(
  videoId: string,
  type: "LIKE" | "DISLIKE",
): Promise<ReactionResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "sign_in" };

  const existing = await prisma.reaction.findUnique({
    where: { userId_videoId: { userId: user.id, videoId } },
  });

  try {
    if (existing?.type === type) {
      await prisma.reaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await prisma.reaction.update({
        where: { id: existing.id },
        data: { type },
      });
    } else {
      try {
        await prisma.reaction.create({ data: { userId: user.id, videoId, type } });
      } catch (e) {
        // A concurrent click created the row first — update it to this type.
        if (prismaCode(e) !== "P2002") throw e;
        await prisma.reaction.update({
          where: { userId_videoId: { userId: user.id, videoId } },
          data: { type },
        });
      }
    }
  } catch (e) {
    // A concurrent click deleted the row mid-toggle; the count below is
    // still fresh, so just fall through.
    if (prismaCode(e) !== "P2025") throw e;
  }

  const likeCount = await prisma.reaction.count({
    where: { videoId, type: "LIKE" },
  });
  const reaction = existing?.type === type ? null : type;
  return { reaction, likeCount };
}
```

`lib/social.ts` (described): read aggregates — `getChannelSocial` (subscriber count + viewer's subscription/notify level) and `getVideoReactions` (like count + viewer's reaction). The dislike count is never displayed.

### Comments

Described — a single `components/comments/comments.tsx` client tree over `lib/comments.ts` (queries) and `lib/comment-actions.ts` (actions): post + one-level replies (replies to replies re-attach to the top-level parent, and only to PUBLISHED parents), Top/Newest sort, comment likes, author delete, creator heart/pin/remove (removal cascades status to the whole thread in one transaction), comments on/off per video. A shared `canReadComments(videoId, userId)` gate (comments enabled AND video not PRIVATE-to-others) protects the public fetch/reply server actions, not just the page render. Tips render as highlighted comments (`isSuperThanks` + amount pill); channel members get a "Member" pill.

### History, resume, and the library

Described:

- `lib/history-actions.ts`: `recordWatchProgress(videoId, position, duration)` — clamps client-reported numbers (finite, 0..12h), respects the user's `historyPaused` flag, upserts one WatchHistory row per (user, video), marks `completed` at ≥95%.
- `components/watch/watch-player.tsx`: resume-aware player — seeks to `resumeAt` on `loadedmetadata`, reports progress throttled every 5 s plus on pause/ended/unmount.
- `lib/history.ts` + `lib/library.ts`: History, Continue-watching (in-progress, >5 s, not completed), Watch later, Liked — all owner-aware (`viewableBy`: PUBLIC/UNLISTED plus the viewer's OWN private videos; type the shared filter as `Prisma.VideoWhereInput`, not `as const`, which makes the arrays readonly and breaks Prisma's types). The subscriptions feed excludes Waves.
- Pages: `/feed/history` (with pause/resume/clear controls), `/playlist?list=WL|LL`, `/feed/subscriptions`, `/feed/you` (hub with all shelves). Cards show a red resume bar via a `progressSeconds` prop.
- Channel tabs: the `[handle]` route becomes a layout (header + client tab strip) with per-tab pages (Home, Videos, About; Waves and Membership arrive later).

## Part 4: The creator economy

### How the money flows

Each creator gets their own connected account (a company under the platform). Charges land on the creator's account, Whop deducts the platform's application fee, and the creator is the merchant of record — the platform never holds funds. Whop reports what happened via signed webhooks, which are the source of truth for entitlements and money records. Creators withdraw through an embedded payout portal; Whop runs KYC.

### The Whop SDK client

### `src/lib/whop.ts`

```ts
import "server-only";
import Whop from "@whop/sdk";
import { env, isSandbox } from "./env";

// Sandbox override: capital "URL" AND the required /api/v1 suffix. `baseUrl`
// (lowercase) is silently ignored and every call hits production → 401.
const sandboxOverride = isSandbox()
  ? { baseURL: "https://sandbox-api.whop.com/api/v1" }
  : {};

/**
 * Company-key client — products, plans, checkout configurations, connected
 * accounts, payouts. Uses the platform Company API Key (`access_pass:create`
 * scope). The App API Key + webhook client is added when we wire webhooks.
 */
export const whopCompany = new Whop({
  apiKey: env.WHOP_COMPANY_API_KEY,
  ...sandboxOverride,
});

/**
 * App-key client — used to verify inbound webhooks. `webhookKey` must be the
 * base64 of WHOP_WEBHOOK_SECRET (a trailing newline in the secret fails
 * verification silently with 401).
 */
export const whopsdk = new Whop({
  apiKey: env.WHOP_CLIENT_SECRET,
  appID: env.WHOP_CLIENT_ID,
  webhookKey: Buffer.from(env.WHOP_WEBHOOK_SECRET ?? "").toString("base64"),
  ...sandboxOverride,
});
```

> The SDK option is `baseURL` — capital URL — and the sandbox override must include `/api/v1`. A lowercase `baseUrl` is silently ignored and every call hits production with a confusing 401.

### `src/lib/money.ts`

```ts
/** Our platform's cut on every viewer-funded charge (memberships + tips). */
export const PLATFORM_FEE_RATE = 0.1; // 10%

/** Application fee in cents — always > 0 and < the total (Whop requires this). */
export function platformFeeCents(amountCents: number): number {
  const fee = Math.round(amountCents * PLATFORM_FEE_RATE);
  return Math.min(Math.max(fee, 1), amountCents - 1);
}

/** Cents → a dollar number for the Whop SDK (which takes dollars, not cents). */
export function toDollars(cents: number): number {
  return Math.round(cents) / 100;
}

/** TIPS-4: preset Cheers amounts (cents). */
export const TIP_PRESETS_CENTS = [200, 500, 1000, 5000] as const;
```

### Make a channel payable (connected accounts)

### `src/app/studio/monetization/actions.ts`

```ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { whopCompany } from "@/lib/whop";
import { env, isSandbox } from "@/lib/env";

/**
 * PAYOUTS-1 (the deferred CHANNEL-1 enrollment): create a Whop connected
 * account (child company) for this channel under our platform company, so the
 * creator can be charged as merchant of record and withdraw their earnings.
 * Idempotent — once `whopCompanyId` is set we never re-create it.
 */
export async function enableMonetization(): Promise<
  { ok: true } | { error: string }
> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
    select: { id: true, name: true, handle: true, whopCompanyId: true },
  });
  if (!channel) return { error: "Create a channel first." };
  if (channel.whopCompanyId) return { ok: true };

  try {
    const company = await whopCompany.companies.create({
      title: channel.name,
      email: user.email ?? `${channel.handle}@wavora.app`,
      parent_company_id: env.WHOP_PLATFORM_COMPANY_ID,
      metadata: { channelId: channel.id, handle: channel.handle },
    });

    await prisma.channel.update({
      where: { id: channel.id },
      data: {
        whopCompanyId: company.id,
        // Sandbox skips KYC, so the account is immediately payout-ready. In
        // production this stays false until KYC clears (PAYOUTS-6).
        payoutEnabled: isSandbox(),
        // Cheers is available once the creator has a connected account.
        superThanksEnabled: true,
      },
    });
  } catch (err) {
    console.error("companies.create failed:", err);
    return { error: "Could not enable monetization. Please try again." };
  }

  revalidatePath("/studio/monetization");
  return { ok: true };
}
```

> `companies.create` validates the email twice: format (reserved TLDs like `.example` fail) AND deliverability (domains without MX records fail). Real OAuth users always have a deliverable email because the `email` scope is requested at sign-in.

### Channel memberships (creator side)

### `src/app/studio/monetization/membership-actions.ts`

```ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { whopCompany } from "@/lib/whop";

const tierSchema = z.object({
  name: z.string().trim().min(1, "Add a tier name").max(50),
  description: z.string().trim().max(500).optional().or(z.literal("")),
  // Stored as cents in our DB; Whop wants dollars. $1–$1000.
  priceCents: z.number().int().min(100).max(100_000),
});

export type TierResult = { ok: true } | { error: string };

/**
 * MEMBERSHIP-1/2: define a membership tier and map it to a Whop **renewal plan**
 * on the creator's connected account (monthly billing). We create one shared
 * Whop product per channel, then a plan per tier. Our application fee is applied
 * later, on the Join checkout (TIPS/MEMBERSHIP-4); plans don't carry it.
 */
export async function createTier(input: {
  name: string;
  description?: string;
  priceCents: number;
}): Promise<TierResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      name: true,
      whopCompanyId: true,
      membershipsEnabled: true,
    },
  });
  if (!channel) return { error: "Create a channel first." };
  if (!channel.whopCompanyId) {
    return { error: "Enable monetization before adding tiers." };
  }

  const parsed = tierSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid tier." };
  }
  const { name, description, priceCents } = parsed.data;

  try {
    // Reuse the channel's existing Whop product, or create it on the first tier.
    const existing = await prisma.membershipTier.findFirst({
      where: { channelId: channel.id, whopProductId: { not: null } },
      select: { whopProductId: true },
    });
    let productId = existing?.whopProductId ?? null;
    if (!productId) {
      const product = await whopCompany.products.create({
        company_id: channel.whopCompanyId,
        title: `${channel.name} Memberships`,
        visibility: "visible",
      });
      productId = product.id;
    }

    const dollars = priceCents / 100;
    // Hidden: joins must go through OUR checkout (which carries the
    // application fee + the metadata the webhook needs), never a direct
    // purchase from the plan's public Whop page.
    const plan = await whopCompany.plans.create({
      company_id: channel.whopCompanyId,
      product_id: productId,
      plan_type: "renewal",
      initial_price: dollars,
      renewal_price: dollars,
      billing_period: 30,
      currency: "usd",
      visibility: "hidden",
      release_method: "buy_now",
    });

    await prisma.membershipTier.create({
      data: {
        channelId: channel.id,
        name,
        description: description ? description : null,
        priceCents,
        whopProductId: productId,
        whopPlanId: plan.id,
      },
    });

    if (!channel.membershipsEnabled) {
      await prisma.channel.update({
        where: { id: channel.id },
        data: { membershipsEnabled: true },
      });
    }
  } catch (err) {
    console.error("createTier failed:", err);
    return { error: "Could not create the tier. Please try again." };
  }

  revalidatePath("/studio/monetization");
  return { ok: true };
}
```

> Whop prices are in **dollars** (`initial_price: 5` = $5.00); the DB stores cents. The standing plan is `visibility: "hidden"` so a join can only happen through our checkout (which carries the application fee and the metadata the webhook needs). `application_fee_amount` does NOT exist on `plans.create` — it goes on the checkout configuration.

`lib/membership.ts` (described): tier list for a channel, `isActiveMember(userId, channelId)`, and the member-pill lookup used by comments.

### The Join checkout and Cheers checkout

### `src/lib/checkout-actions.ts`

```ts
"use server";

import { prisma } from "./prisma";
import { getCurrentUser } from "./session";
import { whopCompany } from "./whop";
import { platformFeeCents, toDollars } from "./money";

export type CheckoutResult = { sessionId: string } | { error: string };

/**
 * MEMBERSHIP-4: create a one-time-configured embedded checkout for a tier on the
 * creator's connected account. The charge is a renewal (subscription) with our
 * application fee on the inline plan; the connected account is merchant of
 * record. Metadata is copied onto the payment + membership so the webhook can
 * grant the entitlement (MEMBERSHIP-5) without mapping Whop ids back.
 */
export async function createMembershipCheckout(
  tierId: string,
): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };

  const tier = await prisma.membershipTier.findUnique({
    where: { id: tierId },
    select: {
      id: true,
      priceCents: true,
      whopProductId: true,
      channel: {
        select: {
          id: true,
          userId: true,
          whopCompanyId: true,
          membershipsEnabled: true,
        },
      },
    },
  });
  if (
    !tier ||
    !tier.channel.membershipsEnabled ||
    !tier.channel.whopCompanyId ||
    !tier.whopProductId
  ) {
    return { error: "Memberships aren't available for this channel." };
  }
  if (tier.channel.userId === user.id) {
    return { error: "You can't join your own channel." };
  }

  const membership = await prisma.channelMember.findUnique({
    where: {
      userId_channelId: { userId: user.id, channelId: tier.channel.id },
    },
    select: { status: true },
  });
  if (membership?.status === "ACTIVE") {
    return { error: "You're already a member of this channel." };
  }

  const amountCents = tier.priceCents;
  const feeCents = platformFeeCents(amountCents);

  try {
    const config = await whopCompany.checkoutConfigurations.create({
      mode: "payment",
      metadata: {
        kind: "membership",
        channelId: tier.channel.id,
        tierId: tier.id,
        viewerUserId: user.id,
        amountCents: String(amountCents),
        feeCents: String(feeCents),
      },
      plan: {
        company_id: tier.channel.whopCompanyId,
        product_id: tier.whopProductId,
        plan_type: "renewal",
        initial_price: toDollars(amountCents),
        renewal_price: toDollars(amountCents),
        billing_period: 30,
        currency: "usd",
        visibility: "hidden",
        release_method: "buy_now",
        application_fee_amount: toDollars(feeCents),
      },
    });
    return { sessionId: config.id };
  } catch (err) {
    console.error("createMembershipCheckout failed:", err);
    return { error: "Could not start checkout. Please try again." };
  }
}

/**
 * TIPS-6: create a one-time Cheers checkout on the creator's connected
 * account with our application fee. The video stays free; this is a tip.
 */
export async function createTipCheckout(
  videoId: string,
  amountCents: number,
  message: string,
): Promise<CheckoutResult> {
  const user = await getCurrentUser();
  if (!user) return { error: "Please sign in." };
  if (!Number.isInteger(amountCents) || amountCents < 100 || amountCents > 50_000) {
    return { error: "Pick a valid amount." };
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: {
      id: true,
      channel: {
        select: {
          id: true,
          userId: true,
          whopCompanyId: true,
          superThanksEnabled: true,
        },
      },
    },
  });
  if (
    !video ||
    !video.channel.whopCompanyId ||
    !video.channel.superThanksEnabled
  ) {
    return { error: "Cheers isn't available for this video." };
  }
  if (video.channel.userId === user.id) {
    return { error: "You can't tip your own video." };
  }

  const feeCents = platformFeeCents(amountCents);

  try {
    const config = await whopCompany.checkoutConfigurations.create({
      mode: "payment",
      metadata: {
        kind: "tip",
        channelId: video.channel.id,
        videoId: video.id,
        viewerUserId: user.id,
        message: message.trim().slice(0, 200),
        amountCents: String(amountCents),
        feeCents: String(feeCents),
      },
      plan: {
        company_id: video.channel.whopCompanyId,
        plan_type: "one_time",
        initial_price: toDollars(amountCents),
        currency: "usd",
        visibility: "hidden",
        release_method: "buy_now",
        application_fee_amount: toDollars(feeCents),
      },
    });
    return { sessionId: config.id };
  } catch (err) {
    console.error("createTipCheckout failed:", err);
    return { error: "Could not start checkout. Please try again." };
  }
}
```

### `src/components/checkout/checkout-embed-panel.tsx`

```tsx
"use client";

import { WhopCheckoutEmbed } from "@whop/checkout/react";

/** Shared embedded-checkout panel (TIPS-7 / MEMBERSHIP-4). */
export function CheckoutEmbedPanel({
  sessionId,
  environment,
  onComplete,
}: {
  sessionId: string;
  environment: "sandbox" | "production";
  onComplete?: () => void;
}) {
  return (
    <div className="min-h-[420px]">
      <WhopCheckoutEmbed
        sessionId={sessionId}
        environment={environment}
        onComplete={() => onComplete?.()}
        themeOptions={{ accentColor: "blue" }}
      />
    </div>
  );
}
```

### `src/components/channel/join-membership.tsx`

```tsx
"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { createMembershipCheckout } from "@/lib/checkout-actions";
import { CheckoutEmbedPanel } from "@/components/checkout/checkout-embed-panel";
import { useEscape } from "@/hooks/use-escape";

type Tier = {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
};

/** MEMBERSHIP-3/4: the Join button + tier picker + embedded checkout. */
export function JoinMembership({
  tiers,
  isSignedIn,
  isMember,
  environment,
}: {
  tiers: Tier[];
  isSignedIn: boolean;
  isMember: boolean;
  environment: "sandbox" | "production";
}) {
  const [open, setOpen] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEscape(open, close);

  if (isMember) {
    return (
      <span className="rounded-full bg-chip px-4 py-2 text-sm font-medium">
        Member ✓
      </span>
    );
  }
  if (tiers.length === 0) return null;

  function pick(tierId: string) {
    if (!isSignedIn) {
      window.location.href = `/sign-in?next=${encodeURIComponent(
        window.location.pathname,
      )}`;
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createMembershipCheckout(tierId);
      if ("error" in res) setError(res.error);
      else setSessionId(res.sessionId);
    });
  }

  function close() {
    setOpen(false);
    setSessionId(null);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-fg hover:opacity-90"
      >
        Join
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Choose your membership"
            className="relative max-h-[92vh] w-full max-w-md overflow-auto rounded-2xl bg-canvas p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full hover:bg-hover"
            >
              <X className="h-5 w-5" />
            </button>
            {sessionId ? (
              <div className="pt-6">
                <CheckoutEmbedPanel
                  sessionId={sessionId}
                  environment={environment}
                  onComplete={() => window.location.reload()}
                />
              </div>
            ) : (
              <div className="pt-2">
                <h3 className="text-lg font-bold">Choose your membership</h3>
                <div className="mt-4 flex flex-col gap-2">
                  {tiers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => pick(t.id)}
                      disabled={pending}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-left hover:border-accent disabled:opacity-60"
                    >
                      <span className="min-w-0">
                        <span className="block font-medium">{t.name}</span>
                        {t.description ? (
                          <span className="block truncate text-xs text-fg-muted">
                            {t.description}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-medium">
                        ${(t.priceCents / 100).toFixed(2)}/mo
                      </span>
                    </button>
                  ))}
                </div>
                {error ? (
                  <p className="mt-3 text-sm text-red-500">{error}</p>
                ) : null}
                {pending ? (
                  <p className="mt-3 text-sm text-fg-muted">Starting checkout…</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
```

### Webhooks

Company-level webhook (not app-level) with **connected account events enabled**, pointing at `/api/webhooks/whop`, subscribed to: `payment.succeeded`, `payment.failed`, `membership.activated`, `membership.deactivated`, `refund.created`. The secret goes in `WHOP_WEBHOOK_SECRET` — no trailing newline, or every verification 401s.

### `src/lib/webhooks.ts`

```ts
import "server-only";
import { prisma } from "./prisma";

/**
 * PLATFORM-1/2/3: verified-and-idempotent webhook intake. The route verifies the
 * signature (whopsdk.webhooks.unwrap) and calls this. Each handler runs its
 * writes ATOMICALLY in a single $transaction whose FIRST write is the
 * `WebhookEvent` marker — so a duplicate delivery (concurrent OR repeat) hits the
 * primary-key conflict and the entire transaction rolls back, undoing every side
 * effect. The dedupe is therefore the real guard, not just the per-row unique
 * constraints. A non-duplicate failure propagates so the route 5xx's and Whop
 * retries; a duplicate is swallowed and acknowledged (200).
 *
 * Money flows are keyed off the checkout metadata we set server-side
 * (kind/channelId/tierId/viewerUserId/amountCents/feeCents), which Whop copies
 * onto the payment + membership — so we never map Whop ids back, and a viewer
 * can't forge the amount or fee (metadata is never client-sourced).
 */
export type WebhookEnvelope = {
  type: string;
  id: string;
  data: Record<string, unknown>;
};

function str(v: unknown): string | undefined {
  return typeof v === "string" ? v : undefined;
}

// Monetary values come back as strings in metadata; round to whole cents.
function int(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

function meta(data: Record<string, unknown>): Record<string, unknown> {
  const m = data.metadata;
  return m && typeof m === "object" ? (m as Record<string, unknown>) : {};
}

/** Prisma unique-constraint violation (the event id, or a per-payment key). */
function isUniqueViolation(e: unknown): boolean {
  return Boolean(
    e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2002",
  );
}

// The processed-event marker. Used as the FIRST write inside every handler's
// $transaction so a duplicate aborts the whole transaction atomically; also
// awaited standalone on no-op/ack paths so those events aren't reprocessed.
const eventWrite = (id: string) =>
  prisma.webhookEvent.create({ data: { id, source: "whop" } });

export async function processWebhookEvent(event: WebhookEnvelope): Promise<void> {
  if (!event.id) return;

  // PLATFORM-2 fast path: skip events already fully processed (a sequential
  // redelivery) so we don't redo handler work. The atomic event-id write inside
  // each handler covers the concurrent race this read can miss.
  const seen = await prisma.webhookEvent.findUnique({
    where: { id: event.id },
    select: { id: true },
  });
  if (seen) return;

  try {
    switch (event.type) {
      case "membership.activated":
        await onMembershipActivated(event.id, event.data);
        break;
      case "membership.deactivated":
        await onMembershipDeactivated(event.id, event.data);
        break;
      case "payment.succeeded":
        await onPaymentSucceeded(event.id, event.data);
        break;
      case "refund.created":
        await onRefundCreated(event.id, event.data);
        break;
      default:
        await eventWrite(event.id); // ack unknown types; no side effect
        break;
    }
  } catch (e) {
    // A unique-constraint violation means a racing/repeat delivery already
    // recorded this event (or its payment) and its writes won — ours rolled back
    // atomically. Treat as already-processed (200). Re-throw anything else so the
    // route returns 5xx and Whop retries.
    if (isUniqueViolation(e)) return;
    throw e;
  }
}

/** MEMBERSHIP-5: grant the entitlement + alert the creator (atomically). */
async function onMembershipActivated(
  eventId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const m = meta(data);
  const channelId = str(m.channelId);
  const viewerUserId = str(m.viewerUserId);
  const tierId = str(m.tierId) ?? null;
  const whopMembershipId = str(data.id) ?? null;
  if (!channelId || !viewerUserId) {
    await eventWrite(eventId);
    return;
  }

  const channel = await prisma.channel.findUnique({
    where: { id: channelId },
    select: { userId: true },
  });

  await prisma.$transaction([
    eventWrite(eventId),
    prisma.channelMember.upsert({
      where: { userId_channelId: { userId: viewerUserId, channelId } },
      create: {
        userId: viewerUserId,
        channelId,
        tierId,
        status: "ACTIVE",
        whopMembershipId,
      },
      update: { status: "ACTIVE", tierId, whopMembershipId },
    }),
    ...(channel
      ? [
          prisma.notification.create({
            data: {
              recipientId: channel.userId,
              type: "NEW_MEMBER",
              title: "New channel member",
              body: "Someone just joined your channel memberships.",
              data: { channelId },
            },
          }),
        ]
      : []),
  ]);
}

/** MEMBERSHIP-5: revoke the entitlement (by membership id, with a metadata fallback). */
async function onMembershipDeactivated(
  eventId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const m = meta(data);
  const whopMembershipId = str(data.id);
  const channelId = str(m.channelId);
  const viewerUserId = str(m.viewerUserId);

  // Interactive transaction: record the event first (atomic dedupe), then revoke
  // by membership id, falling back to (channel, viewer) if the id matched no row.
  await prisma.$transaction(async (tx) => {
    await tx.webhookEvent.create({ data: { id: eventId, source: "whop" } });
    if (whopMembershipId) {
      const res = await tx.channelMember.updateMany({
        where: { whopMembershipId },
        data: { status: "INACTIVE" },
      });
      if (res.count > 0) return;
    }
    if (channelId && viewerUserId) {
      await tx.channelMember.updateMany({
        where: { userId: viewerUserId, channelId },
        data: { status: "INACTIVE" },
      });
    }
  });
}

/**
 * TIPS-8/10/11 + PAYOUTS-8: record a successful charge. A tip writes the Tip,
 * ledger entry, highlighted comment, and creator notification in ONE atomic
 * transaction (with the event marker); a membership renewal adds a ledger entry.
 */
async function onPaymentSucceeded(
  eventId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const m = meta(data);
  const kind = str(m.kind);
  const whopPaymentId = str(data.id);
  if (!whopPaymentId) {
    await eventWrite(eventId);
    return;
  }

  const channelId = str(m.channelId);
  const amountCents = int(m.amountCents);
  const feeCents = int(m.feeCents);
  const netCents = Math.max(0, amountCents - feeCents);

  if (kind === "tip") {
    const supporterUserId = str(m.viewerUserId);
    const message = str(m.message) || null;
    if (!channelId || !supporterUserId || amountCents <= 0) {
      await eventWrite(eventId);
      return;
    }

    const channel = await prisma.channel.findUnique({
      where: { id: channelId },
      select: { userId: true },
    });

    // The video can be deleted between checkout and delivery; record the tip
    // without it (and skip the comment) rather than failing the event forever.
    let videoId = str(m.videoId) ?? null;
    if (videoId) {
      const video = await prisma.video.findUnique({
        where: { id: videoId },
        select: { id: true },
      });
      if (!video) videoId = null;
    }

    await prisma.$transaction([
      eventWrite(eventId),
      prisma.tip.create({
        data: {
          supporterId: supporterUserId,
          channelId,
          videoId,
          amountCents,
          feeCents,
          netCents,
          message,
          whopPaymentId,
        },
      }),
      prisma.earningsLedger.create({
        data: {
          channelId,
          source: "SUPER_THANKS",
          grossCents: amountCents,
          feeCents,
          netCents,
          whopPaymentId,
          videoId,
        },
      }),
      ...(videoId
        ? [
            prisma.comment.create({
              data: {
                videoId,
                authorId: supporterUserId,
                body: message ?? "Cheers!",
                status: "PUBLISHED",
                isSuperThanks: true,
                superThanksAmount: amountCents,
              },
            }),
          ]
        : []),
      ...(channel
        ? [
            prisma.notification.create({
              data: {
                recipientId: channel.userId,
                type: "SUPER_THANKS",
                title: "Cheers received",
                body: `You received $${(amountCents / 100).toFixed(2)} in Cheers.`,
                data: { channelId, videoId },
              },
            }),
          ]
        : []),
    ]);
    return;
  }

  if (kind === "membership" && channelId && amountCents > 0) {
    await prisma.$transaction([
      eventWrite(eventId),
      prisma.earningsLedger.create({
        data: {
          channelId,
          source: "MEMBERSHIP",
          grossCents: amountCents,
          feeCents,
          netCents,
          whopPaymentId,
        },
      }),
    ]);
    return;
  }

  // Recognized payment with no actionable kind/metadata — ack so we don't retry.
  await eventWrite(eventId);
}

/** PAYOUTS-11: reflect a refund as an offsetting ledger entry. */
async function onRefundCreated(
  eventId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const payment = data.payment;
  const originalPaymentId =
    (payment && typeof payment === "object"
      ? str((payment as Record<string, unknown>).id)
      : undefined) ?? str(data.payment_id);
  if (!originalPaymentId) {
    await eventWrite(eventId);
    return;
  }

  const original = await prisma.earningsLedger.findUnique({
    where: { whopPaymentId: originalPaymentId },
    select: {
      channelId: true,
      source: true,
      grossCents: true,
      feeCents: true,
      netCents: true,
      videoId: true,
    },
  });
  if (!original) {
    await eventWrite(eventId);
    return;
  }

  // One offset per ORIGINAL payment (keyed `refund_<id>`, deduped by the unique
  // whopPaymentId): redelivered/duplicate refund events never double-count into a
  // negative balance. We conservatively offset the full original; exact
  // partial-refund amounts would need Whop's refund-amount field (a production
  // enhancement).
  const refundKey = `refund_${originalPaymentId}`;
  await prisma.$transaction([
    eventWrite(eventId),
    prisma.earningsLedger.create({
      data: {
        channelId: original.channelId,
        source: original.source,
        grossCents: -original.grossCents,
        feeCents: -original.feeCents,
        netCents: -original.netCents,
        videoId: original.videoId,
        whopPaymentId: refundKey,
      },
    }),
  ]);
}
```

### `src/app/api/webhooks/whop/route.ts`

```ts
import type { NextRequest } from "next/server";
import { whopsdk } from "@/lib/whop";
import { processWebhookEvent } from "@/lib/webhooks";
import { env } from "@/lib/env";

/**
 * PLATFORM-1/3: verify every inbound Whop webhook before trusting it, then hand
 * off to the idempotent dispatcher. We read the RAW body text (not parsed JSON)
 * because the signature is computed over the exact bytes. Return 2xx fast.
 */
export async function POST(request: NextRequest): Promise<Response> {
  // Refuse to process until the signing secret is configured, so we never run
  // verification against a blank key.
  if (!env.WHOP_WEBHOOK_SECRET) {
    return new Response("webhook not configured", { status: 503 });
  }
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: { type: string; id: string; data: unknown };
  try {
    event = whopsdk.webhooks.unwrap(bodyText, { headers }) as typeof event;
  } catch (err) {
    console.error("Webhook verification failed:", err);
    return new Response("invalid signature", { status: 401 });
  }

  try {
    await processWebhookEvent({
      type: event.type,
      id: event.id,
      data: (event.data ?? {}) as Record<string, unknown>,
    });
  } catch (err) {
    console.error("Webhook processing failed:", err);
    // Return 5xx so Whop RETRIES. The WebhookEvent id is recorded only after a
    // handler fully succeeds, so a failed delivery was never marked processed and
    // reprocessing is idempotent. Swallowing with 200 would permanently drop the
    // entitlement/ledger write on a transient DB blip.
    return new Response("processing failed", { status: 500 });
  }

  return new Response("OK", { status: 200 });
}
```

> Idempotency shape: the WebhookEvent insert is the FIRST write inside each handler's transaction, so a concurrent or replayed delivery aborts atomically on the unique constraint and the dispatcher acks it as already-processed. Failures return 5xx so Whop retries; a tip whose video was deleted mid-flight degrades gracefully (tip + ledger still recorded, comment skipped) instead of failing forever.

### Cheers (tips)

### `src/components/watch/super-thanks.tsx`

```tsx
"use client";

import { useState, useTransition } from "react";
import { Heart, X } from "lucide-react";
import { createTipCheckout } from "@/lib/checkout-actions";
import { CheckoutEmbedPanel } from "@/components/checkout/checkout-embed-panel";
import { TIP_PRESETS_CENTS } from "@/lib/money";
import { useEscape } from "@/hooks/use-escape";
import { cn } from "@/lib/utils";

/** TIPS-2/4/5/7: the Cheers button + amount/message dialog + checkout. */
export function SuperThanks({
  videoId,
  isSignedIn,
  environment,
}: {
  videoId: string;
  isSignedIn: boolean;
  environment: "sandbox" | "production";
}) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(500);
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function begin() {
    if (!isSignedIn) {
      window.location.href = `/sign-in?next=${encodeURIComponent(
        window.location.pathname + window.location.search,
      )}`;
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await createTipCheckout(videoId, amount, message);
      if ("error" in res) setError(res.error);
      else setSessionId(res.sessionId);
    });
  }

  function close() {
    setOpen(false);
    setSessionId(null);
    setError(null);
  }

  useEscape(open, close);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-full bg-chip px-4 py-2 text-sm font-medium hover:bg-hover-strong"
      >
        <Heart className="h-5 w-5" />
        Cheers
      </button>
      {open ? (
        <div
          className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4"
          onClick={close}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Send Cheers"
            className="relative max-h-[92vh] w-full max-w-md overflow-auto rounded-2xl bg-canvas p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="absolute right-3 top-3 z-10 grid h-8 w-8 place-items-center rounded-full hover:bg-hover"
            >
              <X className="h-5 w-5" />
            </button>
            {sessionId ? (
              <div className="pt-6">
                <CheckoutEmbedPanel
                  sessionId={sessionId}
                  environment={environment}
                  onComplete={() => window.location.reload()}
                />
              </div>
            ) : (
              <div className="pt-2">
                <h3 className="text-lg font-bold">Send Cheers</h3>
                <p className="mt-1 text-sm text-fg-muted">
                  Show your support - the video stays free.
                </p>
                <div className="mt-4 grid grid-cols-4 gap-2">
                  {TIP_PRESETS_CENTS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setAmount(c)}
                      className={cn(
                        "rounded-full border px-2 py-2 text-sm font-medium",
                        amount === c
                          ? "border-accent bg-accent/10 text-accent"
                          : "border-border hover:bg-hover",
                      )}
                    >
                      ${c / 100}
                    </button>
                  ))}
                </div>
                <input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  maxLength={200}
                  placeholder="Add a message (optional)"
                  className="mt-4 w-full rounded-lg border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:border-accent"
                />
                {error ? (
                  <p className="mt-3 text-sm text-red-500">{error}</p>
                ) : null}
                <button
                  type="button"
                  onClick={begin}
                  disabled={pending}
                  className="mt-4 w-full rounded-full bg-accent py-2.5 font-medium text-accent-fg hover:opacity-90 disabled:opacity-60"
                >
                  {pending ? "Starting…" : `Send $${(amount / 100).toFixed(2)}`}
                </button>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
```

### Payouts and earnings

### `src/app/api/payout-token/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { whopCompany } from "@/lib/whop";

/**
 * PAYOUTS-3/5: mint a short-lived access token scoped to the signed-in creator's
 * connected company for the embedded payout portal. Never returns the platform
 * API key — only the scoped token.
 */
export async function GET(): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const channel = await prisma.channel.findUnique({
    where: { userId: user.id },
    select: { whopCompanyId: true },
  });
  if (!channel?.whopCompanyId) {
    return NextResponse.json({ error: "no connected account" }, { status: 400 });
  }

  try {
    const res = await whopCompany.accessTokens.create({
      company_id: channel.whopCompanyId,
    });
    return NextResponse.json({ token: res.token });
  } catch (err) {
    console.error("accessTokens.create failed:", err);
    return NextResponse.json({ error: "token failed" }, { status: 500 });
  }
}
```

### `src/components/payouts/payout-portal.tsx`

```tsx
"use client";

import { useMemo } from "react";
import {
  Elements,
  PayoutsSession,
  BalanceElement,
  WithdrawButtonElement,
  WithdrawalsElement,
} from "@whop/embedded-components-react-js";
import { loadWhopElements } from "@whop/embedded-components-vanilla-js";

/**
 * PAYOUTS-4/10: the embedded Whop payout portal — balance, withdraw, and
 * withdrawal history — scoped to the creator's connected account via a
 * short-lived token from /api/payout-token (refreshed on demand by the session).
 */
export function PayoutPortal({
  companyId,
  environment,
}: {
  companyId: string;
  environment: "sandbox" | "production";
}) {
  const elements = useMemo(() => loadWhopElements({ environment }), [environment]);
  const redirectUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/studio/monetization`
      : "/studio/monetization";

  return (
    <Elements elements={elements}>
      <PayoutsSession
        token={async () => {
          const r = await fetch("/api/payout-token");
          if (!r.ok) throw new Error("Could not start a payout session.");
          const d = (await r.json()) as { token?: unknown };
          if (typeof d.token !== "string" || !d.token) {
            throw new Error("No payout token returned.");
          }
          return d.token;
        }}
        companyId={companyId}
        redirectUrl={redirectUrl}
      >
        <div className="flex flex-col gap-4">
          <BalanceElement
            fallback={<div className="text-sm text-fg-muted">Loading balance…</div>}
          />
          <WithdrawButtonElement fallback={<div />} />
          <WithdrawalsElement fallback={<div />} />
        </div>
      </PayoutsSession>
    </Elements>
  );
}
```

### `src/lib/earnings.ts`

```ts
import "server-only";
import { prisma } from "./prisma";

/**
 * PAYOUTS-9: lifetime creator earnings from our ledger, split by source
 * (memberships vs Cheers). Net is after our application fee; refunds are
 * negative ledger entries so they reduce the totals.
 */
export async function getEarnings(channelId: string) {
  const rows = await prisma.earningsLedger.groupBy({
    by: ["source"],
    where: { channelId },
    _sum: { netCents: true },
  });

  let membershipNetCents = 0;
  let tipNetCents = 0;
  for (const r of rows) {
    if (r.source === "MEMBERSHIP") membershipNetCents = r._sum.netCents ?? 0;
    else if (r.source === "SUPER_THANKS") tipNetCents = r._sum.netCents ?? 0;
  }

  return {
    membershipNetCents,
    tipNetCents,
    lifetimeNetCents: membershipNetCents + tipNetCents,
  };
}
```

### The monetization page and notifications

Described: `/studio/monetization` composes the enable panel, tier manager, earnings summary (lifetime/membership/tips net), the embedded payout portal, and a recent-members table. `lib/notifications.ts` + `/api/notifications` + a top-bar bell dropdown implement a minimal in-app inbox (NEW_MEMBER, SUPER_THANKS, NEW_UPLOAD from subscribed channels honoring the per-subscription bell level). The watch page gains the Cheers button, the channel layout gains Join + a Membership tab, and the comments query starts flagging members and highlighting tips.

## Part 5: Playlists, Waves, and shipping

### Full playlists

Described: `lib/playlists.ts` + `lib/playlist-actions.ts` — create (title + visibility), toggle-item (same race-guard pattern as social actions, plus a position counter for ordering), remove, delete; `createPlaylistWithVideo` compensates by deleting the empty playlist if adding the first video fails OR throws. A "Save to…" menu on the watch page lists Watch later + the user's playlists + create-new. `/playlist?list=<id>` shows detail with Play/remove/delete; `/feed/playlists` is the grid. Owner-aware privacy: creators see their own PRIVATE playlists and videos, others never do.

### Members-only videos

Described: the upload/edit forms carry a `membersOnly` flag (coerced off when memberships are disabled). The watch page computes `canWatch = !membersOnly || owner || isActiveMember` and swaps the player for a join prompt with the channel's tiers when false. The webhook-maintained ChannelMember row is the entitlement — no polling.

### Waves (vertical short-form)

Described: portrait uploads ≤ 3 minutes auto-flag `isShort`. `lib/shorts.ts` feeds `/waves` — a full-viewport snap-scroll column; each slide is a 9:16 stage (full-bleed on mobile, centered on desktop) with the action rail (like/dislike/comments/share) absolutely overlaid on the video, an IntersectionObserver autoplaying whichever clip is ≥60% visible (muted until tapped), and a bottom gradient overlay with channel + Subscribe. A home shelf and a channel Waves tab link into the feed with `?v=` deep links. Waves are excluded from every 16:9 grid (home, channel Videos, related, subscriptions, explore).

### Explore and category chips

Described: `lib/explore.ts` (trending = views-per-day-ish ranking; per-category queries) behind `/explore/trending` and `/explore/[category]`. Guard slug→enum lookups with `Object.hasOwn` so `/explore/constructor` 404s instead of leaking `Object.prototype` into Prisma.

### Hardening

### `src/lib/rate-limit.ts`

```ts
import "server-only";

/**
 * Lightweight in-memory fixed-window rate limiter. Best-effort: state is
 * per-process, so on serverless it limits per-instance rather than globally —
 * adequate for the demo + the single-instance dev server, and a real bar against
 * keystroke/loop abuse of the hot routes. Production should swap this for a
 * shared store (e.g. Upstash Ratelimit) keyed the same way.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function sweep(now: number): void {
  if (buckets.size < 5000) return;
  for (const [k, v] of buckets) if (v.resetAt <= now) buckets.delete(k);
}

/**
 * Returns `ok: false` once `limit` requests for `key` have been seen within
 * `windowMs`. `retryAfterSeconds` is how long until the window resets.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfterSeconds: number } {
  const now = Date.now();
  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((b.resetAt - now) / 1000) };
  }
  b.count += 1;
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP from the standard proxy headers (Vercel sets these). */
export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown"
  );
}
```

Wired into `/api/auth/login` (20/min/IP), `/api/handle-check` (40/10s/user), and `/api/whop/upload` (20/min/user). In-memory and per-instance — swap the store for Redis/Upstash in production. The CSP + security headers ship in `next.config.ts` (Part 1).

### Channel customization (Whop Files API)

Avatars and banners upload through the server to Whop's Files API (images are small; videos stay browser-direct to Blob):

### `src/lib/whop-files.ts`

```ts
import "server-only";
import { whopCompany } from "./whop";

const POLL_INTERVAL_MS = 1000;
const POLL_TIMEOUT_MS = 60_000;

/**
 * Upload an image to Whop's files endpoint and return its public CDN URL
 * (https://media.whop.com/...). Three steps, mirroring the Whop files API:
 *   1. files.create() → a file record + a presigned S3 upload URL and headers
 *   2. PUT the bytes to that presigned URL (passing the signed headers verbatim)
 *   3. poll files.retrieve() until the file is `ready`, then return its `url`
 *
 * We force `visibility: "public"` so the avatar/banner render in a plain <img>
 * without an auth header. The SDK's convenience `files.upload()` omits
 * visibility, which is why we drive the three calls ourselves.
 */
export async function uploadImageToWhop(file: File): Promise<string> {
  const created = await whopCompany.files.create({
    filename: file.name || "image",
    visibility: "public",
  });

  // Most uploads start as `pending` and need the bytes PUT to S3; a backend may
  // occasionally mark a record `ready` immediately (remote/import flows).
  if (created.upload_status !== "ready") {
    if (!created.upload_url) {
      throw new Error("Whop files: missing upload URL in the create response.");
    }
    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(created.upload_headers ?? {})) {
      if (value != null) headers[key] = String(value);
    }
    const res = await fetch(created.upload_url, {
      method: "PUT",
      headers,
      body: file,
    });
    if (!res.ok) {
      throw new Error(`Whop files: upload failed (${res.status} ${res.statusText}).`);
    }
  }

  const deadline = Date.now() + POLL_TIMEOUT_MS;
  for (;;) {
    const current = await whopCompany.files.retrieve(created.id);
    if (current.upload_status === "ready" && current.url) return current.url;
    if (current.upload_status === "failed") {
      throw new Error("Whop files: processing failed.");
    }
    if (Date.now() >= deadline) {
      throw new Error("Whop files: timed out waiting for the file to be ready.");
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
}
```

### `src/app/api/whop/upload/route.ts`

```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { uploadImageToWhop } from "@/lib/whop-files";
import { rateLimit } from "@/lib/rate-limit";

// Channel avatars/banners upload through our server to Whop's files endpoint.
// These are small images that sit well under Vercel's 4.5MB serverless body
// limit; videos still go client-direct to Blob (see /api/blob/upload) precisely
// because they don't.
const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

/**
 * Detect the real image type from the leading magic bytes — a client-declared
 * Content-Type is trivially spoofed (a non-image wrapped as image/png). Returns
 * the sniffed type, or null if the bytes aren't a supported image.
 */
function sniffImageType(b: Uint8Array): string | null {
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47)
    return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38)
    return "image/gif";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return "image/webp";
  return null;
}

/**
 * CHANNEL-6/7: upload a channel image (avatar or banner) to Whop's files
 * endpoint. Authorized to a signed-in user who owns a channel; returns the
 * public media.whop.com URL for the customize form to persist via updateChannel.
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in to upload." }, { status: 401 });
    }
    const channel = await prisma.channel.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!channel) {
      return NextResponse.json(
        { error: "Create a channel before uploading." },
        { status: 403 },
      );
    }

    const rl = rateLimit(`whop-upload:${user.id}`, 20, 60_000);
    if (!rl.ok) {
      return NextResponse.json(
        { error: "Too many uploads - try again shortly." },
        { status: 429, headers: { "Retry-After": String(rl.retryAfterSeconds) } },
      );
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Upload a JPEG, PNG, WebP, or GIF image." },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "Image must be 4MB or smaller." },
        { status: 400 },
      );
    }

    // Verify the bytes actually are an image (not just the declared MIME type).
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    if (!sniffImageType(head)) {
      return NextResponse.json(
        { error: "That file isn't a valid image." },
        { status: 400 },
      );
    }

    const url = await uploadImageToWhop(file);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("Whop file upload failed", err);
    return NextResponse.json(
      { error: (err as Error).message || "Upload failed." },
      { status: 500 },
    );
  }
}
```

`/studio/customize` (described): name/@handle/bio/avatar/banner form; images POST as FormData to the route above and save the returned CDN URL via an `updateChannel` action (P2002-guarded handle change).

### Shipping

1. **Register the webhook** (sandbox first): company-level webhook → `https://<your-app>.vercel.app/api/webhooks/whop`, the five events above, connected-account events ON; paste the signing secret into `WHOP_WEBHOOK_SECRET`. Test the full money flow with `4242 4242 4242 4242`.
2. **Switch to production**: create a production Whop app + Company API key, set the production client id/secret/keys, flip `WHOP_SANDBOX=false`, **remove `WHOP_OAUTH_BASE_URL`** (OAuth then uses `api.whop.com`), register the production redirect URI and webhook. The SDK base URL and the checkout/payout `environment` props all key off `WHOP_SANDBOX` — config, not code.
