-- MindCare profile least-privilege policy and grants.
-- Run once in Supabase SQL Editor after the personal-profile migration on an existing project.
-- Idempotent: safe to run more than once.
alter table public.profiles enable row level security;

drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles
  for select to authenticated using (id = auth.uid());

drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Explicit PostgREST privileges are required in addition to RLS policies.
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;

-- Personal insights no longer use cross-user aggregate counts.
drop function if exists public.global_user_count();
