"""Emotion router — rate limited."""
import logging, base64
from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel, Field
from fastapi import Depends
from middleware.rate_limit import rate_limit
from auth.dependencies import get_current_user

logger  = logging.getLogger("mindcare.emotion")
router  = APIRouter()


class EmotionRequest(BaseModel):
    image: str = Field(min_length=1, description="Base64-encoded image (with or without data URL prefix)")


@router.post("/emotion/analyze", dependencies=[Depends(rate_limit("emotion", 20, 60))])
async def analyze_emotion(req: EmotionRequest, current_user=Depends(get_current_user)):
    if len(req.image) > 8_000_000:
        raise HTTPException(status_code=413, detail="Image is too large. Please use a smaller image.")
    from services.emotion_service import predict_emotion
    try:
        return await predict_emotion(req.image)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.post("/emotion/upload", dependencies=[Depends(rate_limit("emotion_upload", 20, 60))])
async def analyze_emotion_upload(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    if file.content_type not in {"image/jpeg", "image/png", "image/webp"}:
        raise HTTPException(status_code=415, detail="Upload a JPEG, PNG, or WebP image.")
    from services.emotion_service import predict_emotion
    contents = await file.read(6_000_001)
    if len(contents) > 6_000_000:
        raise HTTPException(status_code=413, detail="Image is too large. Limit is 6 MB.")
    data_url = f"data:{file.content_type};base64,{base64.b64encode(contents).decode()}"
    try:
        return await predict_emotion(data_url)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/emotion/status")
async def emotion_status():
    from services.emotion_service import is_model_loaded, get_backend
    return {"model_loaded": is_model_loaded(), "backend": get_backend()}
