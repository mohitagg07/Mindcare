# MindCare

## Personal profile and response preferences

For an existing Supabase project, check the applied migration history and apply only missing files from `supabase/migrations/` in the dependency order listed in `START_HERE.md`. Do not rerun already-applied migrations or run the fresh-install schema against an existing database. For a brand-new project, run `supabase/schema.sql`. Keep the fresh schema and migration contract tests aligned as either changes. Profile and application data access uses the signed-in user's JWT and Supabase Row Level Security.



MindCare is a mental-wellbeing support application built with React + Vite, FastAPI, Groq inference, and Supabase (PostgreSQL + Supabase Auth).

> **Safety notice:** MindCare is a wellness-support prototype, not a medical device, diagnostic tool, or emergency service. The user-facing PHQ-9 is a screening instrument, not a diagnosis. Legacy GAD-7 database fields and API support remain for backward compatibility but are not exposed as a new public check-in. Previously saved GAD-7 results remain historical data and may appear in Insights. Facial-expression labels, text sentiment, and the weighted wellbeing indicator are not clinically validated risk assessments. Do not use them to make clinical decisions.

## Production-oriented stack

- **Frontend:** React 18, Vite, Tailwind CSS
- **API:** Python 3.11+, FastAPI, Pydantic, async HTTPX
- **Identity:** Supabase Auth (email/password access tokens)
- **Database:** Supabase PostgreSQL through PostgREST using the signed-in user's JWT; Row Level Security is enabled
- **LLM/agent:** AsyncGroq with bounded tool calling; default text model `openai/gpt-oss-20b` (overridable via `GROQ_CHAT_MODEL`)
- **Vision:** Groq's configurable `qwen/qwen3.8-27b` vision model; explicit unavailable state if the provider fails
- **Retrieval:** lightweight PDF text extraction and keyword retrieval using pypdf
- **Tests:** pytest and Node's built-in test runner; integration tests requiring external credentials are intentionally not run against production data

No MongoDB driver or MongoDB fallback is included. Normal data operations use caller access tokens for PostgREST and Storage, so RLS remains active. A Supabase service-role key is optional and used only by the server-side account deletion endpoint; it is never sent to the browser.

## Brand, profile and personalization

The profile editor supports username changes, a preferred display name, pronouns, time zone, preferences, avatar upload/removal, and permanent account deletion. Permanent deletion uses the Supabase Auth admin API on the server after removing the user's private avatar; Supabase cascades the user's application rows through their auth-user foreign keys.

The supplied “MindCare — A Calmer You, Everyday” artwork is cropped into a compact mark and a horizontal lockup under `frontend/public/brand/` and used on the landing/auth shell, workspace sidebar, loading screen, and favicon. The Profile screen supports a display name, optional DOB with computed age, optional pronouns, timezone, response style, focus areas, and profile photo upload/removal. Avatar uploads are re-encoded to WebP to strip image metadata and stored in a private bucket at an owner-scoped path. The chatbot receives the saved display name/username, optional pronouns, calculated age (never the raw DOB), response style, and selected focus areas. It never receives a profile photo.

New accounts without a preferred display name see a compact “Make this space yours” card on Home, linking to Profile. Personal details remain optional.

## Frontend experience

The authenticated workspace includes a responsive side navigation, an account-specific profile and response preferences, a welcoming overview with saved conversation/assessment recovery, a conversational chat layout with quick-start prompts, streamed replies, stop/retry behavior and saved-history navigation, a PHQ-9-only public assessment journey, with legacy GAD-7 endpoints and saved records retained for compatibility, responsive emotion/insights screens, profile-time-zone-aware timestamps, keyboard-visible focus states, and reduced-motion handling. The public landing page includes plain-language privacy and use notices. Those notices are an application summary—not a substitute for a complete legal policy.

## Project layout

```text
Mindcare-main/
├── backend/
│   ├── auth/dependencies.py      # Supabase session validation
│   ├── db/supabase.py            # pooled async HTTP client for Auth/PostgREST
│   ├── routers/                  # auth, chat, assessment, emotion, metrics
│   ├── services/                 # Groq, RAG, risk indicators, trajectory
│   ├── documents/                # reference PDFs for optional retrieval
│   ├── tests/                    # offline unit/API tests
│   ├── main.py
│   ├── requirements.txt
│   └── .env.example
├── frontend/
├── supabase/schema.sql           # schema, trigger, indexes, RLS, grants and private avatar bucket
├── frontend/public/brand/       # supplied MindCare brand mark and wordmark lockup
├── Dockerfile
├── docker-compose.yml
└── render.yaml
```

## Setup

### 1. Configure Supabase

1. Create a Supabase project. For a **new** project, open SQL Editor and run all of `supabase/schema.sql`. For the existing MindCare project, apply each file under `supabase/migrations/` in filename order; do not rerun the fresh-install schema blindly. Supabase manages RLS on `storage.objects`; the MindCare SQL adds owner-scoped avatar policies without attempting to change the managed table's RLS mode or owner.
3. In Project Settings → API, copy the project URL and publishable/anon key.
4. In **Authentication → URL Configuration**, set **Site URL** to `http://localhost:5173` during local development and add `http://localhost:5173/**` to the Redirect URLs allowlist. Remove any stale `http://localhost:3000` entry as the Site URL unless you actually serve the app on port 3000.
5. In **Authentication → Providers → Email**, keep email confirmation enabled if you want verified accounts. The app sends confirmation links to `/auth/callback`, provides a resend-confirmation flow for expired links, and supports password reset/update.
6. The confirmation/reset emails must use Supabase’s confirmation URL or the configured redirect URL. If you customized the email template to hard-code `{{ .SiteURL }}`, update it so the confirmation flow respects the intended redirect; avoid manually hard-coding `localhost:3000`.
7. Optional **Google sign-in**: in Supabase Authentication → Sign In / Providers, enable Google and enter your Google OAuth client ID and secret. In Google Cloud, add the app origin `http://localhost:5173` and the Supabase OAuth callback URL shown in the Supabase Google provider panel. Google sign-in is a real OAuth request, and will return a clear setup error until the provider is configured.
8. Keep RLS enabled. Policies restrict profiles, conversations, messages, assessments, and trajectories to the signed-in owner. The backend uses the user's Supabase JWT when it accesses PostgREST.

### 2. Backend

```bash
cd backend
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
Copy-Item .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

macOS/Linux:

```bash
source .venv/bin/activate
cp .env.example .env
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Set these values in `backend/.env`:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (or Supabase publishable key supported by your project)
- `SUPABASE_SERVICE_ROLE_KEY` (optional; server-side only, required to enable permanent account deletion)
- `GROQ_API_KEY`
- `ALLOWED_ORIGINS` to your exact frontend origin

Optional model overrides: `GROQ_CHAT_MODEL` and `GROQ_VISION_MODEL`. Defaults are the current Groq-supported model IDs documented in Groq's models/vision docs. Model availability can change; verify in Groq Console if an inference request returns a model error.

### 3. Frontend

In a separate terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

Set `VITE_API_URL=http://localhost:8000` in `frontend/.env`. Open the Vite URL, typically `http://localhost:5173`.

### 4. Health / API docs

- `GET /` — liveness
- `GET /api/health` — verifies Supabase PostgREST schema reachability and optional feature state
- `GET /docs` — Swagger API docs during development

## Deployment

For Render, create the service from `render.yaml` and set `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `GROQ_API_KEY` in its environment. Set `SUPABASE_SERVICE_ROLE_KEY` only if you want to enable account deletion; keep it server-side and never add it to a `VITE_*` variable. Set `ALLOWED_ORIGINS` to the exact Vercel URL. Do not set `DATABASE_URL`, `MONGO_URL`, or `DB_NAME`; MongoDB has been removed from this version.

For Vercel, set `VITE_API_URL` to the deployed FastAPI URL. Never put Groq credentials or a Supabase service-role/secret key in any `VITE_*` variable.

## Performance choices

- Reuses a pooled async HTTP client for Supabase network calls.
- Uses AsyncGroq so inference waits do not block the event loop.
- Uses bounded conversation history (last 12 persisted messages) and bounded completion size.
- Streams chat output over server-sent events and derives stable message IDs from the session/request IDs so retries can recover an already-saved reply without duplicating the pair.
- Keeps optional PDF retrieval lightweight; no ChromaDB, Torch, or LangChain dependency is installed by default.
- Uses asynchronous Groq Vision requests and strict image type/size checks without loading local model weights at startup.
- Uses Supabase refresh tokens to renew sessions rather than forcing sign-in on every access-token expiry.
- Email verification, resend-confirmation, password recovery/password update, expired-link messaging, and optional Google OAuth all use real Supabase Auth endpoints.
- Implements bounded read-only agent tools for local wellness-reference search and grounding exercises; no autonomous external actions.
- Avoids requiring a remote database connection at process import/startup; health endpoint reports actual schema reachability.

A free-tier host may still cold-start after inactivity; this is a host plan behavior, not something application code can fully eliminate.

## Privacy and safety notes

- The application intentionally stores conversations and assessment records in Supabase so history and trend tracking can persist. The in-app privacy notice explains the main data flows, but it is not a complete legal policy. Document retention, deletion requests, operator contact details, and legal requirements before public use.
- Provide camera consent and a non-camera path; do not use emotion recognition as a clinical measure.
- The heuristic wellbeing indicator is explanatory UI context only, not a diagnosis or validated suicide-risk score. Unavailable assessment signals are excluded rather than treated as zero.
- Keyword crisis detection can miss indirect language. It is a safety layer, not a guarantee; verify local emergency resources and provide professional escalation guidance.
- Do not log message text, access tokens, passwords, or image payloads.

## Tests

```bash
cd frontend
npm test
npm run build

cd ../backend
python -m pytest -q
```

Install frontend dependencies with `npm ci`. Install the backend test and audit tools first with `pip install -r requirements-dev.txt`. The automated suites validate stream parsing, scoring, API contracts, and configuration without a real Supabase or Groq account. Before deployment, perform real integration smoke tests against a **separate test Supabase project**: signup with confirmation, email/password login, `/me`, streamed chat persistence, history, session deletion, PHQ-9 persistence, profile/avatar persistence, RLS cross-user isolation, trajectory, and metrics.

## Existing MongoDB data

This codebase intentionally does not auto-migrate legacy MongoDB data. If the old deployment contains users or conversations worth retaining, export them and design a controlled migration to UUID-based Supabase Auth identities. Do not copy password hashes and assume they work with Supabase Auth; use a password-reset flow unless migration compatibility is explicitly validated.
