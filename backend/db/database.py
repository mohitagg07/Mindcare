"""MongoDB database layer — production + test compatible."""
import os, logging
from datetime import datetime, timezone
from pymongo import MongoClient, ASCENDING, DESCENDING

logger = logging.getLogger("mindcare.db")
MONGO_URL = os.getenv("DATABASE_URL", "mongodb://localhost:27017/mindcare")
_client: MongoClient | None = None


def get_client() -> MongoClient:
    global _client
    if _client is None:
        _client = MongoClient(MONGO_URL, serverSelectionTimeoutMS=10000)
    return _client


def get_db():
    db_name = os.getenv("DB_NAME", "mindcare")
    return get_client()[db_name]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def init_db():
    db = get_db()
    # Users
    db.users.create_index("username",  unique=True)
    db.users.create_index("email",     unique=True)
    # Sessions
    db.sessions.create_index("session_id", unique=True)
    db.sessions.create_index("user_id")
    db.sessions.create_index([("started_at", DESCENDING)])
    # Messages
    db.messages.create_index("session_id")
    db.messages.create_index("user_id")
    db.messages.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
    # Trajectory
    db.trajectories.create_index("user_id")
    db.trajectories.create_index([("user_id", ASCENDING), ("timestamp", DESCENDING)])
    # Metrics
    db.metrics.create_index([("timestamp", DESCENDING)])
    logger.info("✅ MongoDB indexes ensured")
    print("✅ MongoDB indexes ensured")
