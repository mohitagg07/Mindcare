"""Auth routes with rate limiting and strong Pydantic validation."""
import logging
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, field_validator
from bson import ObjectId
from slowapi import Limiter
from slowapi.util import get_remote_address

from auth.jwt import hash_password, verify_password, create_access_token
from auth.dependencies import get_current_user
from db.database import get_db, utcnow

logger  = logging.getLogger("mindcare.auth")
router  = APIRouter(prefix="/auth", tags=["auth"])
limiter = Limiter(key_func=get_remote_address)


# ── Schemas ────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    email:    EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def username_clean(cls, v: str) -> str:
        return v.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        if not any(c.isalpha() for c in v):
            raise ValueError("Password must contain at least one letter")
        return v


class TokenResponse(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user_id:      str
    username:     str
    email:        str


class UserResponse(BaseModel):
    id:         str
    username:   str
    email:      str
    is_active:  bool
    created_at: datetime


# ── Endpoints ──────────────────────────────────────────────────
@router.post("/register", response_model=TokenResponse, status_code=201)
@limiter.limit("10/minute")
def register(request: Request, req: RegisterRequest):
    db = get_db()
    if db.users.find_one({"username": req.username}):
        raise HTTPException(400, "Username already taken")
    if db.users.find_one({"email": req.email}):
        raise HTTPException(400, "Email already registered")

    result = db.users.insert_one({
        "username":        req.username,
        "email":           req.email,
        "hashed_password": hash_password(req.password),
        "is_active":       True,
        "created_at":      utcnow(),
        "last_login":      None,
    })
    uid   = str(result.inserted_id)
    token = create_access_token({"sub": uid})
    logger.info(f"User registered: {req.username} ({uid[:8]})")
    return TokenResponse(access_token=token, user_id=uid, username=req.username, email=req.email)


@router.post("/login", response_model=TokenResponse)
@limiter.limit("20/minute")
def login(request: Request, form: OAuth2PasswordRequestForm = Depends()):
    db   = get_db()
    user = (db.users.find_one({"username": form.username}) or
            db.users.find_one({"email":    form.username}))
    if not user or not verify_password(form.password, user["hashed_password"]):
        logger.warning(f"Failed login attempt for: {form.username}")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid credentials",
                            headers={"WWW-Authenticate": "Bearer"})
    if not user.get("is_active", True):
        raise HTTPException(400, "Account disabled")

    db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": utcnow()}})
    uid   = str(user["_id"])
    token = create_access_token({"sub": uid})
    logger.info(f"Login OK: {user['username']} ({uid[:8]})")
    return TokenResponse(access_token=token, user_id=uid,
                         username=user["username"], email=user["email"])


@router.get("/me", response_model=UserResponse)
def me(current_user=Depends(get_current_user)):
    return UserResponse(
        id=str(current_user["_id"]),
        username=current_user["username"],
        email=current_user["email"],
        is_active=current_user.get("is_active", True),
        created_at=current_user.get("created_at", utcnow()),
    )


@router.post("/logout")
def logout():
    return {"message": "Logged out successfully"}
