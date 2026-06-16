from app.core.config import settings
from app.core.exceptions import ConflictException, UnauthorizedException
from app.modules.auth.password_hashing import hash, verify_hash
from app.modules.auth import repository as Repository
from app.shared.response import APIResponse
from app.modules.auth.jwt_halper import create_access_token, create_refresh_token, create_password_reset_token, \
  decode_token
from app.core.mail import send_reset_password_email
from app.modules.auth.cookie_helper import set_auth_cookies, get_refresh_token_from_cookie, delete_auth_cookies


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



  async def login_user_service(self, data, db, response):

    user = await Repository.get_user_by_email(db, data.email)

    if not user:
      raise UnauthorizedException(
        "User with this email does not exist"
      )

    if not user.is_active:
      raise UnauthorizedException(
        "Account is inactive"
      )

    # Password verification
    if not verify_hash(data.password, user.password_hash):
      raise UnauthorizedException(
        "Invalid email or password"
      )

    #create JWT token here and return in response
    access_token = create_access_token(user)
    refresh_token = create_refresh_token(user)

    #store token in cookies
    set_auth_cookies(
      response,
      access_token,
      refresh_token
    )

    return APIResponse.success_response(
      message="User logged in successfully",
      data=None
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

    # Check if old active token exists
    active_token = await Repository.get_active_password_reset_token(db,user.id)

    # Invalidate old token
    if active_token:
      await Repository.mark_reset_token_used(db,active_token)

    # Create new token
    password_reset_token = create_password_reset_token(user)
    hashed_password_reset_token = hash(password_reset_token)

    await Repository.store_password_reset_token(db, user.id, hashed_password_reset_token)

    reset_url = (
      f"{settings.FRONTEND_URL}/reset-password"
      f"?token={password_reset_token}"
    )

    background_tasks.add_task(send_reset_password_email, user.email, reset_url)

    return APIResponse.success_response(
      message="Password reset email sent successfully",
      data=None
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
      payload.get("sub")
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

  async def refresh_token_service(self,request,response,db):

    refresh_token = get_refresh_token_from_cookie(request)

    payload = decode_token(refresh_token)

    if not payload:
      raise UnauthorizedException(
        "Invalid refresh token"
      )

    if payload.get("type") != "refresh":
      raise UnauthorizedException(
        "Invalid refresh token"
      )

    user = await Repository.get_user_by_id(db,payload.get("sub"))

    if not user:
      raise UnauthorizedException(
        "User not found"
      )

    if not user.is_active:
      raise UnauthorizedException(
        "Account is inactive"
      )

    access_token = create_access_token(user)

    set_auth_cookies(
      response,
      access_token,
      refresh_token
    )

    return APIResponse.success_response(
      message="Token refreshed",
      data=None
    )

  async def logout_service(self,response):

    delete_auth_cookies(response)

    return APIResponse.success_response(
      message="Logged out successfully",
      data=None
    )


Service = AuthService()
