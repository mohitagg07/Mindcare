from typing import Tuple

EMOTION_RISK_MAP = {
    "angry":    0.65,
    "disgust":  0.55,
    "fear":     0.80,
    "happy":    0.05,
    "neutral":  0.25,
    "sad":      0.85,
    "surprise": 0.30,
}

CRISIS_KEYWORDS = [
    "suicide", "kill myself", "end my life", "don't want to live",
    "want to die", "self harm", "hurt myself", "no reason to live",
    "better off dead", "can't go on", "no point", "ending it",
    "worthless", "disappear forever",
]

CRISIS_RESOURCES = """
If you might act on these thoughts or are in immediate danger, contact your local emergency number or go to the nearest emergency department now. If you can, tell someone you trust and stay near them while you get support. For a phone, text, or chat service in your country, use Find A Helpline: https://findahelpline.com/.
"""


def check_crisis(text: str) -> Tuple[bool, str]:
    lower = text.lower()
    for kw in CRISIS_KEYWORDS:
        if kw in lower:
            return True, kw
    return False, ""


def get_text_sentiment_risk(text: str) -> float:
    """Returns 0.0 (very positive) to 1.0 (very negative) risk."""
    try:
        from services.sentiment_service import compound_sentiment
        compound = compound_sentiment(text)
        return round((1.0 - compound) / 2.0, 4)
    except Exception:
        return 0.5


def compute_risk_score(
    phq9_score: int | None = None,
    gad7_score: int | None = None,
    emotion: str | None = None,
    text: str = "",
) -> dict:
    components = []
    weights = []
    phq9_n = (phq9_score / 27.0) if phq9_score is not None else None
    gad7_n = (gad7_score / 21.0) if gad7_score is not None else None
    facial_risk = EMOTION_RISK_MAP.get(emotion.lower()) if emotion and emotion.lower() in EMOTION_RISK_MAP else None
    text_risk = get_text_sentiment_risk(text) if text.strip() else None

    # Only include signals actually provided; do not treat a missing assessment as a zero score.
    if phq9_n is not None:
        components.append(phq9_n); weights.append(0.40)
    if gad7_n is not None:
        components.append(gad7_n); weights.append(0.25)
    if facial_risk is not None:
        components.append(facial_risk); weights.append(0.20)
    if text_risk is not None:
        components.append(text_risk); weights.append(0.15)
    final = round(sum(value * weight for value, weight in zip(components, weights)) / sum(weights), 3) if weights else 0.0

    if final >= 0.75:
        level, color = "HIGH",      "#ef4444"
    elif final >= 0.50:
        level, color = "MODERATE",  "#f97316"
    elif final >= 0.25:
        level, color = "LOW",       "#eab308"
    else:
        level, color = "MINIMAL",   "#22c55e"

    return {
        "risk_score": final,
        "risk_level": level,
        "risk_color": color,
        "is_clinical_assessment": False,
        "available_signals": {
            "phq9": phq9_score is not None,
            "gad7": gad7_score is not None,
            "emotion_label": facial_risk is not None,
            "text_signal": text_risk is not None,
        },
        "components": {
            "phq9_contribution": round(phq9_n, 3) if phq9_n is not None else None,
            "gad7_contribution": round(gad7_n, 3) if gad7_n is not None else None,
            "facial_contribution": round(facial_risk, 3) if facial_risk is not None else None,
            "text_contribution": round(text_risk, 3) if text_risk is not None else None,
        },
    }


def get_recommendations(risk_level: str, emotion: str) -> dict:
    exercises = [
        "If it feels comfortable, slow your breathing for a few moments. You can stop at any time.",
        "Look around and name a few things you can see, hear, and feel where you are.",
        "Consider telling someone you trust what today has been like.",
    ]
    resources = []
    message = "These are optional ideas, not a reading of how you are doing. Keep what feels useful and leave the rest."

    if risk_level in {"HIGH", "MODERATE"}:
        resources = [
            {"name": "Find a support line by country", "contact": "https://findahelpline.com/", "type": "directory"},
            {"name": "Professional support", "contact": "A qualified mental health professional", "type": "care"},
        ]
        message = "This activity indicator is experimental and cannot assess your safety. If you might hurt yourself or are in immediate danger, contact local emergency services or go to the nearest emergency department."

    return {"exercises": exercises, "resources": resources, "message": message}
