from collections import defaultdict
from datetime import datetime, timedelta

from app.core.mail import send_contact_email

RATE_LIMIT_WINDOW = timedelta(minutes=15)
RATE_LIMIT_MAX = 5

rate_store: dict[str, list[datetime]] = defaultdict(list)


def is_rate_limited(ip: str) -> bool:
    now = datetime.utcnow()
    cutoff = now - RATE_LIMIT_WINDOW
    timestamps = [t for t in rate_store[ip] if t > cutoff]
    rate_store[ip] = timestamps
    return len(timestamps) >= RATE_LIMIT_MAX


def record_hit(ip: str) -> None:
    rate_store[ip].append(datetime.utcnow())


async def send_contact(name: str, email: str, message: str) -> None:
    await send_contact_email(name=name, email=email, message=message)
