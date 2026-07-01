"""Convenience re-exports for commonly used dependency combinations."""

from app.shared.dependency.get_business import get_current_business
from app.shared.dependency.get_current_user import get_current_user
from app.shared.dependency.role_required import role_required

__all__ = [
    "get_current_business",
    "get_current_user",
    "role_required",
]
