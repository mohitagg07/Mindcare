"""
Emotion Service — Groq Vision API (zero local storage, Render-safe).
Uses llama-3.2-11b-vision-preview as primary (best vision accuracy on Groq).
Falls back to llama-3.2-90b-vision-preview, then pixel heuristics.

Storage used: 0 MB — all inference is done on Groq's cloud.
"""
import os, base64, logging, io, json
from typing import Optional
import numpy as np

logger = logging.getLogger("mindcare.emotion")

EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

_opencv_net     = None
MODEL_AVAILABLE = False

_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
_PROTO_PATH = os.path.join(_MODELS_DIR, "deploy.prototxt")
_CAFFE_PATH = os.path.join(_MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel")

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")

# ── Model priority list (tried in order) ──────────────────────────────────────
# llama-3.2-11b-vision-preview → best vision accuracy on Groq, fast, free tier
# meta-llama/llama-4-scout-17b-16e-instruct → newer, also supports vision
# llama-3.2-90b-vision-preview → most accurate but slower
GROQ_VISION_MODELS = [
    "llama-3.2-11b-vision-preview",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.2-90b-vision-preview",
]

# ── Carefully crafted prompt for accurate emotion detection ───────────────────
VISION_PROMPT = """You are an expert facial expression analyst. Look carefully at the face in this image.

Your task: identify the PRIMARY emotion shown on the face, and rate all 7 emotions.

Instructions:
- Look at: eyebrows (raised/furrowed), eyes (wide/squinted/tearful), mouth (smiling/frowning/open/tight)
- A wide open mouth + raised eyebrows = SURPRISE
- Upturned mouth corners + relaxed eyes = HAPPY
- Downturned mouth + drooping eyelids = SAD
- Furrowed brows + tight lips + jaw tension = ANGRY
- Raised inner eyebrows + wide eyes = FEAR
- Nose wrinkle + upper lip raise = DISGUST
- Flat expression, no muscle tension = NEUTRAL

Return ONLY this JSON (no markdown, no explanation, no extra text):
{
  "emotion": "<one of: happy, sad, angry, fear, disgust, surprise, neutral>",
  "confidence": <0.0-1.0 float, your certainty>,
  "faces_detected": <integer, how many faces you see>,
  "all_scores": {
    "happy": <0.0-1.0>,
    "sad": <0.0-1.0>,
    "angry": <0.0-1.0>,
    "fear": <0.0-1.0>,
    "disgust": <0.0-1.0>,
    "surprise": <0.0-1.0>,
    "neutral": <0.0-1.0>
  },
  "note": "<optional, e.g. 'no face detected' or 'multiple faces'>"
}

Rules:
- all_scores must sum to approximately 1.0
- confidence must reflect how sure you are (0.0 = not sure, 1.0 = very sure)
- If no face is visible: faces_detected=0, emotion="neutral", confidence=0.0
- Focus on the most prominent/largest face if multiple faces exist"""


def load_model():
    """Load OpenCV DNN face detector as pixel-heuristic fallback."""
    global _opencv_net, MODEL_AVAILABLE
    try:
        import cv2
        if os.path.exists(_PROTO_PATH) and os.path.exists(_CAFFE_PATH):
            _opencv_net = cv2.dnn.readNetFromCaffe(_PROTO_PATH, _CAFFE_PATH)
            MODEL_AVAILABLE = True
            logger.info("OpenCV DNN face detector loaded (pixel heuristic fallback)")
        else:
            logger.info("No local model files — Groq Vision is primary (0 MB mode)")
    except Exception as e:
        logger.warning(f"OpenCV DNN load failed: {e}")


def _groq_vision_emotion(image_data: str) -> dict:
    """
    Call Groq Vision API for emotion detection.
    Tries each model in GROQ_VISION_MODELS until one succeeds.
    Zero local storage — all inference on Groq's cloud.
    """
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set")

    try:
        from groq import Groq
    except ImportError:
        raise RuntimeError("groq package not installed — run: pip install groq")

    # Parse base64 image
    if "," in image_data:
        header, b64 = image_data.split(",", 1)
        media_type = "image/jpeg"
        if "png"  in header: media_type = "image/png"
        elif "webp" in header: media_type = "image/webp"
        elif "gif"  in header: media_type = "image/gif"
    else:
        b64, media_type = image_data, "image/jpeg"

    client = Groq(api_key=GROQ_API_KEY)
    last_error = None

    for model in GROQ_VISION_MODELS:
        try:
            logger.info(f"Trying Groq model: {model}")
            response = client.chat.completions.create(
                model=model,
                messages=[{
                    "role": "user",
                    "content": [
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:{media_type};base64,{b64}"}
                        },
                        {"type": "text", "text": VISION_PROMPT},
                    ],
                }],
                max_tokens=512,
                temperature=0.05,  # Low temp = more deterministic emotion reading
            )

            raw_text = response.choices[0].message.content.strip()

            # Strip markdown fences if model adds them
            if "```" in raw_text:
                raw_text = raw_text.split("```")[1]
                if raw_text.startswith("json"):
                    raw_text = raw_text[4:]
            raw_text = raw_text.strip()

            result = json.loads(raw_text)

            emotion = result.get("emotion", "neutral").lower().strip()
            if emotion not in EMOTION_LABELS:
                emotion = "neutral"

            # Normalise all_scores to sum to 1.0
            all_scores = result.get("all_scores", {})
            cleaned, total = {}, 0.0
            for lbl in EMOTION_LABELS:
                v = float(all_scores.get(lbl, 0.0))
                v = max(0.0, min(1.0, v))
                cleaned[lbl] = v
                total += v
            if total > 0:
                cleaned = {k: round(v / total, 4) for k, v in cleaned.items()}
            else:
                cleaned = {lbl: (1.0 if lbl == emotion else 0.0) for lbl in EMOTION_LABELS}

            confidence = float(result.get("confidence", cleaned.get(emotion, 0.5)))
            confidence = max(0.0, min(1.0, confidence))

            logger.info(f"Groq Vision [{model}] → {emotion} ({confidence:.2f})")
            return {
                "emotion":         emotion,
                "confidence":      round(confidence, 3),
                "all_scores":      cleaned,
                "model_available": True,
                "backend":         f"groq-vision/{model}",
                "faces_detected":  int(result.get("faces_detected", 1)),
                "note":            result.get("note", ""),
            }

        except Exception as e:
            logger.warning(f"Groq model {model} failed: {e}")
            last_error = e
            continue

    raise RuntimeError(f"All Groq vision models failed. Last error: {last_error}")


def _estimate_emotion_opencv(image_data: str) -> dict:
    """
    Pixel-heuristic fallback when Groq API is unavailable.
    Only reliable for happy/surprised — documented limitation.
    """
    try:
        from PIL import Image
        import cv2

        if "," in image_data:
            image_data = image_data.split(",")[1]

        img_bytes = base64.b64decode(image_data)
        pil_img   = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        frame_rgb = np.array(pil_img)
        frame_bgr = cv2.cvtColor(frame_rgb, cv2.COLOR_RGB2BGR)
        h, w      = frame_bgr.shape[:2]

        if _opencv_net is None:
            return _default_result(False)

        blob = cv2.dnn.blobFromImage(
            cv2.resize(frame_bgr, (300, 300)), 1.0, (300, 300),
            (104.0, 177.0, 123.0)
        )
        _opencv_net.setInput(blob)
        detections = _opencv_net.forward()

        faces = []
        for i in range(detections.shape[2]):
            conf = detections[0, 0, i, 2]
            if conf > 0.5:
                box = detections[0, 0, i, 3:7] * np.array([w, h, w, h])
                x1, y1, x2, y2 = box.astype(int)
                x1, y1 = max(0, x1), max(0, y1)
                x2, y2 = min(w, x2), min(h, y2)
                if x2 > x1 and y2 > y1:
                    faces.append((x1, y1, x2, y2, float(conf)))

        if not faces:
            return {
                "emotion": "neutral", "confidence": 0.0,
                "all_scores": {l: 0.0 for l in EMOTION_LABELS},
                "model_available": True, "backend": "opencv-dnn",
                "faces_detected": 0, "note": "No face detected"
            }

        x1, y1, x2, y2, fc = max(faces, key=lambda f: (f[2]-f[0]) * (f[3]-f[1]))
        face_gray = cv2.cvtColor(frame_bgr[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)
        fg = cv2.resize(face_gray, (48, 48)).astype(np.float32) / 255.0

        brightness    = float(np.mean(fg))
        contrast      = float(np.std(fg))
        top_dark      = float(np.mean(fg[:16, :]))
        mouth_bright  = float(np.mean(fg[32:, :]))
        eye_contrast  = float(np.std(fg[16:32, :]))

        scores = {
            "happy":    max(0, (mouth_bright - 0.45) * 3.0 + (brightness - 0.4) * 1.5),
            "sad":      max(0, (0.5 - brightness) * 2.0 + (0.45 - mouth_bright) * 1.5),
            "angry":    max(0, (0.5 - top_dark) * 2.5 + (contrast - 0.15) * 1.0),
            "surprise": max(0, (eye_contrast - 0.18) * 4.0 + (brightness - 0.45) * 1.0),
            "fear":     max(0, (eye_contrast - 0.16) * 2.0 + (0.5 - brightness) * 1.5),
            "disgust":  max(0, (contrast - 0.2) * 1.5 + (0.48 - mouth_bright) * 1.0),
            "neutral":  0.3,
        }
        total = sum(scores.values()) or 1.0
        normalized = {k: round(v / total, 4) for k, v in scores.items()}

        return {
            "emotion":         max(normalized, key=normalized.get),
            "confidence":      round(fc, 3),
            "all_scores":      normalized,
            "model_available": True,
            "backend":         "opencv-pixel",
            "faces_detected":  len(faces),
        }

    except Exception as e:
        logger.error(f"OpenCV fallback error: {e}")
        return _default_result(MODEL_AVAILABLE)


def predict_emotion(image_data: str) -> dict:
    """
    Main entry point.
    Primary: Groq Vision API (cloud, 0 MB local storage).
    Fallback: OpenCV pixel heuristics (happy/surprised only).
    """
    if GROQ_API_KEY:
        try:
            return _groq_vision_emotion(image_data)
        except Exception as e:
            logger.error(f"All Groq vision attempts failed: {e}")

    if MODEL_AVAILABLE and _opencv_net is not None:
        logger.warning("Using pixel-heuristic fallback (limited accuracy)")
        return _estimate_emotion_opencv(image_data)

    logger.error("No emotion backend available — check GROQ_API_KEY env var")
    return _default_result(False)


def _default_result(model_available: bool) -> dict:
    return {
        "emotion":         "neutral",
        "confidence":      0.0,
        "all_scores":      {l: (1.0 if l == "neutral" else 0.0) for l in EMOTION_LABELS},
        "model_available": model_available,
        "backend":         "fallback",
        "faces_detected":  0,
    }


def is_model_loaded() -> bool:
    return MODEL_AVAILABLE or bool(GROQ_API_KEY)


def get_backend() -> Optional[str]:
    if GROQ_API_KEY:    return "groq-vision"
    if MODEL_AVAILABLE: return "opencv-pixel"
    return "fallback"