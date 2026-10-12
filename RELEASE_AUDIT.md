# MindCare Release Review — 4.5.1

Review date: 2026-10-13
Scope: supplied brand integration, DOB-derived age, private profile-avatar upload, profile-aware chat context, first-time profile setup card, transparent account-handle recognition, and rate-limited avatar endpoints.

## Implemented

- Cropped the user-supplied logo image into `frontend/public/brand/mindcare-mark.png` and `frontend/public/brand/mindcare-lockup.webp`; used the mark in app branding/favicon and the lockup in the desktop authentication story panel.
- Added `date_of_birth` to profile schema and profile form. Age is derived in the backend using the user's selected time zone. Only the derived age is passed to Groq; the raw DOB is not placed in the LLM context.
- Added optional pronouns, preferred name, username, age, response-style, and focus-area context to the Groq system prompt. If no preferred name is saved, it can identify the account handle without claiming access to an actual legal name.
- Added private Supabase Storage avatar upload/change/remove. The backend validates the upload, rejects unsupported or malformed formats, limits input size/dimensions, re-encodes to WebP to remove EXIF metadata, and stores at an owner-prefixed path. The SQL migration configures a private bucket and SELECT/INSERT/UPDATE/DELETE owner-scoped storage policies.
- Added a compact Home profile setup card for accounts without a preferred display name. The profile picture renders in the profile card, sidebar, and account avatar. The assistant now explicitly identifies the saved account handle when asked for a name if no preferred name has been set, without claiming the handle is a legal/real name.
- Updated `supabase/schema.sql` for new projects and added `supabase/migrations/20261013_dob_avatar_storage.sql` for existing projects.

## Checks performed

- Backend `python -m compileall -q .`: passed.
- Backend `pytest -q`: **46 passed**.
- Frontend JS/JSX: 21 files parsed with TypeScript parser and zero syntax diagnostics; 47 relative imports resolved; CSS parsed with tinycss2 (839 top-level tokens, zero parser errors); package lock root dependency set matches `package.json`.
- SQL contract tests cover new DOB/Storage columns, private bucket configuration, and owner-scoped Storage policies.
- Archive integrity and content checks are performed after packaging.

## Still requires your environment

- I could not run the Vite production build in this environment because the local npm dependency install did not complete. Run `npm ci` then `npm run build` from `frontend/` before deploying.
- Run the three migrations in order on your existing Supabase project: `20261013_personal_profile.sql`, `20261013_profile_permissions.sql`, `20261013_dob_avatar_storage.sql`.
- Test avatar upload/delete and signed URL refresh with the real Supabase project; test RLS with two accounts; test email confirmation/forgot-password and Google OAuth; manually verify the responsive UI in a browser.
- Avatar signed URLs expire after 24 hours and are refreshed when the profile is loaded. The profile photo is not sent to the AI model.
- This remains a wellbeing support prototype, not a diagnostic or emergency service.
