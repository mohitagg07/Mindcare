"""FastAPI dependency: get_current_user — MongoDB version."""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from auth.jwt import decode_token
from db.database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(token: str = Depends(oauth2_scheme)):
    exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    payload = decode_token(token)
    if payload is None:
        raise exc
    user_id = payload.get("sub")
    if not user_id:
        raise exc
    from bson import ObjectId
    try:
        user = get_db().users.find_one({"_id": ObjectId(user_id)})
    except Exception:
        raise exc
    if user is None or not user.get("is_active", True):
        raise exc
    return user
