"""Canonical PHQ-9 and GAD-7 screening scoring.

These totals are screening summaries, not diagnoses and not predictions of imminent danger.
A positive PHQ-9 item 9 is handled as a separate reason for a direct, compassionate follow-up.
"""
PHQ9_QUESTIONS = [
    "Little interest or pleasure in doing things?",
    "Feeling down, depressed, or hopeless?",
    "Trouble falling or staying asleep, or sleeping too much?",
    "Feeling tired or having little energy?",
    "Poor appetite or overeating?",
    "Feeling bad about yourself — or that you are a failure or have let yourself or your family down?",
    "Trouble concentrating on things, such as reading the newspaper or watching television?",
    "Moving or speaking so slowly that other people could have noticed? Or being so fidgety or restless?",
    "Thoughts that you would be better off dead, or of hurting yourself in some way?",
]

GAD7_QUESTIONS = [
    "Feeling nervous, anxious, or on edge?",
    "Not being able to stop or control worrying?",
    "Worrying too much about different things?",
    "Trouble relaxing?",
    "Being so restless that it is hard to sit still?",
    "Becoming easily annoyed or irritable?",
    "Feeling afraid as if something awful might happen?",
]

ANSWER_OPTIONS = [
    {"value": 0, "label": "Not at all"},
    {"value": 1, "label": "Several days"},
    {"value": 2, "label": "More than half the days"},
    {"value": 3, "label": "Nearly every day"},
]


def score_phq9(responses: list) -> dict:
    if len(responses) != 9 or any(type(value) is not int or value < 0 or value > 3 for value in responses):
        raise ValueError("PHQ-9 requires exactly 9 integer responses from 0 to 3")
    total = sum(responses)
    item9_positive = responses[8] >= 1

    if total <= 4:
        cat, color, desc = "Minimal", "#22c55e", "Minimal range of depressive symptoms on this screening"
    elif total <= 9:
        cat, color, desc = "Mild", "#84cc16", "Mild range of depressive symptoms on this screening"
    elif total <= 14:
        cat, color, desc = "Moderate", "#f59e0b", "Moderate range of depressive symptoms on this screening"
    elif total <= 19:
        cat, color, desc = "Moderately Severe", "#f97316", "Moderately severe range of depressive symptoms on this screening"
    else:
        cat, color, desc = "Severe", "#ef4444", "Severe range of depressive symptoms on this screening; consider professional support"

    return {
        "score": total,
        "max_score": 27,
        "category": cat,
        "color": color,
        "description": desc,
        # Backward-compatible alias. Positive item 9 is not proof of imminent danger.
        "crisis_flag": item9_positive,
        "requires_safety_follow_up": item9_positive,
        "safety_follow_up_question": (
            "Are you in immediate danger right now, or do you feel you might act on thoughts of harming yourself today?"
            if item9_positive else None
        ),
        "percentage": round((total / 27) * 100, 1),
        "is_diagnosis": False,
        "interpretation_note": (
            "PHQ-9 is a screening questionnaire, not a diagnosis. A positive answer to item 9 needs direct, "
            "compassionate follow-up; this score cannot establish immediate risk by itself."
        ),
    }


def score_gad7(responses: list) -> dict:
    if len(responses) != 7 or any(type(value) is not int or value < 0 or value > 3 for value in responses):
        raise ValueError("GAD-7 requires exactly 7 integer responses from 0 to 3")
    total = sum(responses)

    if total <= 4:
        cat, color, desc = "Minimal", "#22c55e", "Minimal range of anxiety symptoms on this screening"
    elif total <= 9:
        cat, color, desc = "Mild", "#84cc16", "Mild range of anxiety symptoms on this screening"
    elif total <= 14:
        cat, color, desc = "Moderate", "#f59e0b", "Moderate range of anxiety symptoms on this screening"
    else:
        cat, color, desc = "Severe", "#ef4444", "Severe range of anxiety symptoms on this screening; consider professional support"

    return {
        "score": total,
        "max_score": 21,
        "category": cat,
        "color": color,
        "description": desc,
        "percentage": round((total / 21) * 100, 1),
        "is_diagnosis": False,
        "interpretation_note": (
            "GAD-7 is a screening questionnaire, not a diagnosis. Interpret the score alongside the person's own "
            "account and appropriate professional judgment."
        ),
    }


def get_phq9_questions():
    return PHQ9_QUESTIONS


def get_gad7_questions():
    return GAD7_QUESTIONS


def get_answer_options():
    return ANSWER_OPTIONS
