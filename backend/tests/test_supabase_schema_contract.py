"""Static contracts for Supabase migrations that cannot be tested without a live project."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def read_sql(relative: str) -> str:
    return (ROOT / relative).read_text(encoding="utf-8").lower()

def test_fresh_schema_enforces_profile_ownership_and_grants():
    schema = read_sql("supabase/schema.sql")
    assert 'create policy "profile_select_own"' in schema
    assert 'create policy "profile_insert_own"' in schema
    assert 'create policy "profile_update_own"' in schema
    assert 'using (id = auth.uid()) with check (id = auth.uid())' in schema
    assert 'grant select, insert, update on public.profiles to authenticated' in schema

def test_existing_project_profile_migration_includes_permissions():
    migration = read_sql("supabase/migrations/20261013_profile_permissions.sql")
    assert 'create policy "profile_insert_own"' in migration
    assert 'grant select, insert, update on public.profiles to authenticated' in migration
    assert 'drop function if exists public.global_user_count()' in migration

def test_legacy_platform_wide_user_count_rpc_is_not_created():
    schema = read_sql("supabase/schema.sql")
    assert 'create function public.global_user_count' not in schema
    assert 'create or replace function public.global_user_count' not in schema

def test_all_user_data_tables_have_row_level_security_enabled():
    schema = read_sql("supabase/schema.sql")
    for table in ("profiles", "conversations", "messages", "assessments", "user_memories", "trajectories"):
        assert f"alter table public.{table} enable row level security" in schema
    for policy in (
        "profile_select_own", "profile_insert_own", "profile_update_own",
        "conversations_select_own", "conversations_insert_own", "conversations_update_own", "conversations_delete_own",
        "messages_select_own", "messages_insert_own", "messages_delete_own",
        "assessments_select_own", "assessments_insert_own", "assessments_delete_own",
        "user_memories_select_own", "user_memories_insert_own", "user_memories_delete_own",
        "trajectories_select_own", "trajectories_insert_own",
    ):
        assert f'create policy "{policy}"' in schema

def test_personal_metrics_router_has_no_platform_user_count_routes():
    from routers.metrics import router
    paths = {route.path for route in router.routes}
    assert not any("total-users" in route or "online-users" in route or "heartbeat" in route for route in paths)


def test_dob_avatar_migration_uses_private_owner_scoped_storage():
    migration = read_sql("supabase/migrations/20261013_dob_avatar_storage.sql")
    assert "add column if not exists date_of_birth date" in migration
    assert "add column if not exists avatar_path text" in migration
    assert "values ('profile-avatars', 'profile-avatars', false" in migration
    for policy in ("mindcare_avatar_select_own", "mindcare_avatar_insert_own", "mindcare_avatar_update_own", "mindcare_avatar_delete_own"):
        assert f'create policy "{policy}"' in migration
    assert "storage.foldername(name))[1] = (select auth.uid()::text)" in migration


def test_fresh_schema_includes_dob_and_private_avatar_storage():
    schema = read_sql("supabase/schema.sql")
    assert "date_of_birth date" in schema
    assert "avatar_path text" in schema
    assert 'create policy "mindcare_avatar_select_own"' in schema
    assert 'create policy "mindcare_avatar_insert_own"' in schema


def test_assessment_safety_followup_state_is_owner_scoped():
    schema = read_sql("supabase/schema.sql")
    migration = read_sql("supabase/migrations/20261019_assessment_safety_followup.sql")
    assert "safety_follow_up_at timestamptz" in schema
    assert 'create policy "assessments_update_own"' in schema
    assert "grant select, insert, update, delete on public.assessments to authenticated" in schema
    assert "add column if not exists safety_follow_up_at timestamptz" in migration
    assert "using (user_id = auth.uid())" in migration
    assert "with check (user_id = auth.uid())" in migration


def test_assessment_submission_idempotency_contract():
    schema = read_sql("supabase/schema.sql")
    migration = read_sql("supabase/migrations/20261021_assessment_submission_idempotency.sql")
    assert "submission_id uuid" in schema
    assert "scoring_version text" in schema
    assert "result_snapshot jsonb" in schema
    assert "assessments_user_instrument_submission_uidx" in schema
    assert "add column if not exists submission_id uuid" in migration
    assert "add column if not exists scoring_version text" in migration
    assert "add column if not exists result_snapshot jsonb" in migration
    assert "assessments_user_instrument_submission_uidx" in migration


def test_chat_turn_idempotency_contract():
    schema = read_sql("supabase/schema.sql")
    migration = read_sql("supabase/migrations/20261022_chat_turn_idempotency.sql")
    assert "client_turn_id uuid" in schema
    assert "messages_user_client_turn_role_uidx" in schema
    assert "add column if not exists client_turn_id uuid" in migration
    assert "messages_user_client_turn_role_uidx" in migration


def test_assessment_integrity_permissions_contract():
    migration = read_sql("supabase/migrations/20261022_assessment_integrity_permissions.sql")
    assert "assessment_answers_match_score" in migration
    assert "assessments_score_within_max_check" in migration
    assert "assessments_instrument_max_check" in migration
    assert "assessments_answers_match_score_check" in migration
    assert "assessments_result_snapshot_object_check" in migration
    assert "grant update (safety_follow_up_at) on public.assessments to authenticated" in migration

def test_fresh_schema_contains_user_memory_contract_and_matches_migration():
    schema = read_sql("supabase/schema.sql")
    migration = read_sql("supabase/migrations/20261017_user_memories.sql")

    for contract in (
        "create table if not exists public.user_memories",
        "id uuid primary key default gen_random_uuid()",
        "user_id uuid not null references auth.users(id) on delete cascade",
        "content text not null check (char_length(content) between 2 and 240)",
        "created_at timestamptz not null default now()",
        "user_memories_owner_created_idx",
        'create policy "user_memories_select_own"',
        'create policy "user_memories_insert_own"',
        'create policy "user_memories_delete_own"',
        "grant select, insert, delete on public.user_memories to authenticated",
    ):
        assert contract in schema
        assert contract in migration


def test_memory_preference_defaults_off_in_fresh_schema_and_upgrade_migration():
    schema = read_sql("supabase/schema.sql")
    migration = read_sql("supabase/migrations/20261022_profile_memory_enabled.sql")
    assert "memory_enabled boolean not null default false" in schema
    assert "add column if not exists memory_enabled boolean not null default false" in schema
    assert "add column if not exists memory_enabled boolean not null default false" in migration

def test_saved_memory_edit_permission_is_owner_scoped_and_column_limited():
    schema = read_sql("supabase/schema.sql")
    migration = read_sql("supabase/migrations/20261023_user_memory_edit.sql")

    for source in (schema, migration):
        normalized = " ".join(source.split())
        assert 'create policy "user_memories_update_own"' in normalized
        assert "for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())" in normalized
        assert "grant update (content) on public.user_memories to authenticated" in normalized

