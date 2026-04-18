"""Emotion router — rate limited."""
import logging, base64
from fastapi import APIRouter, UploadFile, File, Request
from pydantic import BaseModel, Field
from slowapi import Limiter
from slowapi.util import get_remote_address

logger  = logging.getLogger("mindcare.emotion")
router  = APIRouter()
limiter = Limiter(key_func=get_remote_address)


class EmotionRequest(BaseModel):
    image: str = Field(description="Base64-encoded image (with or without data URL prefix)")


@router.post("/emotion/analyze")
@limiter.limit("20/minute")
async def analyze_emotion(request: Request, req: EmotionRequest):
    from services.emotion_service import predict_emotion
    return predict_emotion(req.image)


@router.post("/emotion/upload")
@limiter.limit("20/minute")
async def analyze_emotion_upload(request: Request, file: UploadFile = File(...)):
    from services.emotion_service import predict_emotion
    contents = await file.read()
    return predict_emotion(base64.b64encode(contents).decode())


@router.get("/emotion/status")
async def emotion_status():
    from services.emotion_service import is_model_loaded, get_backend
    return {"model_loaded": is_model_loaded(), "backend": get_backend()}
