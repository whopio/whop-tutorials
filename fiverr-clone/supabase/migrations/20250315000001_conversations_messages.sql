create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  buyer_user_id uuid not null references auth.users(id) on delete cascade,
  seller_user_id uuid not null references auth.users(id) on delete cascade,
  gig_id uuid references public.gigs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (buyer_user_id, seller_user_id, gig_id)
);

create index if not exists conversations_buyer_idx on public.conversations (buyer_user_id, updated_at desc);
create index if not exists conversations_seller_idx on public.conversations (seller_user_id, updated_at desc);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_conversation_idx on public.conversation_messages (conversation_id, created_at);

alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

create policy "conversations select participant"
  on public.conversations for select
  using (auth.uid() = buyer_user_id or auth.uid() = seller_user_id);

create policy "conversations insert buyer"
  on public.conversations for insert
  with check (auth.uid() = buyer_user_id);

create policy "conversations update participant"
  on public.conversations for update
  using (auth.uid() = buyer_user_id or auth.uid() = seller_user_id);

create policy "conversation_messages select participant"
  on public.conversation_messages for select
  using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_messages.conversation_id
      and (c.buyer_user_id = auth.uid() or c.seller_user_id = auth.uid())
    )
  );

create policy "conversation_messages insert participant"
  on public.conversation_messages for insert
  with check (
    auth.uid() = sender_user_id
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id
      and (c.buyer_user_id = auth.uid() or c.seller_user_id = auth.uid())
    )
  );

alter publication supabase_realtime add table public.conversation_messages;
