"""MindCare chat API; persistent history and isolation enforced by Supabase RLS."""
import logging
import time
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field, field_validator
from auth.dependencies import get_current_user
from db.supabase import SupabaseError, select_rows, insert_row, update_rows, delete_rows
from middleware.rate_limit import rate_limit

logger = logging.getLogger("mindcare.chat")
router = APIRouter()


class ChatRequest(BaseModel):
    session_id: Optional[uuid.UUID] = None
    client_message_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    message: str = Field(min_length=1, max_length=2000)
    emotion: Optional[str] = Field(default=None, max_length=20)
    phq9_score: Optional[int] = Field(default=None, ge=0, le=27)
    phq9_category: Optional[str] = Field(default="Not assessed", max_length=30)
    phq9_crisis_flag: bool = False
    gad7_score: Optional[int] = Field(default=None, ge=0, le=21)
    gad7_category: Optional[str] = Field(default="Not assessed", max_length=30)

    @field_validator("message", mode="before")
    @classmethod
    def trim_message(cls, value):
        if not isinstance(value, str):
            raise ValueError("Message must be text")
        value = value.strip()
        if not value:
            raise ValueError("Enter a message before sending")
        return value


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


def build_message_rows(session_id: str, user_id: str, request: ChatRequest, response: str,
                       risk_score: float, latency_ms: int, crisis_detected: bool,
                       rag_used: bool, risk: dict | None = None,
                       tools_used: list[str] | None = None) -> list[dict]:
    """Return a PostgREST bulk-insert payload with an identical column set per row.

    PostgREST rejects bulk inserts when each JSON object has different keys. Optional
    columns must be present with null values on the row where they do not apply.
    """
    shared = {"conversation_id": session_id, "user_id": user_id}
    user_metadata = {"phq9_score": request.phq9_score, "gad7_score": request.gad7_score}
    assistant_metadata = {
        "crisis_detected": crisis_detected, "rag_used": rag_used,
        "risk": risk, "tools_used": tools_used or [],
    }
    user_idempotency_key = uuid.uuid5(uuid.NAMESPACE_URL, f"mindcare:{session_id}:{request.client_message_id}:user")
    assistant_idempotency_key = uuid.uuid5(uuid.NAMESPACE_URL, f"mindcare:{session_id}:{request.client_message_id}:assistant")
    return [
        {
            **shared,
            "id": str(user_idempotency_key),
            "role": "user",
            "content": request.message,
            "emotion": request.emotion,
            "risk_score": None,
            "latency_ms": None,
            "metadata": user_metadata,
        },
        {
            **shared,
            "id": str(assistant_idempotency_key),
            "role": "assistant",
            "content": response,
            "emotion": None,
            "risk_score": risk_score,
            "latency_ms": latency_ms,
            "metadata": assistant_metadata,
        },
    ]


@router.get("/chat/memories")
async def list_saved_memories(current_user=Depends(get_current_user)):
    """Return only the signed-in user's explicitly saved memory notes."""
    uid, token = current_user["id"], current_user["access_token"]
    try:
        rows, _ = await select_rows("user_memories", token, {
            "select": "id,content,created_at", "user_id": f"eq.{uid}",
            "order": "created_at.desc", "limit": "20",
        })
        return {"memories": rows, "limit": 20}
    except SupabaseError as exc:
        logger.warning("Saved memory list failed (HTTP %s)", exc.status_code)
        raise HTTPException(status_code=503, detail="Saved memory is not configured yet. Run supabase/migrations/20261017_user_memories.sql in the Supabase SQL Editor, then retry.") from exc


@router.post("/chat/memories", status_code=201)
async def create_saved_memory(req: MemoryCreateRequest, current_user=Depends(get_current_user)):
    """Persist a note only after the user explicitly submits it."""
    uid, token = current_user["id"], current_user["access_token"]
    try:
        existing, _ = await select_rows("user_memories", token, {
            "select": "id", "user_id": f"eq.{uid}", "order": "created_at.desc", "limit": "20",
        })
        if len(existing) >= 20:
            raise HTTPException(status_code=409, detail="You can save up to 20 memories. Remove one before adding another.")
        rows = await insert_row("user_memories", token, {"user_id": uid, "content": req.content})
        if not rows:
            raise HTTPException(status_code=503, detail="The memory could not be saved. Please retry.")
        return {"memory": rows[0], "limit": 20}
    except HTTPException:
        raise
    except SupabaseError as exc:
        logger.warning("Saved memory creation failed (HTTP %s)", exc.status_code)
        raise HTTPException(status_code=503, detail="Saved memory is not configured or could not be saved. Check the user_memories migration and try again.") from exc


@router.delete("/chat/memories/{memory_id}")
async def remove_saved_memory(memory_id: uuid.UUID, current_user=Depends(get_current_user)):
    """Delete a note by both its ID and owner ID; RLS is an additional boundary."""
    uid, token = current_user["id"], current_user["access_token"]
    try:
        rows = await delete_rows("user_memories", token, {"id": f"eq.{memory_id}", "user_id": f"eq.{uid}"})
        if not rows:
            raise HTTPException(status_code=404, detail="Saved memory not found")
        return {"deleted": True, "id": str(memory_id)}
    except HTTPException:
        raise
    except SupabaseError as exc:
        logger.warning("Saved memory deletion failed (HTTP %s)", exc.status_code)
        raise HTTPException(status_code=503, detail="The memory could not be removed. Check the user_memories migration and retry.") from exc


def _message_id(session_id: str, request_id: uuid.UUID, role: str) -> str:
    return str(uuid.uuid5(uuid.NAMESPACE_URL, f"mindcare:{session_id}:{request_id}:{role}"))


async def _get_saved_reply(session_id: str, user_id: str, token: str, request: ChatRequest):
    rows, _ = await select_rows("messages", token, {
        "select": "content,risk_score,metadata", "id": f"eq.{_message_id(session_id, request.client_message_id, 'assistant')}",
        "conversation_id": f"eq.{session_id}", "user_id": f"eq.{user_id}", "role": "eq.assistant", "limit": "1",
    })
    if not rows:
        return None
    row = rows[0]
    metadata = row.get("metadata") if isinstance(row.get("metadata"), dict) else {}
    return {
        "session_id": session_id,
        "response": row.get("content", ""),
        "risk": metadata.get("risk") or {"risk_score": row.get("risk_score"), "risk_level": "unknown", "is_clinical_assessment": False},
        "recommendations": [],
        "crisis_detected": bool(metadata.get("crisis_detected")),
        "rag_used": bool(metadata.get("rag_used")),
        "agent_tools_used": metadata.get("tools_used") or [],
        "trajectory": {},
        "replayed": True,
    }


async def _prepare_chat(request: ChatRequest, current_user: dict, started: float) -> dict:
    uid, token = current_user["id"], current_user["access_token"]
    session_id = str(request.session_id or uuid.uuid4())
    from services.fusion_service import compute_risk_score, check_crisis, CRISIS_RESOURCES
    from services.trajectory_service import get_trajectory_summary

    conversations, _ = await select_rows("conversations", token, {
        "select": "id,user_id,title,phq9_score,phq9_category,gad7_score,gad7_category",
        "id": f"eq.{session_id}", "user_id": f"eq.{uid}", "limit": "1",
    })
    if not conversations:
        try:
            await insert_row("conversations", token, {
                "id": session_id, "user_id": uid, "title": request.message[:80].strip() or "New conversation",
            })
        except SupabaseError as exc:
            if exc.status_code == 409:
                raise HTTPException(status_code=404, detail="Session not found") from exc
            raise

    profile_context = None
    try:
        profile_rows, _ = await select_rows("profiles", token, {
            "select": "display_name,username,pronouns,date_of_birth,timezone,support_style,focus_areas", "id": f"eq.{uid}", "limit": "1",
        })
        profile_context = profile_rows[0] if profile_rows else None
        if profile_context is not None:
            from services.profile_service import calculate_age
            dob = profile_context.pop("date_of_birth", None)
            timezone_name = profile_context.pop("timezone", None)
            profile_context["age"] = calculate_age(dob, timezone_name=timezone_name)
    except SupabaseError as profile_exc:
        logger.info("Profile personalization unavailable for this request (HTTP %s)", profile_exc.status_code)

    try:
        memory_rows, _ = await select_rows("user_memories", token, {
            "select": "content", "user_id": f"eq.{uid}", "order": "created_at.desc", "limit": "20",
        })
        if profile_context is None:
            profile_context = {}
        profile_context["saved_memories"] = [
            {"content": row.get("content", "")}
            for row in memory_rows
            if isinstance(row.get("content"), str) and row.get("content", "").strip()
        ]
    except SupabaseError as memory_exc:
        logger.info("Saved memories unavailable for this request (HTTP %s)", memory_exc.status_code)

    history_rows, _ = await select_rows("messages", token, {
        "select": "role,content,created_at", "conversation_id": f"eq.{session_id}",
        "user_id": f"eq.{uid}", "order": "created_at.desc", "limit": "12",
    })
    history = [{"role": row["role"], "content": row["content"]} for row in reversed(history_rows)]
    keyword_crisis, _ = check_crisis(request.message)
    crisis_detected = keyword_crisis or request.phq9_crisis_flag
    risk = compute_risk_score(
        phq9_score=request.phq9_score, gad7_score=request.gad7_score,
        emotion=request.emotion or "unavailable", text=request.message,
    )
    try:
        trajectory = await get_trajectory_summary(uid, token)
    except SupabaseError as trajectory_exc:
        logger.info("Prior trajectory unavailable for this chat (HTTP %s)", trajectory_exc.status_code)
        trajectory = {"trend": "unknown", "points": 0, "recent": []}
    context = {
        "emotion": request.emotion, "risk_level": risk["risk_level"], "risk_score": risk["risk_score"],
        "phq9_score": request.phq9_score, "phq9_category": request.phq9_category,
        "phq9_crisis_flag": request.phq9_crisis_flag,
        "trajectory": trajectory,
    }
    crisis_response = (
        "I'm really sorry you're experiencing this. Your safety matters. If you may act on these thoughts "
        "or are in immediate danger, contact local emergency services now and, if possible, stay with a trusted person. "
        "You can also reach out to a verified crisis-support service.\n\n" + CRISIS_RESOURCES
    )
    return {
        "uid": uid, "token": token, "session_id": session_id, "started": started,
        "history": history, "profile_context": profile_context, "risk": risk,
        "crisis_detected": crisis_detected, "crisis_response": crisis_response,
        "context": context, "trajectory_before": trajectory,
    }


async def _persist_chat_reply(request: ChatRequest, prepared: dict, response: str, tools_used: list[str]) -> dict:
    from services.fusion_service import get_recommendations
    from services.trajectory_service import update_trajectory

    uid, token, session_id = prepared["uid"], prepared["token"], prepared["session_id"]
    risk = prepared["risk"]
    rag_used = "search_wellness_knowledge" in tools_used
    recommendations = get_recommendations(risk["risk_level"], request.emotion or "neutral")
    await update_rows("conversations", token, {"id": f"eq.{session_id}", "user_id": f"eq.{uid}"}, {
        "phq9_score": request.phq9_score, "phq9_category": request.phq9_category,
        "phq9_crisis_flag": request.phq9_crisis_flag,
        "gad7_score": request.gad7_score, "gad7_category": request.gad7_category,
        "risk_level": risk["risk_level"], "risk_score": risk["risk_score"],
        "trajectory_trend": prepared["trajectory_before"].get("trend"),
    })
    latency_ms = int((time.perf_counter() - prepared["started"]) * 1000)
    message_rows = build_message_rows(
        session_id=session_id, user_id=uid, request=request, response=response,
        risk_score=risk["risk_score"], latency_ms=latency_ms,
        crisis_detected=prepared["crisis_detected"], rag_used=rag_used,
        risk=risk, tools_used=tools_used,
    )
    try:
        inserted = await insert_row("messages", token, message_rows)
        if not inserted:
            raise SupabaseError(503, "The conversation was not saved")
    except SupabaseError as exc:
        if exc.status_code != 409:
            raise
        replay = await _get_saved_reply(session_id, uid, token, request)
        if replay:
            return replay
        raise

    # Supporting insight writes are best-effort and happen only after the
    # user/assistant message pair is durably saved.
    try:
        trajectory_update = await update_trajectory(uid, token, request.message, risk["risk_score"])
        trajectory_summary = trajectory_update["summary"]
        trajectory_result = {"trend": trajectory_summary.get("trend"), "trigger": trajectory_update.get("trigger")}
        await update_rows("conversations", token, {"id": f"eq.{session_id}", "user_id": f"eq.{uid}"}, {
            "trajectory_trend": trajectory_summary.get("trend"),
        })
    except SupabaseError as trajectory_exc:
        logger.info("Trajectory update unavailable for this chat (HTTP %s)", trajectory_exc.status_code)
        trajectory_result = {"trend": prepared["trajectory_before"].get("trend"), "trigger": None}

    logger.info("Chat request completed latency_ms=%d", latency_ms)
    return {
        "session_id": session_id, "response": response, "risk": risk,
        "recommendations": recommendations, "crisis_detected": prepared["crisis_detected"],
        "rag_used": rag_used, "agent_tools_used": tools_used,
        "trajectory": trajectory_result,
    }


@router.post("/chat", dependencies=[Depends(rate_limit("chat", 20, 60))])
async def chat_endpoint(req: ChatRequest, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    session_id = str(req.session_id or uuid.uuid4())
    req.session_id = uuid.UUID(session_id)
    started = time.perf_counter()
    try:
        replay = await _get_saved_reply(session_id, uid, token, req)
        if replay:
            return replay
        prepared = await _prepare_chat(req, current_user, started)
        if prepared["crisis_detected"]:
            response, tools_used = prepared["crisis_response"], []
        else:
            from services.groq_service import generate_reply
            generated = await generate_reply(
                req.message, context=prepared["context"], history=prepared["history"],
                rag_context=None, profile=prepared["profile_context"],
            )
            response, tools_used = generated["response"], generated.get("tools_used", [])
        return await _persist_chat_reply(req, prepared, response, tools_used)
    except HTTPException:
        raise
    except SupabaseError as exc:
        logger.warning("Supabase operation failed during chat (HTTP %s)", exc.status_code)
        status_code = 503 if exc.status_code >= 500 else 400
        raise HTTPException(status_code=status_code, detail="MindCare could not save or retrieve your conversation. Please retry.") from exc
    except Exception as exc:
        logger.error("Chat request failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail="MindCare could not complete this response. Please try again shortly.") from exc


def _sse(data: dict) -> str:
    import json
    return f"data: {json.dumps(data, ensure_ascii=False, separators=(',', ':'))}\n\n"


@router.post("/chat/stream", dependencies=[Depends(rate_limit("chat", 20, 60))])
async def chat_stream_endpoint(req: ChatRequest, current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    session_id = str(req.session_id or uuid.uuid4())
    req.session_id = uuid.UUID(session_id)
    started = time.perf_counter()

    async def events():
        try:
            replay = await _get_saved_reply(session_id, uid, token, req)
            if replay:
                if replay["response"]:
                    yield _sse({"type": "delta", "text": replay["response"]})
                yield _sse({"type": "done", "data": replay})
                return
            prepared = await _prepare_chat(req, current_user, started)
            tools_used: list[str] = []
            if prepared["crisis_detected"]:
                response = prepared["crisis_response"]
                yield _sse({"type": "delta", "text": response})
            else:
                from services.groq_service import stream_reply
                response = ""
                async for item in stream_reply(
                    req.message, context=prepared["context"], history=prepared["history"],
                    rag_context=None, profile=prepared["profile_context"],
                ):
                    if item["type"] == "delta":
                        response += item["text"]
                        yield _sse(item)
                    elif item["type"] == "meta":
                        response = item["response"]
                        tools_used = item.get("tools_used", [])
            if not response.strip():
                raise RuntimeError("The assistant returned an empty response")
            result = await _persist_chat_reply(req, prepared, response, tools_used)
            yield _sse({"type": "done", "data": result})
        except HTTPException as exc:
            yield _sse({"type": "error", "message": exc.detail})
        except SupabaseError as exc:
            logger.warning("Supabase operation failed during streamed chat (HTTP %s)", exc.status_code)
            yield _sse({"type": "error", "message": "MindCare could not save or retrieve your conversation. Please retry."})
        except Exception as exc:
            logger.error("Streamed chat request failed (%s)", type(exc).__name__)
            yield _sse({"type": "error", "message": "MindCare could not complete this response. Please try again shortly."})

    return StreamingResponse(events(), media_type="text/event-stream", headers={
        "Cache-Control": "no-cache, no-transform", "X-Accel-Buffering": "no",
    })


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
        "select": "id,role,content,created_at,emotion,risk_score,metadata",
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
    # Ownership filter and RLS both apply to each deletion.
    await delete_rows("messages", token, {"conversation_id": f"eq.{session_id}", "user_id": f"eq.{uid}"})
    await delete_rows("conversations", token, {"id": f"eq.{session_id}", "user_id": f"eq.{uid}"})
    return {"message": "Session deleted"}


@router.get("/chat/status")
async def chat_status():
    from services.rag_service import is_rag_available
    from services.emotion_service import is_model_loaded, get_backend
    return {"rag_available": is_rag_available(), "emotion_available": is_model_loaded(), "emotion_backend": get_backend()}
