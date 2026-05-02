"""Phone OTP generation and delivery. Uses Twilio in production, logs in dev."""
import random
import string

import structlog

from app.core.config import settings

logger = structlog.get_logger(__name__)


def generate_otp(length: int = 6) -> str:
    return "".join(random.choices(string.digits, k=length))


async def send_phone_otp(phone: str, otp: str) -> None:
    """Send OTP via SMS. Dev mode: logs to console."""
    if not settings.twilio_account_sid:
        logger.info("SMS OTP (dev mode — not sent)", phone=phone, otp=otp)
        return

    try:
        from twilio.rest import Client  # type: ignore
        client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
        client.messages.create(
            body=f"Your ShopForge verification code is: {otp}. Expires in 10 minutes.",
            from_=settings.twilio_phone_number,
            to=phone,
        )
        logger.info("SMS sent", phone=phone)
    except Exception as exc:
        logger.error("SMS delivery failed", phone=phone, error=str(exc))
        raise
