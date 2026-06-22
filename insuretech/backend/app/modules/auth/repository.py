from datetime import datetime, timezone, timedelta

from sqlalchemy.sql import select

from app.core.config import settings
from app.models import User, Role, PasswordResetToken
from sqlalchemy.orm import selectinload


async def get_user_by_email(db, email):
  result = await db.execute(
    select(User)
    .options(selectinload(User.role))
    .where(User.email == email)
  )
  return result.scalar_one_or_none()

async def get_user_by_id(db, user_id):
  result = await db.execute(
    select(User)
    .options(selectinload(User.role))
    .where(User.id == user_id)
  )

  return result.scalar_one_or_none()

async def get_role(db, role_name):
  role = await db.execute(select(Role).where(Role.name == role_name))
  return role.scalar_one_or_none()

async def create_user(db, email, full_name, phone_no, password_hash, role_id):
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
  user = await get_user_by_id(db, user_id)

  if not user:
    return None

  user.password_hash = new_password_hash
  db.add(user)
  await db.commit()
  await db.refresh(user)
  return user

async def store_password_reset_token(db, user_id, token):
  reset_token = PasswordResetToken(
    user_id=user_id,
    token_hash=token,
    expires_at=datetime.now(timezone.utc) + timedelta(minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES)
  )

  db.add(reset_token)
  await db.commit()


async def get_active_password_reset_token(db, user_id):
  result = await db.execute(
    select(PasswordResetToken).where(
      PasswordResetToken.user_id == user_id,
      PasswordResetToken.expires_at > datetime.now(timezone.utc),
      PasswordResetToken.used_at.is_(None)
    )
  )

  return result.scalar_one_or_none()

async def mark_reset_token_used(db,reset_token):
    reset_token.used_at = datetime.now(
      timezone.utc
    )

    await db.commit()

