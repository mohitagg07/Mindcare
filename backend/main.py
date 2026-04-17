"""
MindCare API v3.0 — Production-ready
"""
import os, logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from dotenv import load_dotenv

load_dotenv()

# ── Logging ─────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("mindcare")

# ── ENV CHECK ───────────────────────────────────────
missing = [k for k in ["GROQ_API_KEY", "DATABASE_URL", "SECRET_KEY"] if not os.getenv(k)]
if missing:
    logger.warning(f"Missing env vars: {', '.join(missing)}")

# ── RATE LIMIT ──────────────────────────────────────
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="MindCare API", version="3.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ── CORS ────────────────────────────────────────────
origins = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ROUTERS ─────────────────────────────────────────
from routers.auth import router as auth_router
from routers.chat import router as chat_router
from routers.assessment import router as assessment_router
from routers.emotion import router as emotion_router
from routers.metrics import router as metrics_router

app.include_router(auth_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(assessment_router, prefix="/api")
app.include_router(emotion_router, prefix="/api")
app.include_router(metrics_router, prefix="/api")


# ── STARTUP ─────────────────────────────────────────
@app.on_event("startup")
async def startup():
    logger.info("🚀 Starting MindCare API...")

    from db.database import init_db
    init_db()
    logger.info("✅ MongoDB connected")

    from services.emotion_service import load_model
    load_model()

    from services.rag_service import initialize_rag
    try:
        initialize_rag()
        logger.info("✅ RAG initialized")
    except Exception as e:
        logger.warning(f"⚠️ RAG not available: {e}")

    logger.info("🧠 MindCare API ready!")


# ── HEALTH ──────────────────────────────────────────
@app.get("/api/health")
def health():
    from services.emotion_service import is_model_loaded, get_backend
    from services.rag_service import is_rag_available

    return {
        "status": "healthy",
        "emotion_model": is_model_loaded(),
        "emotion_backend": get_backend(),
        "rag_available": is_rag_available(),
        "version": "3.0.0",
        "database": "mongodb"
    }


@app.get("/")
def root():
    return {"status": "ok", "app": "MindCare API", "version": "3.0.0"}