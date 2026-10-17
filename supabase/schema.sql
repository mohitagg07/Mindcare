-- MindCare Supabase schema. Run in Supabase SQL Editor before deploying.
-- Application data requests use the signed-in user's access token so these RLS
-- policies apply; never put a service_role key in the frontend.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (char_length(username) between 3 and 30),
  display_name text,
  pronouns text,
  date_of_birth date,
  avatar_path text,
  timezone text not null default 'Asia/Kolkata',
  support_style text not null default 'gentle',
  focus_areas text[] not null default '{}'::text[],
  avatar_tone text not null default 'sage',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Upgrade existing projects safely: CREATE TABLE IF NOT EXISTS doesn't add columns.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists pronouns text;
alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists avatar_path text;
alter table public.profiles add column if not exists timezone text not null default 'Asia/Kolkata';
alter table public.profiles add column if not exists support_style text not null default 'gentle';
alter table public.profiles add column if not exists focus_areas text[] not null default '{}'::text[];
alter table public.profiles add column if not exists avatar_tone text not null default 'sage';
DO $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_display_name_length_check') then
    alter table public.profiles add constraint profiles_display_name_length_check check (display_name is null or char_length(display_name) between 1 and 60);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_pronouns_length_check') then
    alter table public.profiles add constraint profiles_pronouns_length_check check (pronouns is null or char_length(pronouns) <= 40);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_timezone_length_check') then
    alter table public.profiles add constraint profiles_timezone_length_check check (char_length(timezone) between 1 and 64);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_support_style_check') then
    alter table public.profiles add constraint profiles_support_style_check check (support_style in ('gentle','practical','reflective'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_avatar_tone_check') then
    alter table public.profiles add constraint profiles_avatar_tone_check check (avatar_tone in ('sage','ocean','lavender','sunrise'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_focus_areas_check') then
    alter table public.profiles add constraint profiles_focus_areas_check check (focus_areas <@ array['stress','sleep','confidence','relationships','focus','self_compassion','emotional_balance','other']::text[]);
  end if;
end $$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  desired_username text;
  fallback_username text;
begin
  desired_username := lower(coalesce(nullif(new.raw_user_meta_data->>'username', ''), split_part(coalesce(new.email, ''), '@', 1)));
  desired_username := regexp_replace(desired_username, '[^a-z0-9_]', '_', 'g');
  desired_username := left(desired_username, 30);
  if char_length(desired_username) < 3 then
    desired_username := 'user_' || substr(replace(new.id::text, '-', ''), 1, 8);
  end if;

  -- Prefer the supplied handle. If it is taken, derive a stable handle from the auth UUID.
  insert into public.profiles(id, username) values (new.id, desired_username)
    on conflict (username) do nothing;
  if not found then
    fallback_username := 'u_' || substr(replace(new.id::text, '-', ''), 1, 28);
    insert into public.profiles(id, username) values (new.id, fallback_username)
      on conflict (username) do nothing;
    if not found then
      raise exception 'Could not create a unique profile handle';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_mindcare on auth.users;
create trigger on_auth_user_created_mindcare
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New conversation' check (char_length(title) <= 120),
  phq9_score integer check (phq9_score between 0 and 27),
  phq9_category text,
  phq9_crisis_flag boolean not null default false,
  gad7_score integer check (gad7_score between 0 and 21),
  gad7_category text,
  risk_level text check (risk_level is null or risk_level in ('MINIMAL','LOW','MODERATE','HIGH')),
  risk_score numeric(5,4) check (risk_score is null or risk_score between 0 and 1),
  trajectory_trend text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  archived_at timestamptz
);
create index if not exists conversations_user_created_idx on public.conversations(user_id, created_at desc);
alter table public.conversations add column if not exists phq9_crisis_flag boolean not null default false;
DO $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.conversations'::regclass and conname = 'conversations_id_user_id_key') then
    alter table public.conversations add constraint conversations_id_user_id_key unique (id, user_id);
  end if;
end $$;

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  content text not null check (char_length(content) <= 12000),
  emotion text,
  risk_score numeric(5,4) check (risk_score is null or risk_score between 0 and 1),
  latency_ms integer check (latency_ms is null or latency_ms >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint messages_conversation_user_fk foreign key (conversation_id, user_id)
    references public.conversations(id, user_id) on delete cascade
);
-- CREATE TABLE IF NOT EXISTS does not update constraints on an existing table;
-- enforce the owner relationship idempotently for upgrades as well as fresh installs.
DO $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.messages'::regclass and conname = 'messages_conversation_user_fk') then
    alter table public.messages add constraint messages_conversation_user_fk
      foreign key (conversation_id, user_id) references public.conversations(id, user_id) on delete cascade;
  end if;
end $$;
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at asc);
create index if not exists messages_user_created_idx on public.messages(user_id, created_at desc);

create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 2 and 240),
  created_at timestamptz not null default now()
);
create index if not exists user_memories_owner_created_idx on public.user_memories(user_id, created_at desc);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument text not null check (instrument in ('PHQ-9','GAD-7')),
  score integer not null check (score >= 0),
  max_score integer not null check (max_score > 0),
  answers jsonb not null default '[]'::jsonb,
  completed_at timestamptz not null default now()
);
create index if not exists assessments_user_completed_idx on public.assessments(user_id, completed_at desc);

-- Keep persisted scores consistent with the answer array received by the API.
create or replace function public.assessment_answers_match_score(p_answers jsonb, p_instrument text, p_score integer)
returns boolean language plpgsql immutable strict set search_path = pg_catalog as $$
declare
  expected_count integer;
  answer jsonb;
  computed_score integer := 0;
begin
  expected_count := case p_instrument when 'PHQ-9' then 9 when 'GAD-7' then 7 else null end;
  if expected_count is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> expected_count then
    return false;
  end if;
  for answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(answer) <> 'number' or answer not in ('0'::jsonb, '1'::jsonb, '2'::jsonb, '3'::jsonb) then
      return false;
    end if;
    computed_score := computed_score + (answer #>> '{}')::integer;
  end loop;
  return computed_score = p_score;
end;
$$;

DO $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.assessments'::regclass and conname = 'assessments_score_within_max_check') then
    alter table public.assessments add constraint assessments_score_within_max_check check (score <= max_score);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.assessments'::regclass and conname = 'assessments_instrument_max_check') then
    alter table public.assessments add constraint assessments_instrument_max_check check ((instrument = 'PHQ-9' and max_score = 27) or (instrument = 'GAD-7' and max_score = 21));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.assessments'::regclass and conname = 'assessments_answers_match_score_check') then
    alter table public.assessments add constraint assessments_answers_match_score_check check (public.assessment_answers_match_score(answers, instrument, score));
  end if;
end $$;

create table if not exists public.trajectories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sentiment_score numeric(6,4) not null,
  risk_score numeric(5,4) not null check (risk_score between 0 and 1),
  state_now numeric(6,4) not null,
  state_ema numeric(6,4) not null,
  delta numeric(6,4) not null,
  trigger text not null check (trigger in ('high_risk','positive_progress','stable')),
  created_at timestamptz not null default now()
);
create index if not exists trajectories_user_created_idx on public.trajectories(user_id, created_at desc);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();
drop trigger if exists conversations_set_updated_at on public.conversations;
create trigger conversations_set_updated_at before update on public.conversations
for each row execute procedure public.set_updated_at();

-- Private-by-default RLS for every user-data table.
alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.user_memories enable row level security;
alter table public.assessments enable row level security;
alter table public.trajectories enable row level security;

drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own" on public.profiles for select to authenticated using (id = auth.uid());
drop policy if exists "profile_insert_own" on public.profiles;
create policy "profile_insert_own" on public.profiles for insert to authenticated with check (id = auth.uid());
drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- Optional DOB and private avatar object security (photo payloads are re-encoded to WebP by the API).
DO $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_date_of_birth_valid_check') then
    alter table public.profiles add constraint profiles_date_of_birth_valid_check check (date_of_birth is null or (date_of_birth >= date '1900-01-01'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.profiles'::regclass and conname = 'profiles_avatar_path_owner_prefix_check') then
    alter table public.profiles add constraint profiles_avatar_path_owner_prefix_check check (avatar_path is null or (char_length(avatar_path) < 100 and avatar_path like id::text || '/%'));
  end if;
end $$;

-- Supabase manages storage.objects and enables RLS on this platform table.
-- App projects should add bucket policies below, not change the table owner or RLS mode.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 3145728, array['image/webp']::text[])
on conflict (id) do update set public = false, file_size_limit = 3145728, allowed_mime_types = array['image/webp']::text[];

drop policy if exists "mindcare_avatar_select_own" on storage.objects;
create policy "mindcare_avatar_select_own" on storage.objects for select to authenticated
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "mindcare_avatar_insert_own" on storage.objects;
create policy "mindcare_avatar_insert_own" on storage.objects for insert to authenticated
  with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "mindcare_avatar_update_own" on storage.objects;
create policy "mindcare_avatar_update_own" on storage.objects for update to authenticated
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "mindcare_avatar_delete_own" on storage.objects;
create policy "mindcare_avatar_delete_own" on storage.objects for delete to authenticated
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));

drop policy if exists "conversations_select_own" on public.conversations;
create policy "conversations_select_own" on public.conversations for select to authenticated using (user_id = auth.uid());
drop policy if exists "conversations_insert_own" on public.conversations;
create policy "conversations_insert_own" on public.conversations for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "conversations_update_own" on public.conversations;
create policy "conversations_update_own" on public.conversations for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "conversations_delete_own" on public.conversations;
create policy "conversations_delete_own" on public.conversations for delete to authenticated using (user_id = auth.uid());

drop policy if exists "messages_select_own" on public.messages;
create policy "messages_select_own" on public.messages for select to authenticated using (user_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own" on public.messages for insert to authenticated with check (user_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));
drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own" on public.messages for delete to authenticated using (user_id = auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid()));

drop policy if exists "user_memories_select_own" on public.user_memories;
create policy "user_memories_select_own" on public.user_memories for select to authenticated using (user_id = auth.uid());
drop policy if exists "user_memories_insert_own" on public.user_memories;
create policy "user_memories_insert_own" on public.user_memories for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "user_memories_delete_own" on public.user_memories;
create policy "user_memories_delete_own" on public.user_memories for delete to authenticated using (user_id = auth.uid());

drop policy if exists "assessments_select_own" on public.assessments;
create policy "assessments_select_own" on public.assessments for select to authenticated using (user_id = auth.uid());
drop policy if exists "assessments_insert_own" on public.assessments;
create policy "assessments_insert_own" on public.assessments for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "assessments_delete_own" on public.assessments;
create policy "assessments_delete_own" on public.assessments for delete to authenticated using (user_id = auth.uid());

drop policy if exists "trajectories_select_own" on public.trajectories;
create policy "trajectories_select_own" on public.trajectories for select to authenticated using (user_id = auth.uid());
drop policy if exists "trajectories_insert_own" on public.trajectories;
create policy "trajectories_insert_own" on public.trajectories for insert to authenticated with check (user_id = auth.uid());

-- Remove a previous platform-wide aggregate that is no longer used by personal insights.
drop function if exists public.global_user_count();

-- PostgREST needs table privileges in addition to RLS policies. Remove any older or
-- default broad grants first, then add only the operations used by this application.
revoke all on public.profiles, public.conversations, public.messages, public.user_memories, public.assessments, public.trajectories from anon, authenticated;
-- The anon SELECT grant only lets the unauthenticated health probe verify reachability;
-- profile RLS has no anon policy, so the probe cannot read profile rows.
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, delete on public.messages to authenticated;
grant select, insert, delete on public.user_memories to authenticated;
grant select, insert, delete on public.assessments to authenticated;
grant select, insert on public.trajectories to authenticated;
grant usage on schema public to anon, authenticated;
