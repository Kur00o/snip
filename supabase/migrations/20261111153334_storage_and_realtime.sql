-- Snip · Phase 2 · Storage buckets and Realtime
-- All buckets are private. Files live under a per-business folder:
--   <business_id>/<anything>   e.g. 3f2c…/logo.png, 3f2c…/reels/<reel_id>/take-1.mp4
-- The browser gets short-lived signed URLs; the worker uses the secret key.
-- Free tier limits: 1 GB total storage, 50 MB per file.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('brand-assets', 'brand-assets', false, 10485760,
    array['image/png', 'image/jpeg', 'image/webp']),
  ('clips', 'clips', false, 52428800,
    array['video/mp4', 'video/quicktime', 'video/webm']),
  ('renders', 'renders', false, 52428800,
    array['image/png', 'image/jpeg', 'video/mp4', 'application/x-subrip', 'text/plain']),
  ('templates', 'templates', false, 2097152,
    array['text/html', 'text/css', 'image/png', 'image/jpeg', 'image/webp', 'font/woff2'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- brand-assets and clips: owners upload, read, replace and delete their own files
create policy "brand-assets, clips: read own" on storage.objects
  for select to authenticated
  using (
    bucket_id in ('brand-assets', 'clips')
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  );
create policy "brand-assets, clips: upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id in ('brand-assets', 'clips')
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  );
create policy "brand-assets, clips: replace own" on storage.objects
  for update to authenticated
  using (
    bucket_id in ('brand-assets', 'clips')
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  )
  with check (
    bucket_id in ('brand-assets', 'clips')
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  );
create policy "brand-assets, clips: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id in ('brand-assets', 'clips')
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  );

-- renders: written by the worker; owners read
create policy "renders: read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'renders'
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  );

-- templates: system/… is readable by every signed-in user; businesses manage their own
create policy "templates: read system and own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'templates'
    and (
      (storage.foldername(name))[1] = 'system'
      or (storage.foldername(name))[1] in (select private.my_business_folders())
    )
  );
create policy "templates: upload own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'templates'
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  );
create policy "templates: replace own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'templates'
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  )
  with check (
    bucket_id = 'templates'
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  );
create policy "templates: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'templates'
    and (storage.foldername(name))[1] in (select private.my_business_folders())
  );

-- Realtime: the studio and calendar watch these for live status (RLS still applies).
alter publication supabase_realtime add table public.jobs, public.posts, public.slides, public.schedules;
