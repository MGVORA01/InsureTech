from passlib.context import CryptContext

from app.modules.auth.constants import BCRYPT_SCHEME, PASSLIB_DEPRECATED_AUTO

pwd_context = CryptContext(schemes=[BCRYPT_SCHEME], deprecated=PASSLIB_DEPRECATED_AUTO)

def hash(input: str) -> str:
    """Hash a plain-text input.

    Args:
        input: Plain-text input to hash.

    Returns:
        The hashed input string.
    """
    return pwd_context.hash(input)

def verify_hash(plain: str, hashed: str) -> bool:
    """Verify a plain input against a hashed value.

    Args:
        plain: Plain-text input provided by the user.
        hashed: Stored hashed input.

    Returns:
        True if the input matches, otherwise False.
    """
    return pwd_context.verify(plain, hashed)
