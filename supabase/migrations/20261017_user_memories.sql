-- MindCare user-controlled saved memories.
-- Apply in Supabase SQL Editor before using the Memory manager in Chat.
-- Notes are created only by explicit user action; no chat messages are auto-saved.

create table if not exists public.user_memories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 2 and 240),
  created_at timestamptz not null default now()
);

create index if not exists user_memories_owner_created_idx
  on public.user_memories(user_id, created_at desc);

alter table public.user_memories enable row level security;

drop policy if exists "user_memories_select_own" on public.user_memories;
create policy "user_memories_select_own" on public.user_memories
  for select to authenticated using (user_id = auth.uid());

drop policy if exists "user_memories_insert_own" on public.user_memories;
create policy "user_memories_insert_own" on public.user_memories
  for insert to authenticated with check (user_id = auth.uid());

drop policy if exists "user_memories_delete_own" on public.user_memories;
create policy "user_memories_delete_own" on public.user_memories
  for delete to authenticated using (user_id = auth.uid());

grant select, insert, delete on public.user_memories to authenticated;
