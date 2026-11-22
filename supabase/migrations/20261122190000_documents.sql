-- F10-lite: document vault (lab results, prescriptions). Spec: docs/specs/F10.md
-- One row per document; the file itself is in the private Storage bucket "documents",
-- path <user id>/<document id>.<jpg|pdf>. Each user sees and changes only their own.

create table public.documents (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  doc_type    text not null check (doc_type in ('lab', 'prescription', 'report', 'other')),
  doc_date    date not null,
  title       text check (title is null or length(title) <= 80),
  file_path   text not null,
  mime_type   text not null check (mime_type in ('image/jpeg', 'application/pdf')),
  created_at  timestamptz not null default now()
);

create index documents_user_id_date_idx on public.documents (user_id, doc_date desc);

alter table public.documents enable row level security;

create policy "Users can read their own documents"
  on public.documents for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own documents"
  on public.documents for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can change their own documents"
  on public.documents for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own documents"
  on public.documents for delete to authenticated
  using ((select auth.uid()) = user_id);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('documents', 'documents', false, 10485760, array['image/jpeg', 'application/pdf'])
on conflict (id) do nothing;

-- Only the owner can see, add, change or delete files in their own folder.
create policy "documents: owner reads"
  on storage.objects for select to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents: owner adds"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents: owner changes"
  on storage.objects for update to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "documents: owner deletes"
  on storage.objects for delete to authenticated
  using (bucket_id = 'documents' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- Grants (applied as a second step "documents_grants"): logged-in users only; "anon" (no session) gets nothing.
revoke all on public.documents from anon, authenticated;
grant select, insert, update, delete on public.documents to authenticated;
