"""Asynchronous Groq Vision integration for optional expression estimates.

Facial expressions are ambiguous and must never be treated as clinical evidence.
When the remote model is unavailable, return an explicit unavailable result instead
of guessing an emotion from brightness or contrast heuristics.
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
from typing import Any

logger = logging.getLogger("mindcare.emotion")
EMOTION_LABELS = ("angry", "disgust", "fear", "happy", "neutral", "sad", "surprise")
_ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp"}
_MAX_IMAGE_BYTES = 6_000_000
_CLIENT: Any | None = None

VISION_PROMPT = """Inspect the image only for a visible facial expression. Do not infer mental health, personality, intent, or diagnosis.
Return ONLY valid JSON with this exact shape:
{"emotion":"neutral","confidence":0.0,"faces_detected":0,"all_scores":{"happy":0,"sad":0,"angry":0,"fear":0,"disgust":0,"surprise":0,"neutral":1}}
Use one emotion from happy, sad, angry, fear, disgust, surprise, neutral. Scores must be between 0 and 1. If there is no clear face, set faces_detected=0, emotion=neutral and confidence=0. Facial expressions are uncertain visual estimates."""


def _client():
    global _CLIENT
    key = os.getenv("GROQ_API_KEY", "").strip()
    if not key:
        raise RuntimeError("GROQ_API_KEY is not configured")
    if _CLIENT is None:
        # Lazy import keeps the health endpoint usable even before optional SDK setup.
        from groq import AsyncGroq
        _CLIENT = AsyncGroq(api_key=key, timeout=20.0, max_retries=1)
    return _CLIENT


def _decode_image(image_data: str) -> tuple[str, str]:
    encoded = image_data.strip()
    media_type = "image/jpeg"
    if encoded.startswith("data:"):
        header, separator, encoded = encoded.partition(",")
        if not separator or ";base64" not in header:
            raise ValueError("Image must be a base64 data URL")
        media_type = header[5:].split(";", 1)[0].lower()
    if media_type not in _ALLOWED_TYPES:
        raise ValueError("Use a JPEG, PNG, or WebP image")
    try:
        decoded = base64.b64decode(encoded, validate=True)
    except Exception as exc:
        raise ValueError("Image payload is not valid base64") from exc
    if not decoded:
        raise ValueError("Image is empty")
    if len(decoded) > _MAX_IMAGE_BYTES:
        raise ValueError("Image exceeds the 6 MB limit")

    # Check the container signature rather than trusting the declared MIME type.
    valid = (
        (media_type == "image/jpeg" and decoded.startswith(b"\xff\xd8\xff"))
        or (media_type == "image/png" and decoded.startswith(b"\x89PNG\r\n\x1a\n"))
        or (media_type == "image/webp" and len(decoded) >= 12 and decoded.startswith(b"RIFF") and decoded[8:12] == b"WEBP")
    )
    if not valid:
        raise ValueError("Image content does not match its declared format")
    return media_type, base64.b64encode(decoded).decode("ascii")


def _parse_response(raw: str, model: str) -> dict[str, Any]:
    content = raw.strip()
    if content.startswith("```"):
        content = re.sub(r"^```(?:json)?\s*|\s*```$", "", content, flags=re.IGNORECASE).strip()
    data = json.loads(content)
    emotion = str(data.get("emotion", "neutral")).lower().strip()
    if emotion not in EMOTION_LABELS:
        emotion = "neutral"
    incoming = data.get("all_scores") if isinstance(data.get("all_scores"), dict) else {}
    scores: dict[str, float] = {}
    for label in EMOTION_LABELS:
        try:
            score = float(incoming.get(label, 0.0))
        except (TypeError, ValueError):
            score = 0.0
        scores[label] = max(0.0, min(1.0, score))
    total = sum(scores.values())
    if total:
        scores = {key: round(value / total, 4) for key, value in scores.items()}
    else:
        scores = {key: float(key == emotion) for key in EMOTION_LABELS}
    try:
        faces_detected = max(0, min(20, int(data.get("faces_detected", 1))))
    except (TypeError, ValueError):
        faces_detected = 0
    try:
        confidence = float(data.get("confidence", scores[emotion]))
    except (TypeError, ValueError):
        confidence = scores[emotion]

    # Enforce the model contract server-side. A malformed response must never attach a
    # confident expression label to an image the model itself says contains no clear face.
    if faces_detected == 0:
        emotion = "neutral"
        confidence = 0.0
        scores = {key: float(key == "neutral") for key in EMOTION_LABELS}

    return {
        "emotion": emotion,
        "confidence": round(max(0.0, min(1.0, confidence)), 3),
        "all_scores": scores,
        "model_available": True,
        "backend": f"groq-vision ({model.split('/')[-1]})",
        "faces_detected": faces_detected,
        "note": "Expression estimate only; it is not a reliable measure of mental state or a clinical indicator.",
    }


def _unavailable(note: str = "Vision analysis is unavailable. No expression estimate was made.") -> dict[str, Any]:
    return {
        "emotion": "neutral", "confidence": 0.0,
        "all_scores": {label: (1.0 if label == "neutral" else 0.0) for label in EMOTION_LABELS},
        "model_available": False, "backend": "unavailable", "faces_detected": 0,
        "note": note,
    }


async def predict_emotion(image_data: str) -> dict[str, Any]:
    """Estimate visible expression asynchronously; failure never blocks the event loop."""
    media_type, encoded = _decode_image(image_data)
    model = os.getenv("GROQ_VISION_MODEL", "qwen/qwen3.8-27b").strip()
    try:
        response = await _client().chat.completions.create(
            model=model,
            messages=[{"role": "user", "content": [
                {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{encoded}"}},
                {"type": "text", "text": VISION_PROMPT},
            ]}],
            temperature=0.1,
            max_completion_tokens=320,
        )
        text = response.choices[0].message.content or ""
        result = _parse_response(text, model)
        logger.info("Vision estimate completed: model=%s emotion=%s", model, result["emotion"])
        return result
    except Exception as exc:
        logger.warning("Vision estimate unavailable (%s)", type(exc).__name__)
        return _unavailable()


def is_model_loaded() -> bool:
    # This is a remote service, not a locally loaded model.
    return bool(os.getenv("GROQ_API_KEY", "").strip())


def get_backend() -> str:
    return "groq-vision" if is_model_loaded() else "unavailable"


async def close_client() -> None:
    global _CLIENT
    if _CLIENT is not None:
        await _CLIENT.close()
        _CLIENT = None
