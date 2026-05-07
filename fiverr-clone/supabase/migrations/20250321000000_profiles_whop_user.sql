-- Whop user identity for chat (and optional OAuth refresh for token endpoint)
alter table public.profiles
  add column if not exists whop_user_id text,
  add column if not exists whop_refresh_token text;

comment on column public.profiles.whop_user_id is 'Whop OAuth user id (sub) for DMs and chat.';
comment on column public.profiles.whop_refresh_token is 'Whop OAuth refresh_token for /api/chat/token (user access token).';
