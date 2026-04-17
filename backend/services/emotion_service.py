"""
Emotion Service — Real FER-based facial emotion detection.

Uses FER (mtcnn=False) as primary — no TensorFlow required on Render.
Falls back to OpenCV DNN face detector if FER fails.
"""

import os
import base64
import logging
import io
from typing import Optional

import numpy as np

logger = logging.getLogger("mindcare.emotion")

EMOTION_LABELS = ['angry', 'disgust', 'fear', 'happy', 'neutral', 'sad', 'surprise']

_fer_model      = None
_opencv_net     = None
MODEL_AVAILABLE = False

_MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models")
_PROTO_PATH = os.path.join(_MODELS_DIR, "deploy.prototxt")
_CAFFE_PATH = os.path.join(_MODELS_DIR, "res10_300x300_ssd_iter_140000.caffemodel")


def load_model():
    global _fer_model, _opencv_net, MODEL_AVAILABLE

    # 1. FER — primary (uses OpenCV internally, no TensorFlow needed)
    try:
        from fer import FER
        _fer_model = FER(mtcnn=False)
        logger.info("✅ FER emotion model loaded")
    except Exception as e:
        logger.warning(f"FER load failed: {e}")
        _fer_model = None

    # 2. OpenCV DNN — fallback face detector using the shipped .caffemodel
    try:
        import cv2
        if os.path.exists(_PROTO_PATH) and os.path.exists(_CAFFE_PATH):
            _opencv_net = cv2.dnn.readNetFromCaffe(_PROTO_PATH, _CAFFE_PATH)
            logger.info("✅ OpenCV DNN face detector loaded")
        else:
            logger.warning("DNN model files missing in backend/models/")
    except Exception as e:
        logger.warning(f"OpenCV DNN load failed: {e}")
        _opencv_net = None

    MODEL_AVAILABLE = (_fer_model is not None) or (_opencv_net is not None)

    if MODEL_AVAILABLE:
        logger.info(f"✅ Emotion system ready ({get_backend()})")
    else:
        logger.warning("⚠️  Emotion system unavailable — returning neutral defaults")


def predict_emotion(image_data: str) -> dict:
    if not MODEL_AVAILABLE:
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

    except Exception as e:
        logger.error(f"Image decode error: {e}")
        return _default_result(False)

    # ── Path 1: FER ──────────────────────────────────────────────────────────
    if _fer_model is not None:
        try:
            results = _fer_model.detect_emotions(frame_bgr)

            if results:
                best = max(results, key=lambda r: r["box"][2] * r["box"][3])
                emos = best["emotions"]

                all_scores = {
                    label: round(float(emos.get(label, 0.0)), 4)
                    for label in EMOTION_LABELS
                }
                dominant = max(all_scores, key=all_scores.get)

                return {
                    "emotion":         dominant,
                    "confidence":      all_scores[dominant],
                    "all_scores":      all_scores,
                    "model_available": True,
                    "backend":         "fer+dnn",
                    "faces_detected":  len(results),
                }
            else:
                return {
                    "emotion":         "neutral",
                    "confidence":      0.0,
                    "all_scores":      {l: 0.0 for l in EMOTION_LABELS},
                    "model_available": True,
                    "backend":         "fer+dnn",
                    "faces_detected":  0,
                    "note":            "No face detected in image",
                }

        except Exception as e:
            logger.warning(f"FER prediction error, trying OpenCV: {e}")

    # ── Path 2: OpenCV DNN — face detected but no emotion CNN ────────────────
    if _opencv_net is not None:
        try:
            import cv2
            h, w = frame_bgr.shape[:2]
            blob = cv2.dnn.blobFromImage(
                cv2.resize(frame_bgr, (300, 300)), 1.0, (300, 300), (104.0, 177.0, 123.0)
            )
            _opencv_net.setInput(blob)
            detections = _opencv_net.forward()
            faces = sum(1 for i in range(detections.shape[2]) if detections[0, 0, i, 2] > 0.5)

            if faces > 0:
                return {
                    "emotion":         "neutral",
                    "confidence":      0.6,
                    "all_scores":      {l: (0.6 if l == "neutral" else 0.06) for l in EMOTION_LABELS},
                    "model_available": True,
                    "backend":         "opencv-dnn",
                    "faces_detected":  faces,
                    "note":            "Face detected; emotion CNN unavailable",
                }
        except Exception as e:
            logger.warning(f"OpenCV DNN error: {e}")

    return _default_result(True)


def _default_result(model_available: bool) -> dict:
    return {
        "emotion":         "neutral",
        "confidence":      0.0,
        "all_scores":      {label: 0.0 for label in EMOTION_LABELS},
        "model_available": model_available,
        "backend":         "fallback",
        "faces_detected":  0,
    }


def is_model_loaded() -> bool:
    return MODEL_AVAILABLE


def get_backend() -> Optional[str]:
    if _fer_model is not None:
        return "fer+dnn"
    if _opencv_net is not None:
        return "opencv-dnn"
    return "fallback"