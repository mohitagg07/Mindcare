"""MindCare chat API with safety-first routing and authenticated persistence."""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from auth.dependencies import get_current_user
from db.supabase import SupabaseError, select_rows, insert_row, update_rows, delete_rows

logger = logging.getLogger("mindcare.chat")
router = APIRouter()


class MemoryCreateRequest(BaseModel):
    content: str = Field(min_length=2, max_length=240)

    @field_validator("content", mode="before")
    @classmethod
    def normalize_content(cls, value):
        if not isinstance(value, str):
            raise ValueError("Memory must be text")
        value = " ".join(value.split())
        if len(value) < 2 or not any(char.isalnum() for char in value):
            raise ValueError("Enter a short memory with at least one letter or number")
        return value


class ChatRequest(BaseModel):
    session_id: Optional[uuid.UUID] = None
    message: str = Field(min_length=1, max_length=2000)
    emotion: Optional[str] = Field(default=None, max_length=20)

    # Legacy browser questionnaire/risk fields are intentionally ignored for backward
    # compatibility, but they are not authoritative input to safety routing or the LLM.


def build_message_rows(
    session_id: str,
    user_id: str,
    request: ChatRequest,
    response: str,
    risk_score: float | None,
    latency_ms: int | None,
    safety_follow_up_required: bool | None = None,
    rag_used: bool = False,
    safety_source: str | None = None,
    crisis_detected: bool | None = None,
) -> list[dict]:
    """Build same-column-set rows for PostgREST bulk insert.

    ``crisis_detected`` remains a compatibility keyword for older tests/callers only;
    its value is never treated as an authoritative clinical label. New code must use
    ``safety_follow_up_required`` to describe that a direct follow-up question was shown.
    """
    if safety_follow_up_required is None:
        safety_follow_up_required = bool(crisis_detected)
    shared = {"conversation_id": session_id, "user_id": user_id}
    user_metadata: dict = {}
    assistant_metadata = {
        "safety_follow_up_required": safety_follow_up_required,
        "rag_used": rag_used,
        "risk_score_status": "unassessed",
    }
    if safety_source:
        assistant_metadata["safety_signal_source"] = safety_source
    return [
        {
            **shared, "role": "user", "content": request.message,
            "emotion": request.emotion, "risk_score": None, "latency_ms": None,
            "metadata": user_metadata,
        },
        {
            **shared, "role": "assistant", "content": response,
            "emotion": None, "risk_score": risk_score, "latency_ms": latency_ms,
            "metadata": assistant_metadata,
        },
    ]


async def _pending_phq9_safety_follow_up(
    user_id: str, token: str, *, fail_closed: bool = False,
) -> str | None:
    """Return latest PHQ-9 id when item 9 is positive and follow-up is unacknowledged.

    Requires migration 20261019_assessment_safety_followup.sql. A normal chat request uses
    ``fail_closed=True``: if state cannot be verified, do not silently skip a possible saved
    follow-up. After a direct safety response has already been prepared, the lookup is best
    effort so a database failure cannot suppress the safety reply.
    """
    try:
        rows, _ = await select_rows("assessments", token, {
            "select": "id,answers,safety_follow_up_at,completed_at",
            "user_id": f"eq.{user_id}", "instrument": "eq.PHQ-9",
            "order": "completed_at.desc", "limit": "1",
        })
        if not rows:
            return None
        latest = rows[0]
        if latest.get("safety_follow_up_at"):
            return None
        answers = latest.get("answers", [])
        if isinstance(answers, str):
            try:
                answers = json.loads(answers)
            except (TypeError, ValueError):
                return None
        if not isinstance(answers, list) or len(answers) != 9:
            return None
        item_9 = answers[8]
        if isinstance(item_9, bool):
            return None
        try:
            number = int(item_9)
            positive = number >= 1 and str(item_9).strip() == str(number)
        except (TypeError, ValueError, OverflowError):
            positive = False
        return str(latest.get("id")) if positive and latest.get("id") else None
    except SupabaseError as exc:
        logger.warning("PHQ-9 follow-up state unavailable (%s)", exc.message)
        if fail_closed:
            raise HTTPException(
                status_code=503,
                detail=("MindCare couldn't verify whether a saved screening needs a safety follow-up. "
                        "Please retry before continuing.")
            ) from exc
        return None


async def _mark_phq9_safety_follow_up_presented(user_id: str, token: str, assessment_id: str) -> None:
    """Mark that a direct question was presented, not that concern was resolved."""
    from datetime import datetime, timezone
    try:
        await update_rows("assessments", token, {
            "id": f"eq.{assessment_id}", "user_id": f"eq.{user_id}",
        }, {"safety_follow_up_at": datetime.now(timezone.utc).isoformat()})
    except SupabaseError as exc:
        # Fail safe: if this write fails, a later request may ask again rather than skip it.
        logger.warning("Could not mark PHQ-9 safety follow-up as presented (%s)", exc.message)


async def _best_effort_persist_safety_turn(
    req: ChatRequest, user_id: str, token: str, response: str, source: str,
) -> tuple[str, bool]:
    """Persist a safety response if possible; storage outage must never suppress the response."""
    requested_session = str(req.session_id) if req.session_id else None
    session_id = requested_session or str(uuid.uuid4())
    try:
        owned = []
        if requested_session:
            try:
                owned, _ = await select_rows("conversations", token, {
                    "select": "id", "id": f"eq.{requested_session}",
                    "user_id": f"eq.{user_id}", "limit": "1",
                })
            except SupabaseError:
                # Ownership could not be established. Never reuse an unverified session id.
                session_id, owned = str(uuid.uuid4()), []

        if not owned:
            try:
                await insert_row("conversations", token, {
                    "id": session_id, "user_id": user_id,
                    "title": req.message[:80].strip() or "Safety check-in",
                })
            except SupabaseError as exc:
                if exc.status_code != 409:
                    raise
                session_id = str(uuid.uuid4())
                await insert_row("conversations", token, {
                    "id": session_id, "user_id": user_id,
                    "title": req.message[:80].strip() or "Safety check-in",
                })

        rows = build_message_rows(
            session_id=session_id, user_id=user_id, request=req, response=response,
            risk_score=None, latency_ms=None, safety_follow_up_required=True,
            rag_used=False, safety_source=source,
        )
        await insert_row("messages", token, rows)
        try:
            await update_rows("conversations", token, {
                "id": f"eq.{session_id}", "user_id": f"eq.{user_id}",
            }, {"risk_level": None, "risk_score": None, "trajectory_trend": None})
        except SupabaseError as exc:
            logger.warning("Safety turn saved but legacy indicator fields could not be cleared (%s)", exc.message)
        return session_id, True
    except SupabaseError as exc:
        logger.warning("Safety response was delivered but not persisted (%s)", exc.message)
        return str(uuid.uuid4()), False
    except Exception as exc:
        logger.warning("Safety response persistence failed (%s)", type(exc).__name__)
        return str(uuid.uuid4()), False


@router.post("/chat")
async def chat_endpoint(req: ChatRequest, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    started = time.perf_counter()

    from services.fusion_service import (
        compute_risk_score, get_recommendations, check_crisis, SAFETY_CHECK_RESPONSE,
    )

    # Safety routing precedes profile, history, analytics, and LLM calls. The signal is a
    # reason for a direct follow-up—not a diagnosis or proof of imminent danger.
    safety_detected, safety_source = check_crisis(req.message)
    pending_assessment_id = None
    if not safety_detected:
        # Fail closed when safety state is unreadable. This may temporarily pause normal
        # chat, but avoids silently skipping a required follow-up after a positive screen.
        pending_assessment_id = await _pending_phq9_safety_follow_up(uid, token, fail_closed=True)
    if not safety_detected and pending_assessment_id:
        safety_detected, safety_source = True, "saved_positive_phq9_item9"

    if safety_detected:
        session_id, persisted = await _best_effort_persist_safety_turn(
            req, uid, token, SAFETY_CHECK_RESPONSE, safety_source,
        )
        if persisted:
            if pending_assessment_id is None:
                pending_assessment_id = await _pending_phq9_safety_follow_up(uid, token)
            if pending_assessment_id:
                await _mark_phq9_safety_follow_up_presented(uid, token, pending_assessment_id)
        risk_status = compute_risk_score()
        return {
            "session_id": session_id,
            "response": SAFETY_CHECK_RESPONSE,
            "risk": risk_status,
            "recommendations": get_recommendations(),
            # Legacy field retained without falsely claiming a classifier established crisis.
            "crisis_detected": False,
            "safety_follow_up_required": True,
            "safety_signal_source": safety_source,
            "rag_used": False,
            "agent_tools_used": [],
            "trajectory": {"trend": "unknown", "available": False, "note": "Experimental composite trajectory is disabled pending validation."},
            "persistence_status": "saved" if persisted else "not_saved",
            "persistence_warning": None if persisted else "This safety response was shown but could not be saved to conversation history. Check your connection before relying on history being complete.",
        }

    # Normal conversation setup. Analytics and composite scoring are not in the response path.
    session_id = str(req.session_id or uuid.uuid4())
    session_ready = False
    context_warnings: list[str] = []
    history: list[dict] = []
    profile_context = None

    try:
        conversations, _ = await select_rows("conversations", token, {
            "select": "id", "id": f"eq.{session_id}",
            "user_id": f"eq.{uid}", "limit": "1",
        })
        if conversations:
            session_ready = True
        else:
            try:
                await insert_row("conversations", token, {
                    "id": session_id, "user_id": uid,
                    "title": req.message[:80].strip() or "New conversation",
                })
                session_ready = True
            except SupabaseError as exc:
                if exc.status_code == 409:
                    # Don't distinguish a foreign UUID from another conflict; start a private session.
                    session_id = str(uuid.uuid4())
                    await insert_row("conversations", token, {
                        "id": session_id, "user_id": uid,
                        "title": req.message[:80].strip() or "New conversation",
                    })
                    session_ready = True
                else:
                    raise
    except SupabaseError as exc:
        logger.warning("Conversation session unavailable (%s)", exc.message)
        session_id = str(uuid.uuid4())
        context_warnings.append("I couldn't connect to your saved conversation, so this reply may not include earlier messages.")

    if session_ready:
        try:
            profile_rows, _ = await select_rows("profiles", token, {
                # Data minimization: no DOB, derived age, or time zone is sent to the LLM.
                "select": "display_name,username,pronouns,support_style,focus_areas",
                "id": f"eq.{uid}", "limit": "1",
            })
            profile_context = profile_rows[0] if profile_rows else None
        except SupabaseError as profile_exc:
            logger.info("Profile personalization unavailable (%s)", profile_exc.message)
            context_warnings.append("I couldn't load your saved response preferences for this reply.")

        try:
            history_rows, _ = await select_rows("messages", token, {
                "select": "role,content,created_at", "conversation_id": f"eq.{session_id}",
                "user_id": f"eq.{uid}", "order": "created_at.desc", "limit": "12",
            })
            history = [{"role": row["role"], "content": row["content"]} for row in reversed(history_rows)]
        except SupabaseError as history_exc:
            logger.warning("Conversation history unavailable (%s)", history_exc.message)
            context_warnings.append("I couldn't load earlier messages, so this reply may miss some previous context.")

        # Saved memories are explicitly user-created, optional, and separately controlled.
        try:
            memory_rows, _ = await select_rows("user_memories", token, {
                "select": "content", "user_id": f"eq.{uid}",
                "order": "created_at.desc", "limit": "20",
            })
            profile_context = {**(profile_context or {}), "saved_memories": memory_rows}
        except SupabaseError as memory_exc:
            logger.info("Saved memories unavailable (%s)", memory_exc.message)
            context_warnings.append("I couldn't load your saved memories for this reply.")

    # Never accept browser-supplied questionnaire values as authoritative safety or model context.
    context = {"emotion": req.emotion if req.emotion else None}
    from services.groq_service import generate_reply
    try:
        generated = await generate_reply(
            req.message, context=context, history=history, rag_context=None, profile=profile_context,
        )
    except Exception as exc:
        logger.exception("LLM generation failed for user=%s (%s)", uid[:8], type(exc).__name__)
        raise HTTPException(status_code=503, detail="MindCare could not generate a reply just now. Please try again.") from exc
    response = generated["response"]
    tools_used = generated.get("tools_used", [])
    latency_ms = int((time.perf_counter() - started) * 1000)

    persistence_status = "not_saved"
    persistence_warning = None
    if session_ready:
        try:
            rows = build_message_rows(
                session_id=session_id, user_id=uid, request=req, response=response,
                risk_score=None, latency_ms=latency_ms, safety_follow_up_required=False,
                rag_used=("search_wellness_knowledge" in tools_used), safety_source=None,
            )
            await insert_row("messages", token, rows)
            persistence_status = "saved"
            try:
                await update_rows("conversations", token, {
                    "id": f"eq.{session_id}", "user_id": f"eq.{uid}",
                }, {"risk_level": None, "risk_score": None, "trajectory_trend": None})
            except SupabaseError as exc:
                logger.warning("Messages saved but legacy indicator fields could not be cleared (%s)", exc.message)
                context_warnings.append("The reply was saved, but an old experimental indicator could not be cleared.")
        except SupabaseError as exc:
            logger.warning("Assistant response was generated but conversation persistence failed (%s)", exc.message)
            persistence_warning = "This reply was generated but could not be saved to conversation history. Check your connection before relying on history being complete."
    else:
        persistence_warning = "This reply was generated without a confirmed saved conversation. It may not appear in history."

    return {
        "session_id": session_id,
        "response": response,
        "risk": compute_risk_score(),
        "recommendations": get_recommendations(),
        "crisis_detected": False,
        "safety_follow_up_required": False,
        "rag_used": "search_wellness_knowledge" in tools_used,
        "agent_tools_used": tools_used,
        "trajectory": {"trend": "unknown", "available": False, "note": "Experimental composite trajectory is disabled pending validation."},
        "context_status": "full" if not context_warnings else "partial",
        "context_warnings": context_warnings,
        "persistence_status": persistence_status,
        "persistence_warning": persistence_warning,
    }


@router.get("/chat/history/{session_id}")
async def get_history_endpoint(session_id: uuid.UUID, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    session_id = str(session_id)
    owned, _ = await select_rows("conversations", token, {
        "select": "id", "id": f"eq.{session_id}", "user_id": f"eq.{uid}", "limit": "1",
    })
    if not owned:
        raise HTTPException(status_code=404, detail="Session not found")
    messages, _ = await select_rows("messages", token, {
        "select": "role,content,created_at,emotion,risk_score,metadata",
        "conversation_id": f"eq.{session_id}", "user_id": f"eq.{uid}",
        "order": "created_at.asc", "limit": "500",
    })
    return {"session_id": session_id, "history": messages}


@router.delete("/chat/session/{session_id}")
async def clear_session_endpoint(session_id: uuid.UUID, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    session_id = str(session_id)
    owned, _ = await select_rows("conversations", token, {
        "select": "id", "id": f"eq.{session_id}", "user_id": f"eq.{uid}", "limit": "1",
    })
    if not owned:
        raise HTTPException(status_code=404, detail="Session not found")
    await delete_rows("messages", token, {"conversation_id": f"eq.{session_id}", "user_id": f"eq.{uid}"})
    await delete_rows("conversations", token, {"id": f"eq.{session_id}", "user_id": f"eq.{uid}"})
    return {"message": "Session deleted"}


@router.get("/chat/status")
async def chat_status():
    from services.rag_service import is_rag_available
    from services.emotion_service import is_model_loaded, get_backend
    return {"rag_available": is_rag_available(), "emotion_available": is_model_loaded(), "emotion_backend": get_backend()}


@router.get("/chat/memories")
async def list_memories_endpoint(current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    memories, _ = await select_rows("user_memories", token, {
        "select": "id,content,created_at", "user_id": f"eq.{uid}",
        "order": "created_at.desc", "limit": "20",
    })
    return {"memories": memories}


@router.post("/chat/memories", status_code=201)
async def create_memory_endpoint(req: MemoryCreateRequest, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    memories, _ = await select_rows("user_memories", token, {
        "select": "id", "user_id": f"eq.{uid}", "limit": "20",
    })
    if len(memories) >= 20:
        raise HTTPException(status_code=400, detail="You can store up to 20 memories. Delete one to add more.")
    rows = await insert_row("user_memories", token, {"user_id": uid, "content": req.content})
    return {"memory": rows[0]}


@router.delete("/chat/memories/{memory_id}")
async def delete_memory_endpoint(memory_id: uuid.UUID, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    deleted = await delete_rows("user_memories", token, {"id": f"eq.{memory_id}", "user_id": f"eq.{uid}"})
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"deleted": True}
