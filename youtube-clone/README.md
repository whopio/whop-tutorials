# Wavora (YouTube Clone)

A video platform where anyone signs in with Whop, starts a channel, and uploads videos. Viewers watch, subscribe, like, comment, save to playlists, and scroll Waves (vertical short-form video). Creators monetize directly with monthly channel memberships and one-time Cheers tips, charged on their own Whop connected account with a platform application fee, and withdraw earnings through an embedded payout portal with KYC handled by Whop. Built with Next.js 16, Prisma 7, Vercel Blob, and the Whop SDK.

**Live demo:** https://wavora-ruddy.vercel.app

## Features

- **OAuth Authentication** - Whop OAuth 2.1 with PKCE + nonce, iron-session encrypted cookies, edge route guard
- **Channels** - Become a channel with a live-checked unique @handle; public page with banner, tabs (Home, Videos, Waves, About, Membership), and customization via Whop's Files API
- **Video Upload** - Browser-direct uploads to Vercel Blob (no server proxying), client-side duration + poster-frame capture, three-frame thumbnail picker or custom upload
- **Watch Experience** - Resume playback, per-day view dedup, like/dislike, Save to playlists, related rail, members-only gating
- **Waves** - Vertical snap-scroll short-form feed with autoplay; portrait uploads are detected automatically
- **Engagement** - Subscriptions with per-channel notification levels, threaded comments with creator moderation (heart, pin, remove), watch history with pause and resume
- **Library** - Watch later, Liked videos, custom playlists, subscriptions feed, library hub
- **Channel Memberships** - Recurring tiers as Whop renewal plans on the creator's connected account; entitlements granted and revoked by webhooks
- **Cheers (Tips)** - One-time direct charges with an application fee; the tip renders as a highlighted comment and notifies the creator
- **Connected Accounts** - Each channel is a Whop sub-company under the platform; the creator is the merchant of record
- **Embedded Payout Portal** - Balance, KYC, and withdrawals without leaving the studio
- **Webhook-Driven Money** - Signed, idempotent handlers for payments, memberships, and refunds; the WebhookEvent row is the first write in every transaction
- **Search + Explore** - Title/channel/@handle search, trending and per-category browse pages, home category chips
- **In-App Notifications** - New members, tips, and uploads from subscribed channels

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework (App Router, Turbopack, `proxy.ts`) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma 7](https://www.prisma.io/) | ORM (`prisma.config.ts`, `@prisma/adapter-pg` driver adapter) |
| [PostgreSQL](https://www.postgresql.org/) | Database (Neon, Supabase, Railway, or local) |
| [Vercel Blob](https://vercel.com/docs/storage/vercel-blob) | Video + thumbnail storage (browser-direct uploads) |
| [Whop SDK](https://dev.whop.com/) | Payments, OAuth, KYC, connected accounts, webhooks |
| [@whop/checkout](https://dev.whop.com/) | Embedded checkout (`WhopCheckoutEmbed`) |
| [Whop Embedded Components](https://dev.whop.com/) | `PayoutsSession` for the embedded payout portal |
| [iron-session](https://github.com/vvo/iron-session) | Encrypted cookie sessions (no session store) |
| [Zod 4](https://zod.dev/) | Validation at every boundary |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling (CSS-first `@theme`) |

## Getting Started

### Prerequisites

- Node.js 18+
- A PostgreSQL database (Neon, Supabase, Railway, or local)
- A Vercel account with a Blob store (for video uploads)
- A [Whop developer account](https://whop.com/developer) - use the [sandbox](https://sandbox.whop.com) while developing

### 1. Clone the repository

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/youtube-clone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

```bash
cp .env.example .env.local
```

See `.env.example` for every variable and where to find it. The short version:

- `WHOP_CLIENT_ID` / `WHOP_CLIENT_SECRET` - your Whop app's OAuth credentials (Developer → your app). Enable the `oauth:token_exchange` permission and the `openid profile email` scopes.
- `WHOP_COMPANY_API_KEY` - a Company API key (Business Settings → API keys) with the `access_pass:create` scope
- `WHOP_PLATFORM_COMPANY_ID` - your company id (`biz_...`)
- `WHOP_WEBHOOK_SECRET` - set after creating the webhook (step 8)
- `SESSION_SECRET` - 32+ random chars: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- `BLOB_READ_WRITE_TOKEN` - from your Vercel Blob store (Storage → Blob)
- `DATABASE_URL` - your Postgres connection string
- `WHOP_SANDBOX=true` and `WHOP_OAUTH_BASE_URL=https://sandbox-api.whop.com` while developing against the sandbox

### 4. Set up the database

```bash
npx prisma db push
```

### 5. Register the OAuth redirect URI

In your Whop app's OAuth settings, add:

```
http://localhost:3000/api/auth/callback
```

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### 7. Seed demo data (optional)

With the dev server running:

```
http://localhost:3000/api/dev/seed?confirm=wavora
```

Creates 6 demo channels and 36 videos (re-runnable; it resets previous demo rows). The route only works in development (`NODE_ENV !== "production"`).

### 8. Configure Whop webhooks

Webhook delivery needs a public URL, so the full money flow comes alive on your deployed app. In your Whop dashboard, create a **company-level** webhook pointing to:

```
https://<your-app>.vercel.app/api/webhooks/whop
```

Subscribe to `payment.succeeded`, `payment.failed`, `membership.activated`, `membership.deactivated`, and `refund.created`, and **enable connected account events** so payments to creators' sub-companies fire it. Paste the signing secret into `WHOP_WEBHOOK_SECRET` (no trailing newline).

In sandbox, test the whole flow with card `4242 4242 4242 4242`.

## Project Structure

```
youtube-clone/
├── prisma/
│   └── schema.prisma            # 17 models (User, Channel, Video, View, WatchHistory,
│                                #   Subscription, Reaction, Comment, CommentReaction,
│                                #   WatchLater, Playlist, PlaylistItem, MembershipTier,
│                                #   ChannelMember, Tip, EarningsLedger, WebhookEvent)
├── docs/
│   └── youtube-clone.md         # Condensed LLM-context version of the tutorial
├── src/
│   ├── app/
│   │   ├── (main)/              # Public app: home, watch, waves, channels, feeds,
│   │   │                        #   playlists, explore, search, create-channel
│   │   ├── api/
│   │   │   ├── auth/            # OAuth login, callback, logout (PKCE + nonce)
│   │   │   ├── blob/upload/     # Vercel Blob client-upload token route
│   │   │   ├── dev/seed/        # Dev-only demo data seeder
│   │   │   ├── handle-check/    # Live @handle availability
│   │   │   ├── notifications/   # In-app notification inbox
│   │   │   ├── payout-token/    # Access tokens for the embedded payout portal
│   │   │   ├── webhooks/whop/   # Signed, idempotent webhook receiver
│   │   │   └── whop/upload/     # Avatar/banner upload to Whop's Files API
│   │   ├── sign-in/             # Sign-in page
│   │   └── studio/              # Creator studio: content, upload, edit,
│   │                            #   customize, monetization (tiers, earnings, payouts)
│   ├── components/              # Layout chrome, feed cards, watch controls, comments,
│   │                            #   shorts player, checkout/payout embeds
│   ├── hooks/                   # useEscape
│   └── lib/                     # env, prisma, session, auth, whop SDK, webhooks,
│                                #   checkout/social/library/playlist actions, validators
├── next.config.ts               # CSP + security headers, turbopack root
├── prisma.config.ts             # Prisma 7 config
└── vercel.json                  # Framework pin
```

## How the Money Flows

1. A creator enables monetization → `companies.create` makes their channel a Whop **connected account** under the platform.
2. Tiers are Whop **renewal plans** (hidden visibility) on that account; joins go through `checkoutConfigurations.create` with the price and `application_fee_amount` inline, rendered by `WhopCheckoutEmbed`.
3. Cheers are `one_time` direct charges, same shape, with the tip message in metadata.
4. Whop credits the creator's balance (minus the platform fee) and calls the webhook; handlers grant/revoke `ChannelMember` entitlements and record tips + ledger rows exactly once.
5. Creators withdraw in the studio through the embedded `PayoutsSession` portal; Whop runs KYC on first withdrawal.

The platform never holds funds - the creator is the merchant of record.

## Read the Tutorial

The full step-by-step tutorial is on the Whop blog, and [`docs/youtube-clone.md`](./docs/youtube-clone.md) is a condensed reference of the same build (used as LLM context for "build this with AI").
