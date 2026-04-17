FROM python:3.11-slim

WORKDIR /app

# ── System dependencies ─────────────────────────────
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# ── Install Python deps ─────────────────────────────
COPY backend/requirements.txt .

RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Copy app ────────────────────────────────────────
COPY backend/ .

# ── Expose port ─────────────────────────────────────
EXPOSE 8000

# ── Run server ──────────────────────────────────────
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]