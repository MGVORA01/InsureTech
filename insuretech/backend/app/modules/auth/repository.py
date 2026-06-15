from datetime import datetime, timedelta, timezone

from sqlalchemy.sql import select

from app.core.config import settings
from app.models import User, Role, RefreshToken


async def get_user_by_email(db, email):
  result = await db.execute(select(User).where(User.email == email))
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

async def store_refresh_token(db, user_id, hash_refresh_token):

  refresh_token = RefreshToken(
    user_id=user_id,
    token_hash=hash_refresh_token,
    expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
  )

  db.add(refresh_token)
  await db.commit()
  await db.refresh(refresh_token)

async def get_active_refresh_tokens_by_user_id(db, user_id):
  result = await db.execute(
    select(RefreshToken).where(
      RefreshToken.user_id == user_id,
      RefreshToken.revoked_at.is_(None),
      RefreshToken.expires_at > datetime.now(timezone.utc),
    )
  )
  return result.scalars().all()

async def revoke_refresh_token(db, refresh_token):
  refresh_token.revoked_at = datetime.now(timezone.utc)
  db.add(refresh_token)
  await db.commit()
  await db.refresh(refresh_token)
  return refresh_token
