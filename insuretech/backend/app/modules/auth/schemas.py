from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional




class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone_no: Optional[str] = None
    password: str
    confirm_password: str

    # Check if password and confirm password are same
    @model_validator(mode="after")
    def check_password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

    # Check password strength
    @field_validator("password")
    @classmethod
    def validate_password(cls, value):
        if len(value) < 8:
            raise ValueError("Password must be at least 8 characters")

        if not any(char.isupper() for char in value):
            raise ValueError("Password must contain at least one uppercase letter")

        if not any(char.isdigit() for char in value):
            raise ValueError("Password must contain at least one number")

        return value

    # Phone number validation
    @field_validator("phone_no")
    @classmethod
    def validate_phone_number(cls, value):
      if value is None:
        return value

      if not value.isdigit():
        raise ValueError("Phone number must contain only digits")

      if len(value) != 10:
        raise ValueError("Phone number must be exactly 10 digits")

      if value[0] not in ["6", "7", "8", "9"]:
        raise ValueError(
          "Invalid Phone Number"
        )

      return value


class LoginRequest(BaseModel):
  email: EmailStr
  password: str

class LogoutRequest(BaseModel):
  refresh_token: str

class ChangePasswordRequest(BaseModel):
  current_password: str
  new_password: str

  # Check password strength
  @field_validator("new_password")
  @classmethod
  def validate_password(cls, value):
    if len(value) < 8:
      raise ValueError("Password must be at least 8 characters")

    if not any(char.isupper() for char in value):
      raise ValueError("Password must contain at least one uppercase letter")

    if not any(char.isdigit() for char in value):
      raise ValueError("Password must contain at least one number")

    return value
