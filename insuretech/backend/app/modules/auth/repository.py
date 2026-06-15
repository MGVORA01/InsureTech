from sqlalchemy.sql import select

from app.models import User, Role


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
