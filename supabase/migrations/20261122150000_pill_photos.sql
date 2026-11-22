-- F4: own-pill photo card. Spec: docs/specs/F4.md
-- One optional photo per medicine, kept in a private Storage bucket. Path: <user id>/<medicine id>-<timestamp>.jpg

alter table public.medications
  add column photo_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('pill-photos', 'pill-photos', false, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- Only the owner can see, add, change or delete files in their own folder.
create policy "pill photos: owner reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'pill-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "pill photos: owner adds"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'pill-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "pill photos: owner changes"
  on storage.objects for update to authenticated
  using (bucket_id = 'pill-photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'pill-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "pill photos: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'pill-photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
