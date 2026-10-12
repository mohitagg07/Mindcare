"""Small in-process rate limiter for authentication, avatar, and image-analysis endpoints.

Use a shared gateway/WAF rate limit for multi-instance production deployments.
"""
from collections import defaultdict, deque
from threading import Lock
from time import monotonic
from fastapi import HTTPException, Request

_events: dict[tuple[str, str], deque[float]] = defaultdict(deque)
_lock = Lock()
_MAX_KEYS = 10000


def rate_limit(scope: str, max_requests: int, window_seconds: int = 60):
    def dependency(request: Request):
        ip = request.client.host if request.client else "unknown"
        key = (scope, ip)
        now = monotonic()
        with _lock:
            # Prevent unbounded key growth from spoofed/client IP churn.
            if len(_events) > _MAX_KEYS:
                for old_key in list(_events)[: max(1, _MAX_KEYS // 10)]:
                    _events.pop(old_key, None)
            queue = _events[key]
            while queue and now - queue[0] >= window_seconds:
                queue.popleft()
            if len(queue) >= max_requests:
                retry_after = max(1, int(window_seconds - (now - queue[0])))
                raise HTTPException(status_code=429, detail="Too many requests. Please wait and try again.", headers={"Retry-After": str(retry_after)})
            queue.append(now)
    return dependency
