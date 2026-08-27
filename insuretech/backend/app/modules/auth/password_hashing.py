import asyncio

from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash(input: str) -> str:
    """Hash a plain-text input."""
    return pwd_context.hash(input)

def verify_hash(plain: str, hashed: str) -> bool:
    """Verify a plain input against a hashed value."""
    return pwd_context.verify(plain, hashed)

async def async_hash(input: str) -> str:
    """Hash a plain-text input (async, runs bcrypt in a thread)."""
    return await asyncio.to_thread(pwd_context.hash, input)

async def async_verify_hash(plain: str, hashed: str) -> bool:
    """Verify a plain input against a hashed value (async)."""
    return await asyncio.to_thread(pwd_context.verify, plain, hashed)

