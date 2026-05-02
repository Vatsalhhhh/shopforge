"""TOTP two-factor authentication setup and verification."""
import pyotp
import pytest
from helpers import DEFAULT_PASSWORD, ts, register_customer, verify_email, login


@pytest.fixture(scope="module")
def tfa_user(api):
    """A verified customer ready for 2FA setup."""
    email = f"tfa_{ts()}@test.io"
    register_customer(api, email)
    verify_email(api, email)
    r = login(api, email)
    assert r.status_code == 200
    return {"email": email, "password": DEFAULT_PASSWORD, "tokens": r.json()}


@pytest.fixture(scope="module")
def totp_secret(api, tfa_user):
    """Setup TOTP for tfa_user and return the raw secret."""
    user_id = tfa_user["tokens"]["user_id"]
    r = api.post("/auth/2fa/setup-for-user", params={"user_id": user_id, "method": "totp"})
    assert r.status_code == 200
    body = r.json()
    assert body["method"] == "totp"
    assert body["totp_uri"]
    assert len(body["backup_codes"]) == 8
    # Extract secret from otpauth URI  (format: otpauth://totp/...?secret=BASE32&...)
    uri = body["totp_uri"]
    secret = dict(p.split("=") for p in uri.split("?")[1].split("&") if "=" in p).get("secret", "")
    assert secret, "Could not extract TOTP secret from URI"
    return secret


# ── Setup ─────────────────────────────────────────────────────────

def test_2fa_setup_returns_qr_and_backup_codes(api, tfa_user):
    user_id = tfa_user["tokens"]["user_id"]
    r = api.post("/auth/2fa/setup-for-user", params={"user_id": user_id, "method": "totp"})
    assert r.status_code == 200
    body = r.json()
    assert body["qr_code_base64"]
    assert len(body["backup_codes"]) == 8


# ── Enable ────────────────────────────────────────────────────────

def test_2fa_enable_with_wrong_code_returns_400(api, tfa_user, totp_secret):
    user_id = tfa_user["tokens"]["user_id"]
    r = api.post("/auth/2fa/enable", params={"user_id": user_id}, json={"code": "000000"})
    assert r.status_code == 400


def test_2fa_enable_with_valid_code(api, tfa_user, totp_secret):
    user_id = tfa_user["tokens"]["user_id"]
    code = pyotp.TOTP(totp_secret).now()
    r = api.post("/auth/2fa/enable", params={"user_id": user_id}, json={"code": code})
    assert r.status_code == 200
    assert "enabled" in r.json()["message"].lower()


# ── Login with 2FA ────────────────────────────────────────────────

def test_login_with_2fa_enabled_returns_challenge(api, tfa_user):
    r = login(api, tfa_user["email"])
    assert r.status_code == 200
    body = r.json()
    assert body["requires_2fa"] is True
    assert body["two_fa_token"]
    assert body["access_token"] == ""


def test_2fa_verify_with_wrong_code_returns_400(api, tfa_user):
    r = login(api, tfa_user["email"])
    two_fa_token = r.json()["two_fa_token"]
    r2 = api.post("/auth/2fa/verify", json={"two_fa_token": two_fa_token, "code": "000000"})
    assert r2.status_code == 400


def test_2fa_verify_with_valid_code_returns_full_tokens(api, tfa_user, totp_secret):
    r = login(api, tfa_user["email"])
    two_fa_token = r.json()["two_fa_token"]
    code = pyotp.TOTP(totp_secret).now()
    r2 = api.post("/auth/2fa/verify", json={"two_fa_token": two_fa_token, "code": code})
    assert r2.status_code == 200
    body = r2.json()
    assert body["access_token"]
    assert body["requires_2fa"] is False


# ── Disable ───────────────────────────────────────────────────────

def test_2fa_disable_with_valid_code(api, tfa_user, totp_secret):
    user_id = tfa_user["tokens"]["user_id"]
    code = pyotp.TOTP(totp_secret).now()
    r = api.post("/auth/2fa/disable", params={"user_id": user_id}, json={"code": code})
    assert r.status_code == 200
    assert "disabled" in r.json()["message"].lower()


def test_login_no_longer_requires_2fa_after_disable(api, tfa_user):
    r = login(api, tfa_user["email"])
    assert r.status_code == 200
    assert r.json()["requires_2fa"] is False
    assert r.json()["access_token"]
