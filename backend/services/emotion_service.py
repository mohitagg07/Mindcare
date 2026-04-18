"""
Emotion Service — Groq Vision API (llama-4-scout) for accurate facial emotion detection.
Falls back to OpenCV pixel heuristics only if Groq API key is unavailable.
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
GROQ_VISION_MODEL = "llama-4-scout-17b-16e-instruct"

VISION_PROMPT = """Analyze the facial expression in this image and determine the person's emotion.

Return ONLY a valid JSON object in this exact format (no markdown, no explanation):
{
  "emotion": "<dominant emotion>",
  "confidence": <0.0-1.0>,
  "faces_detected": <number>,
  "all_scores": {
    "happy": <0.0-1.0>,
    "sad": <0.0-1.0>,
    "angry": <0.0-1.0>,
    "fear": <0.0-1.0>,
    "disgust": <0.0-1.0>,
    "surprise": <0.0-1.0>,
    "neutral": <0.0-1.0>
  },
  "note": "<optional short note if no face detected>"
}

Rules:
- "emotion" must be exactly one of: happy, sad, angry, fear, disgust, surprise, neutral
- all_scores values must be 0.0-1.0 and sum to ~1.0
- "confidence" is your certainty in the dominant emotion (0.0-1.0)
- If no face is visible, set faces_detected to 0, emotion to "neutral", confidence to 0.0
- If multiple faces exist, analyze the most prominent/largest one"""


def load_model():
    global _opencv_net, MODEL_AVAILABLE
    try:
        import cv2
        if os.path.exists(_PROTO_PATH) and os.path.exists(_CAFFE_PATH):
            _opencv_net = cv2.dnn.readNetFromCaffe(_PROTO_PATH, _CAFFE_PATH)
            MODEL_AVAILABLE = True
            logger.info("OpenCV DNN face detector loaded (fallback)")
        else:
            logger.info("OpenCV DNN model files not found — Groq Vision is primary")
    except Exception as e:
        logger.warning(f"OpenCV DNN load failed: {e}")


def _groq_vision_emotion(image_data: str) -> dict:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set")

    try:
        from groq import Groq
    except ImportError:
        raise RuntimeError("groq package not installed")

    if "," in image_data:
        header, b64 = image_data.split(",", 1)
        media_type = "image/jpeg"
        if "png" in header:  media_type = "image/png"
        elif "webp" in header: media_type = "image/webp"
        elif "gif" in header:  media_type = "image/gif"
    else:
        b64, media_type = image_data, "image/jpeg"

    client = Groq(api_key=GROQ_API_KEY)

    response = client.chat.completions.create(
        model=GROQ_VISION_MODEL,
        messages=[{
            "role": "user",
            "content": [
                {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
                {"type": "text", "text": VISION_PROMPT},
            ],
        }],
        max_tokens=512,
        temperature=0.1,
    )

    raw_text = response.choices[0].message.content.strip()
    if raw_text.startswith("```"):
        raw_text = raw_text.split("```")[1]
        if raw_text.startswith("json"):
            raw_text = raw_text[4:]
    raw_text = raw_text.strip()

    result = json.loads(raw_text)

    emotion = result.get("emotion", "neutral").lower()
    if emotion not in EMOTION_LABELS:
        emotion = "neutral"

    all_scores = result.get("all_scores", {})
    cleaned, total = {}, 0.0
    for lbl in EMOTION_LABELS:
        v = float(all_scores.get(lbl, 0.0))
        v = max(0.0, min(1.0, v))
        cleaned[lbl] = v
        total += v
    if total > 0:
        cleaned = {k: round(v / total, 4) for k, v in cleaned.items()}

    confidence = float(result.get("confidence", cleaned.get(emotion, 0.5)))
    confidence = max(0.0, min(1.0, confidence))

    return {
        "emotion":         emotion,
        "confidence":      round(confidence, 3),
        "all_scores":      cleaned,
        "model_available": True,
        "backend":         "groq-vision",
        "faces_detected":  int(result.get("faces_detected", 1)),
        "note":            result.get("note", ""),
    }


def _estimate_emotion_opencv(image_data: str) -> dict:
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

        blob = cv2.dnn.blobFromImage(cv2.resize(frame_bgr, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0))
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
            return {"emotion":"neutral","confidence":0.0,"all_scores":{l:0.0 for l in EMOTION_LABELS},"model_available":True,"backend":"opencv-dnn","faces_detected":0,"note":"No face detected"}

        x1, y1, x2, y2, fc = max(faces, key=lambda f: (f[2]-f[0]) * (f[3]-f[1]))
        face_gray = cv2.cvtColor(frame_bgr[y1:y2, x1:x2], cv2.COLOR_BGR2GRAY)
        fg = cv2.resize(face_gray, (48, 48)).astype(np.float32) / 255.0

        brightness   = float(np.mean(fg))
        contrast     = float(np.std(fg))
        top_dark     = float(np.mean(fg[:16, :]))
        mouth_bright = float(np.mean(fg[32:, :]))
        eye_contrast = float(np.std(fg[16:32, :]))

        scores = {"happy":max(0,(mouth_bright-0.45)*3.0+(brightness-0.4)*1.5),"sad":max(0,(0.5-brightness)*2.0+(0.45-mouth_bright)*1.5),"angry":max(0,(0.5-top_dark)*2.5+(contrast-0.15)*1.0),"surprise":max(0,(eye_contrast-0.18)*4.0+(brightness-0.45)*1.0),"fear":max(0,(eye_contrast-0.16)*2.0+(0.5-brightness)*1.5),"disgust":max(0,(contrast-0.2)*1.5+(0.48-mouth_bright)*1.0),"neutral":0.3}
        total = sum(scores.values()) or 1.0
        normalized = {k: round(v/total, 4) for k, v in scores.items()}
        return {"emotion":max(normalized, key=normalized.get),"confidence":round(fc,3),"all_scores":normalized,"model_available":True,"backend":"opencv-pixel","faces_detected":len(faces)}
    except Exception as e:
        logger.error(f"OpenCV fallback error: {e}")
        return _default_result(MODEL_AVAILABLE)


def predict_emotion(image_data: str) -> dict:
    if GROQ_API_KEY:
        try:
            result = _groq_vision_emotion(image_data)
            logger.info(f"Groq Vision → {result['emotion']} ({result['confidence']:.2f})")
            return result
        except Exception as e:
            logger.error(f"Groq Vision failed, falling back: {e}")

    if MODEL_AVAILABLE and _opencv_net is not None:
        return _estimate_emotion_opencv(image_data)

    logger.warning("No emotion backend available")
    return _default_result(False)


def _default_result(model_available: bool) -> dict:
    return {"emotion":"neutral","confidence":0.0,"all_scores":{l:(1.0 if l=="neutral" else 0.0) for l in EMOTION_LABELS},"model_available":model_available,"backend":"fallback","faces_detected":0}


def is_model_loaded() -> bool:
    return MODEL_AVAILABLE or bool(GROQ_API_KEY)

def get_backend() -> Optional[str]:
    if GROQ_API_KEY:   return "groq-vision"
    if MODEL_AVAILABLE: return "opencv-pixel"
    return "fallback"