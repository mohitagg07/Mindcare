"""Canonical validation for chat inputs that cross into system-prompt context.

This module deliberately keeps validation small and deterministic. User text remains user
content; only a tightly allow-listed visual-expression label may be passed as an auxiliary
context hint. The label is not a measure of internal mood and must never drive safety triage.
"""
from __future__ import annotations

ALLOWED_EXPRESSION_LABELS = frozenset({
    "angry", "disgust", "fear", "happy", "neutral", "sad", "surprise",
})


def normalize_chat_message(value: object) -> str:
    """Trim message boundaries and reject non-text or whitespace-only input.

    Internal whitespace and line breaks are preserved because they can be meaningful in a
    user's story. Validation prevents empty turns without rewriting the user's language.
    """
    if not isinstance(value, str):
        raise ValueError("Message must be text")
    normalized = value.strip()
    if not normalized:
        raise ValueError("Message cannot be empty or whitespace only")
    return normalized


def normalize_expression_label(value: object) -> str | None:
    """Return a known expression label or None; never forward arbitrary client text to a prompt."""
    if not isinstance(value, str):
        return None
    normalized = value.strip().lower()
    return normalized if normalized in ALLOWED_EXPRESSION_LABELS else None
