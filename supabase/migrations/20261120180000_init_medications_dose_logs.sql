-- Med Friend: first tables. Plan: docs/specs/DB-supabase.md
-- Every browser gets its own anonymous Supabase user (role "authenticated").
-- Each user can see and change only their own rows (RLS, owner-only policies).

-- ---------- medications ----------
create table public.medications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null check (length(trim(name)) between 1 and 200),
  from_list     boolean not null default false,
  strength      text check (strength is null or length(strength) <= 100),
  form          text not null,
  amount        numeric not null check (amount > 0),
  times_per_day int not null check (times_per_day between 1 and 4),
  times         text[] not null default '{}',
  created_at    timestamptz not null default now(),
  -- lets dose_logs check that a log and its medication belong to the same user
  unique (id, user_id)
);

create index medications_user_id_idx on public.medications (user_id);

alter table public.medications enable row level security;

create policy "Users can read their own medications"
  on public.medications for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own medications"
  on public.medications for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can change their own medications"
  on public.medications for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own medications"
  on public.medications for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- dose_logs (used by F1 reminders and F8 dose log) ----------
create table public.dose_logs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  medication_id uuid not null,
  scheduled_at  timestamptz not null,
  status        text not null check (status in ('taken', 'skipped', 'snoozed', 'missed')),
  recorded_at   timestamptz not null default now(),
  -- the medication must belong to the same user as the log
  foreign key (medication_id, user_id)
    references public.medications (id, user_id) on delete cascade,
  -- one log row per scheduled dose; snooze -> taken updates the same row
  unique (medication_id, scheduled_at)
);

create index dose_logs_user_id_idx on public.dose_logs (user_id);
create index dose_logs_medication_id_user_id_idx on public.dose_logs (medication_id, user_id);

alter table public.dose_logs enable row level security;

create policy "Users can read their own dose logs"
  on public.dose_logs for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "Users can add their own dose logs"
  on public.dose_logs for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "Users can change their own dose logs"
  on public.dose_logs for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users can delete their own dose logs"
  on public.dose_logs for delete to authenticated
  using ((select auth.uid()) = user_id);

-- ---------- grants ----------
-- Anonymous sign-in users have the "authenticated" role. The "anon" role
-- (no session at all) gets no access to these tables.
revoke all on public.medications, public.dose_logs from anon, authenticated;
grant select, insert, update, delete on public.medications, public.dose_logs to authenticated;
