from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator
from typing import Optional

from app.modules.auth.password_validator import validate_password_strength


class RegisterRequest(BaseModel):
    full_name: str
    email: EmailStr
    phone_no: Optional[str] = None
    password: str
    confirm_password: str

    @model_validator(mode="after")
    def check_password_match(self):
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)

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
            raise ValueError("Invalid Phone Number")
        return value


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
    remember_me: bool = False


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

    @model_validator(mode="after")
    def passwords_match(self):
        if self.new_password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        return validate_password_strength(v)
