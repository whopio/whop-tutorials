-- Optional Whop DM channel ID for this conversation (enables Whop live chat when set)
alter table public.conversations
  add column if not exists whop_channel_id text;

comment on column public.conversations.whop_channel_id is 'Whop DM channel id when chat is backed by Whop; used with Whop ChatElement.';
