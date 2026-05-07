-- Profile fields for settings UI: location, links, tagline, portfolio gallery
alter table public.profiles add column if not exists location text;
alter table public.profiles add column if not exists website text;
alter table public.profiles add column if not exists tagline text;
alter table public.profiles add column if not exists portfolio jsonb not null default '[]'::jsonb;

comment on column public.profiles.portfolio is 'Array of { id, title, image_url, url? } for seller portfolio on profile settings.';
