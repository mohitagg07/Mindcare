-- MindCare personal profile and response-personalization fields.
-- Run this in Supabase SQL Editor for an existing MindCare project.
-- Safe to run more than once.
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists pronouns text;
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
