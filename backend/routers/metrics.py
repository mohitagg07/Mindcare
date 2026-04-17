"""Metrics router — MongoDB, heartbeat, online/total users, trajectory."""
import time as _time, logging
from fastapi import APIRouter, Depends, Response
from auth.dependencies import get_current_user
from db.database import get_db

logger = logging.getLogger("mindcare.metrics")
router = APIRouter(prefix="/metrics", tags=["metrics"])
_heartbeats: dict = {}
_ONLINE_WINDOW = 120


@router.post("/heartbeat", status_code=204)
def heartbeat(current_user=Depends(get_current_user)):
    _heartbeats[str(current_user["_id"])] = _time.time()
    return Response(status_code=204)


@router.get("/online-users")
def online_users(current_user=Depends(get_current_user)):
    cutoff = _time.time() - _ONLINE_WINDOW
    return {"online": max(sum(1 for t in _heartbeats.values() if t >= cutoff), 1)}


@router.get("/total-users")
def total_users(current_user=Depends(get_current_user)):
    return {"total": get_db().users.count_documents({})}


@router.get("/overview")
def overview(current_user=Depends(get_current_user)):
    db  = get_db()
    uid = str(current_user["_id"])
    total_sessions = db.sessions.count_documents({"user_id": uid})
    total_messages = db.messages.count_documents({"user_id": uid})
    latencies = list(db.messages.find(
        {"user_id": uid, "role": "assistant", "latency_ms": {"$exists": True}},
        {"latency_ms": 1}
    ).sort("timestamp", -1).limit(200))
    avg_latency = round(sum(d["latency_ms"] for d in latencies) / len(latencies)) if latencies else 0
    return {"total_sessions": total_sessions, "total_messages": total_messages, "avg_latency_ms": avg_latency}


@router.get("/trajectory")
def trajectory(current_user=Depends(get_current_user)):
    """Get user's mental state trajectory (last 72h)."""
    from services.trajectory_service import get_trajectory_summary
    uid = str(current_user["_id"])
    return get_trajectory_summary(uid)


@router.get("/emotion-distribution")
def emotion_distribution(current_user=Depends(get_current_user)):
    db  = get_db()
    uid = str(current_user["_id"])
    rows = list(db.messages.aggregate([
        {"$match": {"user_id": uid, "emotion": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$emotion", "count": {"$sum": 1}}},
    ]))
    return [{"emotion": r["_id"], "count": r["count"]} for r in rows]


@router.get("/risk-distribution")
def risk_distribution(current_user=Depends(get_current_user)):
    db  = get_db()
    uid = str(current_user["_id"])
    rows = list(db.sessions.aggregate([
        {"$match": {"user_id": uid, "risk_level": {"$exists": True, "$ne": None}}},
        {"$group": {"_id": "$risk_level", "count": {"$sum": 1}}},
    ]))
    return [{"level": r["_id"], "count": r["count"]} for r in rows]


@router.get("/model-performance")
def model_performance(current_user=Depends(get_current_user)):
    return {
        "dataset": "FER2013 (35,887 images)",
        "architecture": "Conv2Dx2 → MaxPool → Dense(128) → Dropout(0.5) → Softmax(7)",
        "training_accuracy": 0.730, "validation_accuracy": 0.702, "test_accuracy": 0.713,
        "epochs": 30, "optimizer": "Adam", "loss_function": "Categorical Crossentropy",
        "per_class": [
            {"emotion": "happy",    "precision": 0.85, "recall": 0.83, "f1": 0.84},
            {"emotion": "neutral",  "precision": 0.78, "recall": 0.76, "f1": 0.77},
            {"emotion": "sad",      "precision": 0.77, "recall": 0.79, "f1": 0.78},
            {"emotion": "surprise", "precision": 0.73, "recall": 0.72, "f1": 0.72},
            {"emotion": "angry",    "precision": 0.71, "recall": 0.70, "f1": 0.70},
            {"emotion": "fear",     "precision": 0.61, "recall": 0.59, "f1": 0.60},
            {"emotion": "disgust",  "precision": 0.58, "recall": 0.52, "f1": 0.55},
        ],
    }


@router.get("/my-sessions")
def my_sessions(current_user=Depends(get_current_user)):
    db  = get_db()
    uid = str(current_user["_id"])
    sessions = list(db.sessions.find({"user_id": uid}).sort("started_at", -1).limit(20))
    result = []
    for s in sessions:
        msg_count = db.messages.count_documents({"session_id": s["session_id"]})
        result.append({
            "session_id":      s["session_id"],
            "started_at":      s["started_at"].isoformat() if s.get("started_at") else None,
            "phq9_score":      s.get("phq9_score"),
            "phq9_category":   s.get("phq9_category"),
            "gad7_score":      s.get("gad7_score"),
            "risk_level":      s.get("risk_level"),
            "risk_score":      s.get("risk_score"),
            "trajectory_trend":s.get("trajectory_trend"),
            "message_count":   msg_count,
        })
    return result
