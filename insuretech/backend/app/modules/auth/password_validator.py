"""Shared password validation logic for auth schemas."""


def validate_password_strength(value: str) -> str:
    """Validate password meets minimum strength requirements."""
    if len(value) < 8:
        raise ValueError("Password must be at least 8 characters")
    if not any(char.isupper() for char in value):
        raise ValueError("Password must contain at least one uppercase letter")
    if not any(char.isdigit() for char in value):
        raise ValueError("Password must contain at least one number")
    return value
