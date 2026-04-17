"""Pytest configuration — sets up test environment."""
import os
os.environ.setdefault("DATABASE_URL", "mongodb://localhost:27017/mindcare_test")
os.environ.setdefault("SECRET_KEY",   "test-secret-key-for-pytest")
os.environ.setdefault("GROQ_API_KEY", "test-key-not-real")
os.environ.setdefault("ALLOWED_ORIGINS", "*")
