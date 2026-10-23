-- Permit authenticated users to edit only the content of their own saved memory notes.
-- Apply this migration to upgraded Supabase projects before deploying the memory editor.
drop policy if exists "user_memories_update_own" on public.user_memories;
create policy "user_memories_update_own" on public.user_memories
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant update (content) on public.user_memories to authenticated;
