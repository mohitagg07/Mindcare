"""
Mental-State Trajectory Engine.
EMA-based emotional tracking → trend detection → adaptive AI triggers.

MongoDB collection: 'trajectories'
{user_id, timestamp, sentiment_score, risk_score, state_ema, delta, trigger}
"""
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

logger     = logging.getLogger("mindcare.trajectory")
EMA_ALPHA  = 0.3
WINDOW_HRS = 72


def _sentiment(text: str) -> float:
    """VADER sentiment: -1 (very negative) → +1 (very positive)."""
    try:
        from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
        return round(SentimentIntensityAnalyzer().polarity_scores(text)["compound"], 4)
    except Exception:
        try:
            from textblob import TextBlob
            return round(TextBlob(text).sentiment.polarity, 4)
        except Exception:
            return 0.0


def update_trajectory(user_id: str, message: str, risk_score: float) -> dict:
    """Update EMA state and store trajectory point."""
    from db.database import get_db, utcnow

    db        = get_db()
    sentiment = _sentiment(message)

    # Map: higher risk = lower state. Sentiment adds nuance.
    state_now = round(sentiment * 0.5 + (1.0 - risk_score) * 0.5 - 0.5, 4)

    last     = db.trajectories.find_one({"user_id": user_id}, sort=[("timestamp", -1)])
    prev_ema = last["state_ema"] if last else state_now

    state_ema = round(EMA_ALPHA * state_now + (1.0 - EMA_ALPHA) * prev_ema, 4)
    delta     = round(state_ema - prev_ema, 4)

    if state_ema < -0.55 and delta <= 0:
        trigger = "high_risk"
    elif delta > 0.15:
        trigger = "positive_progress"
    else:
        trigger = "stable"

    db.trajectories.insert_one({
        "user_id":        user_id,
        "timestamp":      utcnow(),
        "sentiment_score": sentiment,
        "risk_score":     risk_score,
        "state_now":      state_now,
        "state_ema":      state_ema,
        "delta":          delta,
        "trigger":        trigger,
    })
    logger.info(f"Trajectory [{user_id[:8]}]: ema={state_ema:.2f} Δ={delta:+.2f} → {trigger}")
    return {"state_ema": state_ema, "delta": delta, "trigger": trigger, "sentiment": sentiment}


def get_trajectory_summary(user_id: str, hours: int = WINDOW_HRS) -> dict:
    """72h summary for the metrics dashboard."""
    from db.database import get_db, utcnow

    db    = get_db()
    since = utcnow() - timedelta(hours=hours)

    pts = list(db.trajectories.find(
        {"user_id": user_id, "timestamp": {"$gte": since}},
        {"state_ema": 1, "delta": 1, "trigger": 1, "timestamp": 1, "sentiment_score": 1}
    ).sort("timestamp", 1))

    if not pts:
        return {"trend": "unknown", "points": 0, "current_ema": None,
                "avg_sentiment": None, "last_trigger": None, "recent": []}

    emas       = [p["state_ema"] for p in pts]
    sentiments = [p["sentiment_score"] for p in pts]

    if len(emas) >= 2:
        d = emas[-1] - emas[0]
        trend = "improving" if d > 0.1 else "deteriorating" if d < -0.1 else "stable"
    else:
        trend = "stable"

    return {
        "trend":        trend,
        "points":       len(pts),
        "current_ema":  round(emas[-1], 3),
        "avg_sentiment": round(sum(sentiments) / len(sentiments), 3),
        "last_trigger": pts[-1].get("trigger"),
        "recent":       [{"t": p["timestamp"].isoformat(), "ema": p["state_ema"]} for p in pts[-10:]],
    }
