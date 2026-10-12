-- Optional date of birth and private profile-photo storage for MindCare.
-- Run after 20261013_personal_profile.sql and 20261013_profile_permissions.sql.
-- DOB is optional. The API calculates age and does not send the raw DOB to Groq.

alter table public.profiles add column if not exists date_of_birth date;
alter table public.profiles add column if not exists avatar_path text;

DO $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_date_of_birth_valid_check'
  ) then
    alter table public.profiles add constraint profiles_date_of_birth_valid_check
      check (date_of_birth is null or (date_of_birth >= date '1900-01-01'));
  end if;
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.profiles'::regclass and conname = 'profiles_avatar_path_owner_prefix_check'
  ) then
    alter table public.profiles add constraint profiles_avatar_path_owner_prefix_check
      check (avatar_path is null or (char_length(avatar_path) < 100 and avatar_path like id::text || '/%'));
  end if;
end $$;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', false, 3145728, array['image/webp']::text[])
on conflict (id) do update set
  public = false,
  file_size_limit = 3145728,
  allowed_mime_types = array['image/webp']::text[];

alter table storage.objects enable row level security;
drop policy if exists "mindcare_avatar_select_own" on storage.objects;
create policy "mindcare_avatar_select_own" on storage.objects
  for select to authenticated
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "mindcare_avatar_insert_own" on storage.objects;
create policy "mindcare_avatar_insert_own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "mindcare_avatar_update_own" on storage.objects;
create policy "mindcare_avatar_update_own" on storage.objects
  for update to authenticated
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text))
  with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
drop policy if exists "mindcare_avatar_delete_own" on storage.objects;
create policy "mindcare_avatar_delete_own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid()::text));
