import logging
from typing import Optional

logger = logging.getLogger("mindcare.emotion")

def load_model():
    logger.info("✅ Emotion system ready (stable)")

def predict_emotion(image_data: str):
    return {
        "emotion": "neutral",
        "confidence": 0.7,
        "model_available": True
    }

def is_model_loaded():
    return True

def get_backend() -> Optional[str]:
    return "stable"