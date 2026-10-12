"""Offline contract tests for the real Supabase-backed auth flows."""
import pytest
from fastapi.testclient import TestClient
from main import app
from auth.dependencies import get_current_user
import routers.auth as auth_router

client = TestClient(app)
TEST_USER = {
    "id": "11111111-1111-4111-8111-111111111111",
    "access_token": "test-token",
    "username": "test_user",
    "email": "test@example.com",
    "is_active": True,
}


async def fake_user():
    return TEST_USER


def test_signup_uses_vite_email_callback(monkeypatch):
    calls = []

    async def fake_signup(email, password, username, redirect_to):
        calls.append((email, username, redirect_to))
        return {"user": {"id": "user-id", "email": email, "user_metadata": {"username": username}}}

    monkeypatch.setattr(auth_router, "auth_signup", fake_signup)
    response = client.post("/api/auth/register", json={
        "username": "mindful_user", "email": "person@example.com", "password": "mindcare123"
    })
    assert response.status_code == 201
    assert response.json()["requires_email_confirmation"] is True
    assert calls[0][2].endswith("/auth/callback")
    assert ":3000" not in calls[0][2]


def test_resend_confirmation_uses_supabase_service(monkeypatch):
    calls = []

    async def fake_resend(email, redirect_to):
        calls.append((email, redirect_to))
        return {}

    monkeypatch.setattr(auth_router, "auth_resend_signup", fake_resend)
    response = client.post("/api/auth/resend-confirmation", json={"email": "Person@Example.com"})
    assert response.status_code == 200
    assert "pending confirmation" in response.json()["message"]
    assert calls[0][0] == "person@example.com"
    assert calls[0][1].endswith("/auth/callback")


def test_forgot_password_uses_recovery_callback_and_generic_response(monkeypatch):
    calls = []

    async def fake_recover(email, redirect_to):
        calls.append((email, redirect_to))
        return {}

    monkeypatch.setattr(auth_router, "auth_recover", fake_recover)
    response = client.post("/api/auth/forgot-password", json={"email": "Person@Example.com"})
    assert response.status_code == 200
    assert "If an account exists" in response.json()["message"]
    assert calls[0][0] == "person@example.com"
    assert "/auth/callback?flow=recovery" in calls[0][1]


def test_update_password_requires_authenticated_user(monkeypatch):
    calls = []

    async def fake_update(token, password):
        calls.append((token, password))
        return {}

    monkeypatch.setattr(auth_router, "auth_update_password", fake_update)
    original = app.dependency_overrides.get(get_current_user)
    app.dependency_overrides[get_current_user] = fake_user
    try:
        response = client.post("/api/auth/update-password", json={"password": "newpassword123"})
    finally:
        if original is None:
            app.dependency_overrides.pop(get_current_user, None)
        else:
            app.dependency_overrides[get_current_user] = original
    assert response.status_code == 200
    assert calls == [(TEST_USER["access_token"], "newpassword123")]


def test_google_oauth_is_real_supabase_redirect(monkeypatch):
    async def fake_oauth(provider, redirect_to):
        assert provider == "google"
        assert redirect_to.endswith("/auth/callback")
        return "https://accounts.google.com/o/oauth2/v2/auth?client_id=test"

    monkeypatch.setattr(auth_router, "auth_oauth_url", fake_oauth)
    response = client.get("/api/auth/oauth/google-url")
    assert response.status_code == 200
    assert response.json()["url"].startswith("https://accounts.google.com/")


def test_oauth_url_helper_supports_supabase_json_url(monkeypatch):
    import asyncio
    from types import SimpleNamespace
    import db.supabase as supabase_module
    calls = []

    async def fake_request(method, url, **kwargs):
        calls.append((method, url, kwargs))
        return ({"url": "https://accounts.google.com/o/oauth2/v2/auth?client_id=test"}, SimpleNamespace(status_code=200, headers={}))

    monkeypatch.setattr(supabase_module, "SUPABASE_URL", "https://test-project.supabase.co")
    monkeypatch.setattr(supabase_module, "SUPABASE_ANON_KEY", "sb_publishable_test")
    monkeypatch.setattr(supabase_module, "_request", fake_request)
    result = asyncio.run(supabase_module.auth_oauth_url("google", "http://localhost:5173/auth/callback"))
    assert result.startswith("https://accounts.google.com/")
    assert calls[0][2]["params"]["skip_http_redirect"] == "true"
    assert calls[0][2]["params"]["redirect_to"].endswith("/auth/callback")
