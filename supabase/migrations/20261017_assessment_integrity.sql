-- Ensure PHQ-9 and GAD-7 rows contain the expected answer count and a matching total.
create or replace function public.assessment_answers_match_score(p_answers jsonb, p_instrument text, p_score integer)
returns boolean language plpgsql immutable strict set search_path = pg_catalog as $$
declare
  expected_count integer;
  answer jsonb;
  computed_score integer := 0;
begin
  expected_count := case p_instrument when 'PHQ-9' then 9 when 'GAD-7' then 7 else null end;
  if expected_count is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) <> expected_count then
    return false;
  end if;
  for answer in select value from jsonb_array_elements(p_answers) loop
    if jsonb_typeof(answer) <> 'number' or answer not in ('0'::jsonb, '1'::jsonb, '2'::jsonb, '3'::jsonb) then
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
end $$;
