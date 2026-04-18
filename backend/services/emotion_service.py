"""
Emotion Service — Groq Vision API for accurate facial emotion detection.
Uses only confirmed-working models with clean fallback chain.
"""
import os, base64, logging, io, json, httpx
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

# Only confirmed-working vision models (decommissioned ones removed)
GROQ_VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",  # Primary — working, confirmed in logs
    "llama-3.2-90b-vision-preview",               # Fallback — larger, slower
]

VISION_PROMPT = """Analyze the facial expression in this image carefully.

Return ONLY valid JSON, no markdown, no explanation:
{
  "emotion": "<dominant emotion>",
  "confidence": <0.0-1.0>,
  "faces_detected": <integer>,
  "all_scores": {
    "happy": <0.0-1.0>,
    "sad": <0.0-1.0>,
    "angry": <0.0-1.0>,
    "fear": <0.0-1.0>,
    "disgust": <0.0-1.0>,
    "surprise": <0.0-1.0>,
    "neutral": <0.0-1.0>
  }
}

Rules:
- "emotion" must be exactly one of: happy, sad, angry, fear, disgust, surprise, neutral
- all_scores must sum to ~1.0
- confidence = your certainty in the dominant emotion
- If no face detected: faces_detected=0, emotion="neutral", confidence=0.0"""


def load_model():
    global _opencv_net, MODEL_AVAILABLE
    try:
        import cv2
        if os.path.exists(_PROTO_PATH) and os.path.exists(_CAFFE_PATH):
            _opencv_net = cv2.dnn.readNetFromCaffe(_PROTO_PATH, _CAFFE_PATH)
            MODEL_AVAILABLE = True
            logger.info("OpenCV DNN loaded (fallback)")
        else:
            logger.info("Groq Vision is primary emotion backend")
    except Exception as e:
        logger.warning(f"OpenCV load failed: {e}")


def _parse_and_clean(raw_text: str, used_model: str) -> dict:
    """Parse JSON from Groq response, clean and validate scores."""
    # Strip markdown fences if present
    text = raw_text.strip()
    if text.startswith("```"):
        parts = text.split("```")
        text = parts[1] if len(parts) > 1 else text
        if text.startswith("json"):
            text = text[4:]
    text = text.strip()

    result = json.loads(text)

    emotion = result.get("emotion", "neutral").lower().strip()
    if emotion not in EMOTION_LABELS:
        emotion = "neutral"

    raw_scores = result.get("all_scores", {})
    cleaned, total = {}, 0.0
    for lbl in EMOTION_LABELS:
        v = max(0.0, min(1.0, float(raw_scores.get(lbl, 0.0))))
        cleaned[lbl] = v
        total += v
    if total > 0:
        cleaned = {k: round(v / total, 4) for k, v in cleaned.items()}
    else:
        cleaned = {l: (1.0 if l == emotion else 0.0) for l in EMOTION_LABELS}

    confidence = max(0.0, min(1.0, float(result.get("confidence", cleaned.get(emotion, 0.5)))))

    return {
        "emotion":         emotion,
        "confidence":      round(confidence, 3),
        "all_scores":      cleaned,
        "model_available": True,
        "backend":         f"groq-vision ({used_model.split('/')[-1]})",
        "faces_detected":  int(result.get("faces_detected", 1)),
        "note":            result.get("note", ""),
    }


def _groq_vision_emotion(image_data: str) -> dict:
    if not GROQ_API_KEY:
        raise RuntimeError("GROQ_API_KEY not set")

    # Parse image data
    if "," in image_data:
        header, b64 = image_data.split(",", 1)
        media_type = "image/jpeg"
        if "png" in header:  media_type = "image/png"
        elif "webp" in header: media_type = "image/webp"
        elif "gif" in header:  media_type = "image/gif"
    else:
        b64, media_type = image_data, "image/jpeg"

    last_error = None
    for model in GROQ_VISION_MODELS:
        try:
            logger.info(f"Trying Groq model: {model}")
            payload = {
                "model": model,
                "max_tokens": 400,
                "temperature": 0.1,
                "messages": [{
                    "role": "user",
                    "content": [
                        {"type": "image_url", "image_url": {"url": f"data:{media_type};base64,{b64}"}},
                        {"type": "text", "text": VISION_PROMPT},
                    ],
                }],
            }
            response = httpx.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={"Authorization": f"Bearer {GROQ_API_KEY}", "Content-Type": "application/json"},
                json=payload,
                timeout=25.0,
            )
            if response.status_code == 400:
                err_body = response.json()
                err_msg = err_body.get("error", {}).get("message", "400 error")
                # Skip decommissioned models
                if "decommission" in err_msg or "not exist" in err_msg or "deprecated" in err_msg:
                    logger.warning(f"Model {model} decommissioned, skipping")
                    continue
                raise RuntimeError(err_msg)

            response.raise_for_status()
            raw_text = response.json()["choices"][0]["message"]["content"]
            result = _parse_and_clean(raw_text, model)
            logger.info(f"Groq Vision [{model}] → {result['emotion']} ({result['confidence']:.2f})")
            return result

        except (json.JSONDecodeError, KeyError) as e:
            logger.warning(f"Model {model} parse error: {e}")
            last_error = e
            continue
        except RuntimeError:
            raise
        except Exception as e:
            logger.warning(f"Model {model} failed: {e}")
            last_error = e
            continue

    raise RuntimeError(f"All Groq vision models failed. Last error: {last_error}")


def predict_emotion(image_data: str) -> dict:
    """Primary entry point — Groq Vision with OpenCV fallback."""
    if GROQ_API_KEY:
        try:
            return _groq_vision_emotion(image_data)
        except Exception as e:
            logger.error(f"All Groq vision models failed, trying OpenCV: {e}")

    if MODEL_AVAILABLE and _opencv_net is not None:
        return _opencv_fallback(image_data)

    logger.warning("No emotion backend available")
    return _default_result(False)


def _opencv_fallback(image_data: str) -> dict:
    try:
        from PIL import Image
        import cv2
        if "," in image_data:
            image_data = image_data.split(",")[1]
        img_bytes = base64.b64decode(image_data)
        pil_img   = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        frame_bgr = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
        h, w      = frame_bgr.shape[:2]

        blob = cv2.dnn.blobFromImage(cv2.resize(frame_bgr,(300,300)),1.0,(300,300),(104.,177.,123.))
        _opencv_net.setInput(blob)
        dets = _opencv_net.forward()

        faces = []
        for i in range(dets.shape[2]):
            c = dets[0,0,i,2]
            if c > 0.5:
                box = (dets[0,0,i,3:7]*np.array([w,h,w,h])).astype(int)
                x1,y1,x2,y2 = max(0,box[0]),max(0,box[1]),min(w,box[2]),min(h,box[3])
                if x2>x1 and y2>y1: faces.append((x1,y1,x2,y2,float(c)))

        if not faces:
            return {"emotion":"neutral","confidence":0.0,"all_scores":{l:0.0 for l in EMOTION_LABELS},"model_available":True,"backend":"opencv","faces_detected":0}

        x1,y1,x2,y2,fc = max(faces, key=lambda f:(f[2]-f[0])*(f[3]-f[1]))
        fg = cv2.resize(cv2.cvtColor(frame_bgr[y1:y2,x1:x2],cv2.COLOR_BGR2GRAY),(48,48)).astype(np.float32)/255.
        bri=float(np.mean(fg)); con=float(np.std(fg)); top=float(np.mean(fg[:16,:])); mou=float(np.mean(fg[32:,:])); eye=float(np.std(fg[16:32,:]))
        s={"happy":max(0,(mou-0.45)*3+(bri-0.4)*1.5),"sad":max(0,(0.5-bri)*2+(0.45-mou)*1.5),"angry":max(0,(0.5-top)*2.5+(con-0.15)),"surprise":max(0,(eye-0.18)*4+(bri-0.45)),"fear":max(0,(eye-0.16)*2+(0.5-bri)*1.5),"disgust":max(0,(con-0.2)*1.5+(0.48-mou)),"neutral":0.3}
        t=sum(s.values()) or 1.
        n={k:round(v/t,4) for k,v in s.items()}
        return {"emotion":max(n,key=n.get),"confidence":round(fc,3),"all_scores":n,"model_available":True,"backend":"opencv","faces_detected":len(faces)}
    except Exception as e:
        logger.error(f"OpenCV fallback error: {e}")
        return _default_result(True)


def _default_result(model_available: bool) -> dict:
    return {"emotion":"neutral","confidence":0.0,"all_scores":{l:(1.0 if l=="neutral" else 0.0) for l in EMOTION_LABELS},"model_available":model_available,"backend":"fallback","faces_detected":0}

def is_model_loaded() -> bool: return MODEL_AVAILABLE or bool(GROQ_API_KEY)
def get_backend() -> Optional[str]: return "groq-vision" if GROQ_API_KEY else ("opencv" if MODEL_AVAILABLE else "fallback")