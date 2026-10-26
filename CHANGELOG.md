# Changelog

## Unreleased — Route-specific CSS and first-load efficiency

- Kept Profile, Insights, and Chat page styles in their lazy route chunks rather than the global entry stylesheet.
- Consolidated web typography to DM Sans and Fraunces variable families.
- Reduced the initial CSS build payload from 163.14 KB raw / 33.81 KB gzip to 139.10 KB raw / 29.43 KB gzip after Profile and Insights CSS splitting, before the additional Chat CSS split.
- Updated the conversation-mode regression test to validate the component-owned stylesheet.

## Unreleased — Frontend typography and loading foundation

- Consolidated typography to DM Sans for interface text and Fraunces for editorial headings, including inline expression-page headings.
- Reduced Google Fonts from four families to two variable font families, retaining `display=swap` and existing preconnect hints.
- Preserved existing route-level lazy loading and application behavior.
- Added a regression contract for the two-family type system and route-loading boundary.

## Unreleased — Home interaction and layout polish

- Kept the existing guided-start Home structure and copy; did not add a new hero, floating labels, decorative artwork or global blur effects.
- Refined desktop content width, card elevation, typography rhythm and choice-card interaction states.
- Improved recent-activity row hover feedback while preserving real activity, loading, retry and empty states.
- Preserved responsive layouts, keyboard focus indicators and reduced-motion behavior.
- Added a contract test to guard the intentionally restrained Home visual direction.

## Unreleased — Public assessment scope and setup-documentation alignment

- Aligned the public check-in selector with the PHQ-9-only v1 product decision from the long-term engineering blueprint.
- Kept GAD-7 endpoints, scoring/storage contracts and existing records for backward compatibility; existing GAD-7 results can still appear as historical Insights, but the public UI does not start new GAD-7 check-ins.
- Updated the Insights filtering/rendering so legacy GAD-7 history is preserved without presenting GAD-7 as a selectable new check-in.
- Rewrote the Supabase setup guide to describe the complete existing-project migration sequence and to require checking applied migration history before applying only missing migrations.
- Added regression coverage for the public assessment catalogue, PHQ-9-only loading and legacy result labels.

## 4.5.1 — Personal name grounding and avatar safety polish (2026-10-13)

- If no preferred name is saved, the assistant can identify the account handle as a handle instead of claiming it knows nothing or asserting the handle is the person’s real name.
- Stopped using the account handle as a public-facing greeting in the Home and Insights headings; a preferred name appears only when the user has set one.
- Added per-IP limits to avatar upload and deletion endpoints.
- Validation: **46 backend tests pass**; frontend syntax/import/CSS checks pass; Vite build remains unverified here.

## 4.5.0 — Personal identity, private avatar, and supplied brand artwork (2026-10-13)

- Integrated the supplied “MindCare — A Calmer You, Everyday” image as the product brand: a compact icon mark is used in the workspace sidebar, landing nav, loading state, and favicon; the full cropped lockup is used on the authentication story panel.
- Added optional date of birth to the profile with automatically calculated age. The DOB is stored only in the signed-in user's profile; the backend computes age using the user's selected time zone and sends the derived age—not the raw DOB—to Groq. When asked what it knows, the assistant now distinguishes the saved preferred name from the account handle rather than saying it has no information.
- Added private profile-photo upload/change/remove with a per-user Supabase Storage path, owner-scoped RLS, image validation and WebP re-encoding to strip image metadata.
- Added a first-personalization card for new accounts without a preferred display name, directing them to set a name, optional birthday, response style, focus areas, and profile photo.
- Improved chatbot identity grounding: it uses the saved preferred name or clearly identifies the account username when the user asks what is on file, rather than claiming there is no account information.
- Added the idempotent `20261013_dob_avatar_storage.sql` migration and updated the fresh-install schema and setup guide.
- Validation: **45 backend tests pass**; all 21 JS/JSX files pass a TypeScript parser syntax pass. Frontend production build and live Supabase Storage/OAuth checks still require environment-level tests.

## 4.3.1 — Senior release audit and readability pass (2026-10-13)

- Added a profile INSERT RLS policy and explicit authenticated profile SELECT/INSERT/UPDATE grants in both the fresh schema and existing-project migration, so lazy profile creation and saved preferences use the same intended permissions.
- Hardened profile personalization by treating display names as JSON-quoted user data and explicitly forbidding instructions embedded in profile fields from overriding the system policy.
- Validated profile time zones against IANA zone names and added `tzdata` for Windows environments.
- Made chat message timestamps and the Insights refresh timestamp honor the saved profile time zone, with safe fallback for invalid browser/runtime timezone handling.
- Removed unused process-local online-user and cross-user total-user analytics endpoints/helpers from the personal Insights feature, and drop the obsolete global user-count RPC from the schema migration.
- Improved readability of profile, sidebar, chat metadata, and Insights labels; corrected a duplicated Insights error assignment; and fixed the Windows launcher to set `ComSpec` before npm lifecycle scripts.
- Expanded offline regression checks for timezone validation, prompt-injection-resistant profile personalization, profile RLS/grants, and absence of the platform-wide count RPC.
- Validation: **37 backend tests pass**; Python modules compile; all 21 frontend JS/JSX files passed a TypeScript parser syntax pass; 47 relative imports resolved; CSS parsed with PostCSS; package-lock direct dependency entries checked. Production Vite build and live two-account RLS/OAuth checks remain unverified here; see `RELEASE_AUDIT.md`.

## 4.2.1 — Atelier UI and chat persistence fix

- Refined the workspace into a warmer premium visual system with Fraunces display typography, more legible conversation text, softer surfaces, richer hover/focus states, and improved small-screen behavior.
- Fixed short-height sidebar overflow so navigation items scroll rather than colliding with the account controls and privacy card.
- Scoped chat auto-scroll to the chat viewport so sending a message does not scroll ancestor containers or visually shift the workspace chrome.
- Fixed Supabase/PostgREST chat persistence: user and assistant message rows now share the exact same set of JSON keys for bulk insertion, using explicit `null` for fields that do not apply to one row.
- Replaced the tiny static SVG trajectory line in Analytics with a responsive Recharts area chart with hover tooltip, zero reference line, and an explicitly experimental/non-clinical scale. Updated the overview chart to represent signed EMA points rather than incorrectly labeling the signal as a risk percentage.
- Added regression coverage for identical bulk-insert key sets.
- Verification: 20 backend tests pass; 20 frontend JS/JSX files parse without syntax errors; all relative imports resolve; CSS parses successfully. A production Vite build could not be run in this environment because npm dependencies were not available from the registry/cache. Re-run `npm ci` and `npm run build` locally before deployment.

## 4.2.0 — Real Supabase authentication flows

- Sign-up confirmation redirects to the configured Vite origin (`FRONTEND_URL`) instead of inheriting a stale `localhost:3000` Site URL.
- Added an auth callback handler that consumes Supabase session tokens from the URL fragment, stores them locally for the API client, validates the session with the backend, and removes tokens from the address bar.
- Added functional forgot-password, recovery-session password update, and resend-confirmation endpoints using Supabase Auth REST endpoints.
- Added an expired-link recovery UI and clearer unconfirmed-email sign-in messaging.
- Added a real Google OAuth redirect request; it requires the Google provider to be configured in Supabase before it can succeed.
- Added dashboard configuration instructions for Site URL and Redirect URLs, and offline auth-flow contract tests.
- Verification: 19 backend tests pass; 20 frontend JS/JSX files parse with no syntax errors and 40 relative imports resolve. Live email delivery, real Google OAuth, and the production frontend build still require environment-level smoke tests.

## 4.1.0 — Frontend and conversation UX refinement

- Rebuilt the authenticated shell with responsive mobile navigation, clear page context, account identity, and persistent safety reminder.
- Added an activity-aware overview with recent saved conversations and assessment summaries; avoids displaying invented metrics for new accounts.
- Redesigned chat layout with accessible message composer, keyboard hints, quick-start prompts, loading feedback, and saved-session recovery.
- Fixed a broken frontend entry import that prevented the Vite app from compiling.
- Added a privacy/use disclosure dialog that accurately describes current storage and provider flows without pretending to be a complete legal policy.
- Replaced outdated/uncertain footer hotline entries with the Government of India Tele-MANAS 14416 resource and official service information.
- Reduced unsupported “free/private” marketing claims and improved wellbeing/non-diagnostic copy.
- Added an allow-list to the assessment-history response and a regression test to prevent raw answers or user identifiers being returned.
- Verification at the time of that release: 13 backend tests passed; JavaScript/JSX syntax and relative imports were checked. A Vite production build could not be run in this environment because npm dependencies could not be fetched from the registry.

## 4.0.0 — Supabase-first refactor

- Removed PyMongo, MongoDB URL settings, database adapter, and MongoDB-specific queries.
- Switched login/registration/session validation to Supabase Auth.
- Switched persistence to PostgREST with end-user JWTs and row-level security.
- Replaced process-local chat memory with bounded history loaded from PostgreSQL.
- Converted Groq generation to AsyncGroq and made conversation context bounded.
- Updated default Groq model IDs for the current model catalog; vision model is configurable.
- Made unassessed PHQ-9/GAD-7 values nullable rather than silently scoring them as zero.
- Removed stale/fabricated hard-coded model accuracy reporting; deployment now reports no independent validation data unless configured.
- Trimmed unused LangChain, PyMongo, bcrypt, and custom-JWT dependencies.
- Added Supabase RLS policies, ownership constraints, indexes, profile trigger, and an aggregate-only global user-count RPC.

## 4.4.0 — Action-first interactive home (2026-10-13)

- Replaced the long, copy-heavy overview with a compact, action-first home: one greeting, a conversation CTA, a five-option mood-to-chat starter, three clear tools, and up to three real recent activities.
- Added a three-step first-visit tour shown only for users without recent saved activity; it can be skipped and is remembered per account in the current browser.
- Mood selections are not recorded as clinical data; they only prefill an editable conversation starter before the user chooses to send it.
- Added a context-backed pending chat prompt so mood shortcuts take the user to the existing chat composer without auto-sending.
- Shortened workspace navigation, account privacy wording, chat welcome text, and profile page microcopy. Replaced duplicated top-level page text with shorter page labels.
- Added responsive card layouts, interactive hover/focus states, a small animated brand motif, reduced-motion support, and compact mobile styling.
- Validation: **37 backend tests pass**; all 21 JS/JSX files pass TypeScript parser syntax checks; all relative imports resolve; CSS parses with PostCSS. Production Vite build remains unavailable in this environment because the Vite executable is absent from the partial local dependency tree. Run `npm ci` and `npm run build` locally.
