from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash a plain-text password.

    Args:
        password: Plain-text password to hash.

    Returns:
        The hashed password string.
    """
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against a hashed value.

    Args:
        plain: Plain-text password provided by the user.
        hashed: Stored hashed password.

    Returns:
        True if the password matches, otherwise False.
    """
    return pwd_context.verify(plain, hashed)
