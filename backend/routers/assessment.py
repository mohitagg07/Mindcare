from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()


class PHQ9Request(BaseModel):
    responses: List[int]


class GAD7Request(BaseModel):
    responses: List[int]


@router.get("/assessment/questions")
async def get_questions():
    from services.assessment_service import (
        get_phq9_questions,
        get_gad7_questions,
        get_answer_options,
    )
    return {
        "phq9":    get_phq9_questions(),
        "gad7":    get_gad7_questions(),
        "options": get_answer_options(),
    }


@router.post("/assessment/phq9")
async def score_phq9_endpoint(req: PHQ9Request):
    from services.assessment_service import score_phq9
    if len(req.responses) != 9:
        return {"error": "PHQ-9 requires exactly 9 responses (one per question)"}
    return score_phq9(req.responses)


@router.post("/assessment/gad7")
async def score_gad7_endpoint(req: GAD7Request):
    from services.assessment_service import score_gad7
    if len(req.responses) != 7:
        return {"error": "GAD-7 requires exactly 7 responses (one per question)"}
    return score_gad7(req.responses)
