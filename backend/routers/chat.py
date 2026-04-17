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
    session_id: Optional[str] = None
    message: str = Field(min_length=1, max_length=2000)
    emotion: Optional[str] = "neutral"
    phq9_score: Optional[int] = 0
    gad7_score: Optional[int] = 0


@router.post("/chat")
async def chat_endpoint(req: ChatRequest, current_user=Depends(get_current_user)):
    try:
        from services.groq_service import chat
        from services.trajectory_service import update_trajectory
        from services.rag_service import query_rag, is_rag_available

        db = get_db()

        uid = str(current_user["_id"])
        session_id = req.session_id or str(uuid.uuid4())

        emotion = req.emotion or "neutral"

        emotion_map = {
            "happy": 0.8,
            "neutral": 0.5,
            "sad": 0.2,
            "angry": 0.2,
            "fear": 0.2,
        }

        score = emotion_map.get(emotion, 0.5)

        trajectory = update_trajectory(uid, score)

        context = {
            "emotion": emotion,
            "trajectory": trajectory,
            "risk_level": "low" if score > 0.4 else "medium",
            "phq9_score": req.phq9_score,
            "gad7_score": req.gad7_score,
        }

        rag_context = query_rag(req.message) if is_rag_available() else None

        response = chat(
            session_id=session_id,
            message=req.message,
            context=context,
            rag_context=rag_context,
        )

        db.messages.insert_one({
            "session_id": session_id,
            "user_id": uid,
            "role": "user",
            "content": req.message,
            "timestamp": utcnow()
        })

        db.messages.insert_one({
            "session_id": session_id,
            "user_id": uid,
            "role": "assistant",
            "content": response,
            "timestamp": utcnow()
        })

        return {
            "session_id": session_id,
            "response": response,
            "emotion": emotion,
            "trajectory": trajectory,
            "rag_used": rag_context is not None
        }

    except Exception as e:
        logger.error(f"Chat error: {e}")
        raise HTTPException(500, str(e))