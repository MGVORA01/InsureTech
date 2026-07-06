"""Database access layer for authentication."""

from datetime import datetime, timedelta, timezone
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy.sql import select

from app.core.config import settings
from app.models import PasswordResetToken, Role, User
from app.shared import base_repository as Base


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    """Fetch a user by email with role loaded."""
    result = await db.execute(
        select(User).options(selectinload(User.role)).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: UUID | str) -> User | None:
    """Fetch a user by ID with role loaded."""
    return await Base.get_by_id(
        db, User, user_id, options=[selectinload(User.role)]
    )


async def get_role(db: AsyncSession, role_name: str) -> Role | None:
    """Fetch a role by name."""
    result = await db.execute(select(Role).where(Role.name == role_name))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    email: str,
    full_name: str,
    phone_no: str | None,
    password_hash: str,
    role_id: UUID,
) -> User:
    """Create and commit a user."""
    return await Base.create(
        db,
        User,
        email=email,
        full_name=full_name,
        phone=phone_no,
        password_hash=password_hash,
        role_id=role_id,
    )


async def update_user_password(
    db: AsyncSession,
    user_id: UUID,
    new_password_hash: str,
) -> User | None:
    """Update and commit a user's password hash."""
    user = await get_user_by_id(db, user_id)
    if not user:
        return None

    user.password_hash = new_password_hash
    await db.flush()
    await db.refresh(user)
    return user


async def store_password_reset_token(
    db: AsyncSession,
    user_id: UUID,
    token: str,
) -> PasswordResetToken:
    """Create and commit a password reset token."""
    reset_token = PasswordResetToken(
        user_id=user_id,
        token_hash=token,
        expires_at=datetime.now(timezone.utc)
        + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES),
    )
    db.add(reset_token)
    await db.flush()
    await db.refresh(reset_token)
    return reset_token


async def get_active_password_reset_token(
    db: AsyncSession,
    user_id: UUID,
) -> PasswordResetToken | None:
    """Fetch the active password reset token for a user."""
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.expires_at > datetime.now(timezone.utc),
            PasswordResetToken.used_at.is_(None),
        )
    )
    return result.scalar_one_or_none()


async def mark_reset_token_used(
    db: AsyncSession,
    reset_token: PasswordResetToken,
) -> PasswordResetToken:
    """Mark and commit a password reset token as used."""
    reset_token.used_at = datetime.now(timezone.utc)
    await db.flush()
    await db.refresh(reset_token)
    return reset_token
