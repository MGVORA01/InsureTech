"""Repository helpers for contact workflows."""

from collections import defaultdict
from datetime import datetime

from app.core.mail import send_contact_email
from app.modules.contact.constants import RATE_LIMIT_MAX, RATE_LIMIT_WINDOW

rate_store: dict[str, list[datetime]] = defaultdict(list)


def is_rate_limited(ip: str) -> bool:
    """Return whether the client IP has exceeded the contact rate limit."""
    now = datetime.utcnow()
    cutoff = now - RATE_LIMIT_WINDOW
    timestamps = [t for t in rate_store[ip] if t > cutoff]
    rate_store[ip] = timestamps
    return len(timestamps) >= RATE_LIMIT_MAX


def record_hit(ip: str) -> None:
    """Record one contact form submission attempt for a client IP."""
    rate_store[ip].append(datetime.utcnow())


async def send_contact(name: str, email: str, message: str) -> None:
    """Send a contact email."""
    await send_contact_email(name=name, email=email, message=message)
