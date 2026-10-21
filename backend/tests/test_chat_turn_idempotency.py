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
