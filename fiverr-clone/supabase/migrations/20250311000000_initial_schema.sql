-- Extensions
create extension if not exists pgcrypto;
create extension if not exists citext;

-- Enums
do $$ begin
  create type public.user_role as enum ('buyer', 'seller', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.kyc_status as enum ('unstarted', 'pending', 'verified', 'failed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.gig_status as enum ('draft', 'review', 'published', 'paused', 'rejected');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'awaiting_requirements',
    'in_progress',
    'delivered',
    'revision_requested',
    'completed',
    'cancel_requested',
    'cancelled',
    'disputed',
    'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.package_tier as enum ('basic', 'standard', 'premium');
exception when duplicate_object then null; end $$;

-- Core tables
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email citext not null,
  username citext unique,
  display_name text,
  role public.user_role not null default 'buyer',
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seller_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(user_id) on delete cascade,
  whop_company_id text unique,
  kyc_status public.kyc_status not null default 'unstarted',
  kyc_verified_at timestamptz,
  payout_enabled boolean not null default false,
  payout_ready_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  slug citext not null unique,
  name text not null,
  is_active boolean not null default true
);

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
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(description,'')), 'B')
  ) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gigs_search_gin on public.gigs using gin (search_vector);
create index if not exists gigs_status_category_idx on public.gigs (status, category_id);

create table if not exists public.gig_packages (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs(id) on delete cascade,
  tier public.package_tier not null,
  title text not null,
  description text not null,
  price_cents integer not null check (price_cents > 0),
  delivery_days integer not null check (delivery_days between 1 and 365),
  revisions_included integer not null check (revisions_included between 0 and 50),
  includes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (gig_id, tier)
);

create table if not exists public.gig_extras (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs(id) on delete cascade,
  title text not null,
  description text,
  price_cents integer not null check (price_cents > 0),
  delivery_days_add integer not null default 0 check (delivery_days_add between 0 and 365),
  max_quantity integer not null default 1 check (max_quantity between 1 and 50),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists gig_extras_gig_active_idx on public.gig_extras (gig_id, active);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  gig_id uuid not null references public.gigs(id),
  package_id uuid not null references public.gig_packages(id),
  seller_user_id uuid not null references public.profiles(user_id),
  buyer_user_id uuid references public.profiles(user_id),
  buyer_email citext,
  status public.order_status not null default 'awaiting_requirements',
  requirements_schema jsonb not null default '{}'::jsonb,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_buyer_created_idx on public.orders (buyer_user_id, created_at desc);
create index if not exists orders_seller_created_idx on public.orders (seller_user_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);

create table if not exists public.order_requirements (
  order_id uuid primary key references public.orders(id) on delete cascade,
  submitted_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  attachments jsonb not null default '[]'::jsonb
);

create table if not exists public.order_deliveries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  delivered_at timestamptz not null default now(),
  message text,
  items jsonb not null default '[]'::jsonb
);

create index if not exists order_deliveries_order_time_idx on public.order_deliveries (order_id, delivered_at desc);

create table if not exists public.order_messages (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  sender_user_id uuid not null references public.profiles(user_id),
  body text not null,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists order_messages_order_time_idx on public.order_messages (order_id, created_at);

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  gig_id uuid not null references public.gigs(id) on delete cascade,
  seller_user_id uuid not null references public.profiles(user_id) on delete cascade,
  buyer_user_id uuid references public.profiles(user_id) on delete set null,
  rating integer not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now()
);

create index if not exists reviews_gig_time_idx on public.reviews (gig_id, created_at desc);

create table if not exists public.whop_checkout_configs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  whop_checkout_config_id text not null unique,
  connected_company_id text not null,
  initial_price_cents integer not null,
  application_fee_cents integer not null,
  currency text not null default 'usd',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.whop_payments (
  id uuid primary key default gen_random_uuid(),
  whop_payment_id text not null unique,
  whop_company_id text not null,
  order_id uuid references public.orders(id) on delete set null,
  status text not null,
  total_cents integer,
  amount_after_fees_cents integer,
  application_fee_cents integer,
  currency text,
  raw jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists whop_payments_order_idx on public.whop_payments (order_id);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  webhook_id text not null unique,
  type text not null,
  company_id text,
  received_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists webhook_events_type_time_idx on public.webhook_events (type, received_at desc);

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_user_id uuid not null references public.profiles(user_id),
  action text not null,
  target_type text,
  target_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists admin_actions_admin_created_idx on public.admin_actions (admin_user_id, created_at desc);

-- Helper functions (must be after profiles and seller_accounts exist)
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select auth.uid()
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.profiles p
    where p.user_id = public.current_user_id()
      and p.role = 'admin'
  )
$$;

create or replace function public.is_seller()
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.seller_accounts s
    where s.user_id = public.current_user_id()
  )
$$;

-- Trigger: create profile on auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (user_id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.seller_accounts enable row level security;
alter table public.gigs enable row level security;
alter table public.gig_packages enable row level security;
alter table public.gig_extras enable row level security;
alter table public.orders enable row level security;
alter table public.order_requirements enable row level security;
alter table public.order_deliveries enable row level security;
alter table public.order_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.whop_checkout_configs enable row level security;
alter table public.whop_payments enable row level security;
alter table public.webhook_events enable row level security;
alter table public.admin_actions enable row level security;

-- Profiles: allow read/update of own profile
drop policy if exists "profiles self read" on public.profiles;
create policy "profiles self read"
on public.profiles for select
using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists "profiles self update" on public.profiles;
create policy "profiles self update"
on public.profiles for update
using (user_id = public.current_user_id() or public.is_admin())
with check (user_id = public.current_user_id() or public.is_admin());

-- Public read of profiles for display (limited fields via view or direct - we allow select for now, can restrict via view later)
drop policy if exists "profiles public read limited" on public.profiles;
create policy "profiles public read limited"
on public.profiles for select
using (true);

-- Seller accounts
drop policy if exists "seller self read" on public.seller_accounts;
create policy "seller self read"
on public.seller_accounts for select
using (user_id = public.current_user_id() or public.is_admin());

drop policy if exists "seller self insert" on public.seller_accounts;
create policy "seller self insert"
on public.seller_accounts for insert
with check (user_id = public.current_user_id());

drop policy if exists "seller self update" on public.seller_accounts;
create policy "seller self update"
on public.seller_accounts for update
using (user_id = public.current_user_id() or public.is_admin())
with check (user_id = public.current_user_id() or public.is_admin());

-- Gigs
drop policy if exists "gigs public read" on public.gigs;
create policy "gigs public read"
on public.gigs for select
using (status = 'published' or seller_user_id = public.current_user_id() or public.is_admin());

drop policy if exists "gigs seller insert" on public.gigs;
create policy "gigs seller insert"
on public.gigs for insert
with check (seller_user_id = public.current_user_id() or public.is_admin());

drop policy if exists "gigs seller update" on public.gigs;
create policy "gigs seller update"
on public.gigs for update
using (seller_user_id = public.current_user_id() or public.is_admin())
with check (seller_user_id = public.current_user_id() or public.is_admin());

drop policy if exists "gigs seller delete" on public.gigs;
create policy "gigs seller delete"
on public.gigs for delete
using (seller_user_id = public.current_user_id() or public.is_admin());

-- Gig packages/extras
drop policy if exists "gig_packages read" on public.gig_packages;
create policy "gig_packages read"
on public.gig_packages for select
using (
  exists (
    select 1 from public.gigs g
    where g.id = gig_packages.gig_id
      and (g.status = 'published' or g.seller_user_id = public.current_user_id() or public.is_admin())
  )
);

drop policy if exists "gig_packages write" on public.gig_packages;
create policy "gig_packages write"
on public.gig_packages for all
using (
  exists (
    select 1 from public.gigs g
    where g.id = gig_packages.gig_id
      and (g.seller_user_id = public.current_user_id() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.gigs g
    where g.id = gig_packages.gig_id
      and (g.seller_user_id = public.current_user_id() or public.is_admin())
  )
);

-- Orders
drop policy if exists "orders buyer/seller read" on public.orders;
create policy "orders buyer/seller read"
on public.orders for select
using (
  buyer_user_id = public.current_user_id()
  or seller_user_id = public.current_user_id()
  or public.is_admin()
);

drop policy if exists "orders buyer create" on public.orders;
create policy "orders buyer create"
on public.orders for insert
with check (
  buyer_user_id = public.current_user_id()
  or buyer_user_id is null
  or public.is_admin()
);

drop policy if exists "orders buyer/seller update limited" on public.orders;
create policy "orders buyer/seller update limited"
on public.orders for update
using (
  buyer_user_id = public.current_user_id()
  or seller_user_id = public.current_user_id()
  or public.is_admin()
)
with check (
  buyer_user_id = public.current_user_id()
  or seller_user_id = public.current_user_id()
  or public.is_admin()
);

-- Order requirements
drop policy if exists "order_requirements read" on public.order_requirements;
create policy "order_requirements read"
on public.order_requirements for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_requirements.order_id
      and (o.buyer_user_id = public.current_user_id() or o.seller_user_id = public.current_user_id() or public.is_admin())
  )
);

drop policy if exists "order_requirements write" on public.order_requirements;
create policy "order_requirements write"
on public.order_requirements for all
using (
  exists (
    select 1 from public.orders o
    where o.id = order_requirements.order_id
      and (o.buyer_user_id = public.current_user_id() or o.seller_user_id = public.current_user_id() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_requirements.order_id
      and (o.buyer_user_id = public.current_user_id() or o.seller_user_id = public.current_user_id() or public.is_admin())
  )
);

-- Order deliveries
drop policy if exists "order_deliveries read" on public.order_deliveries;
create policy "order_deliveries read"
on public.order_deliveries for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_deliveries.order_id
      and (o.buyer_user_id = public.current_user_id() or o.seller_user_id = public.current_user_id() or public.is_admin())
  )
);

drop policy if exists "order_deliveries write" on public.order_deliveries;
create policy "order_deliveries write"
on public.order_deliveries for all
using (
  exists (
    select 1 from public.orders o
    where o.id = order_deliveries.order_id
      and (o.buyer_user_id = public.current_user_id() or o.seller_user_id = public.current_user_id() or public.is_admin())
  )
)
with check (
  exists (
    select 1 from public.orders o
    where o.id = order_deliveries.order_id
      and (o.buyer_user_id = public.current_user_id() or o.seller_user_id = public.current_user_id() or public.is_admin())
  )
);

-- Order messages
drop policy if exists "order_messages read" on public.order_messages;
create policy "order_messages read"
on public.order_messages for select
using (
  exists (
    select 1 from public.orders o
    where o.id = order_messages.order_id
      and (o.buyer_user_id = public.current_user_id() or o.seller_user_id = public.current_user_id() or public.is_admin())
  )
);

drop policy if exists "order_messages write" on public.order_messages;
create policy "order_messages write"
on public.order_messages for insert
with check (
  sender_user_id = public.current_user_id()
  and exists (
    select 1 from public.orders o
    where o.id = order_messages.order_id
      and (o.buyer_user_id = public.current_user_id() or o.seller_user_id = public.current_user_id() or public.is_admin())
  )
);

-- Reviews
drop policy if exists "reviews public read" on public.reviews;
create policy "reviews public read"
on public.reviews for select
using (true);

drop policy if exists "reviews buyer insert" on public.reviews;
create policy "reviews buyer insert"
on public.reviews for insert
with check (buyer_user_id = public.current_user_id() or public.is_admin());

-- Whop tables
drop policy if exists "whop tables admin read" on public.whop_payments;
create policy "whop tables admin read"
on public.whop_payments for select
using (public.is_admin());

drop policy if exists "webhooks admin read" on public.webhook_events;
create policy "webhooks admin read"
on public.webhook_events for select
using (public.is_admin());

-- Admin actions
drop policy if exists "admin_actions admin" on public.admin_actions;
create policy "admin_actions admin"
on public.admin_actions for all
using (public.is_admin())
with check (public.is_admin());

-- Categories: public read
alter table public.categories enable row level security;
drop policy if exists "categories public read" on public.categories;
create policy "categories public read"
on public.categories for select
using (is_active = true);

-- Trigger: block gig publish until KYC verified
create or replace function public.enforce_kyc_before_gig_publish()
returns trigger
language plpgsql
as $$
declare
  kyc public.kyc_status;
begin
  if new.status = 'published' then
    select s.kyc_status into kyc
    from public.seller_accounts s
    where s.user_id = new.seller_user_id;

    if kyc is distinct from 'verified' then
      raise exception 'Seller must complete KYC before publishing gigs';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_kyc_before_gig_publish on public.gigs;
create trigger trg_enforce_kyc_before_gig_publish
before insert or update of status
on public.gigs
for each row
execute function public.enforce_kyc_before_gig_publish();
