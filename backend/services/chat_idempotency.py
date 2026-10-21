"""Retry-safe lookup for a persisted MindCare chat turn.

The database unique index is the concurrency guard. This module validates the
stored pair before replaying it so a partial or corrupt record never looks like
an ordinary successful response.
"""
from __future__ import annotations

import json
import logging
from typing import Any
from uuid import UUID

from fastapi import HTTPException

from db.supabase import SupabaseError, select_rows

logger = logging.getLogger("mindcare.chat_idempotency")


def _metadata(value: object) -> dict[str, Any]:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except (TypeError, ValueError):
            return {}
        return parsed if isinstance(parsed, dict) else {}
    return {}


def validate_saved_turn_rows(
    rows: list[dict[str, Any]], *, client_turn_id: UUID, expected_message: str
) -> dict[str, Any] | None:
    """Validate a stored user/assistant pair; return None when no turn exists.

    A reused idempotency key with a different message is a client conflict. An
    incomplete/inconsistent stored pair is an integrity problem and fails closed.
    """
    if not rows:
        return None
    if len(rows) != 2:
        logger.error("Idempotent chat turn has %d stored rows; expected exactly 2", len(rows))
        raise HTTPException(
            status_code=503,
            detail="MindCare could not verify the saved state of this message. Please retry shortly.",
        )

    by_role: dict[str, dict[str, Any]] = {}
    for row in rows:
        if not isinstance(row, dict) or row.get("role") not in {"user", "assistant"}:
            raise HTTPException(status_code=503, detail="MindCare found an inconsistent saved message. Please retry shortly.")
        role = row["role"]
        if role in by_role:
            raise HTTPException(status_code=503, detail="MindCare found a duplicate saved message. Please retry shortly.")
        by_role[role] = row

    user_row = by_role.get("user")
    assistant_row = by_role.get("assistant")
    if not user_row or not assistant_row:
        raise HTTPException(status_code=503, detail="MindCare could not verify the saved message pair. Please retry shortly.")

    expected_id = str(client_turn_id)
    conversation_id = user_row.get("conversation_id")
    if (
        not isinstance(conversation_id, str)
        or not conversation_id
        or assistant_row.get("conversation_id") != conversation_id
        or str(user_row.get("client_turn_id")) != expected_id
        or str(assistant_row.get("client_turn_id")) != expected_id
        or not isinstance(user_row.get("content"), str)
        or not isinstance(assistant_row.get("content"), str)
        or not assistant_row.get("content", "").strip()
    ):
        logger.error("Idempotent chat turn failed integrity validation")
        raise HTTPException(status_code=503, detail="MindCare could not verify the saved message pair. Please retry shortly.")

    if user_row["content"] != expected_message:
        raise HTTPException(
            status_code=409,
            detail="This message retry ID was already used for different text. Start a new message instead.",
        )

    assistant_row = dict(assistant_row)
    assistant_row["metadata"] = _metadata(assistant_row.get("metadata"))
    return {
        "conversation_id": conversation_id,
        "user_message": user_row,
        "assistant_message": assistant_row,
    }


async def load_saved_turn(
    user_id: str, token: str, client_turn_id: UUID, *, expected_message: str
) -> dict[str, Any] | None:
    """Load and verify one turn for the authenticated owner before a retry is run."""
    try:
        rows, _ = await select_rows("messages", token, {
            "select": "conversation_id,client_turn_id,role,content,created_at,metadata",
            "user_id": f"eq.{user_id}",
            "client_turn_id": f"eq.{client_turn_id}",
            "order": "created_at.asc",
            "limit": "2",
        })
    except SupabaseError as exc:
        # Fail closed: generating a replacement response when the previous write
        # cannot be checked can create duplicate turns after a client timeout.
        logger.warning("Could not verify chat idempotency state (status=%s)", exc.status_code)
        raise HTTPException(
            status_code=503,
            detail="MindCare could not verify whether this message was already processed. Please retry shortly.",
        ) from exc

    return validate_saved_turn_rows(rows, client_turn_id=client_turn_id, expected_message=expected_message)
