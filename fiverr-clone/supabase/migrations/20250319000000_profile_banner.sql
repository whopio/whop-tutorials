-- Add banner_url to profiles for cover/hero image
alter table public.profiles add column if not exists banner_url text;
