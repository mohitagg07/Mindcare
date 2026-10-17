"""Auth endpoints delegated to Supabase Auth."""
import logging
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from fastapi import APIRouter, HTTPException, status, Depends, File, UploadFile
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr, Field, field_validator, ConfigDict
from middleware.rate_limit import rate_limit

from auth.dependencies import get_current_user, oauth2_scheme
from db.supabase import (FRONTEND_URL, SupabaseError, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, auth_signup, auth_login, auth_refresh, auth_logout, auth_resend_signup, auth_recover, auth_update_password, auth_oauth_url, select_rows, insert_row, update_rows, storage_upload, storage_signed_url, storage_delete)
from services.profile_service import calculate_age

logger = logging.getLogger("mindcare.auth")
router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def username_clean(cls, value: str) -> str:
        return value.strip()

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        if not any(c.isdigit() for c in value) or not any(c.isalpha() for c in value):
            raise ValueError("Password must contain at least one letter and one number")
        return value


class EmailRequest(BaseModel):
    email: EmailStr


class PasswordUpdateRequest(BaseModel):
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def password_strength(cls, value: str) -> str:
        if not any(c.isdigit() for c in value) or not any(c.isalpha() for c in value):
            raise ValueError("Password must contain at least one letter and one number")
        return value


PROFILE_FOCUS_AREAS = {
    "stress", "sleep", "confidence", "relationships", "focus",
    "self_compassion", "emotional_balance", "other",
}
PROFILE_SUPPORT_STYLES = {"gentle", "practical", "reflective"}
PROFILE_AVATAR_TONES = {"sage", "ocean", "lavender", "sunrise"}
PROFILE_SELECT = "id,username,display_name,pronouns,date_of_birth,timezone,support_style,focus_areas,avatar_tone,avatar_path,created_at,updated_at"


class ProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    username: str | None = Field(default=None, min_length=3, max_length=30, pattern=r"^[a-zA-Z0-9_]+$")
    display_name: str | None = Field(default=None, max_length=60)
    pronouns: str | None = Field(default=None, max_length=40)
    date_of_birth: date | None = None
    timezone: str | None = Field(default=None, min_length=1, max_length=64)
    support_style: str | None = Field(default=None, max_length=20)
    focus_areas: list[str] | None = Field(default=None, max_length=6)
    avatar_tone: str | None = Field(default=None, max_length=20)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value):
        if value is None:
            raise ValueError("Username cannot be blank")
        if not isinstance(value, str):
            raise ValueError("Username must be text")
        value = value.strip().lower()
        if not 3 <= len(value) <= 30 or not all(char.isascii() and (char.isalnum() or char == "_") for char in value):
            raise ValueError("Username must be 3–30 letters, numbers, or underscores")
        return value

    @field_validator("display_name", mode="before")
    @classmethod
    def validate_display_name(cls, value):
        # If this field is explicitly patched, it must remain a usable preferred name.
        # Omitted fields are still allowed for partial profile updates.
        if value is None:
            raise ValueError("Preferred name is required")
        if not isinstance(value, str):
            raise ValueError("Preferred name must be text")
        value = " ".join(value.split())
        if not value or not any(character.isalnum() for character in value):
            raise ValueError("Enter a preferred name or nickname")
        if len(value) > 60:
            raise ValueError("Preferred name must be 60 characters or fewer")
        return value

    @field_validator("pronouns", mode="before")
    @classmethod
    def trim_pronouns(cls, value):
        if value is None:
            return None
        if not isinstance(value, str):
            raise ValueError("Pronouns must be text")
        return " ".join(value.split()) or None

    @field_validator("date_of_birth")
    @classmethod
    def validate_date_of_birth(cls, value):
        if value is None:
            return None
        if value > date.today() or value < date(1900, 1, 1):
            raise ValueError("Enter a valid date of birth")
        return value

    @field_validator("timezone", mode="before")
    @classmethod
    def validate_timezone(cls, value):
        if not isinstance(value, str) or not value.strip():
            raise ValueError("Choose a time zone")
        value = value.strip()
        if len(value) > 64:
            raise ValueError("Time zone is too long")
        try:
            ZoneInfo(value)
        except (ZoneInfoNotFoundError, ValueError):
            raise ValueError("Choose a valid IANA time zone")
        return value

    @field_validator("support_style")
    @classmethod
    def validate_support_style(cls, value):
        if value is not None and value not in PROFILE_SUPPORT_STYLES:
            raise ValueError("Choose a supported response style")
        return value

    @field_validator("avatar_tone")
    @classmethod
    def validate_avatar_tone(cls, value):
        if value is not None and value not in PROFILE_AVATAR_TONES:
            raise ValueError("Choose a supported profile color")
        return value

    @field_validator("focus_areas")
    @classmethod
    def validate_focus_areas(cls, value):
        if value is None:
            return None
        unique = list(dict.fromkeys(value))
        if any(item not in PROFILE_FOCUS_AREAS for item in unique):
            raise ValueError("One or more focus areas are not supported")
        if len(unique) > 6:
            raise ValueError("Choose up to six focus areas")
        return unique


def _profile_error(exc: SupabaseError) -> HTTPException:
    lowered = exc.message.lower()
    if "username" in lowered and ("duplicate" in lowered or "unique" in lowered or "already" in lowered):
        return HTTPException(status_code=409, detail="That username is already in use. Choose another handle.")
    profile_columns = ("display_name", "pronouns", "date_of_birth", "avatar_path", "timezone", "support_style", "focus_areas", "avatar_tone")
    if "schema cache" in lowered or ("column" in lowered and any(name in lowered for name in profile_columns)):
        return HTTPException(
            status_code=503,
            detail="Profile schema is missing. Run supabase/migrations/20261013_personal_profile.sql, supabase/migrations/20261013_profile_permissions.sql, and supabase/migrations/20261013_dob_avatar_storage.sql in the Supabase SQL Editor, then retry.",
        )
    if exc.status_code in (401, 403):
        return HTTPException(status_code=exc.status_code, detail="Please sign in again to manage your profile.")
    logger.warning("Profile request failed: HTTP %s", exc.status_code)
    return HTTPException(status_code=503 if exc.status_code >= 500 else 400, detail="Could not load or save your profile. Please try again.")


async def _ensure_profile(current_user: dict) -> dict:
    uid, token = current_user["id"], current_user["access_token"]
    rows, _ = await select_rows("profiles", token, {"select": PROFILE_SELECT, "id": f"eq.{uid}", "limit": "1"})
    if rows:
        return rows[0]
    username = (current_user.get("username") or "mindful_user")[:30]
    inserted = await insert_row("profiles", token, {
        "id": uid, "username": username, "display_name": None, "pronouns": None, "date_of_birth": None, "avatar_path": None,
        "timezone": "Asia/Kolkata", "support_style": "gentle", "focus_areas": [], "avatar_tone": "sage",
    }, upsert=True, on_conflict="id")
    if inserted:
        return inserted[0]
    rows, _ = await select_rows("profiles", token, {"select": PROFILE_SELECT, "id": f"eq.{uid}", "limit": "1"})
    if not rows:
        raise SupabaseError(404, "Profile row could not be created")
    return rows[0]


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str | None = None
    token_type: str = "bearer"
    user_id: str
    username: str
    email: str


class UserResponse(BaseModel):
    id: str
    username: str
    email: str
    is_active: bool = True
    created_at: datetime


def _friendly_auth_error(exc: SupabaseError, *, login: bool = False) -> HTTPException:
    message = exc.message.lower()
    if login:
        if "email not confirmed" in message or "email_not_confirmed" in message or "email address not confirmed" in message:
            return HTTPException(status_code=403, detail="Email not confirmed. Resend the confirmation email to activate your account.")
        if exc.status_code in (400, 401, 403):
            return HTTPException(status_code=401, detail="Invalid email or password")
    if "username" in message and ("duplicate" in message or "unique" in message or "already" in message):
        return HTTPException(status_code=409, detail="Username already taken")
    if "already registered" in message or "already been registered" in message or "user already exists" in message:
        return HTTPException(status_code=409, detail="Email already registered")
    if exc.status_code in (400, 422):
        return HTTPException(status_code=400, detail=exc.message)
    if exc.status_code == 429:
        return HTTPException(status_code=429, detail="Too many attempts. Please wait and try again.")
    return HTTPException(status_code=503 if exc.status_code >= 500 else exc.status_code, detail=exc.message)


@router.post("/register", status_code=201, dependencies=[Depends(rate_limit("register", 10, 60))])
async def register(req: RegisterRequest):
    try:
        payload = await auth_signup(req.email.lower(), req.password, req.username.lower(), f"{FRONTEND_URL}/auth/callback")
    except SupabaseError as exc:
        raise _friendly_auth_error(exc) from exc

    user = payload.get("user") or payload
    token = payload.get("access_token")
    if not token:
        # Supabase may require email confirmation before issuing a session.
        return {
            "requires_email_confirmation": True,
            "message": "Account created. Check your email to confirm your account, then sign in.",
            "user_id": str(user.get("id", "")),
            "username": (user.get("user_metadata") or {}).get("username", req.username.lower()),
            "email": user.get("email", req.email),
        }
    username = (user.get("user_metadata") or {}).get("username", req.username.lower())
    logger.info("User registration completed")
    return TokenResponse(access_token=token, refresh_token=payload.get("refresh_token"), user_id=str(user.get("id", "")), username=username, email=user.get("email", req.email))


@router.post("/resend-confirmation", dependencies=[Depends(rate_limit("resend_confirmation", 5, 300))])
async def resend_confirmation(req: EmailRequest):
    # Keep the response generic so the endpoint does not reveal which emails have accounts.
    try:
        await auth_resend_signup(req.email.lower(), f"{FRONTEND_URL}/auth/callback")
    except SupabaseError as exc:
        if exc.status_code == 429:
            raise HTTPException(status_code=429, detail="Too many requests. Please wait before trying again.") from exc
        if exc.status_code >= 500:
            raise HTTPException(status_code=503, detail="We could not send the email right now. Please try again later.") from exc
        logger.info("Confirmation resend was not accepted by Supabase (HTTP %s)", exc.status_code)
    return {"message": "If this address has a pending confirmation, a new email will be sent. Check your inbox and spam folder."}


@router.post("/forgot-password", dependencies=[Depends(rate_limit("forgot_password", 5, 300))])
async def forgot_password(req: EmailRequest):
    try:
        await auth_recover(req.email.lower(), f"{FRONTEND_URL}/auth/callback?flow=recovery")
    except SupabaseError as exc:
        if exc.status_code == 429:
            raise HTTPException(status_code=429, detail="Too many requests. Please wait before trying again.") from exc
        if exc.status_code >= 500:
            raise HTTPException(status_code=503, detail="Password reset is temporarily unavailable. Please try again later.") from exc
        # Generic response for unknown users and other non-service errors to prevent account enumeration.
        logger.info("Password recovery request was not accepted (HTTP %s)", exc.status_code)
    return {"message": "If an account exists for that email, a password-reset link will arrive shortly. Check your inbox and spam folder."}


@router.post("/update-password", dependencies=[Depends(rate_limit("update_password", 5, 300))])
async def update_password(req: PasswordUpdateRequest, current_user=Depends(get_current_user)):
    try:
        await auth_update_password(current_user["access_token"], req.password)
    except SupabaseError as exc:
        if exc.status_code in (400, 401, 403):
            raise HTTPException(status_code=401, detail="This reset link is invalid or expired. Request a new password-reset email.") from exc
        if exc.status_code == 429:
            raise HTTPException(status_code=429, detail="Too many requests. Please wait before trying again.") from exc
        raise HTTPException(status_code=503, detail="Could not update your password. Please try again.") from exc
    return {"message": "Password updated successfully."}


@router.get("/oauth/google-url", dependencies=[Depends(rate_limit("oauth_google", 20, 60))])
async def google_oauth_url():
    try:
        location = await auth_oauth_url("google", f"{FRONTEND_URL}/auth/callback")
    except SupabaseError as exc:
        if exc.status_code in (400, 404, 422):
            raise HTTPException(status_code=400, detail="Google sign-in is not configured yet. Enable Google under Supabase Authentication → Sign In / Providers and add your Google OAuth client credentials.") from exc
        raise HTTPException(status_code=503 if exc.status_code >= 500 else 502, detail="Could not start Google sign-in. Check the Supabase Google provider configuration.") from exc
    # Supabase itself supplies this redirect; the application never accepts a caller-provided destination.
    return {"url": location}


@router.post("/login", response_model=TokenResponse, dependencies=[Depends(rate_limit("login", 20, 60))])
async def login(form: OAuth2PasswordRequestForm = Depends()):
    email = form.username.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Sign in with the email address linked to your account.")
    try:
        payload = await auth_login(email, form.password)
    except SupabaseError as exc:
        raise _friendly_auth_error(exc, login=True) from exc
    user = payload.get("user") or {}
    username = (user.get("user_metadata") or {}).get("username") or email.split("@", 1)[0]
    token = payload.get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="Supabase Auth did not return a session. Check your Supabase Auth configuration.")
    return TokenResponse(access_token=token, refresh_token=payload.get("refresh_token"), user_id=str(user.get("id", "")), username=username, email=user.get("email", email))


class RefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=10, max_length=2048)


@router.post("/refresh", response_model=TokenResponse, dependencies=[Depends(rate_limit("refresh", 30, 60))])
async def refresh_session(req: RefreshRequest):
    try:
        payload = await auth_refresh(req.refresh_token)
    except SupabaseError as exc:
        if exc.status_code in (400, 401, 403):
            raise HTTPException(status_code=401, detail="Session expired. Please sign in again.") from exc
        raise HTTPException(status_code=503, detail="Could not refresh your session. Please try again.") from exc
    user = payload.get("user") or {}
    token = payload.get("access_token")
    if not token:
        raise HTTPException(status_code=502, detail="Supabase did not return a refreshed session.")
    username = (user.get("user_metadata") or {}).get("username") or (user.get("email") or "user").split("@", 1)[0]
    return TokenResponse(access_token=token, refresh_token=payload.get("refresh_token"), user_id=str(user.get("id", "")), username=username, email=user.get("email", ""))


@router.get("/me", response_model=UserResponse)
async def me(current_user=Depends(get_current_user)):
    created = current_user.get("created_at")
    if isinstance(created, str):
        try:
            created = datetime.fromisoformat(created.replace("Z", "+00:00"))
        except ValueError:
            created = datetime.now(timezone.utc)
    if not isinstance(created, datetime):
        created = datetime.now(timezone.utc)
    return UserResponse(id=current_user["id"], username=current_user["username"], email=current_user["email"], is_active=True, created_at=created)


async def _profile_response(profile: dict, current_user: dict) -> dict:
    """Return profile data and a short-lived URL for this user's private avatar."""
    result = dict(profile)
    result["email"] = current_user.get("email")
    result["account_created_at"] = current_user.get("created_at")
    result["account_deletion_enabled"] = bool(SUPABASE_SERVICE_ROLE_KEY)
    result["age"] = calculate_age(result.get("date_of_birth"), timezone_name=result.get("timezone"))
    result["avatar_url"] = None
    avatar_path = result.get("avatar_path")
    if avatar_path:
        try:
            result["avatar_url"] = await storage_signed_url(
                "profile-avatars", avatar_path, current_user["access_token"], expires_in=86400
            )
        except SupabaseError as exc:
            # A photo problem should not make the rest of a valid profile unavailable.
            logger.warning("Could not sign profile avatar URL (HTTP %s)", exc.status_code)
    return result


@router.get("/profile")
async def get_profile(current_user=Depends(get_current_user)):
    try:
        profile = await _ensure_profile(current_user)
        return await _profile_response(profile, current_user)
    except SupabaseError as exc:
        raise _profile_error(exc) from exc


@router.patch("/profile")
async def update_profile(req: ProfileUpdateRequest, current_user=Depends(get_current_user)):
    try:
        await _ensure_profile(current_user)
        patch = req.model_dump(mode="json", exclude_unset=True)
        if not patch:
            profile_rows, _ = await select_rows("profiles", current_user["access_token"], {
                "select": PROFILE_SELECT, "id": f"eq.{current_user['id']}", "limit": "1",
            })
            profile = profile_rows[0] if profile_rows else {}
        else:
            profile_rows = await update_rows("profiles", current_user["access_token"], {
                "id": f"eq.{current_user['id']}"
            }, patch)
            if profile_rows:
                profile = profile_rows[0]
            else:
                inserted = await insert_row("profiles", current_user["access_token"], {
                    "id": current_user["id"], "username": current_user["username"],
                    "timezone": "Asia/Kolkata", "support_style": "gentle", "focus_areas": [],
                    "avatar_tone": "sage", "date_of_birth": None, "avatar_path": None, **patch,
                }, upsert=True, on_conflict="id")
                profile = inserted[0] if inserted else {}
        return await _profile_response(profile, current_user)
    except SupabaseError as exc:
        raise _profile_error(exc) from exc


def _normalize_avatar(raw: bytes) -> bytes:
    """Validate, orient, resize, and re-encode profile images to strip metadata."""
    from io import BytesIO
    from PIL import Image, ImageOps, UnidentifiedImageError
    try:
        with Image.open(BytesIO(raw)) as probe:
            if probe.format not in {"JPEG", "PNG", "WEBP"}:
                raise HTTPException(status_code=415, detail="Choose a JPG, PNG, or WebP image.")
            if probe.width * probe.height > 24_000_000:
                raise HTTPException(status_code=413, detail="This image is too large to process. Choose a smaller image.")
            probe.verify()
        with Image.open(BytesIO(raw)) as image:
            image = ImageOps.exif_transpose(image)
            if "A" in image.getbands():
                image = image.convert("RGBA")
            else:
                image = image.convert("RGB")
            # Stay below the Supabase Storage bucket's 3 MiB object limit even for noisy images.
            for max_side, quality in ((1024, 84), (896, 80), (768, 76), (640, 72), (512, 68)):
                candidate = image.copy()
                candidate.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
                output = BytesIO()
                candidate.save(output, format="WEBP", quality=quality, method=4)
                optimized = output.getvalue()
                if len(optimized) <= 3_000_000:
                    return optimized
            raise HTTPException(status_code=413, detail="This photo could not be compressed enough. Choose a simpler or smaller image.")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(status_code=415, detail="That file could not be read as a valid image.") from exc


@router.post("/profile/avatar", dependencies=[Depends(rate_limit("profile_avatar_upload", 8, 60))])
async def upload_profile_avatar(file: UploadFile = File(...), current_user=Depends(get_current_user)):
    try:
        await _ensure_profile(current_user)
        raw = await file.read(5 * 1024 * 1024 + 1)
        await file.close()
        if not raw:
            raise HTTPException(status_code=400, detail="Choose a photo before uploading.")
        if len(raw) > 5 * 1024 * 1024:
            raise HTTPException(status_code=413, detail="Choose a photo smaller than 5 MB.")
        # Pillow verifies the file content, so a renamed executable is not accepted as an image.
        import asyncio
        optimized = await asyncio.to_thread(_normalize_avatar, raw)
        path = f"{current_user['id']}/avatar.webp"
        await storage_upload("profile-avatars", path, current_user["access_token"], optimized, "image/webp")
        rows = await update_rows("profiles", current_user["access_token"], {"id": f"eq.{current_user['id']}"}, {"avatar_path": path})
        if not rows:
            raise SupabaseError(404, "Could not update the profile avatar path")
        profile = await _profile_response(rows[0], current_user)
        return {"avatar_path": path, "avatar_url": profile["avatar_url"]}
    except HTTPException:
        raise
    except SupabaseError as exc:
        if exc.status_code == 401:
            raise HTTPException(status_code=401, detail="Please sign in again to manage your profile photo.") from exc
        logger.warning("Profile photo upload failed (HTTP %s)", exc.status_code)
        lowered = exc.message.lower()
        if "bucket" in lowered or "storage" in lowered or "row-level security" in lowered or "policy" in lowered or exc.status_code == 404 or exc.status_code == 403:
            raise HTTPException(status_code=503, detail="Profile photo storage is not ready. Run supabase/migrations/20261013_dob_avatar_storage.sql in Supabase, then retry.") from exc
        raise HTTPException(status_code=503, detail="Could not save your profile photo. Please try again.") from exc


@router.delete("/profile/avatar", dependencies=[Depends(rate_limit("profile_avatar_delete", 12, 60))])
async def delete_profile_avatar(current_user=Depends(get_current_user)):
    try:
        profile = await _ensure_profile(current_user)
        path = profile.get("avatar_path")
        if path:
            await storage_delete("profile-avatars", path, current_user["access_token"])
        rows = await update_rows("profiles", current_user["access_token"], {"id": f"eq.{current_user['id']}"}, {"avatar_path": None})
        cleared = rows[0] if rows else {**profile, "avatar_path": None}
        response = await _profile_response(cleared, current_user)
        return {"message": "Profile photo removed", "profile": response}
    except SupabaseError as exc:
        if exc.status_code == 401:
            raise HTTPException(status_code=401, detail="Please sign in again to manage your profile photo.") from exc
        if exc.status_code in (403, 404) or any(term in exc.message.lower() for term in ("storage", "bucket", "row-level security", "policy")):
            logger.warning("Profile photo deletion was blocked by Storage permissions/configuration (HTTP %s)", exc.status_code)
            raise HTTPException(status_code=503, detail="Profile photo storage is not ready. Check the profile-avatars bucket and owner policies from supabase/migrations/20261013_dob_avatar_storage.sql.") from exc
        raise _profile_error(exc) from exc


class DeleteAccountRequest(BaseModel):
    confirmation: str = Field(min_length=6, max_length=6)

    @field_validator("confirmation")
    @classmethod
    def require_explicit_confirmation(cls, value: str) -> str:
        if value != "DELETE":
            raise ValueError("Type DELETE to confirm account removal")
        return value


@router.delete("/profile/account", dependencies=[Depends(rate_limit("profile_account_delete", 3, 300))])
async def delete_account(req: DeleteAccountRequest, current_user=Depends(get_current_user)):
    """Permanently delete the signed-in account and its cascading application data."""
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise HTTPException(status_code=503, detail="Account deletion is not configured on this server. Contact the MindCare administrator.")
    try:
        profile = await _ensure_profile(current_user)
        avatar_path = profile.get("avatar_path")
        if avatar_path:
            await storage_delete("profile-avatars", avatar_path, current_user["access_token"])
            cleared = await update_rows("profiles", current_user["access_token"], {"id": f"eq.{current_user['id']}"}, {"avatar_path": None})
            if not cleared:
                raise SupabaseError(503, "Could not clear the private avatar reference")
        from db.supabase import auth_admin_delete_user
        await auth_admin_delete_user(current_user["id"])
        return {"message": "Your account and its saved MindCare data have been deleted."}
    except SupabaseError as exc:
        if exc.status_code in (401, 403):
            raise HTTPException(status_code=401, detail="Please sign in again before deleting your account.") from exc
        if exc.status_code == 503 and "service role" in exc.message.lower():
            raise HTTPException(status_code=503, detail="Account deletion is not configured on this server. Contact the MindCare administrator.") from exc
        logger.warning("Account deletion failed for the current user (HTTP %s)", exc.status_code)
        raise HTTPException(status_code=503, detail="Your account could not be deleted. Please try again or contact the MindCare administrator.") from exc


@router.post("/logout")
async def logout(token: str = Depends(oauth2_scheme)):
    try:
        await auth_logout(token)
    except SupabaseError as exc:
        # Local logout should remain possible even if Supabase is temporarily unavailable.
        if exc.status_code not in (401, 403):
            logger.warning("Supabase logout could not be confirmed (HTTP %s)", exc.status_code)
    return {"message": "Logged out successfully"}
