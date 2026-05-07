-- Notifications table for user notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  type text not null, -- 'message', 'order', 'review', etc.
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_created_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_user_read_idx on public.notifications (user_id, read_at);

alter table public.notifications enable row level security;

drop policy if exists "notifications self read" on public.notifications;
create policy "notifications self read"
  on public.notifications for select
  using (user_id = public.current_user_id());

drop policy if exists "notifications self update" on public.notifications;
create policy "notifications self update"
  on public.notifications for update
  using (user_id = public.current_user_id())
  with check (user_id = public.current_user_id());

drop policy if exists "notifications insert" on public.notifications;
create policy "notifications insert"
  on public.notifications for insert
  with check (true);
