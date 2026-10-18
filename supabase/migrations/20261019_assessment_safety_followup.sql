-- Track whether a positive PHQ-9 item 9 screen has received a safety follow-up.
-- Apply once to existing Supabase projects before deploying the matching backend.
-- This does NOT classify imminent suicide risk; it only prevents silently forgetting
-- to present one direct follow-up after a saved positive screen.

alter table public.assessments
  add column if not exists safety_follow_up_at timestamptz;

create index if not exists assessments_user_instrument_completed_idx
  on public.assessments(user_id, instrument, completed_at desc);

drop policy if exists "assessments_update_own" on public.assessments;
create policy "assessments_update_own" on public.assessments
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.assessments to authenticated;
