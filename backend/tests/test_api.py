"""Offline contract tests; no live Supabase or Groq credentials needed."""
import os
os.environ.setdefault("SUPABASE_URL", "")
os.environ.setdefault("SUPABASE_ANON_KEY", "")
os.environ.setdefault("GROQ_API_KEY", "")
os.environ.setdefault("ALLOWED_ORIGINS", "http://localhost:5173")

from fastapi.testclient import TestClient
from main import app
from auth.dependencies import get_current_user
from db.supabase import SupabaseError

client = TestClient(app)
TEST_USER = {"id": "11111111-1111-4111-8111-111111111111", "access_token": "test-token", "username": "test_user", "email": "test@example.com", "is_active": True}

async def _fake_user():
    return TEST_USER

async def _fake_insert(*args, **kwargs):
    return [{"id": "22222222-2222-4222-8222-222222222222"}]


import routers.assessment as assessment_router_module
client.app.dependency_overrides[get_current_user] = _fake_user
assessment_router_module.insert_row = _fake_insert


def test_root_liveness():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert response.json()["version"] == "4.5.1"


def test_health_is_degraded_when_supabase_not_configured():
    response = client.get("/api/health")
    assert response.status_code == 503
    body = response.json()
    assert body["database"] == "supabase_postgres"
    assert body["supabase_configured"] is False


def test_assessment_questions():
    response = client.get("/api/assessment/questions")
    assert response.status_code == 200
    assert len(response.json()["phq9"]) == 9
    assert len(response.json()["gad7"]) == 7


def test_phq9_scoring_and_disclaimer():
    response = client.post("/api/assessment/phq9", json={"responses": [3] * 9})
    assert response.status_code == 200
    body = response.json()
    assert body["score"] == 27
    assert body["crisis_flag"] is True
    assert body["is_diagnosis"] is False


def test_gad7_scoring():
    response = client.post("/api/assessment/gad7", json={"responses": [2] * 7})
    assert response.status_code == 200
    assert response.json()["score"] == 14
    assert response.json()["category"] == "Moderate"


def test_assessment_rejects_wrong_count_and_invalid_values():
    assert client.post("/api/assessment/phq9", json={"responses": [0] * 5}).status_code == 422
    assert client.post("/api/assessment/gad7", json={"responses": [4] * 7}).status_code == 422


def test_chat_requires_auth():
    app.dependency_overrides.pop(get_current_user, None)
    response = client.post("/api/chat", json={"message": "hello"})
    assert response.status_code == 401
    app.dependency_overrides[get_current_user] = _fake_user


def test_chat_bulk_insert_rows_have_identical_keys():
    from routers.chat import ChatRequest, build_message_rows
    request = ChatRequest(message="I have been stressed", emotion="sad", phq9_score=5, client_message_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    rows = build_message_rows(
        session_id="22222222-2222-4222-8222-222222222222",
        user_id=TEST_USER["id"], request=request, response="Thank you for sharing that.",
        risk_score=0.25, latency_ms=420, crisis_detected=False, rag_used=False,
    )
    assert len(rows) == 2
    assert set(rows[0]) == set(rows[1])
    assert rows[0]["risk_score"] is None and rows[0]["latency_ms"] is None
    assert rows[1]["emotion"] is None
    assert rows[0]["role"] == "user" and rows[1]["role"] == "assistant"


def test_chat_message_ids_are_idempotent_for_the_same_request():
    from routers.chat import ChatRequest, build_message_rows
    request = ChatRequest(message="I have been stressed", client_message_id="aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
    def rows_for():
        return build_message_rows(
            session_id="22222222-2222-4222-8222-222222222222", user_id=TEST_USER["id"],
            request=request, response="A supportive reply.", risk_score=0.2, latency_ms=10,
            crisis_detected=False, rag_used=False,
        )
    first, second = rows_for(), rows_for()
    assert [row["id"] for row in first] == [row["id"] for row in second]
    assert first[0]["id"] != first[1]["id"]


def test_chat_stream_emits_deltas_then_persisted_completion(monkeypatch):
    import routers.chat as chat_router_module
    import services.groq_service as groq_service

    async def no_saved_reply(*args):
        return None

    async def prepared(request, current_user, started):
        return {
            "session_id": str(request.session_id), "crisis_detected": False,
            "context": {}, "history": [], "profile_context": None,
        }

    async def fake_stream(*args, **kwargs):
        yield {"type": "delta", "text": "I hear you. "}
        yield {"type": "delta", "text": "That sounds difficult."}
        yield {"type": "meta", "response": "I hear you. That sounds difficult.", "tools_used": []}

    async def persisted(request, context, response, tools):
        return {"session_id": str(request.session_id), "response": response, "risk": {}, "recommendations": [], "crisis_detected": False, "rag_used": False, "trajectory": {}}

    monkeypatch.setattr(chat_router_module, "_get_saved_reply", no_saved_reply)
    monkeypatch.setattr(chat_router_module, "_prepare_chat", prepared)
    monkeypatch.setattr(chat_router_module, "_persist_chat_reply", persisted)
    monkeypatch.setattr(groq_service, "stream_reply", fake_stream)
    response = client.post("/api/chat/stream", json={
        "session_id": "22222222-2222-4222-8222-222222222222",
        "client_message_id": "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "message": "I feel overwhelmed",
    })
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert response.text.index('"text":"I hear you. "') < response.text.index('"type":"done"')
    assert '"text":"That sounds difficult."' in response.text


def test_phq9_duplicate_submission_returns_saved_result(monkeypatch):
    import routers.assessment as assessment_router_module
    submission_id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"

    async def conflict(*args, **kwargs):
        raise SupabaseError(409, "duplicate key")

    async def existing(table, token, params, **kwargs):
        assert table == "assessments"
        assert params["id"] == f"eq.{submission_id}"
        assert params["user_id"] == f"eq.{TEST_USER['id']}"
        return ([{"instrument": "PHQ-9", "answers": [1] * 9}], None)

    monkeypatch.setattr(assessment_router_module, "insert_row", conflict)
    monkeypatch.setattr(assessment_router_module, "select_rows", existing)
    response = client.post("/api/assessment/phq9", json={"submission_id": submission_id, "responses": [3] * 8 + [0]})
    assert response.status_code == 200
    assert response.json()["score"] == 9
    assert response.json()["crisis_flag"] is True


def test_phq9_does_not_claim_saved_when_database_returns_no_row(monkeypatch):
    import routers.assessment as assessment_router_module

    async def no_rows(*args, **kwargs):
        return []

    monkeypatch.setattr(assessment_router_module, "insert_row", no_rows)
    response = client.post("/api/assessment/phq9", json={"responses": [0] * 9})
    assert response.status_code == 503
    assert response.json()["detail"] == "Assessment could not be saved. Please try again."


def test_risk_uses_available_signals_only():
    from services.fusion_service import compute_risk_score
    result = compute_risk_score(phq9_score=None, gad7_score=None, emotion=None, text="I feel okay today")
    assert result["available_signals"]["phq9"] is False
    assert result["available_signals"]["gad7"] is False
    assert result["available_signals"]["emotion_label"] is False
    assert result["is_clinical_assessment"] is False
    assert result["components"]["phq9_contribution"] is None


def test_supabase_client_has_no_mongo_fallback():
    from db import supabase
    assert hasattr(supabase, "select_rows")
    assert not hasattr(supabase, "get_db")


def test_emotion_service_rejects_non_image_payloads():
    import base64
    import pytest
    from services.emotion_service import _decode_image
    with pytest.raises(ValueError):
        _decode_image(base64.b64encode(b'not an image').decode())


def test_emotion_parser_normalizes_scores_and_marks_estimate_non_clinical():
    from services.emotion_service import _parse_response
    result = _parse_response('{"emotion":"happy","confidence":0.8,"faces_detected":1,"all_scores":{"happy":2,"sad":1}}', 'qwen/test-model')
    assert result['emotion'] == 'happy'
    assert abs(sum(result['all_scores'].values()) - 1.0) < 0.001
    assert result['model_available'] is True
    assert 'not a reliable measure' in result['note']


def test_trajectory_query_uses_schema_timestamp_column(monkeypatch):
    import asyncio
    from services import trajectory_service
    calls = []

    async def fake_select(table, token, params, **kwargs):
        calls.append((table, params))
        return ([{'state_ema': -0.2, 'created_at': '2026-10-12T00:00:00+00:00'}], None)

    async def fake_insert(table, token, row, **kwargs):
        return [{'id': 'test-row'}]

    monkeypatch.setattr(trajectory_service, 'select_rows', fake_select)
    monkeypatch.setattr(trajectory_service, 'insert_row', fake_insert)
    result = asyncio.run(trajectory_service.update_trajectory(TEST_USER['id'], 'test-token', 'I feel okay today', 0.2))
    assert calls[0][0] == 'trajectories'
    assert calls[0][1]['select'] == 'state_ema,delta,trigger,created_at,sentiment_score'
    assert calls[0][1]['order'] == 'created_at.desc'
    assert 'state_ema' in result

def test_assessment_history_returns_only_summary_fields(monkeypatch):
    async def fake_select(table, token, params, **kwargs):
        assert table == "assessments"
        assert params["user_id"] == f"eq.{TEST_USER['id']}"
        return ([{
            "id": "33333333-3333-4333-8333-333333333333",
            "instrument": "PHQ-9", "score": 7, "max_score": 27,
            "completed_at": "2026-10-12T12:00:00Z", "answers": [1] * 9,
            "user_id": "must-not-leak",
        }], None)

    monkeypatch.setattr(assessment_router_module, "select_rows", fake_select)
    response = client.get("/api/assessment/history")
    assert response.status_code == 200
    history = response.json()["history"]
    assert len(history) == 1
    assert history[0]["instrument"] == "PHQ-9"
    assert history[0]["score"] == 7
    assert "answers" not in history[0]
    assert "user_id" not in history[0]


def test_recent_conversations_include_the_saved_title(monkeypatch):
    import routers.metrics as metrics_router_module
    session_id = "22222222-2222-4222-8222-222222222222"

    async def fake_select(table, token, params, **kwargs):
        if table == "conversations":
            assert "title" in params["select"]
            return ([{
                "id": session_id,
                "title": "I've been feeling anxious lately",
                "created_at": "2026-10-12T12:00:00Z",
            }], None)
        assert table == "messages"
        return ([{"conversation_id": session_id}, {"conversation_id": session_id}], None)

    monkeypatch.setattr(metrics_router_module, "select_rows", fake_select)
    response = client.get("/api/metrics/my-sessions")
    assert response.status_code == 200
    assert response.json()[0]["title"] == "I've been feeling anxious lately"
    assert response.json()[0]["message_count"] == 2

