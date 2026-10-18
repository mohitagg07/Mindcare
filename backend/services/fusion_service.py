"""Safety cue handling and general support helpers for MindCare.

IMPORTANT:
- No composite clinical risk score is produced by this module.
- PHQ-9/GAD-7 screening totals must be interpreted separately.
- Facial-expression estimates and general sentiment are not used to score or triage a person.
- Keyword cues are a fail-safe prompt to offer a direct safety check, not a classifier,
  diagnosis, or proof that a person is safe when no cue is found.
"""
from __future__ import annotations

import re
from typing import Tuple

# Keep these cues direct and reasonably specific. Broad phrases such as "worthless",
# "no point", or "can't go on" should prompt empathetic clarification in the LLM path,
# not automatically trigger an emergency response by substring matching.
_SAFETY_CUE_PATTERNS: tuple[tuple[str, str], ...] = (
    ("direct_self_harm_intent", r"\b(?:i\s+)?(?:(?:want|plan|intend)\s+to|(?:might|will)\s+|am going\s+to)\s*(?:kill myself|hurt myself|harm myself|end my life|take my own life|commit suicide)\b"),
    ("direct_suicidal_ideation", r"\b(?:i\s+)?(?:want to die|wish i (?:were|was) dead|wish i could die|better off dead|don't want to live|dont want to live|do not want to live)(?:\s+(?:anymore|any more))?\b"),
    ("first_person_suicidal_thoughts", r"\b(?:i am|i'm|im|i have been|i've been)\s+(?:feeling )?suicidal\b|\b(?:i am|i'm|im|i have been|i've been)\s+(?:thinking about|thinking of|having thoughts of)\s+(?:suicide|killing myself|hurting myself|self[- ]harm)\b"),
    ("self_harm_language", r"\b(?:i self[- ]harm|i have self[- ]harmed|i've self[- ]harmed|i am hurting myself|i'm hurting myself|i am harming myself|i'm harming myself|i (?:can't|cannot|don't think i can|dont think i can) keep myself safe)\b|\b(?:thinking about|thinking of|thoughts of)\s+(?:suicide|killing myself|hurting myself|self[- ]harm)\b"),
    ("hinglish_self_harm_cue", r"\b(?:khudkushi kar(?:na|ne)?|khud ko (?:maar(?:na)?|khatam kar(?:na)?|nuksan pahunchana)|jeene ka mann nahi|jeena nahi chahta|jeena nahi chahti|ab aur nahi jeena|marna chahta hoon|marna chahti hoon|mar jana chahta hoon|mar jana chahti hoon)\b"),
)

# Explicit denials should not trigger solely because the words "suicide" or "self-harm"
# are present. Only the matching denial span is masked; a second, positive cue in the same
# message can still trigger a safety response. This is a guard against common false positives,
# not natural-language understanding or a validated safety classifier.
_NEGATED_CUE_PATTERNS: tuple[str, ...] = (
    r"\b(?:i\s+)?(?:don't|dont|do not)\s+want\s+to\s+die\b",
    r"\b(?:i am|i'm|im)\s+not\s+suicidal\b",
    r"\b(?:i am|i'm|im)\s+not\s+(?:thinking about|thinking of|having thoughts of)\s+(?:suicide|killing myself|hurting myself|self[- ]harm)\b",
    r"\bno\s+(?:suicidal thoughts|thoughts of suicide|thoughts of self[- ]harm)\b",
    r"\b(?:i have|i've)\s+no\s+(?:suicidal thoughts|thoughts of suicide|thoughts of self[- ]harm)\b",
)

CRISIS_RESOURCES = """If you may act on these thoughts or cannot keep yourself safe right now, call India's emergency number 112 or go to the nearest emergency department. If you are in India, free 24/7 mental health support is available through Tele-MANAS at 14416. Vandrevala Foundation also offers free 24/7 phone/WhatsApp support at +91 9999 666 555. If you are elsewhere, contact your local emergency number or crisis service."""

SAFETY_CHECK_RESPONSE = """Thank you for telling me. I want to take this seriously without making assumptions. Are you in immediate danger right now, or do you feel you might act on thoughts of harming yourself today?\n\nIf yes, or if you are unsure you can stay safe, please contact emergency support now and, if possible, stay with someone you trust.\n\n""" + CRISIS_RESOURCES


def check_crisis(text: str) -> Tuple[bool, str]:
    """Return whether explicit self-harm language warrants a direct safety check.

    This does not estimate severity or imminent risk and is not exhaustive. A False
    result means only that this small set of cues was not matched; it does not mean
    the user is safe. The model prompt separately instructs the assistant to clarify
    ambiguous hopelessness and to ask about safety when warranted.
    """
    if not isinstance(text, str) or not text.strip():
        return False, ""

    normalized = " ".join(text.lower().replace("’", "'").replace("‘", "'").split())
    searchable = normalized
    for pattern in _NEGATED_CUE_PATTERNS:
        searchable = re.sub(pattern, " ", searchable, flags=re.IGNORECASE)

    for label, pattern in _SAFETY_CUE_PATTERNS:
        if re.search(pattern, searchable, flags=re.IGNORECASE):
            return True, label
    return False, ""


def compute_risk_score(
    phq9_score: int | None = None,
    gad7_score: int | None = None,
    emotion: str | None = None,
    text: str = "",
) -> dict:
    """Deprecated compatibility API: intentionally does not create a risk score.

    Old versions combined questionnaire totals, VADER sentiment, and guessed facial
    expression values into a weighted number. That number was not clinically validated
    and could label a sad face as HIGH risk. Keep a response shape for older callers,
    but return an explicit unassessed state until a clinically governed alternative is
    designed and validated. None of the arguments are used to make a safety decision.
    """
    return {
        "risk_score": None,
        "risk_level": "UNASSESSED",
        "risk_color": "#84918a",
        "is_clinical_assessment": False,
        "status": "disabled_pending_validation",
        "note": "MindCare does not calculate a clinical risk score. Screening results are interpreted separately; facial-expression and sentiment estimates are not safety evidence.",
        "available_signals": {
            "phq9": phq9_score is not None,
            "gad7": gad7_score is not None,
            "emotion_label": bool(emotion),
            "text_signal": bool(text and text.strip()),
        },
        "components": {
            "phq9_contribution": None,
            "gad7_contribution": None,
            "facial_contribution": None,
            "text_contribution": None,
        },
    }


def get_recommendations(risk_level: str | None = None, emotion: str | None = None) -> dict:
    """Return general, low-risk support options; never infer how well/badly a user is doing."""
    return {
        "exercises": [
            "If it feels comfortable, try a few slow, easy breaths without forcing the pace.",
            "Name one thing that feels most important to you right now.",
            "Consider reaching out to a trusted person if you would rather not handle this alone.",
        ],
        "resources": [],
        "message": "I haven't calculated a clinical risk level. We can start with what you tell me and work out what kind of support would help.",
        "personalized_by_risk": False,
    }
