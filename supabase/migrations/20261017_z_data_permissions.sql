-- Apply after the user_memories migration. Remove broad legacy/default grants,
-- then restore only the operations used by this application.
revoke all on public.profiles, public.conversations, public.messages, public.user_memories, public.assessments, public.trajectories from anon, authenticated;

grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, delete on public.messages to authenticated;
grant select, insert, delete on public.user_memories to authenticated;
grant select, insert, delete on public.assessments to authenticated;
grant select, insert on public.trajectories to authenticated;
grant usage on schema public to anon, authenticated;
