from app.core.exceptions import ConflictException, UnauthorizedException
from app.modules.auth.password_hashing import hash, verify_hash
from app.modules.auth import repository as Repository
from app.shared.response import APIResponse
from app.modules.auth.jwt_halper import create_access_token, create_refresh_token, decode_token


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

    return APIResponse.success_response(
      message="User logged in successfully",
      data={
        "access_token": access_token,
        "refresh_token": refresh_token,
      }
    )


  # async def logout_user_service(self, data, db):
  #
  #   payload = decode_token(data.refresh_token)
  #
  #   if not payload or payload.get("type") != "refresh":
  #     raise UnauthorizedException("Invalid refresh token")
  #
  #   user_id = payload.get("sub")
  #
  #   if not user_id:
  #     raise UnauthorizedException("Invalid refresh token")
  #
  #   refresh_tokens = await Repository.get_active_refresh_tokens_by_user_id(
  #     db,
  #     user_id,
  #   )
  #
  #   refresh_token = None
  #
  #   for stored_refresh_token in refresh_tokens:
  #     if verify_hash(data.refresh_token, stored_refresh_token.token_hash):
  #       refresh_token = stored_refresh_token
  #       break
  #
  #   if not refresh_token:
  #     raise UnauthorizedException("Invalid refresh token")
  #
  #   await Repository.revoke_refresh_token(db, refresh_token)
  #
  #   return APIResponse.success_response(
  #     message="User logged out successfully",
  #     data=None,
  #   )


  async def change_password_service(self, data, current_user, db):

    #check current password
    if not verify_hash(data.current_password, current_user.password_hash):
      raise UnauthorizedException("Current password is incorrect")

    #check old and new password not same
    if verify_hash(data.new_password, current_user.password_hash):
      raise ConflictException("New password cannot be same as current password")

    new_password_hash = hash(data.new_password)

    await Repository.update_user_password(db, current_user.id, new_password_hash)

    return APIResponse.success_response(
      message="Password changed successfully",
      data=None,
    )



Service = AuthService()
