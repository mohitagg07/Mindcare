"""
Emotion Service — OpenCV DNN face detection + lightweight pixel-based emotion hints.
No FER, no torch, no tensorflow. Fits in 512MB RAM.
"""
import os
import base64
import logging
import io
from typing import Optional
import numpy as np

logger = logging.getLogger("mindcare.emotion")

EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

_opencv_net     = None
MODEL_AVAILABLE = False

_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
_PROTO_PATH = os.path.join(_MODELS_DIR, "deploy.prototxt")
_CAFFE_PATH = os.path.join(_MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel")


def load_model():
    global _opencv_net, MODEL_AVAILABLE
    try:
        import cv2
        if os.path.exists(_PROTO_PATH) and os.path.exists(_CAFFE_PATH):
            _opencv_net = cv2.dnn.readNetFromCaffe(_PROTO_PATH, _CAFFE_PATH)
            MODEL_AVAILABLE = True
            logger.info("✅ OpenCV DNN face detector loaded")
        else:
            logger.warning("DNN model files missing in backend/models/")
    except Exception as e:
        logger.warning(f"OpenCV DNN load failed: {e}")


def _estimate_emotion(face_gray: np.ndarray) -> dict:
    """
    Lightweight emotion estimation from face pixel statistics.
    Uses brightness, contrast, and region analysis as proxies.
    Not as accurate as FER but works with zero extra dependencies.
    """
    if face_gray.size == 0:
        return {l: (1.0 if l == "neutral" else 0.0) for l in EMOTION_LABELS}

    h, w = face_gray.shape
    # Resize to standard size
    import cv2
    face = cv2.resize(face_gray, (48, 48)).astype(np.float32) / 255.0

    # Region splits
    top    = face[:16, :]   # forehead / brows
    mid    = face[16:32, :] # eyes / nose
    bottom = face[32:, :]   # mouth / chin

    # Feature extraction
    brightness = float(np.mean(face))
    contrast   = float(np.std(face))
    top_dark   = float(np.mean(top))    # dark brows → anger/sad
    mouth_bright = float(np.mean(bottom))  # bright mouth → smile
    eye_contrast = float(np.std(mid))   # high contrast eyes → surprise/fear

    # Rule-based scoring
    scores = {
        "happy":    max(0, (mouth_bright - 0.45) * 3.0 + (brightness - 0.4) * 1.5),
        "sad":      max(0, (0.5 - brightness) * 2.0 + (0.45 - mouth_bright) * 1.5),
        "angry":    max(0, (0.5 - top_dark) * 2.5 + (contrast - 0.15) * 1.0),
        "surprise": max(0, (eye_contrast - 0.18) * 4.0 + (brightness - 0.45) * 1.0),
        "fear":     max(0, (eye_contrast - 0.16) * 2.0 + (0.5 - brightness) * 1.5),
        "disgust":  max(0, (contrast - 0.2) * 1.5 + (0.48 - mouth_bright) * 1.0),
        "neutral":  0.3,
    }

    # Normalize to sum to 1
    total = sum(scores.values()) or 1.0
    normalized = {k: round(v / total, 4) for k, v in scores.items()}
    dominant   = max(normalized, key=normalized.get)

    return normalized, dominant


def predict_emotion(image_data: str) -> dict:
    if not MODEL_AVAILABLE or _opencv_net is None:
        return _default_result(False)

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

        # Detect faces
        blob = cv2.dnn.blobFromImage(
            cv2.resize(frame_bgr, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0)
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
                "faces_detected": 0, "note": "No face detected",
            }

        # Use largest face
        x1, y1, x2, y2, conf = max(faces, key=lambda f: (f[2]-f[0]) * (f[3]-f[1]))
        face_region = frame_bgr[y1:y2, x1:x2]
        face_gray   = cv2.cvtColor(face_region, cv2.COLOR_BGR2GRAY)

        all_scores, dominant = _estimate_emotion(face_gray)

        return {
            "emotion":         dominant,
            "confidence":      round(conf, 3),
            "all_scores":      all_scores,
            "model_available": True,
            "backend":         "opencv-pixel",
            "faces_detected":  len(faces),
        }

    except Exception as e:
        logger.error(f"Emotion prediction error: {e}")
        return _default_result(True)


def _default_result(model_available: bool) -> dict:
    return {
        "emotion": "neutral", "confidence": 0.0,
        "all_scores": {l: 0.0 for l in EMOTION_LABELS},
        "model_available": model_available, "backend": "fallback", "faces_detected": 0,
    }


def is_model_loaded() -> bool:
    return MODEL_AVAILABLE

def get_backend() -> Optional[str]:
    return "opencv-pixel" if MODEL_AVAILABLE else "fallback"