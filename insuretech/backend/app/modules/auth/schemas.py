from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional

from app.modules.auth.constants import (
  EMAIL_FIELD,
  INVALID_PHONE_NUMBER_MESSAGE,
  MODEL_VALIDATOR_AFTER,
  NEW_PASSWORD_FIELD,
  PASSWORD_FIELD,
  PASSWORD_MIN_LENGTH_MESSAGE,
  PASSWORD_NUMBER_MESSAGE,
  PASSWORD_UPPERCASE_MESSAGE,
  PASSWORDS_DO_NOT_MATCH,
  PHONE_DIGITS_ONLY_MESSAGE,
  PHONE_EXACT_LENGTH_MESSAGE,
  PHONE_NUMBER_FIELD,
  PHONE_START_DIGIT_6,
  PHONE_START_DIGIT_7,
  PHONE_START_DIGIT_8,
  PHONE_START_DIGIT_9,
)




class RegisterRequest(BaseModel):
    """Schema for user registration requests.

    Attributes:
        full_name: User full name.
        email: User email address.
        phone_no: Optional user phone number.
        password: User password.
        confirm_password: Password confirmation value.
    """

    full_name: str
    email: EmailStr
    phone_no: Optional[str] = None
    password: str
    confirm_password: str

    @field_validator(EMAIL_FIELD)
    @classmethod
    def normalize_email(cls, value):
        """Normalize the email address before service and database use.

        Args:
            value: Email address value to normalize.

        Returns:
            Lowercase email address string.
        """
        return str(value).lower()

    # Check if password and confirm password are same
    @model_validator(mode=MODEL_VALIDATOR_AFTER)
    def check_password_match(self):
        """Validate that password and confirm password match.

        Returns:
            The validated schema instance.

        Raises:
            ValueError: If password and confirm password do not match.
        """
        if self.password != self.confirm_password:
            raise ValueError(PASSWORDS_DO_NOT_MATCH)
        return self

    # Check password strength
    @field_validator(PASSWORD_FIELD)
    @classmethod
    def validate_password(cls, value):
        """Validate registration password strength.

        Args:
            value: Password value to validate.

        Returns:
            The validated password value.

        Raises:
            ValueError: If the password does not meet strength rules.
        """
        if len(value) < 8:
            raise ValueError(PASSWORD_MIN_LENGTH_MESSAGE)

        if not any(char.isupper() for char in value):
            raise ValueError(PASSWORD_UPPERCASE_MESSAGE)

        if not any(char.isdigit() for char in value):
            raise ValueError(PASSWORD_NUMBER_MESSAGE)

        return value

    # Phone number validation
    @field_validator(PHONE_NUMBER_FIELD)
    @classmethod
    def validate_phone_number(cls, value):
      """Validate an optional Indian mobile phone number.

      Args:
        value: Phone number value to validate.

      Returns:
        The validated phone number value, or None when omitted.

      Raises:
        ValueError: If the phone number format is invalid.
      """
      if value is None:
        return value

      if not value.isdigit():
        raise ValueError(PHONE_DIGITS_ONLY_MESSAGE)

      if len(value) != 10:
        raise ValueError(PHONE_EXACT_LENGTH_MESSAGE)

      if value[0] not in [PHONE_START_DIGIT_6, PHONE_START_DIGIT_7, PHONE_START_DIGIT_8, PHONE_START_DIGIT_9]:
        raise ValueError(
          INVALID_PHONE_NUMBER_MESSAGE
        )

      return value


class LoginRequest(BaseModel):
  """Schema for user login requests.

  Attributes:
    email: User email address.
    password: User password.
  """

  email: EmailStr
  password: str

  @field_validator(EMAIL_FIELD)
  @classmethod
  def normalize_email(cls, value):
    """Normalize the email address before login lookup.

    Args:
      value: Email address value to normalize.

    Returns:
      Lowercase email address string.
    """
    return str(value).lower()

class ChangePasswordRequest(BaseModel):
  """Schema for authenticated password change requests.

  Attributes:
    current_password: Existing password value.
    new_password: New password value.
  """

  current_password: str
  new_password: str

  # Check password strength
  @field_validator(NEW_PASSWORD_FIELD)
  @classmethod
  def validate_password(cls, value):
    """Validate new password strength.

    Args:
      value: New password value to validate.

    Returns:
      The validated password value.

    Raises:
      ValueError: If the password does not meet strength rules.
    """
    if len(value) < 8:
      raise ValueError(PASSWORD_MIN_LENGTH_MESSAGE)

    if not any(char.isupper() for char in value):
      raise ValueError(PASSWORD_UPPERCASE_MESSAGE)

    if not any(char.isdigit() for char in value):
      raise ValueError(PASSWORD_NUMBER_MESSAGE)

    return value


class ForgotPasswordRequest(BaseModel):
  """Schema for forgot password requests.

  Attributes:
    email: User email address.
  """

  email: EmailStr

  @field_validator(EMAIL_FIELD)
  @classmethod
  def normalize_email(cls, value):
    """Normalize the email address before password reset lookup.

    Args:
      value: Email address value to normalize.

    Returns:
      Lowercase email address string.
    """
    return str(value).lower()

class ResetPasswordRequest(BaseModel):
  """Schema for password reset requests.

  Attributes:
    token: Password reset token.
    new_password: New password value.
    confirm_password: Password confirmation value.
  """

  token: str
  new_password: str
  confirm_password: str

  @model_validator(mode=MODEL_VALIDATOR_AFTER)
  def passwords_match(self):
    """Validate that the new password and confirmation match.

    Returns:
      The validated schema instance.

    Raises:
      ValueError: If new password and confirm password do not match.
    """
    if self.new_password != self.confirm_password:
      raise ValueError(PASSWORDS_DO_NOT_MATCH)
    return self

  @field_validator(NEW_PASSWORD_FIELD)
  @classmethod
  def validate_password(cls, value):
    """Validate reset password strength.

    Args:
      value: New password value to validate.

    Returns:
      The validated password value.

    Raises:
      ValueError: If the password does not meet strength rules.
    """
    if len(value) < 8:
      raise ValueError(PASSWORD_MIN_LENGTH_MESSAGE)
    if not any(char.isupper() for char in value):
      raise ValueError(PASSWORD_UPPERCASE_MESSAGE)
    if not any(char.isdigit() for char in value):
      raise ValueError(PASSWORD_NUMBER_MESSAGE)
    return value
