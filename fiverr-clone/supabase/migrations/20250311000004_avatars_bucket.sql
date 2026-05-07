-- Avatars bucket (public read; authenticated users upload to their own folder)
-- Create bucket if your Supabase version supports it; otherwise create "avatars" in Dashboard > Storage
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

-- RLS: allow authenticated users to upload only to their own folder (user_id/filename)
create policy "Users can upload own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: allow users to update/delete their own files
create policy "Users can update own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users can delete own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read is implicit for public buckets; no select policy needed for public read
