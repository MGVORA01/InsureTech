from app.core.config import settings
from app.core.exceptions import ConflictException, UnauthorizedException
from app.modules.auth.password_hashing import hash, verify_hash
from app.modules.auth import repository as Repository
from app.shared.response import APIResponse
from app.modules.auth.jwt_halper import create_access_token, create_refresh_token, create_password_reset_token, \
  decode_token
from app.core.mail import send_reset_password_email
from app.modules.auth.cookie_helper import set_auth_cookies, get_refresh_token_from_cookie, delete_auth_cookies
from app.modules.auth.constants import (
  ACCOUNT_INACTIVE_MESSAGE,
  CURRENT_PASSWORD_INCORRECT_MESSAGE,
  EMAIL_RESPONSE_KEY,
  FULL_NAME_RESPONSE_KEY,
  INVALID_EMAIL_OR_PASSWORD_MESSAGE,
  INVALID_REFRESH_TOKEN_MESSAGE,
  INVALID_TOKEN_MESSAGE,
  INVALID_TOKEN_TYPE_MESSAGE,
  JWT_PASSWORD_RESET_TYPE,
  JWT_REFRESH_TYPE,
  JWT_SUBJECT_KEY,
  JWT_TYPE_KEY,
  LOGGED_OUT_MESSAGE,
  NEW_PASSWORD_SAME_MESSAGE,
  PASSWORD_CHANGED_MESSAGE,
  PASSWORD_RESET_EMAIL_SENT_MESSAGE,
  PASSWORDS_DO_NOT_MATCH,
  PHONE_RESPONSE_KEY,
  RESET_PASSWORD_FRONTEND_PATH,
  RESET_PASSWORD_TOKEN_QUERY,
  RESET_TOKEN_NOT_FOUND_MESSAGE,
  ROLE_USER,
  TOKEN_REFRESHED_MESSAGE,
  USER_EMAIL_EXISTS_MESSAGE,
  USER_EMAIL_NOT_FOUND_MESSAGE,
  USER_LOGGED_IN_MESSAGE,
  USER_NOT_FOUND_MESSAGE,
  USER_REGISTERED_MESSAGE,
)


class AuthService:
  """Provide authentication and password management business operations.

  The service coordinates repository access, password hashing, token creation,
  cookie handling, and API response generation for auth workflows.
  """

  async def register_user_service(self, data, db):
    """Register a user after validating uniqueness and assigning a role.

    Args:
      data: Registration request payload.
      db: Async database session.

    Returns:
      API response containing registered user details.

    Raises:
      ConflictException: If a user with the email already exists.
    """
    existing_user = await Repository.get_user_by_email(db, data.email)

    #check dupliact user
    if existing_user:
      raise ConflictException(
        USER_EMAIL_EXISTS_MESSAGE
      )

    password_hash = hash(data.password)

    role = await Repository.get_role(db, ROLE_USER)

    user = await Repository.create_user(
      db,
      email=data.email,
      full_name=data.full_name,
      phone_no=data.phone_no,
      password_hash=password_hash,
      role_id=role.id
    )

    return APIResponse.success_response(
      message=USER_REGISTERED_MESSAGE,
      data={
        FULL_NAME_RESPONSE_KEY: user.full_name,
        EMAIL_RESPONSE_KEY: user.email,
        PHONE_RESPONSE_KEY: user.phone,
      }
    )



  async def login_user_service(self, data, db, response):
    """Authenticate a user and attach access and refresh cookies.

    Args:
      data: Login request payload.
      db: Async database session.
      response: FastAPI response used to set auth cookies.

    Returns:
      API response for a successful login.

    Raises:
      UnauthorizedException: If the user is missing, inactive, or credentials are invalid.
    """

    user = await Repository.get_user_by_email(db, data.email)

    if not user:
      raise UnauthorizedException(
        USER_EMAIL_NOT_FOUND_MESSAGE
      )

    if not user.is_active:
      raise UnauthorizedException(
        ACCOUNT_INACTIVE_MESSAGE
      )

    # Password verification
    if not verify_hash(data.password, user.password_hash):
      raise UnauthorizedException(
        INVALID_EMAIL_OR_PASSWORD_MESSAGE
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
      message=USER_LOGGED_IN_MESSAGE,
      data=None
    )



  async def change_password_service(self, data, current_user, db):
    """Change the authenticated user's password after validation.

    Args:
      data: Change password request payload.
      current_user: Authenticated user model instance.
      db: Async database session.

    Returns:
      API response for a successful password change.

    Raises:
      UnauthorizedException: If the current password is incorrect.
      ConflictException: If the new password matches the current password.
    """

    #check current password
    if not verify_hash(data.current_password, current_user.password_hash):
      raise UnauthorizedException(CURRENT_PASSWORD_INCORRECT_MESSAGE)

    #check old and new password not same
    if verify_hash(data.new_password, current_user.password_hash):
      raise ConflictException(NEW_PASSWORD_SAME_MESSAGE)

    new_password_hash = hash(data.new_password)

    await Repository.update_user_password(db, current_user.id, new_password_hash)

    return APIResponse.success_response(
      message=PASSWORD_CHANGED_MESSAGE,
      data=None,
    )



  async def forgot_password_service(self, data, db, background_tasks):
    """Create a reset token and queue the password reset email.

    Args:
      data: Forgot password request payload.
      db: Async database session.
      background_tasks: FastAPI background task manager.

    Returns:
      API response for a queued reset email.

    Raises:
      UnauthorizedException: If the user email is not found.
    """

    user = await Repository.get_user_by_email(db, data.email)

    if not user:
      raise UnauthorizedException(
        USER_EMAIL_NOT_FOUND_MESSAGE
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
      f"{settings.FRONTEND_URL}{RESET_PASSWORD_FRONTEND_PATH}"
      f"{RESET_PASSWORD_TOKEN_QUERY}{password_reset_token}"
    )

    background_tasks.add_task(send_reset_password_email, user.email, reset_url)

    return APIResponse.success_response(
      message=PASSWORD_RESET_EMAIL_SENT_MESSAGE,
      data=None
    )

  async def reset_password_service(self, data, db):
    """Reset a user's password after validating the reset token.

    Args:
      data: Reset password request payload.
      db: Async database session.

    Returns:
      API response for a successful password reset.

    Raises:
      ConflictException: If new password and confirm password do not match.
      UnauthorizedException: If the token or user lookup is invalid.
    """

    if data.new_password != data.confirm_password:
      raise ConflictException(
        PASSWORDS_DO_NOT_MATCH
      )

    payload = decode_token(data.token)

    if not payload:
      raise UnauthorizedException(
        INVALID_TOKEN_MESSAGE
      )

    if payload.get(JWT_TYPE_KEY) != JWT_PASSWORD_RESET_TYPE:
      raise UnauthorizedException(
        INVALID_TOKEN_TYPE_MESSAGE
      )

    user = await Repository.get_user_by_id(
      db,
      payload.get(JWT_SUBJECT_KEY)
    )

    if not user:
      raise UnauthorizedException(
        USER_NOT_FOUND_MESSAGE
      )

    reset_token = await Repository.get_active_password_reset_token(db,user.id)

    if not reset_token:
      raise UnauthorizedException(
        RESET_TOKEN_NOT_FOUND_MESSAGE
      )

    if not verify_hash(data.token,reset_token.token_hash):
      raise UnauthorizedException(
        INVALID_TOKEN_MESSAGE
      )

    new_password_hash = hash(data.new_password)

    await Repository.update_user_password(db, user.id, new_password_hash)

    await Repository.mark_reset_token_used(db, reset_token)

    return APIResponse.success_response(
      message=PASSWORD_CHANGED_MESSAGE
    )

  async def refresh_token_service(self,request,response,db):
    """Issue a new access token when the refresh token is valid.

    Args:
      request: FastAPI request containing auth cookies.
      response: FastAPI response used to update auth cookies.
      db: Async database session.

    Returns:
      API response for a successful token refresh.

    Raises:
      UnauthorizedException: If the refresh token or user state is invalid.
    """

    refresh_token = get_refresh_token_from_cookie(request)

    payload = decode_token(refresh_token)

    if not payload:
      raise UnauthorizedException(
        INVALID_REFRESH_TOKEN_MESSAGE
      )

    if payload.get(JWT_TYPE_KEY) != JWT_REFRESH_TYPE:
      raise UnauthorizedException(
        INVALID_REFRESH_TOKEN_MESSAGE
      )

    user = await Repository.get_user_by_id(db,payload.get(JWT_SUBJECT_KEY))

    if not user:
      raise UnauthorizedException(
        USER_NOT_FOUND_MESSAGE
      )

    if not user.is_active:
      raise UnauthorizedException(
        ACCOUNT_INACTIVE_MESSAGE
      )

    access_token = create_access_token(user)

    set_auth_cookies(
      response,
      access_token,
      refresh_token
    )

    return APIResponse.success_response(
      message=TOKEN_REFRESHED_MESSAGE,
      data=None
    )

  async def logout_service(self,response):
    """Clear auth cookies and return a logout response.

    Args:
      response: FastAPI response used to delete auth cookies.

    Returns:
      API response for a successful logout.
    """

    delete_auth_cookies(response)

    return APIResponse.success_response(
      message=LOGGED_OUT_MESSAGE,
      data=None
    )


Service = AuthService()
