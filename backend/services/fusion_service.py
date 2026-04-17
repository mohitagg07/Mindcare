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
🆘 CRISIS RESOURCES — You are not alone:
• iCall (India): 9152987821
• Vandrevala Foundation: 1860-2662-345
• AASRA: 9820466627
• Crisis Text Line: Text HOME to 741741
• Befrienders: www.befrienders.org
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
        from textblob import TextBlob
        polarity = TextBlob(text).sentiment.polarity  # -1 to +1
        return round((1.0 - polarity) / 2.0, 4)
    except Exception:
        return 0.5


def compute_risk_score(
    phq9_score: int = 0,
    gad7_score: int = 0,
    emotion: str = "neutral",
    text: str = "",
) -> dict:
    phq9_n = phq9_score / 27.0
    gad7_n = gad7_score / 21.0
    facial_risk = EMOTION_RISK_MAP.get(emotion.lower(), 0.25)
    text_risk = get_text_sentiment_risk(text) if text.strip() else 0.5

    # Weighted fusion formula
    final = (
        0.40 * phq9_n
        + 0.25 * gad7_n
        + 0.20 * facial_risk
        + 0.15 * text_risk
    )
    final = round(min(max(final, 0.0), 1.0), 3)

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
        "components": {
            "phq9_contribution":   round(phq9_n, 3),
            "gad7_contribution":   round(gad7_n, 3),
            "facial_contribution": round(facial_risk, 3),
            "text_contribution":   round(text_risk, 3),
        },
    }


def get_recommendations(risk_level: str, emotion: str) -> dict:
    exercises = []
    resources = []
    message = ""

    if risk_level == "HIGH":
        exercises = [
            "4-7-8 Breathing: Inhale for 4 sec → Hold 7 sec → Exhale 8 sec. Repeat 4×.",
            "5-4-3-2-1 Grounding: Name 5 things you see, 4 you hear, 3 you touch, 2 you smell, 1 you taste.",
            "Safe Space Visualization: Close eyes, vividly imagine a place you feel completely safe and calm.",
            "Self-compassion break: Place hand on heart, say 'This is a moment of pain. I deserve kindness.'",
        ]
        resources = [
            {"name": "iCall (India)",          "contact": "9152987821",         "type": "phone"},
            {"name": "Vandrevala Foundation",   "contact": "1860-2662-345",      "type": "phone"},
            {"name": "AASRA",                   "contact": "9820466627",         "type": "phone"},
            {"name": "Crisis Text Line",        "contact": "Text HOME to 741741","type": "text"},
        ]
        message = "You're going through an intensely difficult time. Your feelings are valid. Please reach out to a mental health professional or crisis line — you deserve support right now."

    elif risk_level == "MODERATE":
        exercises = [
            "Box Breathing: Inhale 4s → Hold 4s → Exhale 4s → Hold 4s. Repeat 5 cycles.",
            "Progressive Muscle Relaxation: Tense each muscle group 5 seconds, release. Feet → head.",
            "Gratitude + Challenge Journal: Write 3 gratitudes and 1 challenge you navigated today.",
            "Mindful Walk: 10-minute walk focusing entirely on sensory experience — no phone.",
            "STOP Technique: Stop, Take a breath, Observe your feelings, Proceed with awareness.",
        ]
        resources = [
            {"name": "Wysa App",    "contact": "wysa.io",          "type": "app"},
            {"name": "iCall",       "contact": "9152987821",        "type": "phone"},
            {"name": "Headspace",   "contact": "headspace.com",     "type": "app"},
            {"name": "Woebot",      "contact": "woebot.io",         "type": "app"},
        ]
        message = "You're experiencing moderate distress. These exercises genuinely help. Consider speaking with a therapist — even a few sessions can make a big difference."

    elif risk_level == "LOW":
        exercises = [
            "Morning meditation: 5 minutes with Headspace or Calm app.",
            "Gratitude journaling: Write 3 specific good things before bed.",
            "Physical movement: Even 15 minutes of walking improves mood by ~20%.",
            "Social connection: Reach out to one person you care about today.",
        ]
        resources = [
            {"name": "Headspace",    "contact": "headspace.com", "type": "app"},
            {"name": "Calm App",     "contact": "calm.com",      "type": "app"},
        ]
        message = "You're managing well. Staying proactive with self-care is the best prevention. Keep checking in with yourself."

    else:  # MINIMAL
        exercises = [
            "Continue whatever is working for you — you're doing well!",
            "Try a new hobby or creative outlet this week.",
            "Practice 5 minutes of mindfulness daily to build resilience.",
        ]
        resources = [
            {"name": "Calm App", "contact": "calm.com", "type": "app"},
        ]
        message = "You're in a good place. Keep nurturing your mental wellness as a daily practice."

    return {"exercises": exercises, "resources": resources, "message": message}
