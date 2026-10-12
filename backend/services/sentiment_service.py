"""Cached lightweight sentiment analyzer shared by chat and trajectory services."""
from __future__ import annotations

_analyzer = None


def compound_sentiment(text: str) -> float:
    """Return VADER compound sentiment (-1..1); raise if optional analyzer is absent."""
    global _analyzer
    if not text or not text.strip():
        return 0.0
    if _analyzer is None:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        _analyzer = SentimentIntensityAnalyzer()
    return float(_analyzer.polarity_scores(text)["compound"])
