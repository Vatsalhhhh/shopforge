"""Auth-related Pydantic schemas."""
import re
from typing import Literal

from pydantic import BaseModel, EmailStr, Field, field_validator


PASSWORD_RE = re.compile(
    r"^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]).{8,}$"
)

PHONE_RE = re.compile(r"^\+?[1-9]\d{7,14}$")


def _validate_password(v: str) -> str:
    if not PASSWORD_RE.match(v):
        raise ValueError(
            "Password must be at least 8 characters and include uppercase, "
            "lowercase, number, and special character."
        )
    return v


def _validate_phone(v: str | None) -> str | None:
    if v and not PHONE_RE.match(v):
        raise ValueError("Enter a valid phone number (e.g. +12025551234)")
    return v


# ── Registration ────────────────────────────────────────────────

class CustomerRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str | None = None
    password: str
    confirm_password: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: str | None) -> str | None:
        return _validate_phone(v)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


class VendorRegisterRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    email: EmailStr
    phone: str
    password: str
    confirm_password: str
    business_name: str = Field(..., min_length=2, max_length=200)
    business_email: EmailStr
    business_phone: str
    business_address: str = Field(..., min_length=5)
    description: str | None = None

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("phone", "business_phone")
    @classmethod
    def valid_phone(cls, v: str) -> str:
        result = _validate_phone(v)
        if result is None:
            raise ValueError("Phone is required")
        return result

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


# ── Login ────────────────────────────────────────────────────────

class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: Literal["bearer"] = "bearer"
    requires_2fa: bool = False
    two_fa_token: str | None = None  # short-lived token to complete 2FA


class LoginResponse(TokenResponse):
    user_id: str
    email: str
    first_name: str
    last_name: str
    role: str
    email_verified: bool
    phone_verified: bool
    two_factor_enabled: bool


# ── Email verification ────────────────────────────────────────────

class SendEmailVerificationRequest(BaseModel):
    email: EmailStr


class VerifyEmailRequest(BaseModel):
    token: str


class ResendEmailVerificationRequest(BaseModel):
    email: EmailStr


# ── Phone OTP ────────────────────────────────────────────────────

class SendPhoneOTPRequest(BaseModel):
    phone: str

    @field_validator("phone")
    @classmethod
    def valid_phone(cls, v: str) -> str:
        result = _validate_phone(v)
        if result is None:
            raise ValueError("Phone is required")
        return result


class VerifyPhoneOTPRequest(BaseModel):
    phone: str
    code: str = Field(..., min_length=6, max_length=6)


# ── Password reset ────────────────────────────────────────────────

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    password: str
    confirm_password: str

    @field_validator("password")
    @classmethod
    def strong_password(cls, v: str) -> str:
        return _validate_password(v)

    @field_validator("confirm_password")
    @classmethod
    def passwords_match(cls, v: str, info) -> str:
        if "password" in info.data and v != info.data["password"]:
            raise ValueError("Passwords do not match")
        return v


# ── 2FA ──────────────────────────────────────────────────────────

class TwoFASetupRequest(BaseModel):
    method: Literal["totp", "email", "sms"] = "totp"


class TwoFAEnableRequest(BaseModel):
    code: str = Field(..., min_length=6, max_length=8)


class TwoFAVerifyRequest(BaseModel):
    two_fa_token: str
    code: str = Field(..., min_length=6, max_length=8)


class TwoFASetupResponse(BaseModel):
    method: str
    totp_uri: str | None = None
    qr_code_base64: str | None = None
    backup_codes: list[str] = []


# ── Refresh ───────────────────────────────────────────────────────

class RefreshRequest(BaseModel):
    refresh_token: str
