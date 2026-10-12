"""MindCare chat API; persistent history and isolation enforced by Supabase RLS."""
import logging
import time
import uuid
from typing import Optional
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field
from auth.dependencies import get_current_user
from db.supabase import SupabaseError, select_rows, insert_row, update_rows, delete_rows

logger = logging.getLogger("mindcare.chat")
router = APIRouter()


class ChatRequest(BaseModel):
    session_id: Optional[uuid.UUID] = None
    message: str = Field(min_length=1, max_length=2000)
    emotion: Optional[str] = Field(default=None, max_length=20)
    phq9_score: Optional[int] = Field(default=None, ge=0, le=27)
    phq9_category: Optional[str] = Field(default="Not assessed", max_length=30)
    phq9_crisis_flag: bool = False
    gad7_score: Optional[int] = Field(default=None, ge=0, le=21)
    gad7_category: Optional[str] = Field(default="Not assessed", max_length=30)


def build_message_rows(session_id: str, user_id: str, request: ChatRequest, response: str,
                       risk_score: float, latency_ms: int, crisis_detected: bool,
                       rag_used: bool) -> list[dict]:
    """Return a PostgREST bulk-insert payload with an identical column set per row.

    PostgREST rejects bulk inserts when each JSON object has different keys. Optional
    columns must be present with null values on the row where they do not apply.
    """
    shared = {"conversation_id": session_id, "user_id": user_id}
    user_metadata = {"phq9_score": request.phq9_score, "gad7_score": request.gad7_score}
    assistant_metadata = {"crisis_detected": crisis_detected, "rag_used": rag_used}
    return [
        {
            **shared,
            "role": "user",
            "content": request.message,
            "emotion": request.emotion,
            "risk_score": None,
            "latency_ms": None,
            "metadata": user_metadata,
        },
        {
            **shared,
            "role": "assistant",
            "content": response,
            "emotion": None,
            "risk_score": risk_score,
            "latency_ms": latency_ms,
            "metadata": assistant_metadata,
        },
    ]


@router.post("/chat")
async def chat_endpoint(req: ChatRequest, current_user=Depends(get_current_user)):
    uid = current_user["id"]
    token = current_user["access_token"]
    session_id = str(req.session_id or uuid.uuid4())
    started = time.perf_counter()
    try:
        from services.fusion_service import compute_risk_score, get_recommendations, check_crisis, CRISIS_RESOURCES
        from services.trajectory_service import update_trajectory

        # Only select rows belonging to the authenticated user; RLS independently enforces this.
        conversations, _ = await select_rows("conversations", token, {
            "select": "id,user_id,title,phq9_score,phq9_category,gad7_score,gad7_category",
            "id": f"eq.{session_id}", "user_id": f"eq.{uid}", "limit": "1",
        })
        existing = bool(conversations)
        if not existing:
            try:
                await insert_row("conversations", token, {
                    "id": session_id, "user_id": uid, "title": req.message[:80].strip() or "New conversation",
                })
            except SupabaseError as exc:
                # A UUID collision with a different user's conversation must never be exposed.
                if exc.status_code == 409:
                    raise HTTPException(status_code=404, detail="Session not found") from exc
                raise

        # Load only the current user's explicit personalization preferences. This is optional:
        # chat should remain available while a profile migration is pending or a profile row is absent.
        profile_context = None
        try:
            profile_rows, _ = await select_rows("profiles", token, {
                "select": "display_name,username,pronouns,date_of_birth,timezone,support_style,focus_areas", "id": f"eq.{uid}", "limit": "1",
            })
            profile_context = profile_rows[0] if profile_rows else None
            if profile_context is not None:
                # Do not send the raw birth date to the language model; send only a derived age.
                from services.profile_service import calculate_age
                dob = profile_context.pop("date_of_birth", None)
                timezone_name = profile_context.pop("timezone", None)
                profile_context["age"] = calculate_age(dob, timezone_name=timezone_name)
        except SupabaseError as profile_exc:
            logger.info("Profile personalization unavailable for this request (%s)", profile_exc.message)

        # Durable conversation context; no worker-local memory is required.
        history_rows, _ = await select_rows("messages", token, {
            "select": "role,content,created_at", "conversation_id": f"eq.{session_id}",
            "user_id": f"eq.{uid}", "order": "created_at.desc", "limit": "12",
        })
        history = [{"role": row["role"], "content": row["content"]} for row in reversed(history_rows)]

        keyword_crisis, _ = check_crisis(req.message)
        crisis_detected = keyword_crisis or req.phq9_crisis_flag
        risk = compute_risk_score(
            phq9_score=req.phq9_score, gad7_score=req.gad7_score,
            emotion=req.emotion or "unavailable", text=req.message,
        )
        traj_update = await update_trajectory(uid, token, req.message, risk["risk_score"])
        traj_summary = traj_update["summary"]
        context = {
            "emotion": req.emotion, "risk_level": risk["risk_level"], "risk_score": risk["risk_score"],
            "phq9_score": req.phq9_score, "phq9_category": req.phq9_category,
            "phq9_crisis_flag": req.phq9_crisis_flag,
            "gad7_score": req.gad7_score, "gad7_category": req.gad7_category,
            "trajectory": {**traj_summary, "delta": traj_update["delta"], "trigger": traj_update["trigger"]},
        }
        rag_context = None
        tools_used: list[str] = []

        # A crisis signal bypasses generative text so immediate safety guidance is never delayed by the LLM.
        if crisis_detected:
            response = (
                "I'm really sorry you're experiencing this. Your safety matters. If you may act on these thoughts "
                "or are in immediate danger, contact local emergency services now and, if possible, stay with a trusted person. "
                "You can also reach out to a verified crisis-support service.\n\n" + CRISIS_RESOURCES
            )
        else:
            # Only import/init the LLM path after the deterministic crisis safety gate.
            from services.groq_service import generate_reply
            generated = await generate_reply(req.message, context=context, history=history, rag_context=rag_context, profile=profile_context)
            response = generated["response"]
            tools_used = generated.get("tools_used", [])
        latency_ms = int((time.perf_counter() - started) * 1000)

        recommendations = get_recommendations(risk["risk_level"], req.emotion or "neutral")
        message_rows = build_message_rows(
            session_id=session_id,
            user_id=uid,
            request=req,
            response=response,
            risk_score=risk["risk_score"],
            latency_ms=latency_ms,
            crisis_detected=crisis_detected,
            rag_used=("search_wellness_knowledge" in tools_used or rag_context is not None),
        )
        await insert_row("messages", token, message_rows)
        await update_rows("conversations", token, {"id": f"eq.{session_id}", "user_id": f"eq.{uid}"}, {
            "phq9_score": req.phq9_score, "phq9_category": req.phq9_category,
            "phq9_crisis_flag": req.phq9_crisis_flag,
            "gad7_score": req.gad7_score, "gad7_category": req.gad7_category,
            "risk_level": risk["risk_level"], "risk_score": risk["risk_score"],
            "trajectory_trend": traj_summary.get("trend"),
        })

        logger.info("Chat complete user=%s risk_level=%s latency_ms=%d", uid[:8], risk["risk_level"], latency_ms)
        return {
            "session_id": session_id, "response": response, "risk": risk,
            "recommendations": recommendations, "crisis_detected": crisis_detected,
            "rag_used": "search_wellness_knowledge" in tools_used or rag_context is not None,
            "agent_tools_used": tools_used,
            "trajectory": {"trend": traj_summary.get("trend"), "trigger": traj_update.get("trigger")},
        }
    except HTTPException:
        raise
    except SupabaseError as exc:
        logger.warning("Supabase operation failed during chat: %s", exc.message)
        status_code = 503 if exc.status_code >= 500 else 400
        raise HTTPException(status_code=status_code, detail="MindCare could not save or retrieve your conversation. Please retry.") from exc
    except Exception as exc:
        logger.exception("Chat request failed (%s)", type(exc).__name__)
        raise HTTPException(status_code=503, detail="MindCare could not complete this response. Please try again shortly.") from exc


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
    # Ownership filter and RLS both apply to each deletion.
    await delete_rows("messages", token, {"conversation_id": f"eq.{session_id}", "user_id": f"eq.{uid}"})
    await delete_rows("conversations", token, {"id": f"eq.{session_id}", "user_id": f"eq.{uid}"})
    return {"message": "Session deleted"}


@router.get("/chat/status")
async def chat_status():
    from services.rag_service import is_rag_available
    from services.emotion_service import is_model_loaded, get_backend
    return {"rag_available": is_rag_available(), "emotion_available": is_model_loaded(), "emotion_backend": get_backend()}
