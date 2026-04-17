"""Middleware: records endpoint latency to MongoDB."""
import time
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start    = time.time()
        response = await call_next(request)
        latency  = int((time.time() - start) * 1000)

        if request.url.path.startswith("/api/"):
            try:
                from db.database import get_db, utcnow
                get_db().metrics.insert_one({
                    "endpoint":    request.url.path,
                    "latency_ms":  latency,
                    "status_code": response.status_code,
                    "timestamp":   utcnow(),
                })
            except Exception:
                pass
        return response
