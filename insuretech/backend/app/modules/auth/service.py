from app.core.exceptions import ConflictException, UnauthorizedException
from app.modules.auth.password_hashing import hash, verify_hash
from app.modules.auth import repository as Repository
from app.shared.response import APIResponse
from app.modules.auth.jwt_halper import create_access_token, create_refresh_token, create_password_reset_token, \
  decode_token
from app.core.mail import send_reset_password_email


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



  async def forgot_password_service(self, data, db, background_tasks):

    user = await Repository.get_user_by_email(db, data.email)

    if not user:
      raise UnauthorizedException(
        "User with this email does not exist"
      )

    password_reset_token = create_password_reset_token(user)
    hashed_password_reset_token = hash(password_reset_token)

    await Repository.store_password_reset_token(db, user.id, hashed_password_reset_token)

    reset_url = (
      f"http://localhost:5173/reset-password"
      f"?token={password_reset_token}"
    )

    background_tasks.add_task(send_reset_password_email, user.email, reset_url)

    return APIResponse.success_response(
      message="Password reset email sent successfully",
      data=password_reset_token
    )

  async def reset_password_service(self, data, db):

    if data.new_password != data.confirm_password:
      raise ConflictException(
        "Passwords do not match"
      )

    payload = decode_token(data.token)

    if not payload:
      raise UnauthorizedException(
        "Invalid token"
      )

    if payload.get("type") != "password_reset":
      raise UnauthorizedException(
        "Invalid token type"
      )

    user = await Repository.get_user_by_id(
      db,
      payload["sub"]
    )

    if not user:
      raise UnauthorizedException(
        "User not found"
      )

    reset_token = await Repository.get_active_password_reset_token(db,user.id)

    if not reset_token:
      raise UnauthorizedException(
        "Reset token not found"
      )

    if not verify_hash(data.token,reset_token.token_hash):
      raise UnauthorizedException(
        "Invalid token"
      )

    new_password_hash = hash(data.new_password)

    await Repository.update_user_password(db, user.id, new_password_hash)

    await Repository.mark_reset_token_used(db, reset_token)

    return APIResponse.success_response(
      message="Password changed successfully"
    )


Service = AuthService()
