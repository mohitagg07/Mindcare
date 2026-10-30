"""Regression tests for the safety-aware server-sent-events chat route."""
from __future__ import annotations

import asyncio
import json
import uuid

from routers import chat as chat_router
from routers.chat import ChatRequest

USER = {
    "id": "11111111-1111-4111-8111-111111111111",
    "access_token": "stream-test-token",
}
SESSION_ID = "22222222-2222-4222-8222-222222222222"
TURN_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"


async def _collect_response(request):
    response = await chat_router.chat_stream_endpoint(request, current_user=USER)
    chunks = []
    async for chunk in response.body_iterator:
        chunks.append(chunk.decode("utf-8") if isinstance(chunk, bytes) else str(chunk))
    return response, "".join(chunks)


def _events(wire):
    events = []
    for block in wire.replace("\r\n", "\n").split("\n\n"):
        payload_lines = [
            line[5:].lstrip()
            for line in block.split("\n")
            if line.startswith("data:")
        ]
        if payload_lines:
            events.append(json.loads("\n".join(payload_lines)))
    return events


def test_chat_stream_emits_deltas_and_confirms_only_after_persistence(monkeypatch):
    persisted = []
    import services.groq_service as groq_service

    async def fake_load_saved_turn(*args, **kwargs):
        return None

    async def fake_pending_followup(*args, **kwargs):
        return None

    async def fake_select(table, token, params, **kwargs):
        if table == "conversations":
            return ([{"id": SESSION_ID}], None)
        if table == "profiles":
            return ([{
                "display_name": "Test User",
                "support_style": "gentle",
                "focus_areas": [],
                "memory_enabled": False,
            }], None)
        if table == "messages":
            return ([], None)
        raise AssertionError(f"Unexpected table lookup: {table}")

    async def fake_insert(table, token, rows, **kwargs):
        assert table == "messages"
        persisted.extend(rows)
        return rows

    async def fake_update(table, token, filters, body, **kwargs):
        assert table == "conversations"
        return [{"id": SESSION_ID, **body}]

    async def fake_stream_reply(*args, **kwargs):
        yield {"type": "delta", "text": "I hear you. "}
        yield {"type": "delta", "text": "Let's take one step at a time."}
        yield {
            "type": "meta",
            "tools_used": [],
            "response": "I hear you. Let's take one step at a time.",
        }

    monkeypatch.setattr(chat_router, "load_saved_turn", fake_load_saved_turn)
    monkeypatch.setattr(chat_router, "_pending_phq9_safety_follow_up", fake_pending_followup)
    monkeypatch.setattr(chat_router, "select_rows", fake_select)
    monkeypatch.setattr(chat_router, "insert_row", fake_insert)
    monkeypatch.setattr(chat_router, "update_rows", fake_update)
    monkeypatch.setattr(groq_service, "stream_reply", fake_stream_reply)

    request = ChatRequest(
        session_id=uuid.UUID(SESSION_ID),
        client_turn_id=uuid.UUID(TURN_ID),
        message="I feel overwhelmed",
    )
    response, wire = asyncio.run(_collect_response(request))
    events = _events(wire)

    assert response.media_type == "text/event-stream"
    assert response.headers["cache-control"] == "no-cache"
    assert response.headers["x-accel-buffering"] == "no"
    assert [event["text"] for event in events if event["type"] == "delta"] == [
        "I hear you. ",
        "Let's take one step at a time.",
    ]
    completed = [event["data"] for event in events if event["type"] == "done"]
    assert len(completed) == 1
    assert completed[0]["response"] == "I hear you. Let's take one step at a time."
    assert completed[0]["persistence_status"] == "saved"
    assert completed[0]["idempotency_status"] == "saved"
    assert [row["role"] for row in persisted] == ["user", "assistant"]
    assert all(row["client_turn_id"] == TURN_ID for row in persisted)


def test_chat_stream_routes_safety_message_without_calling_the_model(monkeypatch):
    import services.groq_service as groq_service

    async def fake_load_saved_turn(*args, **kwargs):
        return None

    async def fake_pending_followup(*args, **kwargs):
        return None

    async def fake_persist_safety(*args, **kwargs):
        return SESSION_ID, True

    async def unexpected_stream(*args, **kwargs):
        raise AssertionError("Safety response must not call the language model")
        yield  # Make this an async generator for the route contract.

    monkeypatch.setattr(chat_router, "load_saved_turn", fake_load_saved_turn)
    monkeypatch.setattr(chat_router, "_pending_phq9_safety_follow_up", fake_pending_followup)
    monkeypatch.setattr(chat_router, "_best_effort_persist_safety_turn", fake_persist_safety)
    monkeypatch.setattr(groq_service, "stream_reply", unexpected_stream)

    request = ChatRequest(
        session_id=uuid.UUID(SESSION_ID),
        client_turn_id=uuid.UUID(TURN_ID),
        message="I might hurt myself tonight",
    )
    response, wire = asyncio.run(_collect_response(request))
    events = _events(wire)
    completed = [event["data"] for event in events if event["type"] == "done"]

    assert response.media_type == "text/event-stream"
    assert len(completed) == 1
    assert completed[0]["safety_follow_up_required"] is True
    assert completed[0]["persistence_status"] == "saved"
    assert events[-1]["type"] == "done"


def test_chat_stream_replays_saved_turn_without_regenerating(monkeypatch):
    import services.groq_service as groq_service

    saved = {
        "conversation_id": SESSION_ID,
        "assistant_message": {
            "content": "This is the saved answer.",
            "metadata": {
                "rag_used": False,
                "safety_follow_up_required": False,
            },
        },
    }

    async def fake_load_saved_turn(*args, **kwargs):
        return saved

    async def unexpected_stream(*args, **kwargs):
        raise AssertionError("A saved idempotent turn must not be regenerated")
        yield

    monkeypatch.setattr(chat_router, "load_saved_turn", fake_load_saved_turn)
    monkeypatch.setattr(groq_service, "stream_reply", unexpected_stream)

    request = ChatRequest(
        session_id=uuid.UUID(SESSION_ID),
        client_turn_id=uuid.UUID(TURN_ID),
        message="I feel overwhelmed",
    )
    response, wire = asyncio.run(_collect_response(request))
    events = _events(wire)
    completed = [event["data"] for event in events if event["type"] == "done"]

    assert response.media_type == "text/event-stream"
    assert [event["text"] for event in events if event["type"] == "delta"] == [
        "This is the saved answer."
    ]
    assert len(completed) == 1
    assert completed[0]["response"] == "This is the saved answer."
    assert completed[0]["idempotency_status"] == "replayed"
    assert completed[0]["persistence_status"] == "saved"
