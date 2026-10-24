# MindCare Phase 1 — Safety, scoring and data-integrity audit notes

> **Historical snapshot note (2026-10-25):** The audit below describes the source review from 22 October 2026. Its “what remains” section is historical and should not be treated as a complete live inventory. Subsequent commits added the user-facing memory manager and conversation modes, and CI passed on the later baseline. The public structured assessment scope is PHQ-9-only; GAD-7 backend/schema compatibility is retained. See `CHANGELOG.md` and `docs/MINDCARE_PRODUCT_EXPANSION_ROADMAP.md` for current product-scope notes.

**Target reviewed:** the current public `main` source paths fetched on 22 Oct 2026, including the safety, assessment-idempotency, emotion-input and chat-turn-idempotency changes. The conversation attachment `Mindcare-main.zip` is an older snapshot and was not treated as the target checkout.

## Behaviors already present in the current branch

- PHQ-9 and GAD-7 answers are exact integers in the accepted range and have an exact expected answer count.
- A positive PHQ-9 item 9 is treated as a separate reason for direct, compassionate safety follow-up, independent of the total score.
- The old weighted composite score is disabled. The compatibility API returns `risk_score: null` and `risk_level: UNASSESSED` rather than implying clinical prediction.
- Facial-expression estimation is documented and returned as an uncertain visible-expression estimate; it is not a safety-triage or score input.
- Chat safety routing occurs before normal profile/history/LLM work; the saved PHQ-9 follow-up lookup fails closed during normal chat when its state cannot be verified.
- Assessment and chat retry keys protect against common duplicate submissions, with owner-scoped read-back validation.

These are code-level controls, not proof of clinical validity or complete crisis detection. Keyword rules are intentionally limited and must not be interpreted as a safety classifier; absence of a match does not mean a person is safe.

## Gaps addressed by this implementation

### 1. Assessment response could claim success without a verifiable write receipt

The current assessment persistence path requests `return=representation` from PostgREST but previously returned the computed result even if `insert_row()` returned an empty list, and it could return success without a usable assessment ID. The patch now requires exactly one returned row with a non-empty ID. If that receipt is missing, it uses the submitted idempotency key to read the attempt back and validates it using the existing snapshot/replay verifier. If it cannot establish the persisted result, the endpoint returns `503`, not a false success.

For old clients without a submission ID, the endpoint remains backward compatible but cannot guarantee duplicate protection. The failure message explicitly says the result might have reached storage and tells the user to check history before starting a second attempt.

### 2. Fresh-install SQL was weaker than the existing migration set

The current `supabase/schema.sql` defined the assessment columns and idempotency fields, but did not include the answer-array/score consistency function and constraints from `20261017_assessment_integrity.sql`. It also omitted the `result_snapshot` JSON-object constraint from `20261021_assessment_submission_idempotency.sql`. The schema patch puts those checks into the fresh-install schema so a new environment does not quietly start with weaker integrity rules.

This is fresh-schema parity, not a new production migration. An existing database should continue to be managed through the versioned migrations.

## Acceptance criteria for this slice

- A normal assessment insert returns one row with an ID and succeeds.
- If the insert response is empty but the row committed, a submission-ID read-back verifies the same answers/version/score/snapshot and returns the saved result.
- If an empty/malformed receipt cannot be verified, the API returns `503` and does not claim the result is saved.
- Reusing a submission ID with different answers still returns `409` via the existing verifier.
- Fresh-install SQL rejects wrong answer counts, out-of-range answer values, invalid instrument maximums, totals inconsistent with answers, and non-object result snapshots.
- The focused tests and then the full backend suite pass before committing.

## What remains after this slice

1. Run the patch against the exact local checkout, run focused tests and the full backend suite, then inspect the diff.
2. Exercise PHQ-9 item-9 paths in a staging Supabase project with test users: positive low total, positive score with an earlier unanswered follow-up, malformed stored row and temporary database outage.
3. Conduct an explicit clinical/safety review of crisis language and local resources before any real-user pilot. Unit tests cannot validate clinical safety.
4. Continue to monitor failed persistence receipts and safety-follow-up state with privacy-preserving logs (no raw assessment answers or message text in logs).
