# MindCare — Start Here

## Required Supabase setup

For an existing Supabase project, first check Supabase's migration history. Apply only migrations that have not already been applied, using the dependency order below; do not blindly rerun a migration against an existing production database. For a brand-new project, run the complete `supabase/schema.sql` instead of the incremental migrations.

Existing-project migration order:
1. `20261013_personal_profile.sql`
2. `20261013_profile_permissions.sql`
3. `20261013_dob_avatar_storage.sql`
4. `20261017_assessment_integrity.sql`
5. `20261017_user_memories.sql`
6. `20261017_z_data_permissions.sql`
7. `20261019_assessment_safety_followup.sql`
8. `20261021_assessment_submission_idempotency.sql`
9. `20261022_assessment_integrity_permissions.sql`
10. `20261022_chat_turn_idempotency.sql`
11. `20261022_profile_memory_enabled.sql`
12. `20261023_user_memory_edit.sql`

The migration set covers profile preferences and private avatars, PHQ-9/GAD-7 storage integrity, user-approved memories, assessment safety follow-up and idempotency, chat-turn retry protection, memory opt-in and memory editing. The public assessment UI offers PHQ-9 only; legacy GAD-7 API/database support remains for compatibility. The profile-avatar bucket is private and uses owner-authorized access. Never put a Supabase secret/service-role key in the frontend.


This archive contains the complete application source for the Supabase + Groq version of MindCare.

## What is included

- `frontend/`: React + Vite UI, styles, screens, API client, npm lockfile, and the supplied MindCare brand assets under `public/brand/`.
- `backend/`: FastAPI API, Supabase Auth/PostgREST integration, Groq chat and optional vision service, assessment/risk/trajectory services, bundled wellness reference PDFs, and offline tests.
- `supabase/schema.sql`: fresh-install PostgreSQL tables, indexes, triggers, grants, row-level security policies, and private avatar storage. Existing projects should apply only their missing migrations from the full sequence listed at the top of this guide.
- `Dockerfile`, `docker-compose.yml`, `render.yaml`, `frontend/vercel.json`: deployment configuration.
- `README.md`: full configuration, architecture, privacy/safety notes, deployment, and test instructions.

The old ChromaDB cache and local Caffe/OpenCV model weights are intentionally not included: this version uses lightweight PDF retrieval and the configured Groq Vision API instead. `node_modules`, Python virtual environments, local caches, and real `.env` files are not included; package lockfiles and `.env.example` templates are included.

## Run on Windows

1. Install Python 3.11+ and Node.js 20+.
2. For a new Supabase project, open **SQL Editor** and run the complete `supabase/schema.sql` file. For your existing MindCare project, apply only missing migrations from the full sequence listed at the top of this guide instead of rerunning the full schema.
3. Create a Groq API key in GroqCloud.
4. Open `backend/.env.example`, copy it to `backend/.env`, and fill in `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `GROQ_API_KEY`. Keep these values private. Set `ALLOWED_ORIGINS=http://localhost:5173` and `FRONTEND_URL=http://localhost:5173` for local development.
5. Copy `frontend/.env.example` to `frontend/.env`; keep `VITE_API_URL=http://localhost:8000` for local development.
6. Run `start.bat` from the project root. It installs dependencies and starts the API and Vite development server in separate terminals. The first install requires internet access.
7. Open the Vite URL shown in the terminal, typically `http://localhost:5173`.

If `npm ci` on Windows fails inside an `esbuild` postinstall with `ERR_INVALID_ARG_TYPE` and your PowerShell `$env:ComSpec` is empty, run `$env:ComSpec = "$env:WINDIR\System32\cmd.exe"` in that PowerShell window and retry `npm ci`. This only changes the current terminal session.

You can instead follow the separate, step-by-step commands in `README.md`.

## Before a public deployment

- Set the real secrets only in backend hosting environment variables; never put Groq keys or Supabase secret/service-role keys in `VITE_*` variables.
- Set `ALLOWED_ORIGINS` to the exact deployed frontend URL.
- Run `pytest -q` from `backend/` and `npm ci && npm run build` from `frontend/`.
- Test real sign-up/email confirmation, login/refresh/logout, chat persistence and recovery, session deletion, RLS isolation with two distinct test accounts, PHQ-9 submission/follow-up, memory controls, and Groq inference using a separate test project.
- Do not use this project to diagnose mental-health conditions. Facial-expression labels and the composite indicator are experimental and not clinically validated. Confirm local support information and complete privacy/retention terms before real users store sensitive records.

## Validation performed for this archive

- Backend automated tests: 46 passed in the release review (`cd backend` then `python -m pytest tests -q`). Rerun them after extracting if you make changes.
- Frontend source syntax and relative imports were statically checked in the release review; see `RELEASE_AUDIT.md` for the exact scope and limitations.
- Archive integrity: verified after packaging.
- Limitation: a Vite production build could not be run here because npm dependency installation timed out. Complete a successful `npm ci` and `npm run build` before deployment.
- Live authentication still needs a smoke test against your Supabase project: email confirmation, resend, forgot/reset password, and Google OAuth after its provider is configured.
