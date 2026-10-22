-- Store an explicit, server-owned opt-in for using approved memories in replies.
-- Existing profiles default to OFF; this migration does not delete saved notes.
alter table public.profiles
  add column if not exists memory_enabled boolean not null default false;

comment on column public.profiles.memory_enabled is
  'Explicit per-user opt-in for including saved memory notes in future chat context; defaults off.';

-- Existing profile RLS and authenticated UPDATE grants continue to protect this preference.

