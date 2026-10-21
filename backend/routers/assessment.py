"""PHQ-9/GAD-7 screening endpoints with user-scoped, retry-safe persistence.

Screening totals are not diagnoses and must never be presented as an imminent-risk
prediction. PHQ-9 item 9 triggers a direct follow-up pathway independent of the total.
"""
from __future__ import annotations

import json
import logging
from typing import Annotated, Callable
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, StrictInt, field_validator

from auth.dependencies import get_current_user
from db.supabase import SupabaseError, insert_row, select_rows

logger = logging.getLogger("mindcare.assessment")
router = APIRouter()
Answer = Annotated[StrictInt, Field(ge=0, le=3)]
PHQ9_SCORING_VERSION = "phq9-standard-v1"
GAD7_SCORING_VERSION = "gad7-standard-v1"


class _AssessmentRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    responses: list[Answer]
    # Optional for compatibility with stale/third-party clients. The current MindCare
    # frontend sends a UUID. Calls without it continue to work but are not retry-safe.
    submission_id: UUID | None = None


class PHQ9Request(_AssessmentRequest):
    @field_validator("responses")
    @classmethod
    def validate_count(cls, values: list[int]) -> list[int]:
        if len(values) != 9:
            raise ValueError("PHQ-9 requires exactly 9 responses")
        return values


class GAD7Request(_AssessmentRequest):
    @field_validator("responses")
    @classmethod
    def validate_count(cls, values: list[int]) -> list[int]:
        if len(values) != 7:
            raise ValueError("GAD-7 requires exactly 7 responses")
        return values


def _normalize_stored_answers(value: object) -> list[int] | None:
    """Decode JSONB safely; malformed historical data is never treated as a match."""
    if isinstance(value, str):
        try:
            value = json.loads(value)
        except (TypeError, ValueError):
            return None
    if not isinstance(value, list) or any(type(item) is not int or not 0 <= item <= 3 for item in value):
        return None
    return value


async def _find_submission(user_id: str, token: str, instrument: str, submission_id: UUID) -> dict | None:
    rows, _ = await select_rows("assessments", token, {
        "select": "id,user_id,instrument,score,max_score,answers,completed_at,submission_id,scoring_version,result_snapshot",
        "user_id": f"eq.{user_id}",
        "instrument": f"eq.{instrument}",
        "submission_id": f"eq.{submission_id}",
        "limit": "1",
    })
    return rows[0] if rows else None


def _http_persistence_error(exc: SupabaseError) -> HTTPException:
    logger.warning("Assessment persistence failed (status=%s)", exc.status_code)
    return HTTPException(
        status_code=503,
        detail="Assessment could not be safely verified or saved. Retry the same submission without changing its answers.",
    )


def _result_from_snapshot(
    existing: dict,
    responses: list[int],
    scorer: Callable[[list[int]], dict],
    instrument: str,
    version: str,
    max_score: int,
    disclaimer: str,
) -> dict:
    """Validate a replay against stored facts and recompute the client-facing result.

    The result snapshot is useful for audit/version tracking, but it is not blindly
    trusted as output: a signed-in browser must never be able to make the API echo a
    forged category or explanation by directly inserting a row under its own RLS policy.
    """
    saved_answers = _normalize_stored_answers(existing.get("answers"))
    if saved_answers is None or saved_answers != responses:
        raise HTTPException(
            status_code=409,
            detail="This submission ID was already used with different or unreadable answers. Start a new assessment attempt.",
        )

    saved_version = existing.get("scoring_version")
    if saved_version != version:
        raise HTTPException(
            status_code=409,
            detail="This saved submission uses a different scoring version and cannot be replayed safely.",
        )

    # Recompute from validated answers. Never trust user-writable score/category fields
    # without checking them against the server's canonical scorer.
    result = dict(scorer(responses))
    result["is_diagnosis"] = False
    try:
        persisted_score = int(existing.get("score"))
        persisted_max = int(existing.get("max_score"))
    except (TypeError, ValueError):
        raise HTTPException(status_code=409, detail="This saved submission could not be verified safely.")
    if persisted_score != result.get("score") or persisted_max != max_score or result.get("max_score") != max_score:
        raise HTTPException(
            status_code=409,
            detail="Saved assessment values do not match the submitted answers. The record was not overwritten.",
        )

    snapshot = existing.get("result_snapshot")
    if isinstance(snapshot, str):
        try:
            snapshot = json.loads(snapshot)
        except (TypeError, ValueError):
            snapshot = None
    if snapshot is not None:
        if not isinstance(snapshot, dict):
            raise HTTPException(status_code=409, detail="This saved submission has an invalid result snapshot.")
        # Catch internal record corruption without exposing raw stored data to the caller.
        core_fields = ("score", "max_score", "category", "is_diagnosis")
        if any(snapshot.get(key) != result.get(key) for key in core_fields):
            raise HTTPException(status_code=409, detail="This saved submission has inconsistent result data.")
        if result.get("crisis_flag") is not None and snapshot.get("crisis_flag") != result.get("crisis_flag"):
            raise HTTPException(status_code=409, detail="This saved submission has inconsistent safety-follow-up data.")

    result["is_diagnosis"] = False
    result["disclaimer"] = disclaimer
    result["submission_id"] = str(existing.get("submission_id"))
    result["assessment_id"] = existing.get("id")
    result["scoring_version"] = version
    result["idempotent_replay"] = True
    result["idempotency_status"] = "protected"
    return result

async def _persist_assessment(
    *,
    current_user: dict,
    instrument: str,
    responses: list[int],
    max_score: int,
    submission_id: UUID | None,
    scorer: Callable[[list[int]], dict],
    scoring_version: str,
    disclaimer: str,
) -> dict:
    user_id = current_user["id"]
    token = current_user["access_token"]

    # Fail closed on idempotency lookup errors. Inserting anyway could duplicate a result
    # after the browser timed out but the first database write had actually succeeded.
    if submission_id is not None:
        try:
            existing = await _find_submission(user_id, token, instrument, submission_id)
        except SupabaseError as exc:
            raise _http_persistence_error(exc) from exc
        if existing:
            return _result_from_snapshot(existing, responses, scorer, instrument, scoring_version, max_score, disclaimer)

    result = dict(scorer(responses))
    result["is_diagnosis"] = False
    result["disclaimer"] = disclaimer
    result["submission_id"] = str(submission_id) if submission_id else None
    result["scoring_version"] = scoring_version
    result["idempotent_replay"] = False
    result["idempotency_status"] = "protected" if submission_id else "legacy_no_key"

    row = {
        "user_id": user_id,
        "instrument": instrument,
        "score": result["score"],
        "max_score": max_score,
        "answers": responses,
        "scoring_version": scoring_version,
        "result_snapshot": result,
    }
    if submission_id is not None:
        row["submission_id"] = str(submission_id)

    try:
        inserted = await insert_row("assessments", token, row)
        if inserted:
            result["assessment_id"] = inserted[0].get("id")
        return result
    except SupabaseError as exc:
        # Two requests can pass the first lookup simultaneously. The database unique
        # index serializes that race; the loser reads back the winner and compares answers.
        if submission_id is not None and exc.status_code == 409:
            try:
                existing = await _find_submission(user_id, token, instrument, submission_id)
            except SupabaseError as lookup_exc:
                raise _http_persistence_error(lookup_exc) from lookup_exc
            if existing:
                return _result_from_snapshot(existing, responses, scorer, instrument, scoring_version, max_score, disclaimer)
        raise _http_persistence_error(exc) from exc


@router.get("/assessment/questions")
async def get_questions():
    from services.assessment_service import get_phq9_questions, get_gad7_questions, get_answer_options
    return {"phq9": get_phq9_questions(), "gad7": get_gad7_questions(), "options": get_answer_options()}


@router.get("/assessment/history")
async def assessment_history_endpoint(current_user=Depends(get_current_user)):
    """Return only the signed-in user's assessment summaries, never raw answers."""
    try:
        rows, _ = await select_rows("assessments", current_user["access_token"], {
            "select": "id,instrument,score,max_score,completed_at",
            "user_id": f"eq.{current_user['id']}",
            "order": "completed_at.desc", "limit": "20",
        })
        allowed_fields = ("id", "instrument", "score", "max_score", "completed_at")
        return {"history": [{key: row.get(key) for key in allowed_fields} for row in rows]}
    except SupabaseError as exc:
        raise HTTPException(status_code=503, detail="Assessment history is temporarily unavailable.") from exc


@router.post("/assessment/phq9")
async def score_phq9_endpoint(req: PHQ9Request, current_user=Depends(get_current_user)):
    from services.assessment_service import score_phq9
    return await _persist_assessment(
        current_user=current_user, instrument="PHQ-9", responses=req.responses, max_score=27,
        submission_id=req.submission_id, scorer=score_phq9, scoring_version=PHQ9_SCORING_VERSION,
        disclaimer=(
            "PHQ-9 screening result only; not a diagnosis. A positive answer to item 9 needs a direct, "
            "compassionate safety follow-up. The total score cannot establish immediate danger by itself."
        ),
    )


@router.post("/assessment/gad7")
async def score_gad7_endpoint(req: GAD7Request, current_user=Depends(get_current_user)):
    from services.assessment_service import score_gad7
    return await _persist_assessment(
        current_user=current_user, instrument="GAD-7", responses=req.responses, max_score=21,
        submission_id=req.submission_id, scorer=score_gad7, scoring_version=GAD7_SCORING_VERSION,
        disclaimer="GAD-7 screening result only; not a diagnosis.",
    )
