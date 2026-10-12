"""MindCare API — FastAPI, Supabase Postgres/Auth, and asynchronous Groq."""
import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

load_dotenv()
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"), format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("mindcare")

@asynccontextmanager
async def lifespan(app: FastAPI):
    from db.supabase import is_configured, open_http_client, close_http_client
    await open_http_client()
    if not is_configured():
        logger.warning("Supabase configuration is missing; API will return clear configuration errors until configured")
    else:
        logger.info("Supabase REST client initialized")
    from services.rag_service import initialize_rag
    try:
        initialize_rag()
    except Exception as exc:
        logger.warning("RAG disabled during startup: %s", type(exc).__name__)
    yield
    try:
        from services.groq_service import close_client as close_groq_client
        await close_groq_client()
    except Exception as exc:
        logger.debug("Groq chat client shutdown skipped: %s", type(exc).__name__)
    try:
        from services.emotion_service import close_client as close_vision_client
        await close_vision_client()
    except Exception as exc:
        logger.debug("Groq vision client shutdown skipped: %s", type(exc).__name__)
    await close_http_client()

app = FastAPI(title="MindCare API", version="4.5.1", lifespan=lifespan,
              description="Mental-wellbeing support API. Not a diagnostic or emergency service.")

raw_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173")
origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
allow_all = origins == ["*"]
app.add_middleware(CORSMiddleware, allow_origins=["*"] if allow_all else origins,
                   allow_credentials=not allow_all, allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
                   allow_headers=["Authorization", "Content-Type", "apikey"])

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


@app.get("/", tags=["system"])
async def root():
    return {"status": "ok", "app": "MindCare API", "version": "4.5.1"}


@app.get("/api/health", tags=["system"])
async def health():
    from db.supabase import is_configured, probe_database
    from services.emotion_service import is_model_loaded, get_backend
    from services.rag_service import is_rag_available
    configured = is_configured()
    reachable = await probe_database() if configured else False
    payload = {
        "status": "healthy" if reachable else "degraded",
        "database_connected": reachable,
        "database": "supabase_postgres",
        "supabase_configured": configured,
        "emotion_provider_configured": is_model_loaded(),
        "emotion_backend": get_backend(),
        "rag_available": is_rag_available(),
        "version": "4.5.1",
    }
    return payload if reachable else JSONResponse(status_code=503, content=payload)
