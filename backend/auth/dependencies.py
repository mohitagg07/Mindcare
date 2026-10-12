"""Validate Supabase access tokens and expose a normalized current user."""
import logging
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from db.supabase import SupabaseError, auth_get_user

logger = logging.getLogger("mindcare.auth")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)) -> dict:
    try:
        raw = await auth_get_user(token)
    except SupabaseError as exc:
        if exc.status_code in (400, 401, 403):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired session", headers={"WWW-Authenticate": "Bearer"}) from exc
        raise HTTPException(status_code=503, detail=exc.message) from exc

    user_id = raw.get("id")
    if not user_id or raw.get("banned_until"):
        raise HTTPException(status_code=401, detail="Invalid or inactive account", headers={"WWW-Authenticate": "Bearer"})

    metadata = raw.get("user_metadata") or {}
    return {
        "id": str(user_id),
        "username": metadata.get("username") or (raw.get("email") or "user").split("@", 1)[0],
        "email": raw.get("email") or "",
        "is_active": True,
        "created_at": raw.get("created_at"),
        "access_token": token,
    }
