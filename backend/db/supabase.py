"""Async Supabase Auth/PostgREST client.

All data requests use the end-user access token, not a service-role key. Supabase
Row Level Security therefore remains active for application reads and writes.
"""
from __future__ import annotations

import logging
import os
from typing import Any
from urllib.parse import quote

import httpx

logger = logging.getLogger("mindcare.supabase")

SUPABASE_URL = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY", "").strip()
SUPABASE_SERVICE_ROLE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "").strip()
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173").strip().rstrip("/")
_TIMEOUT = httpx.Timeout(connect=4.0, read=15.0, write=10.0, pool=4.0)
_LIMITS = httpx.Limits(max_connections=80, max_keepalive_connections=20, keepalive_expiry=30.0)
_http: httpx.AsyncClient | None = None


class SupabaseError(RuntimeError):
    def __init__(self, status_code: int, message: str):
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def is_configured() -> bool:
    return bool(SUPABASE_URL and SUPABASE_ANON_KEY)


def require_config() -> None:
    if not is_configured():
        raise SupabaseError(503, "Supabase is not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY.")


async def open_http_client() -> None:
    global _http
    if _http is None:
        _http = httpx.AsyncClient(timeout=_TIMEOUT, limits=_LIMITS, follow_redirects=False)


async def close_http_client() -> None:
    global _http
    if _http is not None:
        await _http.aclose()
        _http = None


def _client() -> httpx.AsyncClient:
    if _http is None:
        # Also works in ASGI test clients that don't trigger the lifespan hook.
        raise SupabaseError(503, "Supabase HTTP client is not initialized. Restart the API server.")
    return _http


def _base_headers(access_token: str | None = None) -> dict[str, str]:
    require_config()
    headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Accept": "application/json",
    }
    if access_token:
        headers["Authorization"] = f"Bearer {access_token}"
    return headers


def _error_message(response: httpx.Response) -> str:
    try:
        body = response.json()
        message = body.get("msg") or body.get("message") or body.get("error_description") or body.get("error")
        if isinstance(message, dict):
            message = message.get("message")
        if message:
            return str(message)[:300]
    except Exception:
        pass
    return f"Supabase request failed with HTTP {response.status_code}."


async def _request(method: str, url: str, *, headers: dict[str, str], params=None, json_body=None, content: bytes | None = None, extra_headers=None) -> tuple[Any, httpx.Response]:
    try:
        final_headers = dict(headers)
        if extra_headers:
            final_headers.update(extra_headers)
        response = await _client().request(method, url, headers=final_headers, params=params, json=json_body, content=content)
    except httpx.TimeoutException as exc:
        logger.warning("Supabase request timed out (%s %s)", method, url.split("/rest/v1/")[-1].split("?")[0])
        raise SupabaseError(504, "Supabase timed out. Please try again.") from exc
    except httpx.HTTPError as exc:
        logger.warning("Supabase transport error: %s", type(exc).__name__)
        raise SupabaseError(503, "Could not connect to Supabase. Check the project URL and network.") from exc

    if response.status_code >= 400:
        message = _error_message(response)
        logger.info("Supabase API returned HTTP %s: %s", response.status_code, message)
        raise SupabaseError(response.status_code, message)
    if response.status_code == 204 or not response.content:
        return None, response
    try:
        return response.json(), response
    except ValueError:
        return response.text, response


async def auth_signup(email: str, password: str, username: str, redirect_to: str | None = None) -> dict:
    """Create a Supabase Auth user and send confirmation back to the Vite app."""
    payload, _ = await _request(
        "POST", f"{SUPABASE_URL}/auth/v1/signup", headers=_base_headers(),
        params={"redirect_to": redirect_to or f"{FRONTEND_URL}/auth/callback"},
        json_body={"email": email, "password": password, "data": {"username": username}},
    )
    return payload or {}


async def auth_resend_signup(email: str, redirect_to: str | None = None) -> dict:
    """Resend the real Supabase signup confirmation email."""
    payload, _ = await _request(
        "POST", f"{SUPABASE_URL}/auth/v1/resend", headers=_base_headers(),
        params={"redirect_to": redirect_to or f"{FRONTEND_URL}/auth/callback"},
        json_body={"type": "signup", "email": email},
    )
    return payload or {}


async def auth_recover(email: str, redirect_to: str | None = None) -> dict:
    """Request a real password-reset email. Supabase avoids revealing unknown users."""
    payload, _ = await _request(
        "POST", f"{SUPABASE_URL}/auth/v1/recover", headers=_base_headers(),
        params={"redirect_to": redirect_to or f"{FRONTEND_URL}/auth/callback?flow=recovery"},
        json_body={"email": email},
    )
    return payload or {}


async def auth_update_password(access_token: str, password: str) -> dict:
    """Update the password using a user access token from a valid recovery session."""
    payload, _ = await _request(
        "PUT", f"{SUPABASE_URL}/auth/v1/user", headers=_base_headers(access_token),
        json_body={"password": password},
    )
    return payload or {}


async def auth_oauth_url(provider: str, redirect_to: str) -> str:
    """Ask Supabase Auth for a provider URL without exposing credentials or accepting user redirects."""
    payload, response = await _request(
        "GET", f"{SUPABASE_URL}/auth/v1/authorize", headers=_base_headers(),
        params={"provider": provider, "redirect_to": redirect_to, "skip_http_redirect": "true"},
    )
    if isinstance(payload, dict) and isinstance(payload.get("url"), str) and payload["url"].startswith("https://"):
        return payload["url"]
    location = response.headers.get("location")
    if response.status_code in (301, 302, 303, 307, 308) and location and location.startswith("https://"):
        return location
    raise SupabaseError(502, "Supabase did not return an OAuth URL. Check that the provider is enabled.")


async def auth_login(email: str, password: str) -> dict:
    payload, _ = await _request(
        "POST", f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
        headers=_base_headers(), json_body={"email": email, "password": password},
    )
    return payload or {}


async def auth_refresh(refresh_token: str) -> dict:
    payload, _ = await _request(
        "POST", f"{SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
        headers=_base_headers(), json_body={"refresh_token": refresh_token},
    )
    return payload or {}


async def auth_get_user(access_token: str) -> dict:
    payload, _ = await _request(
        "GET", f"{SUPABASE_URL}/auth/v1/user", headers=_base_headers(access_token),
    )
    return payload or {}


async def auth_logout(access_token: str) -> None:
    await _request("POST", f"{SUPABASE_URL}/auth/v1/logout", headers=_base_headers(access_token))


async def auth_admin_delete_user(user_id: str) -> None:
    """Permanently delete one already-authenticated user's Supabase Auth record."""
    require_config()
    if not SUPABASE_SERVICE_ROLE_KEY:
        raise SupabaseError(503, "Supabase service role key is not configured for account deletion.")
    secret = SUPABASE_SERVICE_ROLE_KEY
    await _request(
        "DELETE", f"{SUPABASE_URL}/auth/v1/admin/users/{quote(user_id, safe='')}",
        headers={"apikey": secret, "Authorization": f"Bearer {secret}", "Accept": "application/json"},
    )


async def probe_database() -> bool:
    """Probe PostgREST without exposing any account data; RLS returns no rows to anon."""
    if not is_configured():
        return False
    try:
        _, response = await _request(
            "GET", f"{SUPABASE_URL}/rest/v1/profiles", headers=_base_headers(),
            params={"select": "id", "limit": "1"},
        )
        return response.status_code == 200
    except SupabaseError:
        return False


async def select_rows(table: str, access_token: str, params: dict[str, str] | None = None, *, count: bool = False) -> tuple[list[dict], int | None]:
    headers = _base_headers(access_token)
    if count:
        headers["Prefer"] = "count=exact"
        headers["Range"] = "0-0"
    payload, response = await _request(
        "GET", f"{SUPABASE_URL}/rest/v1/{quote(table, safe='')}", headers=headers, params=params,
    )
    rows = payload if isinstance(payload, list) else []
    total = None
    if count:
        content_range = response.headers.get("content-range", "")
        if "/" in content_range:
            try:
                total = int(content_range.rsplit("/", 1)[1])
            except ValueError:
                total = len(rows)
        else:
            total = len(rows)
    return rows, total


async def insert_row(table: str, access_token: str, row: dict, *, upsert: bool = False, on_conflict: str | None = None) -> list[dict]:
    headers = _base_headers(access_token)
    headers["Prefer"] = "return=representation"
    if upsert:
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
    params = {"on_conflict": on_conflict} if on_conflict else None
    payload, _ = await _request(
        "POST", f"{SUPABASE_URL}/rest/v1/{quote(table, safe='')}", headers=headers,
        params=params, json_body=row,
    )
    return payload if isinstance(payload, list) else ([payload] if isinstance(payload, dict) else [])


async def update_rows(table: str, access_token: str, params: dict[str, str], patch: dict) -> list[dict]:
    headers = _base_headers(access_token)
    headers["Prefer"] = "return=representation"
    payload, _ = await _request(
        "PATCH", f"{SUPABASE_URL}/rest/v1/{quote(table, safe='')}", headers=headers,
        params=params, json_body=patch,
    )
    return payload if isinstance(payload, list) else ([payload] if isinstance(payload, dict) else [])


async def delete_rows(table: str, access_token: str, params: dict[str, str]) -> list[dict]:
    headers = _base_headers(access_token)
    headers["Prefer"] = "return=representation"
    payload, _ = await _request(
        "DELETE", f"{SUPABASE_URL}/rest/v1/{quote(table, safe='')}", headers=headers, params=params,
    )
    return payload if isinstance(payload, list) else ([payload] if isinstance(payload, dict) else [])


async def storage_upload(bucket: str, path: str, access_token: str, content: bytes, content_type: str) -> dict:
    """Upload one object using the signed-in user's JWT so Storage RLS applies."""
    encoded_bucket = quote(bucket, safe="")
    encoded_path = quote(path, safe="/")
    payload, _ = await _request(
        "POST", f"{SUPABASE_URL}/storage/v1/object/{encoded_bucket}/{encoded_path}",
        headers=_base_headers(access_token), content=content,
        extra_headers={"Content-Type": content_type, "x-upsert": "true"},
    )
    return payload if isinstance(payload, dict) else {}


async def storage_signed_url(bucket: str, path: str, access_token: str, expires_in: int = 86400) -> str:
    """Create a time-limited URL for an object in a private bucket."""
    encoded_bucket = quote(bucket, safe="")
    encoded_path = quote(path, safe="/")
    payload, _ = await _request(
        "POST", f"{SUPABASE_URL}/storage/v1/object/sign/{encoded_bucket}/{encoded_path}",
        headers=_base_headers(access_token), json_body={"expiresIn": max(60, min(int(expires_in), 604800))},
    )
    signed = payload.get("signedURL") or payload.get("signedUrl") if isinstance(payload, dict) else None
    if not isinstance(signed, str) or not signed:
        raise SupabaseError(502, "Supabase did not return a signed profile-photo URL")
    if signed.startswith("https://"):
        return signed
    if signed.startswith("/storage/v1/"):
        return f"{SUPABASE_URL}{signed}"
    if signed.startswith("/"):
        return f"{SUPABASE_URL}/storage/v1{signed}"
    return f"{SUPABASE_URL}/storage/v1/{signed.lstrip('/')}"


async def storage_delete(bucket: str, path: str, access_token: str) -> None:
    """Delete an object using the signed-in user's JWT so Storage RLS applies."""
    encoded_bucket = quote(bucket, safe="")
    await _request(
        "DELETE", f"{SUPABASE_URL}/storage/v1/object/{encoded_bucket}",
        headers=_base_headers(access_token), json_body={"prefixes": [path]},
    )
