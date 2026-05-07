-- Add gallery column to gigs: array of { url, type: 'image'|'video' }
alter table public.gigs add column if not exists gallery jsonb not null default '[]'::jsonb;

-- Gig media bucket for photos and videos
insert into storage.buckets (id, name, public)
values ('gig-media', 'gig-media', true)
on conflict (id) do update set public = true;

-- RLS: sellers upload to their user_id folder (user_id/filename)
create policy "Sellers can upload gig media"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'gig-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Sellers can update gig media"
on storage.objects for update to authenticated
using (
  bucket_id = 'gig-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Sellers can delete gig media"
on storage.objects for delete to authenticated
using (
  bucket_id = 'gig-media'
  and (storage.foldername(name))[1] = auth.uid()::text
);
