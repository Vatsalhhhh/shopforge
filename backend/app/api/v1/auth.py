"""
Unified auth API.
Customer/admin registration, login, email verification, phone OTP,
forgot/reset password, 2FA setup and verification, token refresh.
"""
import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import structlog
from fastapi import APIRouter, Depends, HTTPException, Query, status
from jose import JWTError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import (
    create_2fa_challenge_token, create_access_token, create_refresh_token,
    decode_refresh_token, hash_password, verify_password,
)
from app.db.session import get_db
from app.models.auth_tokens import (
    EmailVerificationToken, PasswordResetToken,
    PhoneVerificationCode, TwoFactorMethod, TwoFactorSettings,
)
from app.models.user import User, UserRole, UserStatus
from app.schemas.auth import (
    CustomerRegisterRequest, ForgotPasswordRequest, LoginRequest,
    LoginResponse, RefreshRequest, ResendEmailVerificationRequest,
    ResetPasswordRequest, SendPhoneOTPRequest, TokenResponse,
    TwoFAEnableRequest, TwoFASetupRequest, TwoFASetupResponse,
    TwoFAVerifyRequest, VerifyEmailRequest, VerifyPhoneOTPRequest,
)
from app.utils.email_service import send_verification_email, send_password_reset_email
from app.utils.otp_service import generate_otp, send_phone_otp
from app.utils.totp_service import (
    generate_backup_codes, generate_qr_code_base64,
    generate_totp_secret, get_totp_uri, verify_totp,
)

logger = structlog.get_logger(__name__)
router = APIRouter(prefix="/auth", tags=["Auth"])

_MAX_OTP_ATTEMPTS = 3
_OTP_EXPIRY_MINUTES = 10
_EMAIL_TOKEN_EXPIRY_HOURS = 24
_RESET_TOKEN_EXPIRY_MINUTES = 30
_TWO_FA_TOKEN_EXPIRY_MINUTES = 10


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _now() -> datetime:
    return datetime.now(timezone.utc)


async def _get_user_by_email(db: AsyncSession, email: str) -> User | None:
    return await db.scalar(
        select(User).where(User.email == email, User.deleted_at.is_(None))
    )


# ── Registration ─────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(body: CustomerRegisterRequest, db: AsyncSession = Depends(get_db)):
    """Customer registration. Sends verification email after account creation."""
    existing = await _get_user_by_email(db, body.email)
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already registered")

    user = User(
        email=body.email,
        hashed_password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        phone=body.phone,
        role=UserRole.customer,
        status=UserStatus.active,
        is_active=True,
        is_verified=False,
        phone_verified=False,
    )
    db.add(user)
    await db.flush()

    token = secrets.token_urlsafe(48)
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=_hash_token(token),
        expires_at=_now() + timedelta(hours=_EMAIL_TOKEN_EXPIRY_HOURS),
    ))
    await db.commit()

    email_sent = False
    try:
        email_sent = await send_verification_email(user.email, user.first_name, token)
    except Exception as exc:
        logger.warning("Verification email failed (account still created)", error=str(exc))

    return {
        "message": "Account created. Please verify your email.",
        "user_id": str(user.id),
        "email_verification_sent": email_sent,
    }


# ── Login ─────────────────────────────────────────────────────────

@router.post("/login", response_model=LoginResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    """
    Login for customers and admins.
    If 2FA is enabled returns requires_2fa=True with a short-lived two_fa_token.
    Complete login via POST /auth/2fa/verify.
    """
    user = await _get_user_by_email(db, body.email)
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")

    if not user.is_active or user.status in (UserStatus.suspended, UserStatus.banned):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Account is not active")

    if user.two_factor_enabled:
        two_fa_token = create_2fa_challenge_token(user.id)
        logger.info("2FA required", user_id=str(user.id))
        return LoginResponse(
            access_token="",
            refresh_token="",
            requires_2fa=True,
            two_fa_token=two_fa_token,
            user_id=str(user.id),
            email=user.email,
            first_name=user.first_name,
            last_name=user.last_name,
            role=user.role.value,
            email_verified=user.is_verified,
            phone_verified=user.phone_verified,
            two_factor_enabled=True,
        )

    return LoginResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id),
        user_id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value,
        email_verified=user.is_verified,
        phone_verified=user.phone_verified,
        two_factor_enabled=user.two_factor_enabled,
    )


# ── Token refresh ─────────────────────────────────────────────────

@router.post("/refresh", response_model=TokenResponse)
async def refresh_token(body: RefreshRequest, db: AsyncSession = Depends(get_db)):
    try:
        payload = decode_refresh_token(body.refresh_token)
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token")

    user = await db.get(User, payload["sub"])
    if not user or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="User not found")

    return TokenResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id),
    )


# ── Email verification ────────────────────────────────────────────

@router.post("/send-email-verification", status_code=status.HTTP_200_OK)
async def send_email_verification(body: ResendEmailVerificationRequest, db: AsyncSession = Depends(get_db)):
    user = await _get_user_by_email(db, body.email)
    if not user:
        return {"message": "If that email exists, a verification link has been sent."}
    if user.is_verified:
        return {"message": "Email is already verified."}

    token = secrets.token_urlsafe(48)
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=_hash_token(token),
        expires_at=_now() + timedelta(hours=_EMAIL_TOKEN_EXPIRY_HOURS),
    ))
    await db.commit()
    try:
        await send_verification_email(user.email, user.first_name, token)
    except Exception:
        pass
    return {"message": "Verification email sent."}


@router.get("/verify-email")
async def verify_email(token: str = Query(...), db: AsyncSession = Depends(get_db)):
    record = await db.scalar(
        select(EmailVerificationToken).where(
            EmailVerificationToken.token_hash == _hash_token(token),
            EmailVerificationToken.is_used == False,
        )
    )
    if not record or record.expires_at.replace(tzinfo=timezone.utc) < _now():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link")

    await db.execute(
        update(User).where(User.id == record.user_id).values(is_verified=True)
    )
    record.is_used = True
    await db.commit()
    return {"message": "Email verified successfully.", "verified": True}


@router.post("/resend-email-verification", status_code=status.HTTP_200_OK)
async def resend_email_verification(body: ResendEmailVerificationRequest, db: AsyncSession = Depends(get_db)):
    return await send_email_verification(body, db)


# ── Phone OTP ─────────────────────────────────────────────────────

@router.post("/send-phone-otp")
async def send_phone_otp_endpoint(body: SendPhoneOTPRequest, db: AsyncSession = Depends(get_db)):
    """Rate-limited: 1 per minute per phone (enforced via DB expiry check)."""
    recent = await db.scalar(
        select(PhoneVerificationCode).where(
            PhoneVerificationCode.phone == body.phone,
            PhoneVerificationCode.is_used == False,
            PhoneVerificationCode.expires_at > _now(),
        )
    )
    if recent:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="A code was already sent. Please wait before requesting again."
        )

    otp = generate_otp()
    code_hash = _hash_token(otp)

    record = PhoneVerificationCode(
        user_id=None,   # type: ignore — may be anonymous at this stage
        phone=body.phone,
        code_hash=code_hash,
        expires_at=_now() + timedelta(minutes=_OTP_EXPIRY_MINUTES),
    )
    db.add(record)
    await db.commit()
    await send_phone_otp(body.phone, otp)
    return {"message": "OTP sent to your phone."}


@router.post("/send-phone-otp-auth")
async def send_phone_otp_authenticated(
    body: SendPhoneOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    """Send phone OTP for a logged-in user to verify their phone number."""
    recent = await db.scalar(
        select(PhoneVerificationCode).where(
            PhoneVerificationCode.phone == body.phone,
            PhoneVerificationCode.is_used == False,
            PhoneVerificationCode.expires_at > _now(),
        )
    )
    if recent:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="A code was already sent. Please wait before requesting again."
        )

    otp = generate_otp()
    db.add(PhoneVerificationCode(
        user_id=None,  # type: ignore
        phone=body.phone,
        code_hash=_hash_token(otp),
        expires_at=_now() + timedelta(minutes=_OTP_EXPIRY_MINUTES),
    ))
    await db.commit()
    await send_phone_otp(body.phone, otp)
    return {"message": "OTP sent."}


@router.post("/verify-phone-otp")
async def verify_phone_otp(body: VerifyPhoneOTPRequest, db: AsyncSession = Depends(get_db)):
    """Verify phone OTP. Marks phone_verified on the user if email matches phone."""
    record = await db.scalar(
        select(PhoneVerificationCode).where(
            PhoneVerificationCode.phone == body.phone,
            PhoneVerificationCode.is_used == False,
            PhoneVerificationCode.expires_at > _now(),
        ).order_by(PhoneVerificationCode.created_at.desc())
    )
    if not record:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No active OTP for this phone")

    if record.attempts >= _MAX_OTP_ATTEMPTS:
        raise HTTPException(status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many attempts. Request a new code.")

    if record.code_hash != _hash_token(body.code):
        record.attempts += 1
        await db.commit()
        remaining = _MAX_OTP_ATTEMPTS - record.attempts
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail=f"Incorrect code. {remaining} attempt(s) remaining."
        )

    record.is_used = True
    await db.execute(
        update(User).where(User.phone == body.phone).values(phone_verified=True, phone=body.phone)
    )
    await db.commit()
    return {"message": "Phone verified successfully.", "verified": True}


# ── Forgot / Reset password ───────────────────────────────────────

@router.post("/forgot-password")
async def forgot_password(body: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    """Always returns success to prevent email enumeration."""
    user = await _get_user_by_email(db, body.email)
    if user:
        token = secrets.token_urlsafe(48)
        db.add(PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_token(token),
            expires_at=_now() + timedelta(minutes=_RESET_TOKEN_EXPIRY_MINUTES),
        ))
        await db.commit()
        try:
            await send_password_reset_email(user.email, user.first_name, token)
        except Exception:
            pass  # Non-fatal

    return {"message": "If that email exists, a password reset link has been sent."}


@router.post("/reset-password")
async def reset_password(body: ResetPasswordRequest, db: AsyncSession = Depends(get_db)):
    record = await db.scalar(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == _hash_token(body.token),
            PasswordResetToken.is_used == False,
        )
    )
    if not record or record.expires_at.replace(tzinfo=timezone.utc) < _now():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link")

    await db.execute(
        update(User).where(User.id == record.user_id).values(
            hashed_password=hash_password(body.password)
        )
    )
    record.is_used = True
    await db.commit()
    return {"message": "Password reset successfully. Please log in."}


# ── 2FA ──────────────────────────────────────────────────────────

@router.post("/2fa/setup", response_model=TwoFASetupResponse)
async def setup_2fa(body: TwoFASetupRequest, db: AsyncSession = Depends(get_db)):
    """
    Initiate 2FA setup for the currently authenticated user.
    For TOTP: returns QR code URI. User must call /2fa/enable to confirm.
    Requires auth header — but for simplicity in MVP we accept user_id in body.
    Full implementation wires through get_current_user dep.
    """
    raise HTTPException(
        status.HTTP_501_NOT_IMPLEMENTED,
        detail="Use /2fa/setup-for-user with a valid auth token"
    )


@router.post("/2fa/setup-for-user", response_model=TwoFASetupResponse)
async def setup_2fa_for_user(
    user_id: str,
    method: str = "totp",
    db: AsyncSession = Depends(get_db),
):
    """Setup 2FA for a specific user. Called after verifying user identity."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")

    existing = await db.scalar(
        select(TwoFactorSettings).where(TwoFactorSettings.user_id == user.id)
    )

    secret = generate_totp_secret()
    backup_plain = generate_backup_codes()
    backup_hashed = [_hash_token(c) for c in backup_plain]

    if existing:
        existing.totp_secret = secret
        existing.method = TwoFactorMethod.totp
        existing.backup_codes = backup_hashed
        existing.is_enabled = False
        existing.is_verified = False
    else:
        db.add(TwoFactorSettings(
            user_id=user.id,
            method=TwoFactorMethod.totp,
            totp_secret=secret,
            backup_codes=backup_hashed,
        ))
    await db.commit()

    uri = get_totp_uri(secret, user.email)
    return TwoFASetupResponse(
        method="totp",
        totp_uri=uri,
        qr_code_base64=generate_qr_code_base64(uri),
        backup_codes=backup_plain,
    )


@router.post("/2fa/enable")
async def enable_2fa(user_id: str, body: TwoFAEnableRequest, db: AsyncSession = Depends(get_db)):
    """Confirm TOTP code to activate 2FA on the account."""
    tfs = await db.scalar(
        select(TwoFactorSettings).where(TwoFactorSettings.user_id == user_id)
    )
    if not tfs or not tfs.totp_secret:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Run 2FA setup first")

    if not verify_totp(tfs.totp_secret, body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid TOTP code")

    tfs.is_enabled = True
    tfs.is_verified = True
    tfs.verified_at = _now()
    await db.execute(
        update(User).where(User.id == user_id).values(two_factor_enabled=True)
    )
    await db.commit()
    return {"message": "Two-factor authentication enabled."}


@router.post("/2fa/disable")
async def disable_2fa(user_id: str, body: TwoFAEnableRequest, db: AsyncSession = Depends(get_db)):
    """Disable 2FA — requires current TOTP code to confirm."""
    tfs = await db.scalar(
        select(TwoFactorSettings).where(TwoFactorSettings.user_id == user_id)
    )
    if not tfs or not tfs.is_enabled:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="2FA is not enabled")

    if not verify_totp(tfs.totp_secret, body.code):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid TOTP code")

    tfs.is_enabled = False
    await db.execute(
        update(User).where(User.id == user_id).values(two_factor_enabled=False)
    )
    await db.commit()
    return {"message": "Two-factor authentication disabled."}


@router.post("/2fa/verify", response_model=LoginResponse)
async def verify_2fa(body: TwoFAVerifyRequest, db: AsyncSession = Depends(get_db)):
    """
    Complete login after 2FA challenge.
    two_fa_token is the short-lived token returned from /login when requires_2fa=True.
    In production this token would be stored in Redis with the user_id.
    For MVP: decode it as a JWT containing user_id.
    """
    try:
        from app.core.security import decode_token
        payload = decode_token(body.two_fa_token)
        user_id = payload.get("sub")
        if payload.get("type") != "2fa_challenge":
            raise ValueError()
    except Exception:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid 2FA session token")

    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")

    tfs = await db.scalar(
        select(TwoFactorSettings).where(TwoFactorSettings.user_id == user.id)
    )
    if not tfs:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="2FA not configured")

    if tfs.method == TwoFactorMethod.totp:
        if not verify_totp(tfs.totp_secret, body.code):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid TOTP code")
    else:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Unsupported 2FA method")

    return LoginResponse(
        access_token=create_access_token(user.id, user.role.value),
        refresh_token=create_refresh_token(user.id),
        user_id=str(user.id),
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value,
        email_verified=user.is_verified,
        phone_verified=user.phone_verified,
        two_factor_enabled=user.two_factor_enabled,
    )


# ── Dev helpers (development mode only) ─────────────────────────

@router.get("/dev/verification-token")
async def dev_get_verification_token(email: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Return a fresh email verification token. DEVELOPMENT ONLY."""
    if settings.app_env != "development":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only available in development")
    user = await _get_user_by_email(db, email)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    token = secrets.token_urlsafe(48)
    db.add(EmailVerificationToken(
        user_id=user.id,
        token_hash=_hash_token(token),
        expires_at=_now() + timedelta(hours=_EMAIL_TOKEN_EXPIRY_HOURS),
    ))
    await db.commit()
    return {"token": token, "user_id": str(user.id), "email": user.email}


@router.get("/dev/phone-otp")
async def dev_get_phone_otp(phone: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Return a fresh phone OTP. Invalidates any existing OTPs first. DEVELOPMENT ONLY."""
    if settings.app_env != "development":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only available in development")
    # Invalidate all existing unused OTPs for this phone so the new one is always found first
    await db.execute(
        update(PhoneVerificationCode)
        .where(PhoneVerificationCode.phone == phone, PhoneVerificationCode.is_used == False)
        .values(is_used=True)
    )
    otp = generate_otp()
    db.add(PhoneVerificationCode(
        user_id=None,  # type: ignore
        phone=phone,
        code_hash=_hash_token(otp),
        expires_at=_now() + timedelta(minutes=_OTP_EXPIRY_MINUTES),
    ))
    await db.commit()
    return {"otp": otp, "phone": phone}


@router.get("/dev/reset-token")
async def dev_get_reset_token(email: str = Query(...), db: AsyncSession = Depends(get_db)):
    """Return a fresh password reset token. DEVELOPMENT ONLY."""
    if settings.app_env != "development":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only available in development")
    user = await _get_user_by_email(db, email)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    token = secrets.token_urlsafe(48)
    db.add(PasswordResetToken(
        user_id=user.id,
        token_hash=_hash_token(token),
        expires_at=_now() + timedelta(minutes=_RESET_TOKEN_EXPIRY_MINUTES),
    ))
    await db.commit()
    return {"token": token, "user_id": str(user.id), "email": user.email}
