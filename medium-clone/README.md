# Storyline

A Medium clone built with Next.js 16 and the Whop Payments Network. Companion code for the tutorial _How to build a Medium clone with Next.js and Whop_.

## What it is

A multi-writer publishing platform where readers subscribe to a single platform-wide "Plus" tier ($5/mo) to unlock all paid stories, can tip any story with any amount, and where writers earn from:

- **Tips** — direct charges to the writer's connected Whop account with a configurable platform fee (default 10%).
- **Partner Program** — a monthly revenue share computed from Plus-member reads of their paid stories, transferred to the writer's Whop balance via the Transfers API.

Writers withdraw inside Storyline through the embedded Whop payout portal — no leaving the site.

## Stack

- **Next.js 16** (App Router, Turbopack) + React 19
- **Tailwind CSS v4** with the Storyline palette (Medium-matched colors + free-font substitutes)
- **Whop** for OAuth, embedded checkout, memberships, connected accounts, transfers, embedded payout portal
- **Neon Postgres** via the Vercel Marketplace
- **Prisma 7** with the `@prisma/adapter-pg` driver adapter
- **iron-session** for encrypted cookie sessions
- **Zod** for runtime validation
- **TipTap 3** with a custom paywall break node
- **UploadThing** for cover and inline images
- **`@whop/checkout`** rendered inside an in-app popup (blurred backdrop on desktop, bottom sheet on mobile)

## Local development

1. Provision Neon via Vercel: Project → Storage → Add → Neon. Then `vercel env pull .env.local`.
2. Set the rest of the `.env.local` keys — see `.env.example`. Set `ROOT_OPERATOR_EMAIL` to the address you want gated for `/admin/*` (upserted into the `Operator` table on every admin access).
3. `npx prisma db push` — creates all 15 tables on your Neon branch.
4. `npx tsx prisma/seed.ts` — seeds the 20 topics.
5. `npx tsx scripts/create-plus-plan.ts` — creates the Storyline Plus product + plan on your Whop sandbox company. Paste the printed `STORYLINE_PLUS_PLAN_ID` back into Vercel and re-pull.
6. `npm run dev` — Turbopack dev server at http://localhost:3000.

## Project scripts

```bash
npm run dev                              # Turbopack dev server
npm run build                            # Production build (runs `prisma generate` via vercel.ts)
npm run start                            # Production preview
npm run lint                             # ESLint
npx prisma generate                      # Regenerate client to src/generated/prisma
npx prisma db push                       # Push schema to Neon (uses DATABASE_URL_UNPOOLED)
npx tsx prisma/seed.ts                   # Seed the 20 topics
npx tsx scripts/create-plus-plan.ts      # Create the Plus product + plan on Whop
npx tsx scripts/seed-reads.ts            # Dev: simulate a month of Plus-on-Plus reads
npx tsx scripts/preflight-prod.ts        # Pre-cutover health check
```

## Status — all 7 parts shipped

| Part | Status | What landed |
|------|--------|-------------|
| 1. Scaffold, deploy, OAuth, Prisma | done | Next 16 + Turbopack, Tailwind v4 palette, `proxy.ts`, `vercel.ts` with CSP + cron, PKCE OAuth with `nonce` + `client_secret`, all 15 Prisma models |
| 2. Writing experience | done | TipTap 3 editor with autosave + paywall break, UploadThing covers, `/edit/[id]`, `/@user/[slug]` reading, `/tag/[slug]`, `/me/stories` |
| 3. Plus subscription + paywall + embedded checkout popup | done | `/membership` page, `CheckoutPopup` shell, `PlusCheckoutPopup`, full webhook handler, `/me/membership` with pause/resume/cancel/uncancel, per-story paywall with server-side truncation |
| 4. Discovery, likes, bookmarks, follows | done | Binary `Like` with denormalized count, Bookmark/Follow/TopicFollow, `/me/library`, in-app notification bell + page |
| 5. Writer onboarding, tipping, operators, promo codes | done | Sub-company creation, KYC link + sandbox bypass, custom-amount `TipPopup`, `/admin/operators` and `/admin/promo-codes`, promo code input on `/membership` |
| 6. Partner Program (Transfers + payout portal) | done | 30s-dwell read tracker, monthly cron at `0 0 1 * *`, `transfers.create` with idempotence key, embedded payout portal on `/me/dashboard` |
| 7. Production switch + polish | done | Sitemap + robots, in-nav theme toggle, rate-limit proxy, loading skeletons, preflight script, this README |

## Production switch

Follow this checklist when promoting from sandbox to production. Do it once, in this order.

### Whop

1. **Create a production Whop app** — Developer Dashboard → New App. Add redirect URI `https://your-domain.com/api/auth/callback` exactly (no trailing slash). Select OAuth scopes `openid profile email`. Enable the `oauth:token_exchange` permission.
2. **Create production API keys**:
   - **App API key** (Developer → App → Environment) → `WHOP_APP_API_KEY`
   - **Company API key** (Business Settings → API Keys, scopes: `access_pass:create`, `plan:create`, `checkout_configuration:create`, `payout:transfer_funds`, `promo_code:create`, `accounts:create`) → `WHOP_COMPANY_API_KEY`
3. **Create the production Plus plan**:
   - Set Vercel env temporarily so the script runs against production: pull, unset `WHOP_SANDBOX`, set the new keys.
   - `npx tsx scripts/create-plus-plan.ts` → paste the printed `STORYLINE_PLUS_PLAN_ID` back into Vercel.
4. **Create the production webhook**:
   - Business Settings → Webhooks → Create webhook
   - URL: `https://your-domain.com/api/webhooks/whop`
   - Events: `payment.succeeded`, `payment.failed`, `payment.refunded`, `membership.activated`, `membership.deactivated`
   - Copy the signing secret → `WHOP_WEBHOOK_SECRET`. **No trailing newline** — paste carefully or use the Vercel CLI with `--value`.
5. **Save an operator card** on the platform company (Business Settings → Payment Methods). Optional but needed if the Partner Program cron ever needs to top up the platform balance — store the payment method id as `OPERATOR_TOPUP_PAYMENT_METHOD_ID`.

### Vercel env

In the production environment:

- `WHOP_SANDBOX` → **unset** (or set to anything other than `"true"`)
- `NEXT_PUBLIC_WHOP_SANDBOX` → **unset**
- `NEXT_PUBLIC_APP_URL` → your stable HTTPS domain (NOT a deployment-specific URL — OAuth will reject those)
- All API keys + IDs above
- `SESSION_SECRET` → fresh 32+ char string (`openssl rand -base64 32`)
- `CRON_SECRET` → fresh 16+ char string (Vercel Cron sends this as the `Authorization: Bearer …` header)

### Code

- `vercel.ts` CSP — keep `https://js.whop.com`, **remove** `https://sandbox-js.whop.com` from `script-src`.
- The sandbox KYC bypass in `/api/writers/onboard` automatically deactivates because it keys off `WHOP_SANDBOX === "true"`.

### Cutover

```bash
npx tsx scripts/preflight-prod.ts   # Fails loudly on anything missing
vercel deploy --prod                # Or push to main with the GitHub integration
```

Then in production:

1. Sign in as `ROOT_OPERATOR_EMAIL` → `/admin/operators` should be visible.
2. Visit `/membership` → green Subscribe pill opens the popup → complete a real $5 charge with your own card.
3. Watch the Vercel function logs for `membership.activated` webhook arriving and PlusMembership row appearing.
4. Create a test PLUS story → confirm the paywall renders for a signed-out browser, full text for your Plus account.
5. Open `/me/dashboard` → confirm the embedded payout portal loads without console CSP errors.

If the embed renders a blank box, the first place to look is the browser console for CSP violations and the network tab for `js.whop.com/static/checkout/loader.js`.

## Repo layout

```
src/
  app/
    [handle]/                 # /@username + /@username/[slug] reading
    admin/{operators,promo-codes}/
    api/
      auth/                   # OAuth login, callback, logout
      stories/[id]/           # CRUD + like/bookmark/tip/read/publish/unpublish
      membership/             # checkout, pause/resume/cancel/uncancel
      writers/                # onboard, kyc-return, payout-token, hosted-payout-link
      admin/operators/        # invite + revoke
      promo-codes/            # operator-only
      cron/partner-payout/    # Vercel Cron monthly
      uploadthing/            # UploadThing route handler
      webhooks/whop/          # signature-verified entry point
    me/                       # stories, library, dashboard, settings, membership, notifications, kyc-return
    edit/[id]/                # TipTap editor
    new-story/                # creates draft + redirects
    membership/               # Plus pricing page
    sign-in/
    tag/[slug]/               # topic feed
    topics/                   # topic directory
    sitemap.ts                # Production sitemap
    robots.ts
  components/
    checkout/                 # CheckoutPopup, PlusCheckoutPopup, TipPopup, MembershipCTA, …
    editor/                   # StoryEditor, EditorToolbar, CoverImagePicker, TopicsPicker, PublishDialog
    payouts/                  # Embedded payout portal wrapper
    Skeletons, StoryCard, LikeButton, BookmarkButton, FollowButton, TopicFollowButton, NotificationBell, PaywallCard, TopNav, UserMenu, ThemeProvider, ThemeToggleItem, …
  lib/
    auth, env, env-public, prisma, session, whop, whop-oauth, slug, reading-time, excerpt, rate-limit, utils
    tiptap/                   # extensions, paywall-break-node, render-server (tsx)
    uploadthing
  proxy.ts                    # Rate-limit + future request-time concerns
  generated/prisma/           # Generated client (.gitignored)
prisma/
  schema.prisma               # 15 models
  seed.ts                     # 20 topics
scripts/
  create-plus-plan.ts         # One-shot Plus plan creation
  seed-reads.ts               # Dev: simulate Plus reads
  preflight-prod.ts           # Pre-cutover env + Whop reachability check
vercel.ts                     # Build cmd + CSP + cron schedule
prisma.config.ts              # Loads .env.local via dotenv
```

See `docs/medium-clone-1.md` and `docs/medium-clone-2.md` for the condensed companion guide that an LLM can use to help you rebuild this project.
