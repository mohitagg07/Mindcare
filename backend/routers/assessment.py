from typing import Annotated
import uuid
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, StrictInt, field_validator
from fastapi import Depends
from auth.dependencies import get_current_user
from db.supabase import insert_row, select_rows, SupabaseError

router = APIRouter()
Answer = Annotated[StrictInt, Field(ge=0, le=3)]

class PHQ9Request(BaseModel):
    responses: list[Answer]
    submission_id: uuid.UUID = Field(default_factory=uuid.uuid4)
    @field_validator("responses")
    @classmethod
    def validate_count(cls, values):
        if len(values) != 9:
            raise ValueError("PHQ-9 requires exactly 9 responses")
        return values

class GAD7Request(BaseModel):
    responses: list[Answer]
    @field_validator("responses")
    @classmethod
    def validate_count(cls, values):
        if len(values) != 7:
            raise ValueError("GAD-7 requires exactly 7 responses")
        return values

@router.get("/assessment/questions")
async def get_questions():
    from services.assessment_service import get_phq9_questions, get_gad7_questions, get_answer_options
    return {"phq9": get_phq9_questions(), "gad7": get_gad7_questions(), "options": get_answer_options()}

@router.get("/assessment/history")
async def assessment_history_endpoint(current_user=Depends(get_current_user)):
    """Return only the signed-in user's recent assessment summaries, never raw answers."""
    try:
        rows, _ = await select_rows("assessments", current_user["access_token"], {
            "select": "id,instrument,score,max_score,completed_at",
            "user_id": f"eq.{current_user['id']}",
            "order": "completed_at.desc", "limit": "20",
        })
        allowed_fields = ("id", "instrument", "score", "max_score", "completed_at")
        history = [{key: row.get(key) for key in allowed_fields} for row in rows]
        return {"history": history}
    except SupabaseError as exc:
        raise HTTPException(status_code=503, detail="Assessment history is temporarily unavailable.") from exc


@router.post("/assessment/phq9")
async def score_phq9_endpoint(req: PHQ9Request, current_user=Depends(get_current_user)):
    from services.assessment_service import score_phq9
    result = score_phq9(req.responses)
    result["is_diagnosis"] = False
    result["disclaimer"] = "Screening result only; not a diagnosis."
    try:
        inserted = await insert_row("assessments", current_user["access_token"], {
            "id": str(req.submission_id), "user_id": current_user["id"], "instrument": "PHQ-9", "score": result["score"],
            "max_score": 27, "answers": req.responses,
        })
        if not inserted:
            raise SupabaseError(503, "The screening result was not saved")
    except SupabaseError as exc:
        if exc.status_code == 409:
            # A retry after a lost response returns the original saved result for
            # this user instead of writing a second screening row.
            existing, _ = await select_rows("assessments", current_user["access_token"], {
                "select": "instrument,answers", "id": f"eq.{req.submission_id}",
                "user_id": f"eq.{current_user['id']}", "limit": "1",
            })
            if existing and existing[0].get("instrument") == "PHQ-9" and isinstance(existing[0].get("answers"), list):
                result = score_phq9(existing[0]["answers"])
                result["is_diagnosis"] = False
                result["disclaimer"] = "Screening result only; not a diagnosis."
                return result
        raise HTTPException(status_code=503, detail="Assessment could not be saved. Please try again.") from exc
    return result

@router.post("/assessment/gad7")
async def score_gad7_endpoint(req: GAD7Request, current_user=Depends(get_current_user)):
    from services.assessment_service import score_gad7
    result = score_gad7(req.responses)
    result["is_diagnosis"] = False
    result["disclaimer"] = "Screening result only; not a diagnosis."
    try:
        await insert_row("assessments", current_user["access_token"], {
            "user_id": current_user["id"], "instrument": "GAD-7", "score": result["score"],
            "max_score": 21, "answers": req.responses,
        })
    except SupabaseError as exc:
        raise HTTPException(status_code=503, detail="Assessment could not be saved. Please try again.") from exc
    return result
