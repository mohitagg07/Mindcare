-- MindCare P0: make assessment submission retries safe.
-- Apply after schema.sql and existing assessment safety-follow-up migrations, before
-- deploying the matching backend. Safe to run more than once.

alter table public.assessments
  add column if not exists submission_id uuid,
  add column if not exists scoring_version text not null default 'legacy-unversioned',
  add column if not exists result_snapshot jsonb;

-- NULL submission IDs from older clients may coexist. Non-NULL keys are unique per
-- authenticated owner and instrument. The backend still checks the answers on replay,
-- so reusing a key with a different payload returns HTTP 409 rather than overwriting data.
create unique index if not exists assessments_user_instrument_submission_uidx
  on public.assessments (user_id, instrument, submission_id);

create index if not exists assessments_user_submission_lookup_idx
  on public.assessments (user_id, submission_id)
  where submission_id is not null;

-- Defensive constraint: a result snapshot, when present, must be a JSON object.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.assessments'::regclass
      and conname = 'assessments_result_snapshot_object_check'
  ) then
    alter table public.assessments
      add constraint assessments_result_snapshot_object_check
      check (result_snapshot is null or jsonb_typeof(result_snapshot) = 'object');
  end if;
end $$;

notify pgrst, 'reload schema';
