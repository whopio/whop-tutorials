-- Add image_url to categories for custom category images
alter table public.categories add column if not exists image_url text;
