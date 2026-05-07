# How to build a Fiverr clone with Next.js and Whop

A freelance gig marketplace where users sign up, become verified sellers, list tiered packages (basic/standard/premium) with optional add-ons, and deliver work to buyers end-to-end. Whop handles payments, KYC, seller payouts, and embedded chat. The platform takes a configurable cut of every order via application fees.

**Source:** https://github.com/whopio/whop-tutorials/tree/main/fiverr-clone

## Tech stack

Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase (Postgres + Row Level Security + Realtime + Supabase Auth), Whop OAuth + Whop for Platforms (connected accounts, embedded KYC, application-fee checkouts, embedded payouts, embedded chat), TypeScript 5, Vercel.

## Pages

- `/login` — Email/password sign-in plus "Continue with Whop" OAuth
- `/account` — Authenticated buyer landing page
- `/sell/onboarding` — Connected-company creation and embedded KYC verification
- `/sell/dashboard` — Seller workspace: balance, payout methods, withdrawals
- `/sell/orders` — Seller's list of incoming orders
- `/sell/orders/[id]` — Seller-side order workspace (deliver, message buyer)
- `/orders/[id]` — Buyer-side order workspace (submit requirements, request revisions, accept delivery, review)
- `/checkout/complete` — Post-payment confirmation landing

## API routes

- `/api/auth/whop/authorize` — Whop OAuth initiation with PKCE + chat scopes
- `/api/auth/callback/whop` — OAuth callback, token exchange, user upsert via Supabase Auth
- `/api/sell/onboard` — Create the seller's connected company under your platform
- `/api/sell/kyc/sync` — Pull verification status from Whop into `seller_accounts`
- `/api/sell/payouts-token` — Short-lived access token for embedded KYC/payouts
- `/api/sell/withdraw` — Trigger a Whop withdrawal to the seller's payout method
- `/api/checkout/create` — Create a Whop checkout configuration with the platform fee
- `/api/checkout/confirm` — Confirm the order from the buyer's browser after payment
- `/api/orders/[id]/requirements` — Buyer submits the project brief
- `/api/orders/[id]/deliver` — Seller submits a delivery
- `/api/orders/[id]/request-revision` — Buyer requests changes
- `/api/orders/[id]/accept-delivery` — Buyer accepts the delivery
- `/api/orders/[id]/review` — Buyer leaves a 1–5 star review
- `/api/webhooks/whop` — Whop webhook receiver (payments, refunds, disputes, verification, payouts)
- `/api/chat/token` — Mint a Whop access token for embedded chat (three-strategy fallback)
- `/api/token` — Alias of `/api/chat/token` for Whop embedded components default

## Payment flow

1. Buyer clicks Purchase on a gig, picks a package and extras. The slide-out panel POSTs to `/api/checkout/create`, which calls `whop.checkoutConfigurations.create` on the seller's connected company with `application_fee_amount` set
2. Buyer pays through the Whop checkout embed inside the slide-out — they never leave your domain
3. `onComplete` calls `/api/checkout/confirm`, which creates the local `orders` row immediately so the buyer sees a confirmation page (UX convenience only)
4. Whop fires a `payment_succeeded` webhook to `/api/webhooks/whop`. The handler verifies the signature, stores the event idempotently, and reconciles `whop_payments` → `orders` (this is the source of truth)
5. Whop credits the seller's connected company with the payment minus the platform fee. The seller links a payout method through the embedded payouts UI and withdraws via `/api/sell/withdraw`

## Why Whop

- **Payments and payouts** — Whop for Platforms handles connected accounts, application fees, and embedded payouts so the platform never touches the money
- **Identity verification** — Whop's embedded KYC flow runs inside an iframe on your site; no third-party redirect
- **Real-time messaging** — Whop's embedded chat components give buyers and sellers DMs powered by Whop's infrastructure; Whop OAuth (with chat:* and dms:* scopes) is the auth mechanism

## Setup

```bash
git clone https://github.com/whopio/whop-tutorials.git
cd whop-tutorials/fiverr-clone
npm install
```

### Environment variables

| Variable | Source |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase dashboard → Project Settings → API |
| `WHOP_API_KEY` | Whop dashboard → Developer → API Keys |
| `WHOP_PLATFORM_COMPANY_ID` | Your platform's parent company ID, from the dashboard URL (`biz_...`) |
| `WHOP_WEBHOOK_SECRET` | Whop dashboard → Developer → Webhooks |
| `PLATFORM_FEE_BPS` | Take rate in basis points (1000 = 10%) |
| `NEXT_PUBLIC_APP_URL` | Absolute base URL (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_WHOP_ENVIRONMENT` | `sandbox` or `production` |
| `WHOP_OAUTH_CLIENT_ID` | Whop dashboard → Developer → Apps → OAuth |
| `WHOP_OAUTH_CLIENT_SECRET` | Whop dashboard → Developer → Apps → OAuth |
| `NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI` | Must match what's registered in Whop |

### Whop sandbox setup

Use `sandbox.whop.com` for development. Create a Whop, then go to **Developer → Apps → OAuth**, register `http://localhost:3000/api/auth/callback/whop` and your production callback URL, copy the client ID + secret. Create an API key under **Developer → API Keys**. Sandbox uses `sandbox-api.whop.com` for all SDK endpoints — set `NEXT_PUBLIC_WHOP_ENVIRONMENT=sandbox` to point the embedded components at it.

### Webhook setup

In sandbox.whop.com → **Developer → Webhooks**, create a webhook pointing to `https://your-app.vercel.app/api/webhooks/whop`. Subscribe to: `payment_succeeded`, `payment_failed`, `payment_pending`, `refund_created`, `refund_updated`, `dispute_created`, `dispute_updated`, `dispute_alert_created`, `verification_succeeded`, `payout_method_created`, `withdrawal_created`, `withdrawal_updated`. Copy the webhook secret into `WHOP_WEBHOOK_SECRET`.

### Supabase setup

Create a Supabase project, then install the CLI and link it:

```bash
npm install -g supabase
supabase login
supabase link --project-ref your-project-ref
supabase db push
```

`supabase db push` applies the migrations below.

## Database schema

All SQL lives in a single migration file: `supabase/migrations/20250311000000_initial_schema.sql`.

### Status enums

```sql
create type public.user_role as enum ('buyer', 'seller', 'admin');
create type public.kyc_status as enum ('unstarted', 'pending', 'verified', 'failed');
create type public.gig_status as enum ('draft', 'review', 'published', 'paused', 'rejected');
create type public.order_status as enum (
  'awaiting_requirements', 'in_progress', 'delivered',
  'revision_requested', 'completed', 'cancel_requested',
  'cancelled', 'disputed', 'refunded'
);
create type public.package_tier as enum ('basic', 'standard', 'premium');
```

### Core tables (summary)

| Table | Key columns |
|-------|-------------|
| `profiles` | `user_id`, `email`, `username`, `display_name`, `role`, `whop_user_id`, `whop_refresh_token` |
| `seller_accounts` | `user_id`, `whop_company_id`, `kyc_status`, `kyc_verified_at`, `payout_enabled` |
| `categories` | `slug`, `name`, `is_active` |
| `gigs` | `seller_user_id`, `title`, `slug`, `description`, `category_id`, `status`, `requirements_schema`, `search_vector` |
| `gig_packages` | `gig_id`, `tier`, `price_cents`, `delivery_days`, `revisions_included` |
| `gig_extras` | `gig_id`, `title`, `price_cents`, `max_quantity` |
| `orders` | `gig_id`, `package_id`, `seller_user_id`, `buyer_user_id`, `status`, `whop_checkout_config_id`, `requirements_schema` |
| `order_requirements` | `order_id`, `answers`, `attachments`, `submitted_at` |
| `order_deliveries` | `order_id`, `message`, `items` |
| `order_messages` | `order_id`, `sender_user_id`, `body` |
| `reviews` | `order_id`, `gig_id`, `rating`, `body` |
| `whop_checkout_configs` | `whop_checkout_config_id`, `order_id`, `application_fee_cents` |
| `whop_payments` | `whop_payment_id`, `order_id`, `whop_company_id`, `status`, `total_cents`, `raw` |
| `webhook_events` | `webhook_id` (unique), `type`, `company_id`, `payload` |
| `notifications` | `user_id`, `type`, `title`, `body`, `link` |

### Auto-create profiles on signup

```sql
create or replace function public.handle_new_user()
returns trigger language plpgsql
security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(new.email, '@', 1)
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

### Gigs table with full-text search

```sql
create table if not exists public.gigs (
  id uuid primary key default gen_random_uuid(),
  seller_user_id uuid not null references public.profiles(user_id) on delete cascade,
  category_id uuid references public.categories(id),
  slug citext not null unique,
  title text not null,
  description text not null,
  faq jsonb not null default '[]'::jsonb,
  status public.gig_status not null default 'draft',
  search_vector tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(description, '')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gigs_search_gin on public.gigs using gin (search_vector);
create index if not exists gigs_status_category_idx on public.gigs (status, category_id);
```

### KYC trigger (the core trust mechanism)

A seller cannot publish a gig until they have completed identity verification. Most tutorials enforce this in the UI. UI-level checks can be bypassed by calling the API directly. This Postgres trigger is the last line of defense — even a crafted API call gets rejected.

```sql
create or replace function public.enforce_kyc_before_gig_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  kyc public.kyc_status;
begin
  if (TG_OP = 'INSERT' or TG_OP = 'UPDATE') then
    if new.status = 'published' then
      select s.kyc_status into kyc
      from public.seller_accounts s
      where s.user_id = new.seller_user_id;
      if kyc is null or kyc != 'verified' then
        raise exception 'Seller must complete KYC before publishing';
      end if;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_enforce_kyc_before_gig_publish
before insert or update of status
on public.gigs
for each row
execute function public.enforce_kyc_before_gig_publish();
```

## Core libraries

### Environment validation (`src/lib/env.ts`)

Lists required env vars and validates them at startup. The export is a flat object.

```ts
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'WHOP_API_KEY',
  'WHOP_PLATFORM_COMPANY_ID',
  'PLATFORM_FEE_BPS',
  'NEXT_PUBLIC_APP_URL',
] as const;

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
  whopApiKey: process.env.WHOP_API_KEY!,
  whopPlatformCompanyId: process.env.WHOP_PLATFORM_COMPANY_ID!,
  platformFeeBps: parseInt(process.env.PLATFORM_FEE_BPS!, 10),
  appUrl: process.env.NEXT_PUBLIC_APP_URL!,
  whopEnvironment: (process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT ?? 'sandbox') as 'sandbox' | 'production',
  whopOauthClientId: process.env.WHOP_OAUTH_CLIENT_ID,
  whopOauthClientSecret: process.env.WHOP_OAUTH_CLIENT_SECRET,
  whopWebhookSecret: process.env.WHOP_WEBHOOK_SECRET,
};
```

### Supabase clients (`src/lib/supabase/server.ts`)

Two clients: a regular cookie-aware client for user-facing requests (RLS applies), and an admin client that bypasses RLS for cross-user operations like creating notifications or inserting orders for guests.

```ts
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Components can't set cookies — ignore
          }
        },
      },
    }
  );
}
```

### Session refresh (`src/lib/supabase/middleware.ts`)

Refreshes the Supabase session on every request so it doesn't expire mid-session. Required for SSR auth.

```ts
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  await supabase.auth.getUser();
  return supabaseResponse;
}
```

### Root middleware (`src/middleware.ts`)

```ts
import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
```

### Other libraries

- **`src/lib/app-url.ts`** — `getAppBaseUrl()` returns `NEXT_PUBLIC_APP_URL` if set, otherwise a hardcoded canonical production URL when on Vercel, otherwise `http://localhost:3000`. Use it everywhere you construct redirect URLs to avoid Vercel's preview-URL auth issue.

## Authentication

GigFlow has two ways in: email/password through Supabase Auth, and "Continue with Whop" via OAuth. Whop OAuth is the recommended path — it gives you the user's `whop_user_id` and refresh token, which is what unlocks embedded chat in Step 11.

### Email/password login page (`src/app/login/page.tsx`)

Client component. Calls `supabase.auth.signUp()` or `supabase.auth.signInWithPassword()` directly from the browser using `createBrowserClient` from `@supabase/ssr`. Sign-up form passes `signup_role: 'buyer' | 'seller'` and `full_name` in `options.data` — the `handle_new_user()` Postgres trigger reads these to populate `profiles.role` and `profiles.display_name`. Successful signup as `'seller'` redirects to `/sell/onboarding`, otherwise `/account`.

### Whop OAuth authorize (`src/app/api/auth/whop/authorize/route.ts`)

Generates PKCE values + state + nonce, stores them in an httpOnly cookie, redirects to Whop's authorize endpoint. The cookie (not session storage) survives the cross-domain redirect back to the callback. The chat:* and dms:* scopes are required up-front — adding them later requires re-authentication.

```ts
import { NextResponse } from 'next/server';
import { randomBytes, createHash } from 'crypto';

function randomString(bytes: number): string {
  return randomBytes(bytes).toString('base64url');
}

async function sha256(input: string): Promise<string> {
  const hash = createHash('sha256').update(input).digest();
  return Buffer.from(hash).toString('base64url');
}

export async function GET() {
  const clientId = process.env.WHOP_OAUTH_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'Whop OAuth is not configured' },
      { status: 500 }
    );
  }

  const pkce = {
    codeVerifier: randomString(32),
    state: randomString(16),
    nonce: randomString(16),
  };

  const scopes = [
    'openid',
    'profile',
    'email',
    'chat:message:create',
    'chat:read',
    'dms:read',
    'dms:message:manage',
    'dms:channel:manage',
  ].join(' ');

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: scopes,
    state: pkce.state,
    nonce: pkce.nonce,
    code_challenge: await sha256(pkce.codeVerifier),
    code_challenge_method: 'S256',
  });

  const authUrl = `https://api.whop.com/oauth/authorize?${params}`;
  const response = NextResponse.redirect(authUrl);

  response.cookies.set('whop_oauth_pkce', JSON.stringify(pkce), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 15,
    path: '/',
  });

  return response;
}
```

### Whop OAuth callback (`src/app/api/auth/callback/whop/route.ts`)

Validates state, exchanges the code for tokens, fetches the Whop user profile, then bridges into Supabase Auth: looks up an existing user by email, creates one if missing, stores `whop_user_id` and `whop_refresh_token` on the profile (used later for chat token generation).

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { getAppBaseUrl } from '@/lib/app-url';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const baseUrl = getAppBaseUrl();

  if (error) {
    return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`);
  }

  const pkceCookie = request.cookies.get('whop_oauth_pkce');
  if (!pkceCookie?.value || !code) {
    return NextResponse.redirect(`${baseUrl}/login?error=invalid_state`);
  }

  const pkce = JSON.parse(pkceCookie.value);
  if (pkce.state !== state) {
    return NextResponse.redirect(`${baseUrl}/login?error=state_mismatch`);
  }

  const clientId = process.env.WHOP_OAUTH_CLIENT_ID!;
  const clientSecret = process.env.WHOP_OAUTH_CLIENT_SECRET!;
  const redirectUri = process.env.NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI!;

  const tokenRes = await fetch('https://api.whop.com/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
    },
    body: JSON.stringify({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
      code_verifier: pkce.codeVerifier,
    }),
  });

  if (!tokenRes.ok) {
    return NextResponse.redirect(`${baseUrl}/login?error=token_exchange_failed`);
  }

  const tokens = await tokenRes.json();

  const userRes = await fetch('https://api.whop.com/oauth/userinfo', {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });

  if (!userRes.ok) {
    return NextResponse.redirect(`${baseUrl}/login?error=userinfo_failed`);
  }

  const whopUser = await userRes.json();
  const supabaseAdmin = createAdminClient();

  const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingUser = existingUsers?.users.find(u => u.email === whopUser.email);

  let supabaseUserId: string;

  if (existingUser) {
    supabaseUserId = existingUser.id;
  } else {
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: whopUser.email,
      email_confirm: true,
      user_metadata: {
        full_name: whopUser.name,
        whop_user_id: whopUser.id,
      },
    });

    if (createError || !newUser.user) {
      return NextResponse.redirect(`${baseUrl}/login?error=user_creation_failed`);
    }

    supabaseUserId = newUser.user.id;
  }

  await supabaseAdmin
    .from('profiles')
    .update({
      whop_user_id: whopUser.id,
      whop_refresh_token: tokens.refresh_token,
    })
    .eq('user_id', supabaseUserId);

  const response = NextResponse.redirect(`${baseUrl}/account`);
  response.cookies.set('whop_oauth_pkce', '', { maxAge: 0, path: '/' });
  return response;
}
```

## Seller onboarding

A seller becomes one in two steps: backend creates a Whop connected company, frontend mounts the embedded `<VerifyElement>` to complete KYC inline. The user never leaves your domain.

### Onboard route (`src/app/api/sell/onboard/route.ts`)

`whop.companies.create({ parent_company_id, metadata.internal_user_id })` makes the seller's sub-merchant account. Idempotent: returns the existing company if the seller already has one.

```ts
import { NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();
  const apiKey = process.env.WHOP_API_KEY;
  const platformCompanyId = process.env.WHOP_PLATFORM_COMPANY_ID;

  if (!apiKey || !platformCompanyId) {
    return NextResponse.json({ error: 'Whop is not configured' }, { status: 500 });
  }

  const whop = new Whop({ apiKey });

  const { data: existingSeller } = await supabaseAdmin
    .from('seller_accounts')
    .select('id, whop_company_id, kyc_status')
    .eq('user_id', user.id)
    .single();

  if (existingSeller?.whop_company_id) {
    return NextResponse.json({
      companyId: existingSeller.whop_company_id,
      kycStatus: existingSeller.kyc_status,
    });
  }

  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('display_name, email')
    .eq('user_id', user.id)
    .single();

  const company = await whop.companies.create({
    email: user.email!,
    title: profile?.display_name || user.email?.split('@')[0] || 'Seller',
    parent_company_id: platformCompanyId,
    metadata: { internal_user_id: user.id },
  });

  await supabaseAdmin.from('seller_accounts').insert({
    user_id: user.id,
    whop_company_id: company.id,
    kyc_status: 'unstarted',
  });

  return NextResponse.json({
    companyId: company.id,
    kycStatus: 'unstarted',
  });
}
```

### Verification helper (`src/lib/whop-verification.ts`)

Reads the seller's verification status from Whop's Ledger API. Whop returns `'verified'` or `'approved'` for completed KYC.

```ts
import Whop from '@whop/sdk';

export interface VerificationResult {
  verified: boolean;
  status?: string;
  error?: string;
}

export async function getWhopVerificationStatus(
  whopCompanyId: string,
  apiKey: string
): Promise<VerificationResult> {
  try {
    const whop = new Whop({ apiKey });
    const ledger = await whop.ledgerAccounts.retrieve(whopCompanyId);
    const payout = ledger.payout_account_details;

    if (!payout?.latest_verification) {
      return { verified: false, status: 'not_started' };
    }

    const verStatus = payout.latest_verification.status;
    const verified = verStatus === 'verified' || verStatus === 'approved';
    return { verified, status: verStatus };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return { verified: false, error: msg };
  }
}
```

### KYC sync route (`src/app/api/sell/kyc/sync/route.ts`)

Called by the embed when verification is submitted. Pulls the latest status from Whop's Ledger API and updates `seller_accounts.kyc_status`. The webhook (`verification_succeeded`) is the eventual source of truth — this route just makes the UI feel instant.

```ts
import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { getWhopVerificationStatus } from '@/lib/whop-verification';

export async function POST() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: seller, error: sellerError } = await supabase
    .from('seller_accounts')
    .select('id, kyc_status, whop_company_id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller) {
    return NextResponse.json({ error: 'Seller account not found' }, { status: 404 });
  }
  if (!seller.whop_company_id) {
    return NextResponse.json({ verified: false, synced: false, reason: 'no_company' });
  }

  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'WHOP_API_KEY is not set' }, { status: 500 });
  }

  const { verified, status, error: verError } = await getWhopVerificationStatus(
    seller.whop_company_id,
    apiKey
  );

  if (verError) {
    return NextResponse.json({ verified: false, synced: false, error: verError }, { status: 502 });
  }

  if (verified && seller.kyc_status !== 'verified') {
    const supabaseAdmin = createAdminClient();
    await supabaseAdmin
      .from('seller_accounts')
      .update({
        kyc_status: 'verified',
        kyc_verified_at: new Date().toISOString(),
        payout_enabled: true,
      })
      .eq('id', seller.id);
  }

  return NextResponse.json({ verified, status, synced: true });
}
```

### Payouts token route (`src/app/api/sell/payouts-token/route.ts`)

Mints a short-lived Whop access token scoped to the seller's connected company. The embedded KYC and payout components fetch this token to authenticate.

```ts
import { NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient } from '@/lib/supabase/server';
import { getAppBaseUrl } from '@/lib/app-url';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: seller, error: sellerError } = await supabase
    .from('seller_accounts')
    .select('whop_company_id')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller?.whop_company_id) {
    return NextResponse.json(
      { error: 'Complete seller onboarding before accessing payouts.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'WHOP_API_KEY is not set' }, { status: 500 });
  }

  const whop = new Whop({ apiKey });
  const { token } = await whop.accessTokens.create({
    company_id: seller.whop_company_id,
  });

  return NextResponse.json({
    token,
    companyId: seller.whop_company_id,
    redirectUrl: `${getAppBaseUrl()}/sell/dashboard`,
  });
}
```

### Embedded verification UI (`src/components/sell/WhopVerificationEmbed.tsx`)

Mounts `<VerifyElement>` inside `<Elements>` + `<PayoutsSession>`. The `getToken` callback fetches `/api/sell/payouts-token`. On submission, `onVerificationSubmitted` calls `/api/sell/kyc/sync` so the database flips immediately. The injected `<style>` tag is required to make the iframe fill its container.

```tsx
'use client';

import { useEffect, useRef } from 'react';
import { loadWhopElements } from '@whop/embedded-components-vanilla-js';
import {
  Elements,
  PayoutsSession,
  VerifyElement,
} from '@whop/embedded-components-react-js';

interface WhopVerificationEmbedProps {
  companyId: string;
  onComplete?: () => void;
  onClose?: () => void;
}

export function WhopVerificationEmbed({
  companyId,
  onComplete,
  onClose,
}: WhopVerificationEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      whop-verify, whop-verify iframe {
        width: 100% !important;
        min-height: 500px !important;
      }
    `;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  const getToken = async (): Promise<string> => {
    const res = await fetch('/api/sell/payouts-token');
    if (!res.ok) throw new Error('Failed to fetch payout token');
    const data = await res.json();
    return data.token;
  };

  return (
    <div ref={containerRef} className="w-full min-h-[500px]">
      <Elements loader={loadWhopElements}>
        <PayoutsSession companyId={companyId} getToken={getToken}>
          <VerifyElement
            includeControls
            onVerificationSubmitted={async () => {
              await fetch('/api/sell/kyc/sync', { method: 'POST' });
              onComplete?.();
            }}
            onClose={onClose}
          />
        </PayoutsSession>
      </Elements>
    </div>
  );
}
```

## Checkout

The checkout has three phases: create the Whop checkout session on the server, render the Whop embed inside a slide-out panel, confirm the order after payment.

### Create checkout route (`src/app/api/checkout/create/route.ts`)

Looks up the gig's seller, calculates the platform fee from `PLATFORM_FEE_BPS`, and creates the checkout configuration on the seller's connected company. The plan is inline (not pre-created) and carries `application_fee_amount` so Whop routes the fee to your platform automatically. Metadata includes `gig_id`, `package_id`, and `buyer_user_id` — the confirm endpoint and webhook handler both read this back.

```ts
import { NextRequest, NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'WHOP_API_KEY is not set' }, { status: 500 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let body: {
    gigId: string;
    gigTitle: string;
    packageId: string;
    packageTitle: string;
    quantity?: number;
    extras?: Array<{ id: string; title: string; price_cents: number }>;
    totalCents: number;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { gigId, gigTitle, packageId, packageTitle, quantity = 1, extras = [], totalCents } = body;
  if (!gigId || !packageId || !totalCents) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: gig, error: gigError } = await supabase
    .from('gigs')
    .select('id, seller_user_id, requirements_schema')
    .eq('id', gigId)
    .single();

  if (gigError || !gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  const supabaseAdmin = createAdminClient();
  const { data: seller, error: sellerError } = await supabaseAdmin
    .from('seller_accounts')
    .select('whop_company_id')
    .eq('user_id', gig.seller_user_id)
    .single();

  if (sellerError || !seller?.whop_company_id) {
    return NextResponse.json({ error: 'Seller has not connected a Whop account' }, { status: 400 });
  }

  const totalDollars = totalCents / 100;
  const platformFeeBps = parseInt(process.env.PLATFORM_FEE_BPS || '1000', 10);
  const applicationFee = Math.round((totalCents * platformFeeBps) / 10000) / 100;

  const client = new Whop({ apiKey });

  const checkoutConfig = await client.checkoutConfigurations.create({
    mode: 'payment',
    plan: {
      company_id: seller.whop_company_id,
      currency: 'usd',
      initial_price: totalDollars,
      plan_type: 'one_time',
      application_fee_amount: applicationFee,
      title: gigTitle,
      product: {
        external_identifier: `gig_${gig.id}_pkg_${packageId}`,
        title: gigTitle,
      },
    },
    metadata: {
      gig_id: gig.id,
      package_id: packageId,
      package_title: packageTitle,
      quantity: String(quantity),
      extras_ids: extras.map((e) => e.id).join(','),
      buyer_user_id: user?.id ?? '',
    },
  });

  return NextResponse.json({
    sessionId: checkoutConfig.id,
    purchaseUrl: checkoutConfig.purchase_url,
  });
}
```

### Slide-out checkout panel (`src/components/gig/OrderOptionsSlideOut.tsx`)

Client component with two internal steps managed by a `Step = 'options' | 'checkout'` state. The `'options'` step shows a package picker (basic/standard/premium with delivery days + revisions), an extras checkbox list, a running total, and a "Continue to payment" button that POSTs to `/api/checkout/create`. The `'checkout'` step swaps to `<WhopCheckoutEmbed>` from `@whop/checkout/react`, passing `sessionId`, `returnUrl` (set to `${origin}/checkout/complete`), and an `onComplete` callback that POSTs to `/api/checkout/confirm` and routes to `/checkout/complete?order_id=...`. State resets on `isOpen` toggle, Escape closes the panel, click on the backdrop closes it.

### Confirm checkout route (`src/app/api/checkout/confirm/route.ts`)

Called from `onComplete` of the embed. Retrieves the checkout configuration from Whop, reads metadata, looks up the gig, creates the local `orders` row idempotently (keyed by `whop_checkout_config_id`), and inserts notifications for both buyer and seller. Treats this as a UX convenience — webhooks are the real source of truth.

```ts
import { NextRequest, NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'WHOP_API_KEY is not set' }, { status: 500 });
  }

  let body: { session_id: string; receipt_id?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { session_id } = body;
  if (!session_id) {
    return NextResponse.json({ error: 'session_id is required' }, { status: 400 });
  }

  const client = new Whop({ apiKey });
  const supabaseAdmin = createAdminClient();

  let config;
  try {
    config = await client.checkoutConfigurations.retrieve(session_id);
  } catch (err) {
    return NextResponse.json({ error: 'Checkout session not found' }, { status: 404 });
  }

  const meta = (config.metadata ?? {}) as Record<string, string>;
  const gigId = meta.gig_id;
  const packageId = meta.package_id;
  const buyerUserId = meta.buyer_user_id || null;

  if (!gigId || !packageId) {
    return NextResponse.json({ error: 'Checkout metadata is incomplete' }, { status: 400 });
  }

  const { data: gig, error: gigError } = await supabaseAdmin
    .from('gigs')
    .select('id, seller_user_id, title, requirements_schema')
    .eq('id', gigId)
    .single();

  if (gigError || !gig) {
    return NextResponse.json({ error: 'Gig not found' }, { status: 404 });
  }

  const { data: existingOrder } = await supabaseAdmin
    .from('orders')
    .select('id')
    .eq('whop_checkout_config_id', session_id)
    .single();

  if (existingOrder) {
    return NextResponse.json({ orderId: existingOrder.id });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from('orders')
    .insert({
      gig_id: gigId,
      package_id: packageId,
      seller_user_id: gig.seller_user_id,
      buyer_user_id: buyerUserId,
      status: 'awaiting_requirements',
      requirements_schema: gig.requirements_schema ?? {},
      whop_checkout_config_id: session_id,
    })
    .select('id')
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }

  await supabaseAdmin.from('notifications').insert([
    {
      user_id: gig.seller_user_id,
      type: 'order',
      title: 'New order received',
      body: gig.title,
      link: '/sell/orders',
    },
    ...(buyerUserId
      ? [{
          user_id: buyerUserId,
          type: 'order',
          title: 'Order confirmed',
          body: gig.title,
          link: `/orders/${order.id}`,
        }]
      : []),
  ]);

  return NextResponse.json({ orderId: order.id });
}
```

## Order lifecycle

State machine:

| From | Trigger | To |
|------|---------|----|
| `awaiting_requirements` | Buyer submits the project brief | `in_progress` |
| `in_progress` | Seller submits a delivery | `delivered` |
| `delivered` | Buyer accepts the delivery | `completed` |
| `delivered` | Buyer requests a revision | `revision_requested` |
| `revision_requested` | Seller resubmits a delivery | `delivered` |
| `in_progress` / `delivered` | Either party opens a dispute | `disputed` |
| `disputed` | Dispute resolved in buyer's favor | `refunded` |

Every transition route follows the same pattern: authenticate, load the order, verify the user has permission (buyer or seller), validate the current status, update via the admin client (to bypass RLS for cross-user operations like inserting a notification on the other party), insert a notification. The `deliver` route is shown in full as the representative example. The other four follow the same shape — only the permission check, source/target status, and notification body change.

### Deliver (`src/app/api/orders/[id]/deliver/route.ts`)

Seller-initiated. Accepts both `in_progress` and `revision_requested` as valid starting states. Inserts an `order_deliveries` row, looks up the gig title for the notification copy, and notifies the buyer.

```ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: orderId } = await params;
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, status, seller_user_id, buyer_user_id, gig_id')
    .eq('id', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  if (order.seller_user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden — only the seller can deliver' }, { status: 403 });
  }

  const validStatuses = ['in_progress', 'revision_requested'];
  if (!validStatuses.includes(order.status)) {
    return NextResponse.json(
      { error: `Order cannot be delivered in its current state: ${order.status}` },
      { status: 400 }
    );
  }

  let body: { message?: string; items?: unknown[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const supabaseAdmin = createAdminClient();

  await supabaseAdmin.from('order_deliveries').insert({
    order_id: orderId,
    message: typeof body.message === 'string' ? body.message.trim() || null : null,
    items: Array.isArray(body.items) ? body.items : [],
  });

  await supabaseAdmin
    .from('orders')
    .update({ status: 'delivered', updated_at: new Date().toISOString() })
    .eq('id', orderId);

  const { data: gig } = await supabaseAdmin
    .from('gigs')
    .select('title')
    .eq('id', order.gig_id)
    .single();

  if (order.buyer_user_id) {
    await supabaseAdmin.from('notifications').insert({
      user_id: order.buyer_user_id,
      type: 'order',
      title: 'Delivery received',
      body: gig?.title ?? 'Your order has been delivered',
      link: `/orders/${orderId}`,
    });
  }

  return NextResponse.json({ ok: true });
}
```

### The other four routes (prose summaries)

- **Submit Requirements** (`/api/orders/[id]/requirements`) — Buyer-initiated. Special case: allows **guests** when `order.buyer_user_id` is null (skip the auth check, only require that the order is a guest order). Upserts `order_requirements` keyed by `order_id`. Source: `awaiting_requirements`. Target: `in_progress`. Notifies seller.
- **Request Revision** (`/api/orders/[id]/request-revision`) — Buyer-only. Source: `delivered`. Target: `revision_requested`. Notifies seller. No body payload required.
- **Accept Delivery** (`/api/orders/[id]/accept-delivery`) — Buyer-only. Source: `delivered`. Target: `completed` plus sets `completed_at` and `updated_at`. Notifies seller. No body payload.
- **Review** (`/api/orders/[id]/review`) — Buyer-only. Valid from either `delivered` or `completed`. Body: `{ rating: number 1–5, body?: string }`. Inserts a `reviews` row keyed by `order_id` (unique constraint prevents duplicates). If source state was `delivered`, also auto-completes the order to `completed`.

## Webhooks

The webhook handler is the source of truth — the confirm endpoint is just for UX. Verify the signature, store the event idempotently in `webhook_events`, and route by type.

### Webhook handler (`src/app/api/webhooks/whop/route.ts`)

`whop.webhooks.unwrap(bodyText, { headers })` does signature verification. The SDK constructor needs `webhookKey: btoa(WHOP_WEBHOOK_SECRET)`. Store every event in `webhook_events` with a unique constraint on `webhook_id` to dedupe retries.

```ts
import { NextRequest, NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createAdminClient } from '@/lib/supabase/server';

const whop = new Whop({
  apiKey: process.env.WHOP_API_KEY!,
  webhookKey: process.env.WHOP_WEBHOOK_SECRET
    ? btoa(process.env.WHOP_WEBHOOK_SECRET)
    : undefined,
});

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const headers = Object.fromEntries(request.headers);

  let webhook: { id: string; type: string; company_id?: string; data: unknown };
  try {
    webhook = whop.webhooks.unwrap(bodyText, { headers }) as typeof webhook;
  } catch (err) {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 401 });
  }

  const supabaseAdmin = createAdminClient();

  const { error: insertError } = await supabaseAdmin.from('webhook_events').insert({
    webhook_id: webhook.id,
    type: webhook.type,
    company_id: webhook.company_id ?? null,
    payload: JSON.parse(bodyText),
  });

  if (insertError?.code === '23505') {
    // Already processed (unique constraint violation on webhook_id)
    return NextResponse.json({ ok: true });
  }
  if (insertError) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }

  try {
    switch (webhook.type) {
      case 'payment_succeeded':
        await handlePaymentSucceeded(webhook.data, supabaseAdmin);
        break;
      case 'verification_succeeded':
        await handleVerificationSucceeded(webhook.company_id, supabaseAdmin);
        break;
      case 'refund_created':
      case 'refund_updated':
        await handleRefund(webhook.data, supabaseAdmin);
        break;
      case 'dispute_created':
      case 'dispute_updated':
        await handleDispute(webhook.data, supabaseAdmin);
        break;
      default:
        console.log(`[webhook] Unhandled event type: ${webhook.type}`);
    }
  } catch (err) {
    console.error(`[webhook] Handler error for ${webhook.type}:`, err);
  }

  return NextResponse.json({ ok: true });
}

async function handlePaymentSucceeded(
  data: unknown,
  supabaseAdmin: ReturnType<typeof createAdminClient>
) {
  const payment = data as {
    id: string;
    company_id: string;
    status: string;
    final_amount: number;
    metadata?: Record<string, string>;
  };

  await supabaseAdmin.from('whop_payments').upsert(
    {
      whop_payment_id: payment.id,
      whop_company_id: payment.company_id,
      status: payment.status,
      total_cents: payment.final_amount,
      raw: payment,
    },
    { onConflict: 'whop_payment_id' }
  );

  const orderId = payment.metadata?.order_id;
  if (orderId) {
    await supabaseAdmin
      .from('whop_payments')
      .update({ order_id: orderId })
      .eq('whop_payment_id', payment.id);
  }
}

async function handleVerificationSucceeded(
  companyId: string | undefined,
  supabaseAdmin: ReturnType<typeof createAdminClient>
) {
  if (!companyId) return;
  await supabaseAdmin
    .from('seller_accounts')
    .update({
      kyc_status: 'verified',
      kyc_verified_at: new Date().toISOString(),
      payout_enabled: true,
    })
    .eq('whop_company_id', companyId);
}

async function handleRefund(
  data: unknown,
  supabaseAdmin: ReturnType<typeof createAdminClient>
) {
  const refund = data as { payment_id?: string };
  if (!refund.payment_id) return;

  const { data: payment } = await supabaseAdmin
    .from('whop_payments')
    .select('order_id')
    .eq('whop_payment_id', refund.payment_id)
    .single();

  if (payment?.order_id) {
    await supabaseAdmin
      .from('orders')
      .update({ status: 'refunded', updated_at: new Date().toISOString() })
      .eq('id', payment.order_id);
  }
}

async function handleDispute(
  data: unknown,
  supabaseAdmin: ReturnType<typeof createAdminClient>
) {
  const dispute = data as { payment_id?: string };
  if (!dispute.payment_id) return;

  const { data: payment } = await supabaseAdmin
    .from('whop_payments')
    .select('order_id')
    .eq('whop_payment_id', dispute.payment_id)
    .single();

  if (payment?.order_id) {
    await supabaseAdmin
      .from('orders')
      .update({ status: 'disputed', updated_at: new Date().toISOString() })
      .eq('id', payment.order_id);
  }
}
```

## Payouts

Sellers withdraw earnings through Whop's embedded payouts UI. The provider component sets up an `<Elements>` + `<PayoutsSession>` context that any payout element can use.

### Payouts provider (`src/components/sell/SellPayoutsProvider.tsx`)

Fetches the company ID + redirect URL from `/api/sell/payouts-token`, exposes `<PayoutsSession>` context. The `getToken` callback re-fetches the same endpoint on demand for refresh. The `usePayouts()` hook returns `{ available }` so children can degrade gracefully when the seller hasn't onboarded.

```tsx
'use client';

import { useState, useEffect, useMemo, createContext, useContext } from 'react';
import { loadWhopElements } from '@whop/embedded-components-vanilla-js';
import { Elements, PayoutsSession } from '@whop/embedded-components-react-js';

interface PayoutsConfig {
  companyId: string;
  redirectUrl: string;
}

const PayoutsContext = createContext<{ available: boolean }>({ available: false });
export const usePayouts = () => useContext(PayoutsContext);

export function SellPayoutsProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<PayoutsConfig | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/sell/payouts-token')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch payout token');
        return res.json();
      })
      .then((data: { companyId: string; redirectUrl: string }) => {
        setConfig({ companyId: data.companyId, redirectUrl: data.redirectUrl });
      })
      .catch((err) => setError(err.message));
  }, []);

  const loader = useMemo(() => loadWhopElements, []);

  const getToken = async (): Promise<string> => {
    const res = await fetch('/api/sell/payouts-token');
    if (!res.ok) throw new Error('Failed to refresh payout token');
    const data = await res.json();
    return data.token;
  };

  if (error || !config) {
    return (
      <PayoutsContext.Provider value={{ available: false }}>
        {children}
      </PayoutsContext.Provider>
    );
  }

  return (
    <PayoutsContext.Provider value={{ available: true }}>
      <Elements loader={loader}>
        <PayoutsSession companyId={config.companyId} getToken={getToken}>
          {children}
        </PayoutsSession>
      </Elements>
    </PayoutsContext.Provider>
  );
}
```

The dashboard mounts this provider and embeds Whop's `<BalanceElement>`, `<WithdrawButtonElement>`, and `<WithdrawalsElement>` inside it for inline balance display and withdrawal management.

### Withdraw route (`src/app/api/sell/withdraw/route.ts`)

Programmatic alternative to the embedded button. Calls `whop.withdrawals.create` with the seller's connected company ID. Gates on `kyc_status === 'verified'` and `payout_enabled`.

```ts
import { NextRequest, NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: { amount: number; currency: string; payout_method_id: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { amount, currency, payout_method_id } = body;
  if (!amount || !currency || !payout_method_id) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const { data: seller, error: sellerError } = await supabase
    .from('seller_accounts')
    .select('whop_company_id, kyc_status, payout_enabled')
    .eq('user_id', user.id)
    .single();

  if (sellerError || !seller?.whop_company_id) {
    return NextResponse.json({ error: 'Seller account not found' }, { status: 404 });
  }
  if (seller.kyc_status !== 'verified' || !seller.payout_enabled) {
    return NextResponse.json({ error: 'Complete KYC verification before withdrawing' }, { status: 403 });
  }

  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'WHOP_API_KEY is not set' }, { status: 500 });
  }

  const whop = new Whop({ apiKey });
  const withdrawal = await whop.withdrawals.create({
    company_id: seller.whop_company_id,
    amount,
    currency,
    payout_method_id,
  });

  return NextResponse.json({
    success: true,
    withdrawalId: withdrawal.id,
    status: withdrawal.status,
    amount: withdrawal.amount,
  });
}
```

## Embedded chat

If the user signed in with Whop OAuth (with chat:* and dms:* scopes from Step 4), the chat embed works inline. Otherwise the component shows a "Connect your Whop account" prompt that links back to the OAuth flow.

### Chat token route (`src/app/api/chat/token/route.ts`)

Three-strategy fallback. Strategy 1: mint a user-scoped access token using `whop_user_id` (from OAuth). Strategy 2: refresh the OAuth token using the stored `whop_refresh_token`. Strategy 3: fall back to a company-scoped token for sellers (limits chat to company context).

```ts
import { NextResponse } from 'next/server';
import Whop from '@whop/sdk';
import { createClient } from '@/lib/supabase/server';
import { getAppBaseUrl } from '@/lib/app-url';

const CHAT_SCOPES = [
  'chat:message:create',
  'chat:read',
  'dms:read',
  'dms:message:manage',
  'dms:channel:manage',
  'support_chat:read',
  'support_chat:message:create',
].join(' ');

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'WHOP_API_KEY is not set' }, { status: 503 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('whop_user_id, whop_refresh_token')
    .eq('user_id', user.id)
    .single();

  const whop = new Whop({ apiKey });

  // Strategy 1: Direct user access token
  if (profile?.whop_user_id) {
    try {
      const { token } = await whop.accessTokens.create({
        user_id: profile.whop_user_id,
        scopes: CHAT_SCOPES,
      });
      return NextResponse.json({ token });
    } catch (err) {
      console.warn('[chat/token] User access token failed, trying OAuth refresh:', err);
    }
  }

  // Strategy 2: OAuth refresh
  if (profile?.whop_refresh_token) {
    const clientId = process.env.WHOP_OAUTH_CLIENT_ID;
    const clientSecret = process.env.WHOP_OAUTH_CLIENT_SECRET;
    const baseUrl = getAppBaseUrl();

    if (clientId && clientSecret) {
      try {
        const tokenRes = await fetch('https://api.whop.com/oauth/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          },
          body: JSON.stringify({
            grant_type: 'refresh_token',
            refresh_token: profile.whop_refresh_token,
            redirect_uri: `${baseUrl}/api/auth/callback/whop`,
          }),
        });

        if (tokenRes.ok) {
          const tokens = await tokenRes.json();
          return NextResponse.json({ token: tokens.access_token });
        }

        const errText = await tokenRes.text();
        if (errText.includes('invalid_grant')) {
          // Stale refresh token — clear it
          const { createAdminClient } = await import('@/lib/supabase/server');
          await createAdminClient()
            .from('profiles')
            .update({ whop_refresh_token: null })
            .eq('user_id', user.id);
        }
      } catch (err) {
        console.warn('[chat/token] OAuth refresh threw:', err);
      }
    }
  }

  // Strategy 3: Seller company token (fallback)
  const { data: seller } = await supabase
    .from('seller_accounts')
    .select('whop_company_id')
    .eq('user_id', user.id)
    .single();

  if (seller?.whop_company_id) {
    try {
      const { token } = await whop.accessTokens.create({
        company_id: seller.whop_company_id,
      });
      return NextResponse.json({ token });
    } catch (err) {
      console.error('[chat/token] Company token failed:', err);
    }
  }

  return NextResponse.json(
    { error: 'Could not generate a chat token. Connect your Whop account to enable chat.' },
    { status: 403 }
  );
}
```

### Token alias (`src/app/api/token/route.ts`)

Whop's embedded components default to fetching `/api/token`. The alias keeps both paths working.

```ts
export { GET } from '../chat/token/route';
```

### Chat embed component (`src/components/messages/WhopChatEmbed.tsx`)

Fetches `/api/token`, mounts `<ChatSession>` + `<ChatElement>`. On 401/403, shows a prompt to connect a Whop account (links to `/api/auth/whop/authorize`). The `environment` prop is wired to `NEXT_PUBLIC_WHOP_ENVIRONMENT`.

```tsx
'use client';

import { useState, useEffect, useMemo } from 'react';
import { loadWhopElements } from '@whop/embedded-components-vanilla-js';
import { Elements, ChatSession, ChatElement } from '@whop/embedded-components-react-js';

interface WhopChatEmbedProps {
  channelId: string;
  onAuthRequired?: () => void;
}

export function WhopChatEmbed({ channelId, onAuthRequired }: WhopChatEmbedProps) {
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [authError, setAuthError] = useState(false);

  const whopEnv = (process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT ?? 'production') as
    | 'sandbox'
    | 'production';

  const loader = useMemo(() => loadWhopElements, []);

  useEffect(() => {
    fetch('/api/token', { credentials: 'include' })
      .then((res) => {
        if (res.status === 401 || res.status === 403) {
          setAuthError(true);
          onAuthRequired?.();
          return null;
        }
        return res.json();
      })
      .then((data) => {
        if (data?.token) setToken(data.token);
      });
  }, [onAuthRequired]);

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center h-48 text-center text-gray-500">
        <p className="font-medium">Connect your Whop account to use chat</p>
        <a href="/api/auth/whop/authorize" className="mt-2 text-sm underline">
          Connect Whop account
        </a>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400">
        Loading chat…
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[400px]">
      <Elements loader={loader}>
        <ChatSession
          getToken={async () => token}
          environment={whopEnv}
          appearance={{ theme: 'light' }}
        >
          <ChatElement
            channelId={channelId}
            emptyState="Send a message to start the conversation"
            onReady={() => setIsReady(true)}
          />
        </ChatSession>
      </Elements>
    </div>
  );
}
```

## Row level security

Three patterns covering every table. Apply these in `supabase/migrations/20250311000000_initial_schema.sql` after the table definitions.

### Pattern 1: self access

Users can read and update their own row only. Applies to `profiles`, `seller_accounts`, `notifications`.

```sql
create policy "profiles self read"
on public.profiles for select
using (user_id = public.current_user_id() or public.is_admin());

create policy "profiles self update"
on public.profiles for update
using (user_id = public.current_user_id() or public.is_admin())
with check (user_id = public.current_user_id() or public.is_admin());

create policy "seller self read"
on public.seller_accounts for select
using (user_id = public.current_user_id() or public.is_admin());
```

### Pattern 2: participant access

Buyers and sellers share access to resources they're both part of. Applies to `orders`, `order_messages`, `order_deliveries`, `order_requirements`.

```sql
create policy "orders buyer/seller read"
on public.orders for select
using (
  buyer_user_id = public.current_user_id()
  or seller_user_id = public.current_user_id()
  or public.is_admin()
);

create policy "order_messages read"
on public.order_messages for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_messages.order_id
      and (
        o.buyer_user_id = public.current_user_id()
        or o.seller_user_id = public.current_user_id()
        or public.is_admin()
      )
  )
);

create policy "order_messages write"
on public.order_messages for insert
with check (
  sender_user_id = public.current_user_id()
  and exists (
    select 1 from public.orders o
    where o.id = order_messages.order_id
      and (
        o.buyer_user_id = public.current_user_id()
        or o.seller_user_id = public.current_user_id()
      )
  )
);

create policy "order_deliveries read"
on public.order_deliveries for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_deliveries.order_id
      and (
        o.buyer_user_id = public.current_user_id()
        or o.seller_user_id = public.current_user_id()
        or public.is_admin()
      )
  )
);
```

### Pattern 3: admin-only visibility

Sensitive operational tables are admin-only. Applies to `whop_payments`, `webhook_events`.

```sql
create policy "whop tables admin read"
on public.whop_payments for select
using (public.is_admin());

create policy "webhooks admin read"
on public.webhook_events for select
using (public.is_admin());
```

### Gigs visibility

Published gigs are public; drafts are seller-only. Owner-only writes.

```sql
create policy "gigs public read"
on public.gigs for select
using (
  status = 'published'
  or seller_user_id = public.current_user_id()
  or public.is_admin()
);

create policy "gigs seller insert"
on public.gigs for insert
with check (seller_user_id = public.current_user_id() or public.is_admin());

create policy "gigs seller update"
on public.gigs for update
using (seller_user_id = public.current_user_id() or public.is_admin())
with check (seller_user_id = public.current_user_id() or public.is_admin());

create policy "gigs seller delete"
on public.gigs for delete
using (seller_user_id = public.current_user_id() or public.is_admin());
```

## Production switch

Sandbox keys won't work against the live Whop API. Recreate everything on whop.com:

1. Create a parent company at whop.com — copy the new `WHOP_PLATFORM_COMPANY_ID`
2. **Developer → API keys** → new live API key → `WHOP_API_KEY`
3. **Developer → Apps → OAuth** → new OAuth app with production redirect URI → `WHOP_OAUTH_CLIENT_ID` + `WHOP_OAUTH_CLIENT_SECRET`
4. **Developer → Webhooks** → new webhook pointing to `https://your-app.vercel.app/api/webhooks/whop`, subscribe to the same events → `WHOP_WEBHOOK_SECRET`

In Vercel, set every variable from `.env.local` but replace the Whop ones with the live values. Set `NEXT_PUBLIC_WHOP_ENVIRONMENT=production`, `NEXT_PUBLIC_APP_URL=https://your-app.vercel.app`, and `NEXT_PUBLIC_WHOP_OAUTH_REDIRECT_URI` to your production callback. Keep sandbox keys in your local `.env.local` for ongoing development.

## Whop SDK gotchas

- **`accountLinks.create` is the hosted-redirect flow.** It returns a Whop-hosted URL. We don't use it in this project — embedded `<VerifyElement>` + `whop.accessTokens.create({ company_id })` keeps KYC inside your app.
- **`application_fee_amount` goes on `checkoutConfigurations.create()` inside the `plan` object.** Not on `plans.create()`. Whop routes the fee to your platform automatically.
- **`company_id` on `checkoutConfigurations.create` belongs on the `plan` object only.** Top-level `company_id` will produce `400: Cannot provide company_id for this configuration`.
- **Webhook verification needs `webhookKey: btoa(WHOP_WEBHOOK_SECRET)` in the SDK constructor.** Pass the raw body text to `whop.webhooks.unwrap(bodyText, { headers })` — parsed JSON breaks signature verification.
- **Webhook event names use underscores, not dots:** `payment_succeeded`, `verification_succeeded`, `refund_created`, `dispute_created`, `payout_method_created`, `withdrawal_created`, etc.
- **Sandbox uses `sandbox-api.whop.com` for all SDK endpoints** (OAuth, API, webhooks). The embedded components read `NEXT_PUBLIC_WHOP_ENVIRONMENT`.
- **OAuth PKCE: store the code verifier in an httpOnly cookie**, not the session. Cookies survive cross-domain redirects reliably.
- **The chat token endpoint needs three fallback strategies** because some users have a `whop_user_id` (OAuth path), some have a `whop_refresh_token` only, and sellers have a company they can scope the token to.
- **The KYC trigger is the source of trust.** Keep `trg_enforce_kyc_before_gig_publish` even if the UI also blocks unverified publishes — the trigger catches API-level bypass attempts.
- **Idempotency relies on three unique constraints:** `webhook_events.webhook_id`, `whop_payments.whop_payment_id`, and `reviews.order_id`. Without these, Whop's webhook retries and the dual confirm/webhook path will create duplicates.
- **`whop.checkoutConfigurations.retrieve` lets the confirm endpoint read back the metadata you set on creation** — that's how you re-attach the order to the buyer/gig from the `onComplete` callback.
- **Whop OAuth chat scopes must be requested up front.** Adding `chat:*` and `dms:*` after the user already authenticated requires re-authentication.
