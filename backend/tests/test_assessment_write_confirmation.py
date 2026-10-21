"""Regression tests for assessment writes whose PostgREST response is ambiguous."""
from __future__ import annotations

import asyncio
from uuid import UUID

import pytest
from fastapi import HTTPException

import routers.assessment as assessment_module
from db.supabase import SupabaseError
from services.assessment_service import score_phq9

USER = {"id": "11111111-1111-4111-8111-111111111111", "access_token": "test-token"}
SUBMISSION_ID = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
ANSWERS = [1, 0, 0, 0, 0, 0, 0, 0, 0]
VERSION = "phq9-standard-v1"
DISCLAIMER = "Screening result only; not a diagnosis."


def _stored_row(row: dict) -> dict:
    return {**row, "id": "assessment-confirmed-001", "completed_at": "2026-10-22T00:00:00Z"}


def _persist(**overrides):
    args = {
        "current_user": USER,
        "instrument": "PHQ-9",
        "responses": ANSWERS,
        "max_score": 27,
        "submission_id": SUBMISSION_ID,
        "scorer": score_phq9,
        "scoring_version": VERSION,
        "disclaimer": DISCLAIMER,
    }
    args.update(overrides)
    return asyncio.run(assessment_module._persist_assessment(**args))


def test_empty_insert_receipt_reads_back_and_verifies_same_attempt(monkeypatch):
    state: dict[str, dict | None] = {"row": None}
    inserts = []

    async def fake_select(table, token, params, **kwargs):
        assert table == "assessments"
        assert params["user_id"] == f"eq.{USER['id']}"
        return ([state["row"]] if state["row"] else [], None)

    async def fake_insert(table, token, row, **kwargs):
        inserts.append(row)
        # Simulate a successful database commit with a lost/empty representation.
        state["row"] = _stored_row(row)
        return []

    monkeypatch.setattr(assessment_module, "select_rows", fake_select)
    monkeypatch.setattr(assessment_module, "insert_row", fake_insert)

    result = _persist()

    assert result["idempotent_replay"] is True
    assert result["assessment_id"] == "assessment-confirmed-001"
    assert result["score"] == 1
    assert len(inserts) == 1


def test_empty_insert_receipt_without_retry_key_does_not_claim_success(monkeypatch):
    async def fake_insert(table, token, row, **kwargs):
        return []

    monkeypatch.setattr(assessment_module, "insert_row", fake_insert)

    with pytest.raises(HTTPException) as error:
        _persist(submission_id=None)

    assert error.value.status_code == 503
    assert "could not confirm" in error.value.detail.lower()
    assert "check assessment history" in error.value.detail.lower()


def test_unreadable_readback_after_empty_receipt_fails_closed(monkeypatch):
    lookups = {"count": 0}

    async def fake_select(table, token, params, **kwargs):
        lookups["count"] += 1
        if lookups["count"] == 1:
            return ([], None)  # Initial idempotency lookup: no record yet.
        raise SupabaseError(503, "database unavailable")  # Read-after-write cannot be verified.

    async def fake_insert(table, token, row, **kwargs):
        return []

    monkeypatch.setattr(assessment_module, "select_rows", fake_select)
    monkeypatch.setattr(assessment_module, "insert_row", fake_insert)

    with pytest.raises(HTTPException) as error:
        _persist()

    assert error.value.status_code == 503
    assert "safely verified or saved" in error.value.detail.lower()


def test_malformed_representation_is_not_treated_as_a_receipt(monkeypatch):
    async def fake_insert(table, token, row, **kwargs):
        return [{"id": None}]

    monkeypatch.setattr(assessment_module, "insert_row", fake_insert)
    async def fake_select(table, token, params, **kwargs):
        return ([], None)
    monkeypatch.setattr(assessment_module, "select_rows", fake_select)

    with pytest.raises(HTTPException) as error:
        _persist()

    assert error.value.status_code == 503
    assert "could not confirm" in error.value.detail.lower()
