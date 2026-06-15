from fastapi import HTTPException
from starlette import status

from app.modules.auth.password_hashing import hash_password
from app.modules.auth import repository as Repository


class AuthService:

  async def register_user_service(self, data, db):
    existing_user = await Repository.get_user_by_email(db, data.email)

    #check dupliact user
    if existing_user:
      raise HTTPException(
        status_code=status.HTTP_409_CONFLICT,
        detail="User with this email already exists",
      )

    password_hash = hash_password(data.password)

    role = await Repository.get_role(db, "USER")

    return await Repository.create_user(
      db,
      email=data.email,
      full_name=data.full_name,
      phone_no=data.phone_no,
      password_hash=password_hash,
      role_id=role.id
    )


Service = AuthService()
