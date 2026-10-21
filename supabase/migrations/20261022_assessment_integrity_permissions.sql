-- MindCare P0: align existing Supabase projects with the fresh-install schema.
-- Apply after the PHQ-9 safety-follow-up and assessment-idempotency migrations.
-- This is safe to re-run. If old assessment rows violate the score/answer checks,
-- constraint creation will fail intentionally: inspect and repair those rows before rollout.

alter table public.assessments
  add column if not exists safety_follow_up_at timestamptz,
  add column if not exists submission_id uuid,
  add column if not exists scoring_version text not null default 'legacy-unversioned',
  add column if not exists result_snapshot jsonb;

create or replace function public.assessment_answers_match_score(p_answers jsonb, p_instrument text, p_score integer)
returns boolean language plpgsql immutable strict set search_path = pg_catalog as $$
declare
  expected_count integer;
  answer jsonb;
  computed_score integer := 0;
begin
  expected_count := case p_instrument when 'PHQ-9' then 9 when 'GAD-7' then 7 else null end;
  if expected_count is null then
    return false;
  end if;
  if jsonb_typeof(p_answers) is distinct from 'array' then
    return false;
  end if;
  if jsonb_array_length(p_answers) <> expected_count then
    return false;
  end if;
  for answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(answer) <> 'number' or (answer #>> '{}') !~ '^[0-3]$' then
      return false;
    end if;
    computed_score := computed_score + (answer #>> '{}')::integer;
  end loop;
  return computed_score = p_score;
end;
$$;

do $$ begin
  if not exists (select 1 from pg_constraint where conrelid = 'public.assessments'::regclass and conname = 'assessments_score_within_max_check') then
    alter table public.assessments add constraint assessments_score_within_max_check check (score <= max_score);
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.assessments'::regclass and conname = 'assessments_instrument_max_check') then
    alter table public.assessments add constraint assessments_instrument_max_check check ((instrument = 'PHQ-9' and max_score = 27) or (instrument = 'GAD-7' and max_score = 21));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.assessments'::regclass and conname = 'assessments_answers_match_score_check') then
    alter table public.assessments add constraint assessments_answers_match_score_check check (public.assessment_answers_match_score(answers, instrument, score));
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'public.assessments'::regclass and conname = 'assessments_result_snapshot_object_check') then
    alter table public.assessments add constraint assessments_result_snapshot_object_check check (result_snapshot is null or jsonb_typeof(result_snapshot) = 'object');
  end if;
end $$;

-- The API only updates safety_follow_up_at using the user's JWT. Do not grant a
-- signed-in user broad UPDATE over historical scores, answers, submission IDs or snapshots.
revoke update (id, user_id, instrument, score, max_score, answers, completed_at, safety_follow_up_at, submission_id, scoring_version, result_snapshot)
  on public.assessments from public, anon, authenticated;
revoke update on public.assessments from public, anon, authenticated;
grant select, insert, delete on public.assessments to authenticated;
grant update (safety_follow_up_at) on public.assessments to authenticated;

notify pgrst, 'reload schema';
