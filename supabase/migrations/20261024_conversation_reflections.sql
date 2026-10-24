-- MindCare: user-controlled, conversation-scoped reflection cards.
-- Apply in the Supabase SQL Editor before deploying the API/frontend code for this feature.
create table if not exists public.conversation_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  conversation_id uuid not null,
  what_i_shared text not null default '' check (char_length(what_i_shared) <= 600),
  what_i_noticed text not null default '' check (char_length(what_i_noticed) <= 600),
  possible_next_step text not null default '' check (char_length(possible_next_step) <= 400),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint conversation_reflections_conversation_user_fk
    foreign key (conversation_id, user_id)
    references public.conversations(id, user_id) on delete cascade,
  constraint conversation_reflections_nonempty_check
    check (
      char_length(btrim(what_i_shared)) > 0
      or char_length(btrim(what_i_noticed)) > 0
      or char_length(btrim(possible_next_step)) > 0
    ),
  constraint conversation_reflections_one_per_conversation unique (conversation_id, user_id)
);

create index if not exists conversation_reflections_user_updated_idx
  on public.conversation_reflections(user_id, updated_at desc);

alter table public.conversation_reflections enable row level security;
drop policy if exists "conversation_reflections_select_own" on public.conversation_reflections;
create policy "conversation_reflections_select_own" on public.conversation_reflections
  for select to authenticated using (user_id = auth.uid());
drop policy if exists "conversation_reflections_insert_own" on public.conversation_reflections;
create policy "conversation_reflections_insert_own" on public.conversation_reflections
  for insert to authenticated with check (
    user_id = auth.uid()
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
drop policy if exists "conversation_reflections_update_own" on public.conversation_reflections;
create policy "conversation_reflections_update_own" on public.conversation_reflections
  for update to authenticated using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.conversations c where c.id = conversation_id and c.user_id = auth.uid())
  );
drop policy if exists "conversation_reflections_delete_own" on public.conversation_reflections;
create policy "conversation_reflections_delete_own" on public.conversation_reflections
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, update, delete on public.conversation_reflections to authenticated;
