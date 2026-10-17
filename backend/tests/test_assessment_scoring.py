"""Scoring boundaries and payload validation for PHQ-9 and GAD-7."""
import pytest
from pydantic import ValidationError

from routers.assessment import GAD7Request, PHQ9Request
from services.assessment_service import score_gad7, score_phq9


@pytest.mark.parametrize(("total", "category"), [
    (0, "Minimal"), (4, "Minimal"), (5, "Mild"), (9, "Mild"),
    (10, "Moderate"), (14, "Moderate"), (15, "Moderately Severe"),
    (19, "Moderately Severe"), (20, "Severe"), (27, "Severe"),
])
def test_phq9_severity_boundaries(total, category):
    responses = [0] * 9
    responses[0] = total if total <= 3 else 3
    remainder = total - responses[0]
    for index in range(1, 9):
        value = min(3, remainder)
        responses[index] = value
        remainder -= value
    result = score_phq9(responses)
    assert sum(responses) == total
    assert result["category"] == category
    assert result["score"] == total
    assert result["max_score"] == 27


@pytest.mark.parametrize(("total", "category"), [
    (0, "Minimal"), (4, "Minimal"), (5, "Mild"), (9, "Mild"),
    (10, "Moderate"), (14, "Moderate"), (15, "Severe"), (21, "Severe"),
])
def test_gad7_severity_boundaries(total, category):
    responses = [0] * 7
    remainder = total
    for index in range(7):
        responses[index] = min(3, remainder)
        remainder -= responses[index]
    result = score_gad7(responses)
    assert sum(responses) == total
    assert result["category"] == category
    assert result["score"] == total
    assert result["max_score"] == 21


def test_phq9_safety_flag_is_independent_of_total_score():
    assert score_phq9([0, 0, 0, 0, 0, 0, 0, 0, 1])["crisis_flag"] is True
    assert score_phq9([1, 0, 0, 0, 0, 0, 0, 0, 0])["crisis_flag"] is False


def test_assessment_payloads_require_exact_integer_responses():
    assert PHQ9Request(responses=[0] * 9).responses == [0] * 9
    assert GAD7Request(responses=[3] * 7).responses == [3] * 7
    with pytest.raises(ValidationError):
        PHQ9Request(responses=[0.5] + [0] * 8)
    with pytest.raises(ValidationError):
        GAD7Request(responses=["1"] + [0] * 6)


def test_crisis_guidance_uses_location_aware_support():
    from services.fusion_service import CRISIS_RESOURCES, get_recommendations
    assert "local emergency number" in CRISIS_RESOURCES
    assert "https://findahelpline.com/" in CRISIS_RESOURCES
    high_support = get_recommendations("HIGH", "sad")
    assert all("contact" not in item or "9152987821" not in item["contact"] for item in high_support["resources"])
    assert any(item["contact"] == "https://findahelpline.com/" for item in high_support["resources"])
