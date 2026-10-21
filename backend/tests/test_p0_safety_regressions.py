"""P0 safety/data-integrity regressions for the latest MindCare backend."""
from __future__ import annotations

import asyncio
import json

import pytest
from fastapi import HTTPException

from db.supabase import SupabaseError
import routers.chat as chat_router
from services.assessment_service import score_phq9
from services.emotion_service import _parse_response
from services.fusion_service import compute_risk_score, get_recommendations

TEST_USER_ID = "11111111-1111-4111-8111-111111111111"


def _positive_assessment(assessment_id: str, answer: int = 1) -> dict:
    return {
        "id": assessment_id,
        "answers": [0, 0, 0, 0, 0, 0, 0, 0, answer],
        "safety_follow_up_at": None,
        "completed_at": "2026-10-19T00:00:00Z",
    }


def test_pending_followup_searches_unpresented_positive_screens_not_only_latest(monkeypatch):
    calls = []

    async def fake_select(table, token, params, **kwargs):
        calls.append((table, params))
        assert table == "assessments"
        # This is the row that the JSON-path + null-timestamp filters must return:
        # a prior positive result remains pending even if a later screen is negative.
        return ([_positive_assessment("older-positive-assessment")], None)

    monkeypatch.setattr(chat_router, "select_rows", fake_select)
    found = asyncio.run(chat_router._pending_phq9_safety_follow_up(TEST_USER_ID, "test-token", fail_closed=True))

    assert found == "older-positive-assessment"
    params = calls[0][1]
    assert params["instrument"] == "eq.PHQ-9"
    assert params["safety_follow_up_at"] == "is.null"
    assert params["answers->>8"] == "gte.1"
    assert params["order"] == "completed_at.desc"


def test_no_pending_positive_followup_returns_none(monkeypatch):
    async def fake_select(table, token, params, **kwargs):
        assert params["answers->>8"] == "gte.1"
        assert params["safety_follow_up_at"] == "is.null"
        return ([], None)

    monkeypatch.setattr(chat_router, "select_rows", fake_select)
    assert asyncio.run(chat_router._pending_phq9_safety_follow_up(TEST_USER_ID, "test-token", fail_closed=True)) is None


def test_pending_followup_fails_closed_on_corrupt_saved_answers(monkeypatch):
    corrupt = _positive_assessment("corrupt-assessment")
    corrupt["answers"] = [0] * 8 + ["1"]

    async def fake_select(table, token, params, **kwargs):
        return ([corrupt], None)

    monkeypatch.setattr(chat_router, "select_rows", fake_select)
    with pytest.raises(HTTPException) as error:
        asyncio.run(chat_router._pending_phq9_safety_follow_up(TEST_USER_ID, "test-token", fail_closed=True))
    assert error.value.status_code == 503
    assert "couldn't verify" in error.value.detail.lower()


def test_pending_followup_database_failure_fails_closed(monkeypatch):
    async def fake_select(*args, **kwargs):
        raise SupabaseError(503, "database temporarily unavailable")

    monkeypatch.setattr(chat_router, "select_rows", fake_select)
    with pytest.raises(HTTPException) as error:
        asyncio.run(chat_router._pending_phq9_safety_follow_up(TEST_USER_ID, "test-token", fail_closed=True))
    assert error.value.status_code == 503


def test_recommendations_ignore_retired_risk_level_and_facial_labels():
    high_sad = get_recommendations("HIGH", "sad")
    moderate_fear = get_recommendations("MODERATE", "fear")
    baseline = get_recommendations()

    assert high_sad == moderate_fear == baseline
    assert high_sad["resources"] == []
    assert high_sad["personalized_by_risk"] is False
    assert "clinical risk level" in high_sad["message"].lower()


def test_no_composite_score_is_created_from_any_signal_combination():
    result = compute_risk_score(phq9_score=27, gad7_score=21, emotion="sad", text="I feel awful")
    assert result["risk_score"] is None
    assert result["risk_level"] == "UNASSESSED"
    assert result["is_clinical_assessment"] is False
    assert result["status"] == "disabled_pending_validation"


def test_positive_phq9_item9_triggers_followup_independent_of_total_score():
    low_total_positive_item9 = score_phq9([0, 0, 0, 0, 0, 0, 0, 0, 1])
    high_total_negative_item9 = score_phq9([3, 3, 3, 3, 3, 3, 3, 3, 0])

    assert low_total_positive_item9["score"] == 1
    assert low_total_positive_item9["requires_safety_follow_up"] is True
    assert low_total_positive_item9["is_diagnosis"] is False
    assert high_total_negative_item9["score"] == 24
    assert high_total_negative_item9["requires_safety_follow_up"] is False


def test_missing_face_count_is_not_promoted_to_a_detected_face():
    parsed = _parse_response(
        json.dumps({
            "emotion": "sad",
            "confidence": 0.95,
            "all_scores": {"sad": 0.9, "neutral": 0.1},
            # faces_detected intentionally omitted by a malformed provider response.
        }),
        "qwen/test-model",
    )
    assert parsed["faces_detected"] == 0
    assert parsed["emotion"] == "neutral"
    assert parsed["confidence"] == 0.0
    assert parsed["safety_use"] == "not_used_for_triage"
