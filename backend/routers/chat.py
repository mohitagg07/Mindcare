"""MindCare chat API with safety-first routing and authenticated persistence."""
from __future__ import annotations

import json
import logging
import time
import uuid
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator

from auth.dependencies import get_current_user
from db.supabase import SupabaseError, select_rows, insert_row, update_rows, delete_rows
from services.input_integrity import normalize_chat_message, normalize_expression_label
from services.chat_idempotency import load_saved_turn

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
    # Reuse this UUID only when retrying the same logical user turn.
    client_turn_id: Optional[uuid.UUID] = None
    message: str = Field(min_length=1, max_length=2000)
    emotion: Optional[str] = Field(default=None, max_length=20)
    conversation_mode: Literal["listen", "explore", "next_step", "reflect"] = "listen"
    assessment_follow_up_id: Optional[uuid.UUID] = None

    @field_validator("message", mode="before")
    @classmethod
    def validate_message(cls, value):
        return normalize_chat_message(value)

    @field_validator("emotion", mode="before")
    @classmethod
    def validate_expression_label(cls, value):
        # Expression is optional context only. Unknown client strings are discarded, never
        # copied into the LLM system prompt or treated as evidence about the user's state.
        return normalize_expression_label(value)

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
    if request.client_turn_id is not None:
        shared["client_turn_id"] = str(request.client_turn_id)
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
    """Return the newest unpresented positive PHQ-9 item-9 assessment, if any.

    The lookup intentionally searches ALL unpresented positive item-9 assessments,
    not only the newest PHQ-9 row. A later negative screen must not silently hide an
    earlier positive response that has never received a direct safety follow-up.

    The JSON-path filter limits results to item 9 >= 1. Assessment answer integrity
    is also enforced by the database migration. Returned rows are revalidated here;
    malformed rows fail closed in the normal-chat path instead of being treated as safe.
    Requires 20261019_assessment_safety_followup.sql and
    20261017_assessment_integrity.sql.
    """
    try:
        rows, _ = await select_rows("assessments", token, {
            "select": "id,answers,safety_follow_up_at,completed_at",
            "user_id": f"eq.{user_id}",
            "instrument": "eq.PHQ-9",
            "safety_follow_up_at": "is.null",
            # PostgREST JSON-path filter: item 9 is array index 8. The database
            # integrity constraint restricts every response to the integer 0..3.
            "answers->>8": "gte.1",
            "order": "completed_at.desc",
            "limit": "1000",
        })

        for candidate in rows:
            # Defensive check in case a test double or intermediary ignores filters.
            if candidate.get("safety_follow_up_at"):
                continue

            answers = candidate.get("answers")
            if isinstance(answers, str):
                try:
                    answers = json.loads(answers)
                except (TypeError, ValueError):
                    answers = None

            valid_answers = (
                isinstance(answers, list)
                and len(answers) == 9
                and all(type(value) is int and 0 <= value <= 3 for value in answers)
            )
            if not valid_answers:
                logger.error("Pending PHQ-9 assessment has invalid stored answers; safety state is unverifiable")
                if fail_closed:
                    raise HTTPException(
                        status_code=503,
                        detail=("MindCare couldn't verify a saved screening's safety follow-up state. "
                                "Please retry or contact support before continuing."),
                    )
                continue

            # The query should only return positive item-9 answers. If the persisted
            # payload contradicts the query, treat it as an integrity failure.
            if answers[8] < 1:
                logger.error("Pending PHQ-9 assessment does not match its positive item-9 query")
                if fail_closed:
                    raise HTTPException(
                        status_code=503,
                        detail=("MindCare couldn't verify a saved screening's safety follow-up state. "
                                "Please retry or contact support before continuing."),
                    )
                continue

            assessment_id = candidate.get("id")
            if not isinstance(assessment_id, str) or not assessment_id.strip():
                logger.error("Pending PHQ-9 assessment has no usable ID")
                if fail_closed:
                    raise HTTPException(
                        status_code=503,
                        detail=("MindCare couldn't verify a saved screening's safety follow-up state. "
                                "Please retry or contact support before continuing."),
                    )
                continue
            return assessment_id
        return None
    except SupabaseError as exc:
        logger.warning("PHQ-9 follow-up state unavailable (%s)", exc.message)
        if fail_closed:
            raise HTTPException(
                status_code=503,
                detail=("MindCare couldn't verify whether a saved screening needs a safety follow-up. "
                        "Please retry before continuing."),
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
        return session_id, False
    except Exception as exc:
        logger.warning("Safety response persistence failed (%s)", type(exc).__name__)
        return session_id, False


def _replay_turn_payload(saved_turn: dict) -> dict:
    """Return the already-persisted assistant answer for a safe idempotent retry."""
    from services.fusion_service import compute_risk_score, get_recommendations

    assistant = saved_turn["assistant_message"]
    metadata = assistant.get("metadata") if isinstance(assistant.get("metadata"), dict) else {}
    safety_required = bool(metadata.get("safety_follow_up_required"))
    return {
        "session_id": saved_turn["conversation_id"],
        "response": assistant["content"],
        "risk": compute_risk_score(),
        "recommendations": get_recommendations(),
        "crisis_detected": False,
        "safety_follow_up_required": safety_required,
        "safety_signal_source": metadata.get("safety_signal_source"),
        "rag_used": bool(metadata.get("rag_used")),
        "agent_tools_used": [],
        "trajectory": {"trend": "unknown", "available": False, "note": "Experimental composite trajectory is disabled pending validation."},
        "context_status": "replayed",
        "context_warnings": [],
        "persistence_status": "saved",
        "persistence_warning": None,
        "idempotency_status": "replayed",
    }


def _memory_enabled_from_profile(profile_context: dict | None) -> bool:
    """Only a literal boolean from the authenticated profile enables retrieval."""
    return isinstance(profile_context, dict) and profile_context.get("memory_enabled") is True


async def _load_saved_memories(
    user_id: str,
    token: str,
    *,
    enabled: bool,
    context_warnings: list[str],
) -> list[dict] | None:
    """Fetch memories only after the server-owned preference explicitly opts in.

    None means disabled or unavailable; an empty list means enabled, with no saved notes.
    The preference is read from the authenticated profile, never from the chat request.
    """
    if enabled is not True:
        return None
    try:
        memories, _ = await select_rows("user_memories", token, {
            "select": "content", "user_id": f"eq.{user_id}",
            "order": "created_at.desc", "limit": "20",
        })
        return memories
    except SupabaseError as memory_exc:
        logger.info("Saved memories unavailable (%s)", memory_exc.message)
        context_warnings.append("I couldn't load your saved memories for this reply.")
        return None


async def _load_assessment_follow_up(user_id: str, token: str, assessment_id: uuid.UUID) -> dict:
    """Load the minimal summary of a saved check-in after the user explicitly asks to discuss it."""
    try:
        rows, _ = await select_rows("assessments", token, {
            "select": "id,instrument,score,max_score,result_snapshot",
            "id": f"eq.{assessment_id}", "user_id": f"eq.{user_id}", "limit": "1",
        })
    except SupabaseError as exc:
        raise HTTPException(status_code=503, detail="Your saved check-in could not be verified. Please try again.") from exc
    if not rows:
        raise HTTPException(status_code=404, detail="That saved check-in was not found in your account.")
    row = rows[0]
    definitions = {
        "PHQ-9": ("Mood & interest check-in", 27, {"Minimal", "Mild", "Moderate", "Moderately Severe", "Severe"}),
        "GAD-7": ("Worry & tension check-in", 21, {"Minimal", "Mild", "Moderate", "Severe"}),
    }
    instrument = row.get("instrument")
    if instrument not in definitions:
        raise HTTPException(status_code=409, detail="This check-in is not available for conversation follow-up.")
    title, expected_max, categories = definitions[instrument]
    try:
        score, max_score = int(row.get("score")), int(row.get("max_score"))
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=409, detail="This saved check-in could not be verified safely.") from exc
    if max_score != expected_max or not 0 <= score <= max_score:
        raise HTTPException(status_code=409, detail="This saved check-in has inconsistent result data.")
    snapshot = row.get("result_snapshot")
    if isinstance(snapshot, str):
        try:
            snapshot = json.loads(snapshot)
        except (TypeError, ValueError):
            snapshot = None
    # A positive final item follows the safety pathway, not ordinary score reflection.
    if instrument == "PHQ-9" and isinstance(snapshot, dict) and snapshot.get("crisis_flag") is True:
        raise HTTPException(status_code=409, detail="This check-in needs a separate safety follow-up before ordinary reflection.")
    category = snapshot.get("category") if isinstance(snapshot, dict) else None
    if not isinstance(category, str) or category not in categories:
        category = None
    # Never provide individual answers, the entire snapshot, or an internal instrument ID to the model.
    return {"title": title, "score": score, "max_score": max_score, "category": category}


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
    if req.client_turn_id is not None:
        try:
            saved_turn = await load_saved_turn(uid, token, req.client_turn_id, expected_message=req.message)
        except HTTPException:
            if not safety_detected:
                raise
            logger.warning("Idempotency lookup unavailable for a safety-triggered message; delivering safety guidance anyway")
        else:
            if saved_turn is not None:
                return _replay_turn_payload(saved_turn)
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
        if not persisted and req.client_turn_id is not None:
            # A concurrent retry may have won the unique-index race. Try to replay
            # it, but never let a second read failure suppress safety guidance.
            try:
                saved_turn = await load_saved_turn(uid, token, req.client_turn_id, expected_message=req.message)
            except HTTPException:
                logger.warning("Could not verify a concurrent safety-turn retry; delivering the safety response")
            else:
                if saved_turn is not None:
                    if session_id != saved_turn["conversation_id"]:
                        try:
                            await delete_rows("conversations", token, {"id": f"eq.{session_id}", "user_id": f"eq.{uid}"})
                        except SupabaseError as cleanup_exc:
                            logger.info("Could not remove duplicate safety session (%s)", cleanup_exc.status_code)
                    return _replay_turn_payload(saved_turn)
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
            "idempotency_status": ("saved" if persisted else "not_saved") if req.client_turn_id is not None else "not_requested",
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
                "select": "display_name,username,pronouns,support_style,focus_areas,memory_enabled",
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

        # Memory retrieval is opt-in and controlled by the server-owned profile field.
        memory_enabled = _memory_enabled_from_profile(profile_context)
        memory_rows = await _load_saved_memories(
            uid, token, enabled=memory_enabled, context_warnings=context_warnings,
        )
        if memory_rows is not None:
            profile_context = {**(profile_context or {}), "saved_memories": memory_rows}

    # Never accept browser-supplied questionnaire values as authoritative safety or model context.
    context = {
        "emotion": req.emotion if req.emotion else None,
        "conversation_mode": req.conversation_mode,
    }
    if req.assessment_follow_up_id is not None:
        context["assessment_follow_up"] = await _load_assessment_follow_up(
            uid, token, req.assessment_follow_up_id,
        )
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
            if req.client_turn_id is not None and exc.status_code == 409:
                # Another identical request may have inserted the pair first. The unique
                # index prevents duplicate persisted turns; return the winner's response.
                saved_turn = await load_saved_turn(uid, token, req.client_turn_id, expected_message=req.message)
                if saved_turn is not None:
                    if session_id != saved_turn["conversation_id"]:
                        try:
                            await delete_rows("conversations", token, {"id": f"eq.{session_id}", "user_id": f"eq.{uid}"})
                        except SupabaseError as cleanup_exc:
                            logger.info("Could not remove duplicate chat session (%s)", cleanup_exc.status_code)
                    return _replay_turn_payload(saved_turn)
                raise HTTPException(status_code=503, detail="MindCare could not verify a concurrent message retry. Please retry shortly.") from exc
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
        "idempotency_status": ("saved" if persistence_status == "saved" else "not_saved") if req.client_turn_id is not None else "not_requested",
    }



def _chat_sse_event(event: dict) -> str:
    """Encode one JSON event for the browser's EventSource-style stream parser."""
    return f"data: {json.dumps(event, ensure_ascii=False, separators=(',', ':'))}\n\n"


async def _replay_as_stream(payload: dict):
    """Replay a persisted turn through the same stream contract as a live response."""
    response = str(payload.get("response") or "")
    if response:
        yield _chat_sse_event({"type": "delta", "text": response})
    yield _chat_sse_event({"type": "done", "data": payload})


@router.post("/chat/stream")
async def chat_stream_endpoint(req: ChatRequest, current_user=Depends(get_current_user)):
    """Stream the assistant's tokens, then confirm the saved turn in a final event.

    Safety routing and owner-scoped context loading happen before the response starts,
    so validation and safety-state failures retain normal HTTP status codes. Once the
    stream begins, generation/persistence failures are sent as explicit SSE error events.
    """
    uid, token = current_user["id"], current_user["access_token"]
    started = time.perf_counter()

    from services.fusion_service import (
        compute_risk_score, get_recommendations, check_crisis, SAFETY_CHECK_RESPONSE,
    )

    safety_detected, safety_source = check_crisis(req.message)
    if req.client_turn_id is not None:
        try:
            saved_turn = await load_saved_turn(uid, token, req.client_turn_id, expected_message=req.message)
        except HTTPException:
            if not safety_detected:
                raise
            logger.warning("Stream idempotency lookup unavailable for a safety-triggered message; delivering safety guidance anyway")
        else:
            if saved_turn is not None:
                return StreamingResponse(
                    _replay_as_stream(_replay_turn_payload(saved_turn)),
                    media_type="text/event-stream",
                    headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
                )

    pending_assessment_id = None
    if not safety_detected:
        pending_assessment_id = await _pending_phq9_safety_follow_up(uid, token, fail_closed=True)
    if not safety_detected and pending_assessment_id:
        safety_detected, safety_source = True, "saved_positive_phq9_item9"

    if safety_detected:
        session_id, persisted = await _best_effort_persist_safety_turn(
            req, uid, token, SAFETY_CHECK_RESPONSE, safety_source,
        )
        if not persisted and req.client_turn_id is not None:
            try:
                saved_turn = await load_saved_turn(uid, token, req.client_turn_id, expected_message=req.message)
            except HTTPException:
                logger.warning("Could not verify a concurrent safety-stream retry; delivering safety guidance")
            else:
                if saved_turn is not None:
                    if session_id != saved_turn["conversation_id"]:
                        try:
                            await delete_rows("conversations", token, {
                                "id": f"eq.{session_id}", "user_id": f"eq.{uid}",
                            })
                        except SupabaseError as cleanup_exc:
                            logger.info("Could not remove duplicate safety stream session (%s)", cleanup_exc.status_code)
                    return StreamingResponse(
                        _replay_as_stream(_replay_turn_payload(saved_turn)),
                        media_type="text/event-stream",
                        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
                    )
        if persisted:
            if pending_assessment_id is None:
                pending_assessment_id = await _pending_phq9_safety_follow_up(uid, token)
            if pending_assessment_id:
                await _mark_phq9_safety_follow_up_presented(uid, token, pending_assessment_id)

        safety_payload = {
            "session_id": session_id,
            "response": SAFETY_CHECK_RESPONSE,
            "risk": compute_risk_score(),
            "recommendations": get_recommendations(),
            "crisis_detected": False,
            "safety_follow_up_required": True,
            "safety_signal_source": safety_source,
            "rag_used": False,
            "agent_tools_used": [],
            "trajectory": {
                "trend": "unknown",
                "available": False,
                "note": "Experimental composite trajectory is disabled pending validation.",
            },
            "persistence_status": "saved" if persisted else "not_saved",
            "persistence_warning": None if persisted else (
                "This safety response was shown but could not be saved to conversation history. "
                "Check your connection before relying on history being complete."
            ),
            "idempotency_status": (
                "saved" if persisted else "not_saved"
            ) if req.client_turn_id is not None else "not_requested",
        }
        return StreamingResponse(
            _replay_as_stream(safety_payload),
            media_type="text/event-stream",
            headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
        )

    # Match the normal endpoint's owner-scoped session/profile/history preparation.
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
                    session_id = str(uuid.uuid4())
                    await insert_row("conversations", token, {
                        "id": session_id, "user_id": uid,
                        "title": req.message[:80].strip() or "New conversation",
                    })
                    session_ready = True
                else:
                    raise
    except SupabaseError as exc:
        logger.warning("Stream conversation session unavailable (%s)", exc.message)
        session_id = str(uuid.uuid4())
        context_warnings.append(
            "I couldn't connect to your saved conversation, so this reply may not include earlier messages."
        )

    if session_ready:
        try:
            profile_rows, _ = await select_rows("profiles", token, {
                "select": "display_name,username,pronouns,support_style,focus_areas,memory_enabled",
                "id": f"eq.{uid}", "limit": "1",
            })
            profile_context = profile_rows[0] if profile_rows else None
        except SupabaseError as profile_exc:
            logger.info("Stream profile personalization unavailable (%s)", profile_exc.message)
            context_warnings.append("I couldn't load your saved response preferences for this reply.")

        try:
            history_rows, _ = await select_rows("messages", token, {
                "select": "role,content,created_at", "conversation_id": f"eq.{session_id}",
                "user_id": f"eq.{uid}", "order": "created_at.desc", "limit": "12",
            })
            history = [
                {"role": row["role"], "content": row["content"]}
                for row in reversed(history_rows)
            ]
        except SupabaseError as history_exc:
            logger.warning("Stream conversation history unavailable (%s)", history_exc.message)
            context_warnings.append(
                "I couldn't load earlier messages, so this reply may miss some previous context."
            )

        memory_enabled = _memory_enabled_from_profile(profile_context)
        memory_rows = await _load_saved_memories(
            uid, token, enabled=memory_enabled, context_warnings=context_warnings,
        )
        if memory_rows is not None:
            profile_context = {**(profile_context or {}), "saved_memories": memory_rows}

    context = {
        "emotion": req.emotion if req.emotion else None,
        "conversation_mode": req.conversation_mode,
    }
    if req.assessment_follow_up_id is not None:
        context["assessment_follow_up"] = await _load_assessment_follow_up(
            uid, token, req.assessment_follow_up_id,
        )

    async def stream_events():
        try:
            from services.groq_service import stream_reply

            tools_used: list[str] = []
            response_parts: list[str] = []
            final_meta = None
            async for event in stream_reply(
                req.message, context=context, history=history, rag_context=None, profile=profile_context,
            ):
                if event.get("type") == "delta" and isinstance(event.get("text"), str):
                    response_parts.append(event["text"])
                    yield _chat_sse_event({"type": "delta", "text": event["text"]})
                elif event.get("type") == "meta":
                    final_meta = event
                    tools_used = event.get("tools_used", []) if isinstance(event.get("tools_used"), list) else []

            response = final_meta.get("response") if isinstance(final_meta, dict) else "".join(response_parts)
            if not isinstance(response, str) or not response.strip():
                raise RuntimeError("MindCare did not receive a complete response from the model")

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
                        logger.warning("Stream messages saved but legacy indicator fields could not be cleared (%s)", exc.message)
                        context_warnings.append(
                            "The reply was saved, but an old experimental indicator could not be cleared."
                        )
                except SupabaseError as exc:
                    if req.client_turn_id is not None and exc.status_code == 409:
                        saved_turn = await load_saved_turn(
                            uid, token, req.client_turn_id, expected_message=req.message,
                        )
                        if saved_turn is not None:
                            if session_id != saved_turn["conversation_id"]:
                                try:
                                    await delete_rows("conversations", token, {
                                        "id": f"eq.{session_id}", "user_id": f"eq.{uid}",
                                    })
                                except SupabaseError as cleanup_exc:
                                    logger.info("Could not remove duplicate chat stream session (%s)", cleanup_exc.status_code)
                            payload = _replay_turn_payload(saved_turn)
                            yield _chat_sse_event({"type": "done", "data": payload})
                            return
                        raise HTTPException(
                            status_code=503,
                            detail="MindCare could not verify a concurrent message retry. Please retry shortly.",
                        ) from exc
                    logger.warning("Stream response generated but persistence failed (%s)", exc.message)
                    persistence_warning = (
                        "This reply was generated but could not be saved to conversation history. "
                        "Check your connection before relying on history being complete."
                    )
            else:
                persistence_warning = (
                    "This reply was generated without a confirmed saved conversation. "
                    "It may not appear in history."
                )

            payload = {
                "session_id": session_id,
                "response": response,
                "risk": compute_risk_score(),
                "recommendations": get_recommendations(),
                "crisis_detected": False,
                "safety_follow_up_required": False,
                "rag_used": "search_wellness_knowledge" in tools_used,
                "agent_tools_used": tools_used,
                "trajectory": {
                    "trend": "unknown",
                    "available": False,
                    "note": "Experimental composite trajectory is disabled pending validation.",
                },
                "context_status": "full" if not context_warnings else "partial",
                "context_warnings": context_warnings,
                "persistence_status": persistence_status,
                "persistence_warning": persistence_warning,
                "idempotency_status": (
                    "saved" if persistence_status == "saved" else "not_saved"
                ) if req.client_turn_id is not None else "not_requested",
            }
            yield _chat_sse_event({"type": "done", "data": payload})
        except Exception as exc:
            logger.exception("Chat stream failed for user=%s (%s)", uid[:8], type(exc).__name__)
            yield _chat_sse_event({
                "type": "error",
                "message": "MindCare could not complete and confirm this response. Please retry the same message.",
            })

    return StreamingResponse(
        stream_events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )

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

    # A user/assistant pair is persisted with one shared created_at timestamp.
    # PostgREST does not guarantee a stable order for ties, so normalize each
    # timestamp tie to user-first, assistant-second before returning history.
    messages.sort(key=lambda row: (
        str(row.get("created_at") or ""),
        0 if row.get("role") == "user" else 1,
    ))
    return {"session_id": session_id, "history": messages}


@router.delete("/chat/session/{session_id}")
async def clear_session_endpoint(session_id: uuid.UUID, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    session_id = str(session_id)

    # messages.conversation_id has ON DELETE CASCADE, so deleting the owner-scoped
    # parent row removes its messages in the same database transaction. Avoid two
    # separate DELETE calls that could leave a partially deleted conversation.
    deleted = await delete_rows("conversations", token, {
        "id": f"eq.{session_id}", "user_id": f"eq.{uid}",
    })
    if not deleted:
        raise HTTPException(status_code=404, detail="Session not found")
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


@router.patch("/chat/memories/{memory_id}")
async def update_memory_endpoint(memory_id: uuid.UUID, req: MemoryCreateRequest, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    updated = await update_rows(
        "user_memories",
        token,
        {"id": f"eq.{memory_id}", "user_id": f"eq.{uid}"},
        {"content": req.content},
    )
    if not updated:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"memory": updated[0]}


@router.delete("/chat/memories")
async def delete_all_memories_endpoint(current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    deleted = await delete_rows("user_memories", token, {"user_id": f"eq.{uid}"})
    return {"deleted": True, "deleted_count": len(deleted)}


@router.delete("/chat/memories/{memory_id}")
async def delete_memory_endpoint(memory_id: uuid.UUID, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    deleted = await delete_rows("user_memories", token, {"id": f"eq.{memory_id}", "user_id": f"eq.{uid}"})
    if not deleted:
        raise HTTPException(status_code=404, detail="Memory not found")
    return {"deleted": True}
