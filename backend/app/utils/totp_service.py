"""TOTP (Time-based One-Time Password) utilities using pyotp."""
import io
import base64

import pyotp
import qrcode

from app.core.config import settings


def generate_totp_secret() -> str:
    return pyotp.random_base32()


def get_totp_uri(secret: str, email: str) -> str:
    return pyotp.totp.TOTP(secret).provisioning_uri(
        name=email, issuer_name=settings.app_name
    )


def generate_qr_code_base64(uri: str) -> str:
    """Generate a base64-encoded PNG QR code from the TOTP URI."""
    img = qrcode.make(uri)
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode()


def verify_totp(secret: str, code: str) -> bool:
    totp = pyotp.TOTP(secret)
    return totp.verify(code, valid_window=1)


def generate_backup_codes(count: int = 8) -> list[str]:
    """Generate one-time backup codes (plain text — hash before storing)."""
    import secrets
    return [secrets.token_hex(4).upper() for _ in range(count)]
