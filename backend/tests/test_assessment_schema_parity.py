"""A fresh schema must enforce the same assessment integrity contract as migrations."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_fresh_schema_contains_answer_and_score_integrity_function_and_constraints():
    schema = (ROOT / "supabase" / "schema.sql").read_text(encoding="utf-8").lower()
    assert "create or replace function public.assessment_answers_match_score" in schema
    assert "assessments_score_within_max_check" in schema
    assert "assessments_instrument_max_check" in schema
    assert "assessments_answers_match_score_check" in schema
    assert "assessments_result_snapshot_object_check" in schema
    assert "jsonb_typeof(result_snapshot) = 'object'" in schema
    assert "jsonb_array_length(p_answers) <> expected_count" in schema
    assert "computed_score = p_score" in schema


def test_fresh_schema_contract_is_covered_by_existing_migrations():
    schema = (ROOT / "supabase" / "schema.sql").read_text(encoding="utf-8").lower()
    integrity = (ROOT / "supabase" / "migrations" / "20261017_assessment_integrity.sql").read_text(encoding="utf-8").lower()
    idempotency = (ROOT / "supabase" / "migrations" / "20261021_assessment_submission_idempotency.sql").read_text(encoding="utf-8").lower()

    for term in (
        "assessment_answers_match_score",
        "assessments_score_within_max_check",
        "assessments_instrument_max_check",
        "assessments_answers_match_score_check",
    ):
        assert term in schema
        assert term in integrity

    assert "assessments_result_snapshot_object_check" in schema
    assert "assessments_result_snapshot_object_check" in idempotency
