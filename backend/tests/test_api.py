"""
MindCare API Tests.
Run:  cd backend && pytest tests/ -v

These tests use an in-memory mock of MongoDB (mongomock) when available,
otherwise they test against the live configured database.
"""
import os, pytest

# Point to test DB so we never touch production
os.environ.setdefault("DATABASE_URL", "mongodb://localhost:27017/mindcare_test")
os.environ.setdefault("SECRET_KEY",   "test-secret-key-for-pytest")
os.environ.setdefault("GROQ_API_KEY", "test-key-not-real")
os.environ.setdefault("ALLOWED_ORIGINS", "*")

from fastapi.testclient import TestClient

# Import app after env vars are set
from main import app

client = TestClient(app)

# ── Helpers ────────────────────────────────────────────────────
UNIQUE_SUFFIX = str(os.getpid())
TEST_USER = {
    "username": f"testuser{UNIQUE_SUFFIX}",
    "email":    f"test{UNIQUE_SUFFIX}@example.com",
    "password": "TestPass1",
}


def _register_and_get_token() -> str:
    r = client.post("/api/auth/register", json=TEST_USER)
    if r.status_code == 400 and "already" in r.text:
        # User exists, just log in
        r = client.post("/api/auth/login", data={
            "username": TEST_USER["username"],
            "password": TEST_USER["password"],
        })
    assert r.status_code in (200, 201), f"Auth failed: {r.text}"
    return r.json()["access_token"]


# ── Health ─────────────────────────────────────────────────────
def test_root():
    r = client.get("/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"
    assert r.json()["version"] == "3.0.0"


def test_health():
    r = client.get("/api/health")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "healthy"
    assert "emotion_model" in data
    assert "rag_available" in data


# ── Auth ───────────────────────────────────────────────────────
def test_register_success():
    import uuid
    suffix = uuid.uuid4().hex[:8]
    r = client.post("/api/auth/register", json={
        "username": f"newuser{suffix}",
        "email":    f"new{suffix}@example.com",
        "password": "ValidPass1",
    })
    assert r.status_code == 201
    data = r.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "user_id" in data


def test_register_weak_password():
    r = client.post("/api/auth/register", json={
        "username": "weakpassuser",
        "email":    "weak@example.com",
        "password": "abc",          # too short AND no number
    })
    assert r.status_code == 422     # Pydantic validation error


def test_register_no_number_in_password():
    r = client.post("/api/auth/register", json={
        "username": "nonumber",
        "email":    "nonumber@example.com",
        "password": "PasswordNoNumber",   # no digit
    })
    assert r.status_code == 422


def test_register_invalid_email():
    r = client.post("/api/auth/register", json={
        "username": "badmail",
        "email":    "not-an-email",
        "password": "ValidPass1",
    })
    assert r.status_code == 422


def test_login_success():
    token = _register_and_get_token()
    assert len(token) > 10


def test_login_wrong_password():
    _register_and_get_token()   # ensure user exists
    r = client.post("/api/auth/login", data={
        "username": TEST_USER["username"],
        "password": "WrongPass999",
    })
    assert r.status_code == 401


def test_me_requires_auth():
    r = client.get("/api/auth/me")
    assert r.status_code == 401


def test_me_with_token():
    token = _register_and_get_token()
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert data["username"] == TEST_USER["username"]
    assert data["email"] == TEST_USER["email"]


# ── Assessment ─────────────────────────────────────────────────
def test_get_questions():
    r = client.get("/api/assessment/questions")
    assert r.status_code == 200
    data = r.json()
    assert len(data["phq9"]) == 9
    assert len(data["gad7"]) == 7
    assert len(data["options"]) == 4


def test_phq9_scoring_minimal():
    r = client.post("/api/assessment/phq9", json={"responses": [0]*9})
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 0
    assert data["category"] == "Minimal"


def test_phq9_scoring_severe():
    r = client.post("/api/assessment/phq9", json={"responses": [3]*9})
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 27
    assert data["category"] == "Severe"
    assert data["crisis_flag"] is True


def test_gad7_scoring():
    r = client.post("/api/assessment/gad7", json={"responses": [2]*7})
    assert r.status_code == 200
    data = r.json()
    assert data["score"] == 14
    assert data["category"] == "Moderate"


def test_phq9_wrong_count():
    r = client.post("/api/assessment/phq9", json={"responses": [0]*5})
    assert r.status_code == 200
    assert "error" in r.json()


# ── Chat ───────────────────────────────────────────────────────
def test_chat_requires_auth():
    r = client.post("/api/chat", json={"message": "hello"})
    assert r.status_code == 401


def test_chat_message_too_long():
    token = _register_and_get_token()
    r = client.post("/api/chat",
        json={"message": "x" * 2001},
        headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 422   # Pydantic validation


# ── Metrics ────────────────────────────────────────────────────
def test_metrics_requires_auth():
    r = client.get("/api/metrics/overview")
    assert r.status_code == 401


def test_metrics_overview():
    token = _register_and_get_token()
    r = client.get("/api/metrics/overview",
                   headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "total_sessions" in data
    assert "total_messages" in data
    assert "avg_latency_ms" in data


def test_total_users():
    token = _register_and_get_token()
    r = client.get("/api/metrics/total-users",
                   headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    assert r.json()["total"] >= 1


def test_emotion_status():
    r = client.get("/api/emotion/status")
    assert r.status_code == 200
    assert "model_loaded" in r.json()


# ── Trajectory ─────────────────────────────────────────────────
def test_trajectory_endpoint():
    token = _register_and_get_token()
    r = client.get("/api/metrics/trajectory",
                   headers={"Authorization": f"Bearer {token}"})
    assert r.status_code == 200
    data = r.json()
    assert "trend" in data
    assert "points" in data
