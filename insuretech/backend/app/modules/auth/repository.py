from datetime import datetime, timezone, timedelta

from sqlalchemy.sql import select

from app.core.config import settings
from app.models import User, Role, PasswordResetToken


async def get_user_by_email(db, email):
  """Return a user matching the provided email address.

  Args:
    db: Async database session.
    email: Email address to search for.

  Returns:
    Matching user model instance, or None when not found.
  """
  result = await db.execute(select(User).where(User.email == email))
  return result.scalar_one_or_none()

async def get_user_by_id(db, user_id):
  """Return a user matching the provided user ID.

  Args:
    db: Async database session.
    user_id: User ID to search for.

  Returns:
    Matching user model instance, or None when not found.
  """
  result = await db.execute(select(User).where(User.id == user_id))
  return result.scalar_one_or_none()

async def get_role(db, role_name):
  """Return a role matching the provided role name.

  Args:
    db: Async database session.
    role_name: Role name to search for.

  Returns:
    Matching role model instance, or None when not found.
  """
  role = await db.execute(select(Role).where(Role.name == role_name))
  return role.scalar_one_or_none()

async def create_user(db, email, full_name, phone_no, password_hash, role_id):
  """Create and persist a new user record.

  Args:
    db: Async database session.
    email: User email address.
    full_name: User full name.
    phone_no: User phone number.
    password_hash: Hashed user password.
    role_id: Role ID to assign to the user.

  Returns:
    Created user model instance.
  """
  user = User(
    email=email,
    full_name=full_name,
    phone=phone_no,
    password_hash=password_hash,
    role_id=role_id,
  )

  db.add(user)
  await db.commit()
  await db.refresh(user)
  return user


async def update_user_password(db, user_id, new_password_hash):
  """Update a user's stored password hash.

  Args:
    db: Async database session.
    user_id: ID of the user to update.
    new_password_hash: New hashed password value.

  Returns:
    Updated user model instance, or None when the user is not found.
  """
  user = await get_user_by_id(db, user_id)

  if not user:
    return None

  user.password_hash = new_password_hash
  db.add(user)
  await db.commit()
  await db.refresh(user)
  return user

async def store_password_reset_token(db, user_id, token):
  """Store a hashed password reset token for a user.

  Args:
    db: Async database session.
    user_id: ID of the user who owns the token.
    token: Hashed password reset token.
  """
  reset_token = PasswordResetToken(
    user_id=user_id,
    token_hash=token,
    expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
  )

  db.add(reset_token)
  await db.commit()


async def get_active_password_reset_token(db, user_id):
  """Return the user's active unused password reset token.

  Args:
    db: Async database session.
    user_id: ID of the user who owns the token.

  Returns:
    Active password reset token model instance, or None when not found.
  """
  result = await db.execute(
    select(PasswordResetToken).where(
      PasswordResetToken.user_id == user_id,
      PasswordResetToken.expires_at > datetime.now(timezone.utc),
      PasswordResetToken.used_at.is_(None)
    )
  )

  return result.scalar_one_or_none()

async def mark_reset_token_used(db,reset_token):
    """Mark a password reset token as used.

    Args:
      db: Async database session.
      reset_token: Password reset token model instance to update.
    """
    reset_token.used_at = datetime.now(
      timezone.utc
    )

    await db.commit()
