"""Per-user wellbeing trend indicators persisted in Supabase."""
from __future__ import annotations

import logging
from datetime import datetime, timedelta, timezone
from db.supabase import select_rows, insert_row
from services.sentiment_service import compound_sentiment

logger = logging.getLogger("mindcare.trajectory")
EMA_ALPHA = 0.3
WINDOW_HRS = 72
_MAX_POINTS = 300


def _sentiment(text: str) -> float:
    try:
        return round(compound_sentiment(text), 4)
    except Exception:
        return 0.0


def _summary_from_points(points: list[dict]) -> dict:
    if not points:
        return {"trend": "unknown", "points": 0, "current_ema": None, "avg_sentiment": None, "last_trigger": None, "recent": []}
    emas = [float(point["state_ema"]) for point in points]
    sentiments = [float(point.get("sentiment_score", 0.0)) for point in points]
    change = emas[-1] - emas[0] if len(emas) >= 2 else 0.0
    trend = "improving" if change > 0.1 else "deteriorating" if change < -0.1 else "stable"
    return {
        "trend": trend,
        "points": len(points),
        "current_ema": round(emas[-1], 3),
        "avg_sentiment": round(sum(sentiments) / len(sentiments), 3),
        "last_trigger": points[-1].get("trigger"),
        "recent": [{"t": point.get("created_at"), "ema": float(point["state_ema"])} for point in points[-10:]],
    }


async def update_trajectory(user_id: str, access_token: str, message: str, risk_score: float) -> dict:
    """Write one EMA point and return its 72-hour summary without another DB round trip."""
    sentiment = _sentiment(message)
    risk_score = max(0.0, min(1.0, float(risk_score)))
    state_now = round((sentiment - risk_score) * 0.5, 4)
    now = datetime.now(timezone.utc)
    since = (now - timedelta(hours=WINDOW_HRS)).isoformat()

    recent_desc, _ = await select_rows("trajectories", access_token, {
        "select": "state_ema,delta,trigger,created_at,sentiment_score",
        "user_id": f"eq.{user_id}", "created_at": f"gte.{since}",
        "order": "created_at.desc", "limit": str(_MAX_POINTS),
    })
    recent = list(reversed(recent_desc))

    # Preserve EMA continuity across a gap longer than the display window.
    if recent_desc:
        prev_ema = float(recent_desc[0]["state_ema"])
    else:
        last_rows, _ = await select_rows("trajectories", access_token, {
            "select": "state_ema", "user_id": f"eq.{user_id}",
            "order": "created_at.desc", "limit": "1",
        })
        prev_ema = float(last_rows[0]["state_ema"]) if last_rows else state_now

    state_ema = round(EMA_ALPHA * state_now + (1.0 - EMA_ALPHA) * prev_ema, 4)
    delta = round(state_ema - prev_ema, 4)
    if state_ema < -0.55 and delta <= 0:
        trigger = "high_risk"
    elif delta > 0.15:
        trigger = "positive_progress"
    else:
        trigger = "stable"

    created_at = now.isoformat()
    point = {
        "user_id": user_id, "sentiment_score": sentiment, "risk_score": risk_score,
        "state_now": state_now, "state_ema": state_ema, "delta": delta,
        "trigger": trigger, "created_at": created_at,
    }
    await insert_row("trajectories", access_token, point)
    recent.append({key: point[key] for key in ("state_ema", "delta", "trigger", "created_at", "sentiment_score")})
    recent = recent[-_MAX_POINTS:]
    summary = _summary_from_points(recent)
    logger.debug("Trajectory point stored")
    return {"state_ema": state_ema, "delta": delta, "trigger": trigger, "sentiment": sentiment, "summary": summary}


async def get_trajectory_summary(user_id: str, access_token: str, hours: int = WINDOW_HRS) -> dict:
    since = (datetime.now(timezone.utc) - timedelta(hours=hours)).isoformat()
    # Descending + reverse keeps the latest 300 points when there is heavy activity.
    points_desc, _ = await select_rows("trajectories", access_token, {
        "select": "state_ema,delta,trigger,created_at,sentiment_score",
        "user_id": f"eq.{user_id}", "created_at": f"gte.{since}",
        "order": "created_at.desc", "limit": str(_MAX_POINTS),
    })
    return _summary_from_points(list(reversed(points_desc)))
