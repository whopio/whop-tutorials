# Soundify (Spotify Clone)

A multi-artist music platform where independent artists publish songs, gate premium tracks behind one-time payments, and withdraw earnings through an embedded payout portal. Listeners browse, play free songs inline, pay to unlock premium songs, and save anything to their own playlists. Built with Next.js 16, Prisma, Supabase Storage, and the Whop SDK.

## Features

- **OAuth Authentication** - Whop OAuth 2.1 with PKCE + nonce, iron-session encrypted cookies
- **Artist Profiles** - Public handle, display name, bio, avatar; one Whop user = one artist
- **Song Management** - Upload audio + cover art + optional 30-second preview; mark free or premium with a per-song price
- **Public Artist Pages** - `/a/[handle]` plays free songs inline; premium songs show a price badge and unlock button
- **One-Time Unlocks** - Listeners pay once on Whop hosted checkout to reveal each premium song
- **Listener Library + Playlists** - Saved-songs graph with positional ordering and per-playlist uniqueness
- **Connected Accounts** - Each artist has their own Whop sub-company under the platform; KYC via Whop's hosted onboarding
- **Application Fees** - Platform takes a configurable per-song fee (default 50¢ via `Artist.applicationFee`); the rest goes straight to the artist
- **Embedded Payout Portal** - Artists see balance, complete KYC, and withdraw earnings without leaving the dashboard
- **Webhook-Driven Reconciliation** - `payment.succeeded` / `payment.failed` events are signed, idempotent, and the source of truth
- **Signed Direct Uploads** - Audio and image files PUT directly from the browser to Supabase via short-lived signed URLs; the server never proxies the bytes
- **React Compiler** - Memoization handled automatically by the Next.js 16 React Compiler

## Tech Stack

| Technology | Purpose |
|------------|---------|
| [Next.js 16](https://nextjs.org/) | Full-stack React framework (App Router, React Compiler) |
| [React 19](https://react.dev/) | UI library |
| [TypeScript](https://www.typescriptlang.org/) | Type safety |
| [Prisma 7](https://www.prisma.io/) | Database ORM (with `@prisma/adapter-pg` driver adapter) |
| [PostgreSQL](https://www.postgresql.org/) | Database |
| [Supabase Storage](https://supabase.com/storage) | Audio + image hosting (three public buckets: `songs`, `covers`, `previews`) |
| [Whop SDK](https://dev.whop.com/) | Payments, OAuth, KYC, connected accounts, embedded payouts |
| [Whop Embedded Components](https://dev.whop.com/) | `<PayoutsSession>` for the embedded payout portal |
| [Iron Session](https://github.com/vvo/iron-session) | Encrypted cookie sessions |
| [Zod](https://zod.dev/) | Request validation |
| [Tailwind CSS v4](https://tailwindcss.com/) | Styling |

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database (Neon, Supabase, Railway, or local)
- A [Supabase](https://supabase.com) project (for file storage)
- A [Whop Developer Account](https://whop.com/developer)

### 1. Clone the repository

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/spotify-clone
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

See `.env.example` for all required variables and where to find them.

### 4. Set up the database

```bash
npx prisma generate
npx prisma migrate dev
```

### 5. Set up Supabase Storage

In the Supabase dashboard, create three buckets and enable **Public bucket** on each:

- `songs` - full audio files
- `covers` - cover art images
- `previews` - optional 30-second preview clips

Without public access, audio URLs resolve but return 400 silently.

### 6. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 7. Configure Whop OAuth

Whop requires an `https://` URL for OAuth callbacks and webhook delivery. For local development, run ngrok to expose your dev server:

```bash
npx ngrok http 3000
```

In your Whop app settings (whop.com/developer → your app → OAuth tab), add the redirect URI:

```
https://your-ngrok-url.ngrok-free.app/api/auth/callback
```

The `WHOP_REDIRECT_URI` env var and `NEXT_PUBLIC_APP_URL` must match this URL exactly.

### 8. Configure Whop webhooks

In your Whop developer dashboard (whop.com/developer → your app → Webhooks), create a webhook pointing to:

```
https://your-ngrok-url.ngrok-free.app/api/webhooks/whop
```

Subscribe to the `payment.succeeded` and `payment.failed` events. **Enable "Connected account events"** so webhooks fire on payments to artists' connected accounts.

## Project Structure

```
spotify-clone/
├── prisma/
│   ├── schema.prisma              # 6 models (User, Artist, Song, Unlock, UserPlaylist, UserPlaylistSong)
│   └── migrations/                # Init migration + playlists migration
├── src/
│   ├── app/
│   │   ├── a/[handle]/            # Public artist page (free + premium songs, unlock flow)
│   │   ├── actions/               # Server actions (artist, songs, checkout, earnings, playlists)
│   │   ├── api/
│   │   │   ├── auth/              # OAuth login, callback, logout (PKCE + nonce)
│   │   │   ├── earnings/complete/ # KYC return handler (flips payoutEnabled)
│   │   │   ├── payout-token/      # Mints access tokens for the embedded payout portal
│   │   │   ├── upload/            # Mints signed Supabase upload URLs
│   │   │   └── webhooks/whop/     # payment.succeeded / payment.failed receiver
│   │   ├── components/            # AppShell (navigation, footer)
│   │   ├── dashboard/             # Artist dashboard (profile, songs, earnings, payouts)
│   │   ├── library/               # Listener library + playlist detail pages
│   │   ├── layout.tsx             # Root layout (Geist + Bricolage Grotesque fonts)
│   │   └── page.tsx               # Landing page (trending songs, popular artists, new releases)
│   └── lib/                       # prisma, session, supabase, whop
├── next.config.ts                 # React Compiler, ngrok dev origins, Supabase image allowlist
└── package.json
```

## Database Schema

```
User ────── Artist ────────┬──── Song ────┬──── Unlock
                           │              └──── UserPlaylistSong
                           └──── Unlock
User ────── UserPlaylist ──┴──── UserPlaylistSong
```

Six models. `Artist` is the creator profile keyed off `userId` with the public `handle`. `Song` is owned by the artist; `isPremium = true` means buyers must unlock. `Unlock` is the payment record (`PENDING` → `PAID` / `FAILED` / `REFUNDED`) with a `whopPaymentId @unique` constraint that makes the redirect-vs-webhook race idempotent. `UserPlaylist` + `UserPlaylistSong` is the listener's saved-songs graph with positional ordering and a unique constraint per playlist.

`price` and `applicationFee` are stored as integer cents.

## Sandbox vs Production

| Environment | Dashboard | API | Payments |
|-------------|-----------|-----|----------|
| **Sandbox** | sandbox.whop.com | sandbox-api.whop.com | Test cards only |
| **Production** | whop.com | api.whop.com | Real payments |

Set `NEXT_PUBLIC_WHOP_ENV="sandbox"` and the sandbox `WHOP_BASE_URL` / `WHOP_OAUTH_BASE` values for development. Switch to `production` (and omit the sandbox base URLs) when you go live.

### Test Cards (Sandbox)

- `4242 4242 4242 4242` - Successful payment
- Any future expiration date and any 3-digit CVC

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.example` (set `NEXT_PUBLIC_WHOP_ENV=production` and remove `WHOP_BASE_URL` / `WHOP_OAUTH_BASE` for production)
4. Set Whop webhook URL to `https://your-app.vercel.app/api/webhooks/whop` (with **Connected account events** enabled)
5. Set OAuth redirect URI to `https://your-app.vercel.app/api/auth/callback`
6. Set `NEXT_PUBLIC_APP_URL` to your canonical production URL
7. Deploy

### Other Platforms

```bash
npm run build
npm start
```

Requires Node.js 18+ runtime, a PostgreSQL database, a Supabase project for storage, and all environment variables configured.

## Documentation

- [`docs/spotify-clone.md`](docs/spotify-clone.md) - Full walkthrough of the build: data model, OAuth + PKCE flow, signed Supabase uploads, connected accounts, hosted checkout with application fees, embedded payout portal, and the webhook reconciliation handler
- [Whop for Platforms](https://docs.whop.com/payments/platforms/about) - Official documentation for connected accounts, application fees, and payouts

## Disclaimer

This project is for **educational purposes only** and is not intended for production use. It demonstrates core concepts for building a multi-artist music marketplace on top of Whop but omits certain security hardening and scalability measures that would be required in a real-world application.

## License

MIT

## Acknowledgments

- [Whop](https://whop.com) for the payment infrastructure
- [Supabase](https://supabase.com) for storage
- [Vercel](https://vercel.com) for Next.js and hosting
- [Prisma](https://prisma.io) for the ORM
