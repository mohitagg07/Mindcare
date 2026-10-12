"""Small, privacy-conscious helpers for user profile information."""
from datetime import date, datetime
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError


def calculate_age(date_of_birth: date | str | None, today: date | None = None, timezone_name: str | None = None) -> int | None:
    """Calculate age without exposing/storing a separate age value. Accept a date or ISO date string."""
    if not date_of_birth:
        return None
    if isinstance(date_of_birth, str):
        try:
            date_of_birth = date.fromisoformat(date_of_birth[:10])
        except (TypeError, ValueError):
            return None
    if not isinstance(date_of_birth, date):
        return None
    if today is None:
        try:
            today = datetime.now(ZoneInfo(timezone_name or "UTC")).date()
        except (ZoneInfoNotFoundError, ValueError):
            today = date.today()
    if date_of_birth > today or date_of_birth < date(1900, 1, 1):
        return None
    return today.year - date_of_birth.year - ((today.month, today.day) < (date_of_birth.month, date_of_birth.day))
