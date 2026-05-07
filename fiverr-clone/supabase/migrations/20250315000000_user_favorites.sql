create table if not exists public.user_favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  gig_id uuid not null references public.gigs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, gig_id)
);

create index if not exists user_favorites_user_idx on public.user_favorites (user_id);
create index if not exists user_favorites_gig_idx on public.user_favorites (gig_id);

alter table public.user_favorites enable row level security;

create policy "user_favorites select own"
  on public.user_favorites for select
  using (auth.uid() = user_id);

create policy "user_favorites insert own"
  on public.user_favorites for insert
  with check (auth.uid() = user_id);

create policy "user_favorites delete own"
  on public.user_favorites for delete
  using (auth.uid() = user_id);
