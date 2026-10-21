"""PHQ-9/GAD-7 screening endpoints with user-scoped, retry-safe persistence.

Screening totals are not diagnoses and must never be presented as an imminent-risk
prediction. PHQ-9 item 9 triggers a separate, compassionate safety follow-up pathway.
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
    # Optional for compatibility with older clients. Current clients should send a UUID.
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
    """Validate a replay against persisted facts and recompute canonical output."""
    saved_answers = _normalize_stored_answers(existing.get("answers"))
    if saved_answers is None or saved_answers != responses:
        raise HTTPException(
            status_code=409,
            detail="This submission ID was already used with different or unreadable answers. Start a new assessment attempt.",
        )

    if existing.get("scoring_version") != version:
        raise HTTPException(
            status_code=409,
            detail="This saved submission uses a different scoring version and cannot be replayed safely.",
        )

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
        for key in ("score", "max_score", "category", "is_diagnosis"):
            if snapshot.get(key) != result.get(key):
                raise HTTPException(status_code=409, detail="This saved submission has inconsistent result data.")
        if result.get("crisis_flag") is not None and snapshot.get("crisis_flag") != result.get("crisis_flag"):
            raise HTTPException(status_code=409, detail="This saved submission has inconsistent safety-follow-up data.")

    result.update({
        "is_diagnosis": False,
        "disclaimer": disclaimer,
        "submission_id": str(existing.get("submission_id")),
        "assessment_id": existing.get("id"),
        "scoring_version": version,
        "idempotent_replay": True,
        "idempotency_status": "protected",
    })
    return result


async def _persist_assessment(
    *, current_user: dict, instrument: str, responses: list[int], max_score: int,
    submission_id: UUID | None, scorer: Callable[[list[int]], dict],
    scoring_version: str, disclaimer: str,
) -> dict:
    user_id, token = current_user["id"], current_user["access_token"]

    # Fail closed on idempotency lookup failures: inserting anyway could duplicate a row
    # after a client timeout where the first database write actually succeeded.
    if submission_id is not None:
        try:
            existing = await _find_submission(user_id, token, instrument, submission_id)
        except SupabaseError as exc:
            raise _http_persistence_error(exc) from exc
        if existing:
            return _result_from_snapshot(existing, responses, scorer, instrument, scoring_version, max_score, disclaimer)

    result = dict(scorer(responses))
    result.update({
        "is_diagnosis": False,
        "disclaimer": disclaimer,
        "submission_id": str(submission_id) if submission_id else None,
        "scoring_version": scoring_version,
        "idempotent_replay": False,
        "idempotency_status": "protected" if submission_id else "legacy_no_key",
    })
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
        if (
            isinstance(inserted, list)
            and len(inserted) == 1
            and isinstance(inserted[0], dict)
            and isinstance(inserted[0].get("id"), str)
            and inserted[0]["id"].strip()
        ):
            # insert_row explicitly asks PostgREST for return=representation.
            # A returned row with an id is the write receipt; an empty/malformed
            # payload is ambiguous and must not be reported as a saved assessment.
            result["assessment_id"] = inserted[0]["id"]
            return result

        logger.error(
            "Assessment insert returned no verifiable receipt (instrument=%s, idempotent=%s)",
            instrument,
            submission_id is not None,
        )

        # The database may have committed the row even if the HTTP response did not
        # include its representation. With an idempotency key, read the exact attempt
        # back and verify answers, score, scoring version, and snapshot before claiming
        # success. Retrying the same key is safe because the database unique index guards it.
        if submission_id is not None:
            try:
                existing = await _find_submission(user_id, token, instrument, submission_id)
            except SupabaseError as lookup_exc:
                raise _http_persistence_error(lookup_exc) from lookup_exc
            if existing:
                return _result_from_snapshot(
                    existing, responses, scorer, instrument, scoring_version, max_score, disclaimer
                )

        detail = (
            "MindCare could not confirm that this assessment was saved. The submission may have been received. "
            "Retry this same attempt with the same submission ID."
            if submission_id is not None
            else
            "MindCare could not confirm that this assessment was saved. The submission may have been received; "
            "check assessment history before starting another attempt. This older request did not include a retry key."
        )
        raise HTTPException(status_code=503, detail=detail)
    except SupabaseError as exc:
        # Two requests can pass the initial lookup simultaneously. The unique index
        # serializes that race; the loser reads the winner and verifies exact answers.
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
    """Return only the signed-in user's recent summaries, never raw answers or user IDs."""
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
