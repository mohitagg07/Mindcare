"""P1 regression tests for retry-safe chat turn persistence."""
from __future__ import annotations

import asyncio
from uuid import UUID

import pytest
from fastapi import HTTPException

import services.chat_idempotency as idempotency
from db.supabase import SupabaseError

TURN_ID = UUID("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
USER_ID = "11111111-1111-4111-8111-111111111111"


def _rows(*, message: str = "I feel overwhelmed", turn_id: UUID = TURN_ID, roles=("user", "assistant")):
    common = {"conversation_id": "22222222-2222-4222-8222-222222222222", "client_turn_id": str(turn_id)}
    rows = []
    for role in roles:
        rows.append({
            **common,
            "role": role,
            "content": message if role == "user" else "That sounds like a lot to carry.",
            "created_at": "2026-10-22T10:00:00Z",
            "metadata": {"rag_used": False, "safety_follow_up_required": False} if role == "assistant" else {},
        })
    return rows


def test_valid_pair_can_be_replayed():
    result = idempotency.validate_saved_turn_rows(
        _rows(), client_turn_id=TURN_ID, expected_message="I feel overwhelmed"
    )
    assert result is not None
    assert result["conversation_id"] == "22222222-2222-4222-8222-222222222222"
    assert result["assistant_message"]["content"] == "That sounds like a lot to carry."
    assert result["assistant_message"]["metadata"]["rag_used"] is False


def test_no_rows_is_not_a_saved_turn():
    assert idempotency.validate_saved_turn_rows([], client_turn_id=TURN_ID, expected_message="hello") is None


def test_reusing_turn_id_for_different_text_is_conflict():
    with pytest.raises(HTTPException) as error:
        idempotency.validate_saved_turn_rows(
            _rows(), client_turn_id=TURN_ID, expected_message="a different message"
        )
    assert error.value.status_code == 409


@pytest.mark.parametrize("roles", [("user",), ("assistant",), ("user", "user"), ("assistant", "assistant")])
def test_partial_or_duplicate_turn_rows_fail_closed(roles):
    with pytest.raises(HTTPException) as error:
        idempotency.validate_saved_turn_rows(
            _rows(roles=roles), client_turn_id=TURN_ID, expected_message="I feel overwhelmed"
        )
    assert error.value.status_code == 503


def test_turn_rows_must_share_the_same_conversation():
    rows = _rows()
    rows[1]["conversation_id"] = "33333333-3333-4333-8333-333333333333"
    with pytest.raises(HTTPException) as error:
        idempotency.validate_saved_turn_rows(
            rows, client_turn_id=TURN_ID, expected_message="I feel overwhelmed"
        )
    assert error.value.status_code == 503


def test_turn_lookup_is_scoped_to_authenticated_user_and_turn_id(monkeypatch):
    calls = []

    async def fake_select(table, token, params):
        calls.append((table, token, params))
        return (_rows(), None)

    monkeypatch.setattr(idempotency, "select_rows", fake_select)
    result = asyncio.run(idempotency.load_saved_turn(
        USER_ID, "access-token", TURN_ID, expected_message="I feel overwhelmed"
    ))

    assert result is not None
    table, token, params = calls[0]
    assert table == "messages"
    assert token == "access-token"
    assert params["user_id"] == f"eq.{USER_ID}"
    assert params["client_turn_id"] == f"eq.{TURN_ID}"
    assert params["limit"] == "2"


def test_database_lookup_failure_fails_closed(monkeypatch):
    async def fail_select(*args, **kwargs):
        raise SupabaseError(503, "database unavailable")

    monkeypatch.setattr(idempotency, "select_rows", fail_select)
    with pytest.raises(HTTPException) as error:
        asyncio.run(idempotency.load_saved_turn(
            USER_ID, "access-token", TURN_ID, expected_message="I feel overwhelmed"
        ))
    assert error.value.status_code == 503
    assert "verify whether this message was already processed" in error.value.detail.lower()

def _install_chat_endpoint_harness(monkeypatch, *, coordinate_concurrent_lookups=False):
    """Exercise the real chat route against a deterministic in-memory PostgREST model."""
    import copy
    import uuid

    import routers.chat as chat_router
    import services.groq_service as groq_service
    from routers.chat import ChatRequest

    session_id = "22222222-2222-4222-8222-222222222222"
    user = {"id": USER_ID, "access_token": "api-access-token"}
    state = {
        "conversations": {},
        "messages": [],
        "message_insert_attempts": 0,
        "message_insert_successes": 0,
        "generate_calls": 0,
        "initial_lookups": 0,
    }
    initial_lookups_ready = asyncio.Event()
    both_generation_calls_ready = asyncio.Event()

    async def fake_load_saved_turn(user_id, token, client_turn_id, *, expected_message):
        assert user_id == USER_ID
        assert token == user["access_token"]
        rows = [
            copy.deepcopy(row) for row in state["messages"]
            if row.get("user_id") == user_id
            and str(row.get("client_turn_id")) == str(client_turn_id)
        ]
        if rows:
            return idempotency.validate_saved_turn_rows(
                rows, client_turn_id=client_turn_id, expected_message=expected_message
            )

        if coordinate_concurrent_lookups:
            state["initial_lookups"] += 1
            if state["initial_lookups"] == 2:
                initial_lookups_ready.set()
            # Model two requests that both check before either has committed a turn.
            await initial_lookups_ready.wait()
            return None
        return None

    async def fake_select(table, token, params, **kwargs):
        assert token == user["access_token"]
        if table == "conversations":
            conversation_id = params.get("id", "").removeprefix("eq.")
            conversation = state["conversations"].get(conversation_id)
            if conversation and conversation.get("user_id") == params.get("user_id", "").removeprefix("eq."):
                return ([copy.deepcopy(conversation)], None)
            return ([], None)
        if table == "profiles":
            assert params.get("id") == f"eq.{USER_ID}"
            return ([{
                "display_name": "Test User",
                "username": "test_user",
                "support_style": "gentle",
                "focus_areas": [],
                "memory_enabled": False,
            }], None)
        if table == "messages":
            conversation_id = params.get("conversation_id", "").removeprefix("eq.")
            rows = [
                copy.deepcopy(row) for row in state["messages"]
                if row.get("conversation_id") == conversation_id and row.get("user_id") == USER_ID
            ]
            return (rows[-12:], None)
        if table == "assessments":
            return ([], None)
        if table == "user_memories":
            pytest.fail("Memory is disabled in this chat endpoint test")
        raise AssertionError(f"Unexpected table lookup: {table}")

    async def fake_insert(table, token, rows, **kwargs):
        assert token == user["access_token"]
        if table == "conversations":
            state["conversations"][rows["id"]] = copy.deepcopy(rows)
            return [copy.deepcopy(rows)]
        if table == "messages":
            state["message_insert_attempts"] += 1
            # Emulate the production unique index on (user_id, client_turn_id, role).
            existing_keys = {
                (item.get("user_id"), str(item.get("client_turn_id")), item.get("role"))
                for item in state["messages"]
            }
            incoming_keys = [
                (item.get("user_id"), str(item.get("client_turn_id")), item.get("role"))
                for item in rows
            ]
            if any(key in existing_keys for key in incoming_keys) or len(set(incoming_keys)) != len(incoming_keys):
                raise SupabaseError(409, "duplicate client turn and role")
            state["messages"].extend(copy.deepcopy(rows))
            state["message_insert_successes"] += 1
            return copy.deepcopy(rows)
        raise AssertionError(f"Unexpected insert: {table}")

    async def fake_update(table, token, filters, body, **kwargs):
        assert table == "conversations"
        return [{"id": filters.get("id", "").removeprefix("eq."), **body}]

    async def no_pending_followup(*args, **kwargs):
        return None

    async def fake_generate_reply(message, **kwargs):
        state["generate_calls"] += 1
        call_number = state["generate_calls"]
        if coordinate_concurrent_lookups:
            if call_number == 2:
                both_generation_calls_ready.set()
            # Both concurrent requests generate before either writes the pair.
            await both_generation_calls_ready.wait()
        return {"response": f"Generated reply {call_number}", "tools_used": []}

    monkeypatch.setattr(chat_router, "load_saved_turn", fake_load_saved_turn)
    monkeypatch.setattr(chat_router, "select_rows", fake_select)
    monkeypatch.setattr(chat_router, "insert_row", fake_insert)
    monkeypatch.setattr(chat_router, "update_rows", fake_update)
    monkeypatch.setattr(chat_router, "_pending_phq9_safety_follow_up", no_pending_followup)
    monkeypatch.setattr(groq_service, "generate_reply", fake_generate_reply)

    async def send(text="I feel overwhelmed"):
        request = ChatRequest(
            session_id=uuid.UUID(session_id),
            client_turn_id=TURN_ID,
            message=text,
        )
        return await chat_router.chat_endpoint(request, current_user=user)

    return state, send


def test_chat_retry_after_persisted_response_was_lost_replays_without_duplicate_rows(monkeypatch):
    # The first response represents a server success whose HTTP response the client never
    # received. Retrying with the same logical turn must replay the persisted assistant reply.
    state, send = _install_chat_endpoint_harness(monkeypatch)

    first = asyncio.run(send())
    assert first["persistence_status"] == "saved"
    assert first["idempotency_status"] == "saved"
    assert len(state["messages"]) == 2

    retry = asyncio.run(send())

    assert retry["response"] == first["response"]
    assert retry["session_id"] == first["session_id"]
    assert retry["persistence_status"] == "saved"
    assert retry["idempotency_status"] == "replayed"
    assert state["generate_calls"] == 1
    assert state["message_insert_attempts"] == 1
    assert state["message_insert_successes"] == 1
    assert [row["role"] for row in state["messages"]] == ["user", "assistant"]


def test_concurrent_chat_requests_with_same_turn_id_persist_only_one_pair(monkeypatch):
    state, send = _install_chat_endpoint_harness(monkeypatch, coordinate_concurrent_lookups=True)

    async def concurrent_requests():
        return await asyncio.gather(send(), send())

    responses = asyncio.run(concurrent_requests())

    assert len(responses) == 2
    assert responses[0]["response"] == responses[1]["response"]
    assert all(response["persistence_status"] == "saved" for response in responses)
    assert state["generate_calls"] == 2  # persistence uniqueness protects stored history
    assert state["message_insert_attempts"] == 2
    assert state["message_insert_successes"] == 1
    assert len(state["messages"]) == 2
    assert [row["role"] for row in state["messages"]] == ["user", "assistant"]
    assert {str(row["client_turn_id"]) for row in state["messages"]} == {str(TURN_ID)}


def test_chat_endpoint_fails_closed_when_turn_state_cannot_be_verified(monkeypatch):
    from fastapi import HTTPException
    import routers.chat as chat_router

    state, send = _install_chat_endpoint_harness(monkeypatch)

    async def lookup_unavailable(*args, **kwargs):
        raise HTTPException(status_code=503, detail="Could not verify prior turn")

    monkeypatch.setattr(chat_router, "load_saved_turn", lookup_unavailable)
    with pytest.raises(HTTPException) as error:
        asyncio.run(send())

    assert error.value.status_code == 503
    assert state["generate_calls"] == 0
    assert state["message_insert_attempts"] == 0
    assert state["messages"] == []

