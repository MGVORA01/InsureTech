from fastapi import HTTPException
from starlette import status

from app.core.exceptions import ConflictException, UnauthorizedException
from app.modules.auth.password_hashing import hash, verify_hash
from app.modules.auth import repository as Repository
from app.shared.response import APIResponse
from app.modules.auth.jwt_halper import create_access_token, create_refresh_token


class AuthService:

  async def register_user_service(self, data, db):
    existing_user = await Repository.get_user_by_email(db, data.email)

    #check dupliact user
    if existing_user:
      raise ConflictException(
        "User with this email already exists"
      )

    password_hash = hash(data.password)

    role = await Repository.get_role(db, "USER")

    user = await Repository.create_user(
      db,
      email=data.email,
      full_name=data.full_name,
      phone_no=data.phone_no,
      password_hash=password_hash,
      role_id=role.id
    )

    return APIResponse.success_response(
      message="User registered successfully",
      data={
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
      }
    )



  async def login_user_service(self, data, db):

    user = await Repository.get_user_by_email(db, data.email)

    if not user:
      raise UnauthorizedException(
        "User with this email does not exist"
      )

    # Password verification
    if not verify_hash(data.password, user.password_hash):
      raise UnauthorizedException(
        "Invalid email or password"
      )

    #create JWT token here and return in response
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)

    hash_refresh_token = hash(refresh_token)

    #store hash_refresh_token in database
    await Repository.store_refresh_token(db, user.id, hash_refresh_token)

    return APIResponse.success_response(
      message="User logged in successfully",
      data={
        "access_token": access_token,
        "refresh_token": refresh_token,
      }
    )


Service = AuthService()
