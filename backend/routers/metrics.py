"""User-scoped analytics built from Supabase Postgres records."""
from collections import Counter
from fastapi import APIRouter, Depends, Response
from auth.dependencies import get_current_user
from db.supabase import select_rows
from services.trajectory_service import get_trajectory_summary

router = APIRouter(prefix="/metrics", tags=["metrics"])
@router.get("/overview")
async def overview(current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    _, sessions = await select_rows("conversations", token, {"select": "id", "user_id": f"eq.{uid}"}, count=True)
    _, messages_count = await select_rows("messages", token, {"select": "id", "user_id": f"eq.{uid}"}, count=True)
    recent, _ = await select_rows("messages", token, {
        "select": "latency_ms", "user_id": f"eq.{uid}", "role": "eq.assistant",
        "latency_ms": "not.is.null", "order": "created_at.desc", "limit": "200",
    })
    values = [int(row["latency_ms"]) for row in recent if row.get("latency_ms") is not None]
    return {"total_sessions": sessions or 0, "total_messages": messages_count or 0,
            "avg_latency_ms": round(sum(values) / len(values)) if values else 0}


@router.get("/trajectory")
async def trajectory(current_user=Depends(get_current_user)):
    return await get_trajectory_summary(current_user["id"], current_user["access_token"])


@router.get("/emotion-distribution")
async def emotion_distribution(current_user=Depends(get_current_user)):
    rows, _ = await select_rows("messages", current_user["access_token"], {
        "select": "emotion", "user_id": f"eq.{current_user['id']}",
        "emotion": "not.is.null", "limit": "2000",
    })
    counts = Counter(row["emotion"] for row in rows if row.get("emotion"))
    return [{"emotion": key, "count": value} for key, value in counts.items()]


@router.get("/risk-distribution")
async def risk_distribution(current_user=Depends(get_current_user)):
    rows, _ = await select_rows("conversations", current_user["access_token"], {
        "select": "risk_level", "user_id": f"eq.{current_user['id']}",
        "risk_level": "not.is.null", "limit": "1000",
    })
    counts = Counter(row["risk_level"] for row in rows if row.get("risk_level"))
    return [{"level": key, "count": value} for key, value in counts.items()]


@router.get("/model-performance")
async def model_performance(current_user=Depends(get_current_user)):
    from services.emotion_service import is_model_loaded, get_backend
    return {
        "dataset": "No independent validation report configured",
        "architecture": "Groq Vision API; no synthetic local fallback",
        "training_accuracy": None, "validation_accuracy": None, "test_accuracy": None,
        "available": is_model_loaded(), "backend": get_backend(), "per_class": [],
        "note": "Emotion labels are uncertain visual estimates and are not clinical indicators.",
    }


@router.get("/my-sessions")
async def my_sessions(current_user=Depends(get_current_user)):
    uid, token = current_user["id"], current_user["access_token"]
    sessions, _ = await select_rows("conversations", token, {
        "select": "id,created_at,phq9_score,phq9_category,gad7_score,risk_level,risk_score,trajectory_trend",
        "user_id": f"eq.{uid}", "order": "created_at.desc", "limit": "20",
    })
    if not sessions:
        return []
    # Fetch recent message ownership metadata once instead of one network round trip per session.
    session_ids = [item["id"] for item in sessions]
    message_rows, _ = await select_rows("messages", token, {
        "select": "conversation_id", "user_id": f"eq.{uid}",
        "conversation_id": f"in.({','.join(session_ids)})", "limit": "5000",
    })
    message_counts = Counter(row["conversation_id"] for row in message_rows if row.get("conversation_id"))
    results = []
    for item in sessions:
        results.append({
            "session_id": item["id"], "started_at": item.get("created_at"),
            "phq9_score": item.get("phq9_score"), "phq9_category": item.get("phq9_category"),
            "gad7_score": item.get("gad7_score"), "risk_level": item.get("risk_level"),
            "risk_score": item.get("risk_score"), "trajectory_trend": item.get("trajectory_trend"),
            "message_count": message_counts.get(item["id"], 0),
        })
    return results
