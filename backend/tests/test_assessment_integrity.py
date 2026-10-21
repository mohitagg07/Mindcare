"""P0 assessment integrity tests; no live Supabase or Groq credentials are needed."""
from __future__ import annotations

import os
import uuid

os.environ.setdefault("SUPABASE_URL", "")
os.environ.setdefault("SUPABASE_ANON_KEY", "")
os.environ.setdefault("GROQ_API_KEY", "")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")

import pytest
from fastapi.testclient import TestClient
from fastapi import HTTPException

from main import app
from auth.dependencies import get_current_user
from db.supabase import SupabaseError
import routers.assessment as assessment_module

USER_ID = "11111111-1111-4111-8111-111111111111"
TOKEN = "assessment-integrity-test-token"
TEST_USER = {"id": USER_ID, "access_token": TOKEN, "username": "test_user", "email": "test@example.com"}


async def fake_user():
    return TEST_USER


@pytest.fixture
def client():
    original = app.dependency_overrides.copy()
    app.dependency_overrides[get_current_user] = fake_user
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
    app.dependency_overrides.update(original)


def test_phq9_request_rejects_non_integer_and_boolean_answers(client):
    assert client.post("/api/assessment/phq9", json={"responses": ["1"] * 9}).status_code == 422
    assert client.post("/api/assessment/phq9", json={"responses": [True] + [0] * 8}).status_code == 422
    assert client.post("/api/assessment/phq9", json={"responses": [0] * 8}).status_code == 422


def test_submission_replay_returns_saved_snapshot_and_does_not_insert_twice(client, monkeypatch):
    sid = str(uuid.uuid4())
    store = {}
    inserted = []

    async def fake_select(table, token, params, **kwargs):
        assert table == "assessments"
        assert params["user_id"] == f"eq.{USER_ID}"
        assert params["instrument"] == "eq.PHQ-9"
        assert params["submission_id"] == f"eq.{sid}"
        record = store.get((USER_ID, "PHQ-9", sid))
        return ([record] if record else [], None)

    async def fake_insert(table, token, row, **kwargs):
        inserted.append(row.copy())
        record = {
            **row,
            "id": "assessment-001",
            "completed_at": "2026-10-21T00:00:00Z",
        }
        if row.get("submission_id"):
            store[(row["user_id"], row["instrument"], row["submission_id"])] = record
        return [record]

    monkeypatch.setattr(assessment_module, "select_rows", fake_select)
    monkeypatch.setattr(assessment_module, "insert_row", fake_insert)
    payload = {"submission_id": sid, "responses": [1, 0, 0, 0, 0, 0, 0, 0, 0]}

    first = client.post("/api/assessment/phq9", json=payload)
    replay = client.post("/api/assessment/phq9", json=payload)

    assert first.status_code == 200, first.text
    assert replay.status_code == 200, replay.text
    assert first.json()["idempotent_replay"] is False
    assert replay.json()["idempotent_replay"] is True
    assert replay.json()["assessment_id"] == "assessment-001"
    assert replay.json()["score"] == first.json()["score"]
    assert len(inserted) == 1
    assert inserted[0]["result_snapshot"]["score"] == first.json()["score"]
    assert inserted[0]["scoring_version"] == "phq9-standard-v1"


def test_reusing_submission_id_with_changed_answers_returns_conflict(client, monkeypatch):
    sid = str(uuid.uuid4())
    saved_answers = [1, 0, 0, 0, 0, 0, 0, 0, 0]
    existing = {
        "id": "assessment-001", "submission_id": sid, "instrument": "PHQ-9",
        "answers": saved_answers, "score": 1, "max_score": 27,
        "scoring_version": "phq9-standard-v1",
        "result_snapshot": {"score": 1, "category": "Minimal", "is_diagnosis": False},
    }
    insert_calls = []

    async def fake_select(*args, **kwargs):
        return ([existing], None)

    async def fake_insert(*args, **kwargs):
        insert_calls.append(args)
        return []

    monkeypatch.setattr(assessment_module, "select_rows", fake_select)
    monkeypatch.setattr(assessment_module, "insert_row", fake_insert)
    response = client.post("/api/assessment/phq9", json={
        "submission_id": sid, "responses": [2, 0, 0, 0, 0, 0, 0, 0, 0],
    })
    assert response.status_code == 409
    assert "different" in response.json()["detail"]
    assert insert_calls == []


def test_idempotency_lookup_failure_fails_closed_without_insert(client, monkeypatch):
    sid = str(uuid.uuid4())
    insert_calls = []

    async def fake_select(*args, **kwargs):
        raise SupabaseError(503, "database unavailable")

    async def fake_insert(*args, **kwargs):
        insert_calls.append(args)
        return []

    monkeypatch.setattr(assessment_module, "select_rows", fake_select)
    monkeypatch.setattr(assessment_module, "insert_row", fake_insert)
    response = client.post("/api/assessment/phq9", json={"submission_id": sid, "responses": [0] * 9})
    assert response.status_code == 503
    assert insert_calls == []


def test_database_unique_conflict_reads_winning_submission(client, monkeypatch):
    sid = str(uuid.uuid4())
    answers = [0, 0, 0, 0, 0, 0, 0, 0, 1]
    state = {"record": None, "lookups": 0, "inserts": 0}

    async def fake_select(table, token, params, **kwargs):
        state["lookups"] += 1
        return ([state["record"]] if state["record"] else [], None)

    async def fake_insert(table, token, row, **kwargs):
        state["inserts"] += 1
        state["record"] = {
            **row, "id": "winner-id", "completed_at": "2026-10-21T00:00:00Z",
        }
        raise SupabaseError(409, "unique constraint violation")

    monkeypatch.setattr(assessment_module, "select_rows", fake_select)
    monkeypatch.setattr(assessment_module, "insert_row", fake_insert)
    response = client.post("/api/assessment/phq9", json={"submission_id": sid, "responses": answers})
    assert response.status_code == 200, response.text
    assert response.json()["idempotent_replay"] is True
    assert response.json()["assessment_id"] == "winner-id"
    assert state["lookups"] == 2
    assert state["inserts"] == 1
    assert response.json().get("requires_safety_follow_up", response.json().get("crisis_flag")) is True


def test_legacy_client_without_submission_id_still_works_but_is_marked_unprotected(client, monkeypatch):
    calls = []

    async def fake_insert(table, token, row, **kwargs):
        calls.append(row)
        return [{"id": "legacy-assessment"}]

    monkeypatch.setattr(assessment_module, "insert_row", fake_insert)
    response = client.post("/api/assessment/phq9", json={"responses": [0] * 9})
    assert response.status_code == 200, response.text
    assert response.json()["idempotency_status"] == "legacy_no_key"
    assert response.json()["submission_id"] is None
    assert len(calls) == 1
    assert "submission_id" not in calls[0]


def test_history_does_not_expose_raw_answers_or_result_snapshot(client, monkeypatch):
    async def fake_select(table, token, params, **kwargs):
        assert table == "assessments"
        assert params["user_id"] == f"eq.{USER_ID}"
        return ([{
            "id": "assessment-id", "instrument": "PHQ-9", "score": 5, "max_score": 27,
            "completed_at": "2026-10-21T00:00:00Z", "answers": [1] * 9,
            "result_snapshot": {"sensitive": "must-not-leak"}, "user_id": "not-for-client",
        }], None)

    monkeypatch.setattr(assessment_module, "select_rows", fake_select)
    response = client.get("/api/assessment/history")
    assert response.status_code == 200
    item = response.json()["history"][0]
    assert set(item) == {"id", "instrument", "score", "max_score", "completed_at"}
    assert "answers" not in item and "result_snapshot" not in item and "user_id" not in item


