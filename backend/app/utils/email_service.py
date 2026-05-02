"""Email delivery service using aiosmtplib. Falls back to console logging in dev."""
import structlog
from aiosmtplib import SMTP, SMTPException

from app.core.config import settings

logger = structlog.get_logger(__name__)


def _smtp_configured() -> bool:
    """True only if real SMTP credentials are set (not placeholders)."""
    user = settings.smtp_user or ""
    pwd = settings.smtp_password or ""
    return (
        bool(user)
        and user != "your_email@gmail.com"
        and bool(pwd)
        and pwd != "CHANGE_ME_app_password"
    )


async def _send(to: str, subject: str, html: str) -> None:
    from email.mime.multipart import MIMEMultipart
    from email.mime.text import MIMEText

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = f"{settings.email_from_name} <{settings.email_from_address}>"
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    async with SMTP(hostname=settings.smtp_host, port=settings.smtp_port, start_tls=True) as smtp:
        await smtp.login(settings.smtp_user, settings.smtp_password)
        await smtp.send_message(msg)


async def send_email(to: str, subject: str, html: str) -> bool:
    """Returns True if sent via SMTP, False if only logged (dev/unconfigured mode)."""
    if not _smtp_configured():
        logger.info("EMAIL (SMTP not configured — printed below)", to=to, subject=subject)
        logger.info(f"EMAIL BODY:\n{html}")
        return False
    try:
        await _send(to, subject, html)
        logger.info("Email sent", to=to, subject=subject)
        return True
    except SMTPException as exc:
        logger.error("Email delivery failed", to=to, error=str(exc))
        raise


async def send_verification_email(to: str, name: str, token: str) -> bool:
    link = f"{settings.frontend_url}/auth/verify-email?token={token}"

    # Always log the link so devs can use it without SMTP
    logger.info(f"EMAIL VERIFY LINK (copy this): {link}")

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#1a1a1a">Verify your email</h2>
      <p>Hi {name}, click the button below to verify your email address.</p>
      <a href="{link}" style="display:inline-block;padding:12px 24px;background:#6366f1;
        color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
        Verify Email
      </a>
      <p style="color:#666;font-size:13px;margin-top:20px">
        Or paste this link in your browser:<br><code>{link}</code>
      </p>
      <p style="color:#666;font-size:13px;margin-top:8px">
        Link expires in 24 hours. If you didn't create an account, ignore this email.
      </p>
    </div>"""
    return await send_email(to, "Verify your ShopForge email", html)


async def send_password_reset_email(to: str, name: str, token: str) -> bool:
    link = f"{settings.frontend_url}/auth/reset-password?token={token}"

    logger.info(f"PASSWORD RESET LINK (copy this): {link}")

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#1a1a1a">Reset your password</h2>
      <p>Hi {name}, click below to reset your password.</p>
      <a href="{link}" style="display:inline-block;padding:12px 24px;background:#ef4444;
        color:#fff;text-decoration:none;border-radius:8px;font-weight:600">
        Reset Password
      </a>
      <p style="color:#666;font-size:13px;margin-top:20px">
        Or paste this link:<br><code>{link}</code>
      </p>
      <p style="color:#666;font-size:13px;margin-top:8px">
        This link expires in 30 minutes.
      </p>
    </div>"""
    return await send_email(to, "Reset your ShopForge password", html)


async def send_email_otp(to: str, name: str, otp: str) -> None:
    logger.info(f"EMAIL OTP CODE: {otp}")

    html = f"""
    <div style="font-family:sans-serif;max-width:480px;margin:auto">
      <h2 style="color:#1a1a1a">Your verification code</h2>
      <p>Hi {name}, your 2FA code is:</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#6366f1;
        padding:20px;background:#f5f5ff;border-radius:12px;text-align:center">
        {otp}
      </div>
      <p style="color:#666;font-size:13px;margin-top:20px">
        Expires in 10 minutes. Never share this code.
      </p>
    </div>"""
    await send_email(to, "Your ShopForge verification code", html)
