"""
Chat router — fixed trajectory call + full risk fusion.
"""

import time
import uuid
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, Field

from auth.dependencies import get_current_user
from db.database import get_db, utcnow

logger = logging.getLogger("mindcare.chat")
router = APIRouter()


class ChatRequest(BaseModel):
    session_id:    Optional[str] = None
    message:       str           = Field(min_length=1, max_length=2000)
    emotion:       Optional[str] = Field(default="neutral", max_length=20)
    phq9_score:    Optional[int] = Field(default=0, ge=0, le=27)
    phq9_category: Optional[str] = Field(default="Not assessed", max_length=30)
    gad7_score:    Optional[int] = Field(default=0, ge=0, le=21)
    gad7_category: Optional[str] = Field(default="Not assessed", max_length=30)


@router.post("/chat")
async def chat_endpoint(req: ChatRequest, current_user=Depends(get_current_user)):
    try:
        from services.groq_service       import chat
        from services.fusion_service     import (
            compute_risk_score, get_recommendations, check_crisis, CRISIS_RESOURCES
        )
        from services.trajectory_service import update_trajectory, get_trajectory_summary
        from services.rag_service        import query_rag, is_rag_available

        db         = get_db()
        uid        = str(current_user["_id"])
        session_id = req.session_id or str(uuid.uuid4())
        t0         = time.time()

        # 1. Crisis check
        is_crisis, _ = check_crisis(req.message)

        # 2. Real multimodal risk scoring
        risk = compute_risk_score(
            phq9_score=req.phq9_score  or 0,
            gad7_score=req.gad7_score  or 0,
            emotion   =req.emotion     or "neutral",
            text      =req.message,
        )

        # 3. Trajectory update — FIXED: correct 3-arg signature
        traj_update  = update_trajectory(uid, req.message, risk["risk_score"])
        traj_summary = get_trajectory_summary(uid)

        # 4. LLM context
        context = {
            "emotion":       req.emotion or "neutral",
            "risk_level":    risk["risk_level"],
            "risk_score":    risk["risk_score"],
            "phq9_score":    req.phq9_score,
            "phq9_category": req.phq9_category,
            "gad7_score":    req.gad7_score,
            "gad7_category": req.gad7_category,
            "trajectory": {
                **traj_summary,
                "delta":   traj_update["delta"],
                "trigger": traj_update["trigger"],
            },
        }

        # 5. RAG (optional)
        rag_context = query_rag(req.message) if is_rag_available() else None

        # 6. LLM response
        response   = chat(session_id, req.message, context=context, rag_context=rag_context)
        latency_ms = int((time.time() - t0) * 1000)

        if is_crisis:
            response = f"I'm very concerned about what you shared.\n\n{response}\n\n{CRISIS_RESOURCES}"

        recommendations = get_recommendations(risk["risk_level"], req.emotion or "neutral")

        # 7. Persist to MongoDB
        db.sessions.update_one(
            {"session_id": session_id},
            {
                "$setOnInsert": {
                    "session_id": session_id,
                    "user_id":    uid,
                    "started_at": utcnow(),
                },
                "$set": {
                    "risk_level":       risk["risk_level"],
                    "risk_score":       risk["risk_score"],
                    "phq9_score":       req.phq9_score,
                    "phq9_category":    req.phq9_category,
                    "gad7_score":       req.gad7_score,
                    "gad7_category":    req.gad7_category,
                    "trajectory_trend": traj_summary.get("trend"),
                },
            },
            upsert=True,
        )

        db.messages.insert_many([
            {
                "session_id": session_id,
                "user_id":    uid,
                "role":       "user",
                "content":    req.message,
                "emotion":    req.emotion,
                "timestamp":  utcnow(),
            },
            {
                "session_id": session_id,
                "user_id":    uid,
                "role":       "assistant",
                "content":    response,
                "risk_score": risk["risk_score"],
                "latency_ms": latency_ms,
                "timestamp":  utcnow(),
            },
        ])

        logger.info(
            f"Chat [{uid[:8]}] risk={risk['risk_level']} "
            f"traj={traj_summary.get('trend')} {latency_ms}ms"
        )

        return {
            "session_id":      session_id,
            "response":        response,
            "risk":            risk,
            "recommendations": recommendations,
            "crisis_detected": is_crisis,
            "rag_used":        rag_context is not None,
            "trajectory": {
                "trend":   traj_summary.get("trend"),
                "trigger": traj_update.get("trigger"),
            },
        }

    except Exception as e:
        logger.error(f"Chat error: {e}", exc_info=True)
        raise HTTPException(500, str(e))


@router.get("/chat/history/{session_id}")
async def get_history_endpoint(session_id: str, current_user=Depends(get_current_user)):
    from services.groq_service import get_history
    return {"session_id": session_id, "history": get_history(session_id)}


@router.delete("/chat/session/{session_id}")
async def clear_session_endpoint(session_id: str, current_user=Depends(get_current_user)):
    from services.groq_service import clear_session
    clear_session(session_id)
    return {"message": "Session cleared"}


@router.get("/chat/status")
async def chat_status():
    from services.rag_service    import is_rag_available
    from services.emotion_service import is_model_loaded, get_backend
    return {
        "rag_available":     is_rag_available(),
        "emotion_available": is_model_loaded(),
        "emotion_backend":   get_backend(),
    }