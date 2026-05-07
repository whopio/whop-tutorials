-- Add bio and skills to profiles for complete profile
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists skills text[] default '{}';
