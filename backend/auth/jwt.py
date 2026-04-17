"""JWT authentication helpers."""
import os
import hashlib
from datetime import datetime, timedelta, timezone
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext

SECRET_KEY  = os.getenv("SECRET_KEY", "mindcare-super-secret-key-change-in-production")
ALGORITHM   = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "1440"))

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def _prepare(plain: str) -> str:
    return hashlib.sha256(plain.encode()).hexdigest()


def hash_password(plain: str) -> str:
    return pwd_context.hash(_prepare(plain))


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(_prepare(plain), hashed)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> Optional[dict]:
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except JWTError:
        return None
