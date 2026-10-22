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
    request = ChatRequest(message="I have been stressed", emotion="sad", phq9_score=5, gad7_score=4)
    rows = build_message_rows(
        session_id="22222222-2222-4222-8222-222222222222",
        user_id=TEST_USER["id"], request=request, response="Thank you for sharing that.",
        risk_score=None, latency_ms=420, safety_follow_up_required=False, rag_used=False,
    )
    assert len(rows) == 2
    assert set(rows[0]) == set(rows[1])
    assert rows[0]["risk_score"] is None and rows[0]["latency_ms"] is None
    assert rows[1]["emotion"] is None
    assert rows[0]["role"] == "user" and rows[1]["role"] == "assistant"


def test_composite_risk_score_is_disabled_pending_validation():
    from services.fusion_service import compute_risk_score
    result = compute_risk_score(phq9_score=27, gad7_score=21, emotion="sad", text="I feel awful")
    assert result["risk_score"] is None
    assert result["risk_level"] == "UNASSESSED"
    assert result["is_clinical_assessment"] is False
    assert result["status"] == "disabled_pending_validation"
    assert result["components"]["phq9_contribution"] is None
    assert result["components"]["facial_contribution"] is None


def test_facial_expression_alone_never_creates_risk_level():
    from services.fusion_service import compute_risk_score
    sad = compute_risk_score(emotion="sad")
    happy = compute_risk_score(emotion="happy")
    assert sad["risk_score"] is None and happy["risk_score"] is None
    assert sad["risk_level"] == happy["risk_level"] == "UNASSESSED"


def test_assessment_rejects_coerced_or_boolean_answers():
    # Answers must be actual integer option values, not strings, floats or booleans.
    assert client.post("/api/assessment/phq9", json={"responses": ["1"] * 9}).status_code == 422
    assert client.post("/api/assessment/phq9", json={"responses": [True] + [0] * 8}).status_code == 422
    assert client.post("/api/assessment/gad7", json={"responses": [1.5] + [0] * 6}).status_code == 422


def test_crisis_cues_are_direct_and_do_not_treat_general_hopelessness_as_imminent_cue():
    from services.fusion_service import check_crisis
    assert check_crisis("I might hurt myself tonight")[0] is True
    assert check_crisis("I wish I were dead")[0] is True
    assert check_crisis("Mujhe jeene ka mann nahi")[0] is True
    assert check_crisis("I don't want to die. I am not suicidal.")[0] is False
    assert check_crisis("I have no thoughts of suicide")[0] is False
    assert check_crisis("I feel worthless and there is no point replacing my phone")[0] is False


def test_positive_phq9_item9_is_marked_as_follow_up_not_imminent_risk():
    from services.assessment_service import score_phq9
    result = score_phq9([0, 0, 0, 0, 0, 0, 0, 0, 1])
    assert result["crisis_flag"] is True
    assert result["requires_safety_follow_up"] is True
    assert "immediate danger" in result["safety_follow_up_question"]
    assert result["is_diagnosis"] is False


def test_chat_does_not_trust_legacy_client_phq9_flag(monkeypatch):
    import routers.chat as chat_router_module
    import services.groq_service as groq_service

    async def fake_select(table, token, params, **kwargs):
        if table == "assessments":
            return ([], None)
        if table == "conversations":
            return ([], None)
        if table == "profiles":
            return ([{"display_name": "Sam", "support_style": "gentle", "focus_areas": []}], None)
        if table == "messages":
            return ([], None)
        return ([], None)

    async def fake_insert(table, token, rows, **kwargs):
        return [{"id": "saved"}]

    async def fake_update(table, token, filters, body, **kwargs):
        return [{"id": "updated"}]

    async def fake_generate_reply(message, **kwargs):
        return {"response": "I'm here. What's been on your mind?", "tools_used": []}

    monkeypatch.setattr(chat_router_module, "select_rows", fake_select)
    monkeypatch.setattr(chat_router_module, "insert_row", fake_insert)
    monkeypatch.setattr(chat_router_module, "update_rows", fake_update)
    monkeypatch.setattr(groq_service, "generate_reply", fake_generate_reply)

    # A stale/untrusted frontend boolean must not repeatedly force a safety response.
    response = client.post("/api/chat", json={
        "message": "Can we talk about my week?",
        "phq9_crisis_flag": True,
        "phq9_score": 27,
    })
    assert response.status_code == 200
    body = response.json()
    assert body["safety_follow_up_required"] is False
    assert body["crisis_detected"] is False
    assert body["response"] == "I'm here. What's been on your mind?"

def test_pending_phq9_item9_followup_comes_from_saved_assessment(monkeypatch):
    import asyncio
    import routers.chat as chat_router_module
    async def fake_select(table, token, params, **kwargs):
        assert table == "assessments"
        assert params["user_id"] == f"eq.{TEST_USER['id']}"
        assert params["instrument"] == "eq.PHQ-9"
        return ([{
            "id": "44444444-4444-4444-8444-444444444444",
            "answers": [0, 0, 0, 0, 0, 0, 0, 0, 1],
            "safety_follow_up_at": None,
            "completed_at": "2026-10-19T00:00:00Z",
        }], None)
    monkeypatch.setattr(chat_router_module, "select_rows", fake_select)
    result = asyncio.run(chat_router_module._pending_phq9_safety_follow_up(TEST_USER["id"], "test-token"))
    assert result == "44444444-4444-4444-8444-444444444444"


def test_chat_uses_saved_positive_phq9_item9_after_client_state_is_lost(monkeypatch):
    import routers.chat as chat_router_module
    calls = []
    async def fake_select(table, token, params, **kwargs):
        calls.append(("select", table, params))
        if table == "assessments":
            return ([{
                "id": "55555555-5555-4555-8555-555555555555",
                "answers": [0, 0, 0, 0, 0, 0, 0, 0, 1],
                "safety_follow_up_at": None,
                "completed_at": "2026-10-19T00:00:00Z",
            }], None)
        return ([], None)
    async def fake_insert(table, token, rows, **kwargs):
        calls.append(("insert", table, rows))
        return [{"id": "inserted"}]
    async def fake_update(table, token, filters, body, **kwargs):
        calls.append(("update", table, filters, body))
        return [{"id": filters.get("id", "updated")}]
    monkeypatch.setattr(chat_router_module, "select_rows", fake_select)
    monkeypatch.setattr(chat_router_module, "insert_row", fake_insert)
    monkeypatch.setattr(chat_router_module, "update_rows", fake_update)

    # Neutral message and no client crisis flag: the server-side saved PHQ-9 must still prompt.
    response = client.post("/api/chat", json={"message": "Can we talk about my week?"})
    assert response.status_code == 200
    body = response.json()
    assert body["safety_follow_up_required"] is True
    assert body["safety_signal_source"] == "saved_positive_phq9_item9"
    assert body["persistence_status"] == "saved"
    assert any(call[0] == "update" and call[1] == "assessments" for call in calls)


def test_followup_prompt_timestamp_is_owner_scoped(monkeypatch):
    import asyncio
    import routers.chat as chat_router_module
    calls = []
    async def fake_update(table, token, filters, body, **kwargs):
        calls.append((table, filters, body))
        return [{"id": "assessment-id"}]
    monkeypatch.setattr(chat_router_module, "update_rows", fake_update)
    asyncio.run(chat_router_module._mark_phq9_safety_follow_up_presented(TEST_USER["id"], "test-token", "assessment-id"))
    assert calls[0][0] == "assessments"
    assert calls[0][1] == {"id": "eq.assessment-id", "user_id": f"eq.{TEST_USER['id']}"}
    assert "safety_follow_up_at" in calls[0][2]



def test_direct_safety_cue_also_marks_pending_phq9_prompt_presented(monkeypatch):
    import routers.chat as chat_router_module
    calls = []

    async def fake_select(table, token, params, **kwargs):
        calls.append(("select", table, params))
        if table == "assessments":
            return ([{
                "id": "66666666-6666-4666-8666-666666666666",
                "answers": [0, 0, 0, 0, 0, 0, 0, 0, 1],
                "safety_follow_up_at": None,
                "completed_at": "2026-10-19T00:00:00Z",
            }], None)
        return ([], None)

    async def fake_insert(table, token, rows, **kwargs):
        calls.append(("insert", table, rows))
        return [{"id": "inserted"}]

    async def fake_update(table, token, filters, body, **kwargs):
        calls.append(("update", table, filters, body))
        return [{"id": filters.get("id", "updated")}]

    monkeypatch.setattr(chat_router_module, "select_rows", fake_select)
    monkeypatch.setattr(chat_router_module, "insert_row", fake_insert)
    monkeypatch.setattr(chat_router_module, "update_rows", fake_update)

    response = client.post("/api/chat", json={"message": "I might hurt myself tonight"})
    assert response.status_code == 200
    assert response.json()["crisis_detected"] is False
    assert response.json()["safety_follow_up_required"] is True
    assert any(call[0] == "update" and call[1] == "assessments" for call in calls)

def test_safety_response_survives_database_failure(monkeypatch):
    import routers.chat as chat_router_module
    def fail_select(*args, **kwargs):
        raise SupabaseError(503, "database unavailable")
    def fail_insert(*args, **kwargs):
        raise SupabaseError(503, "database unavailable")
    async def async_fail_select(*args, **kwargs):
        raise SupabaseError(503, "database unavailable")
    async def async_fail_insert(*args, **kwargs):
        raise SupabaseError(503, "database unavailable")
    monkeypatch.setattr(chat_router_module, "select_rows", async_fail_select)
    monkeypatch.setattr(chat_router_module, "insert_row", async_fail_insert)
    response = client.post("/api/chat", json={"message": "I might hurt myself tonight"})
    assert response.status_code == 200
    body = response.json()
    assert body["safety_follow_up_required"] is True
    assert body["crisis_detected"] is False
    assert body["safety_follow_up_required"] is True
    assert "immediate danger right now" in body["response"]
    assert body["persistence_status"] == "not_saved"
    assert body["persistence_warning"]


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


def test_emotion_parser_overrides_inconsistent_no_face_prediction():
    from services.emotion_service import _parse_response
    result = _parse_response(
        '{"emotion":"sad","confidence":0.95,"faces_detected":0,"all_scores":{"sad":0.9,"neutral":0.1}}',
        'qwen/test-model',
    )
    assert result["faces_detected"] == 0
    assert result["emotion"] == "neutral"
    assert result["confidence"] == 0.0
    assert result["all_scores"]["neutral"] == 1.0
    assert result["all_scores"]["sad"] == 0.0


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




def test_delete_chat_session_is_owner_scoped_and_uses_cascade(monkeypatch):
    import routers.chat as chat_router_module

    session_id = "44444444-4444-4444-8444-444444444444"
    calls = []

    async def fake_delete(table, token, params):
        calls.append((table, token, params))
        return [{"id": session_id, "user_id": TEST_USER["id"]}]

    monkeypatch.setattr(chat_router_module, "delete_rows", fake_delete)
    response = client.delete(f"/api/chat/session/{session_id}")

    assert response.status_code == 200
    assert response.json() == {"message": "Session deleted"}
    assert calls == [(
        "conversations",
        "test-token",
        {"id": f"eq.{session_id}", "user_id": f"eq.{TEST_USER['id']}"},
    )]


def test_delete_chat_session_returns_404_without_deleting_other_rows(monkeypatch):
    import routers.chat as chat_router_module

    session_id = "55555555-5555-4555-8555-555555555555"
    calls = []

    async def fake_delete(table, token, params):
        calls.append((table, params))
        return []

    monkeypatch.setattr(chat_router_module, "delete_rows", fake_delete)
    response = client.delete(f"/api/chat/session/{session_id}")

    assert response.status_code == 404
    assert calls == [(
        "conversations",
        {"id": f"eq.{session_id}", "user_id": f"eq.{TEST_USER['id']}"},
    )]
