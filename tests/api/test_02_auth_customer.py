"""Customer registration, login, email verification, and password reset."""
import pytest
from helpers import (
    DEFAULT_PASSWORD, ts, register_customer,
    dev_email_token, dev_reset_token, verify_email, login,
)


# ── Registration validation ───────────────────────────────────────

def test_register_missing_fields_returns_422(api):
    r = api.post("/auth/register", json={"email": "x@x.com"})
    assert r.status_code == 422


def test_register_invalid_email_returns_422(api):
    r = api.post("/auth/register", json={
        "first_name": "A", "last_name": "B",
        "email": "not-an-email",
        "password": DEFAULT_PASSWORD, "confirm_password": DEFAULT_PASSWORD,
    })
    assert r.status_code == 422


def test_register_weak_password_returns_422(api):
    r = api.post("/auth/register", json={
        "first_name": "A", "last_name": "B",
        "email": f"weak_{ts()}@test.io",
        "password": "password",
        "confirm_password": "password",
    })
    assert r.status_code == 422
    assert "password" in r.text.lower()


def test_register_password_mismatch_returns_422(api):
    r = api.post("/auth/register", json={
        "first_name": "A", "last_name": "B",
        "email": f"mismatch_{ts()}@test.io",
        "password": DEFAULT_PASSWORD,
        "confirm_password": "Different@9999!",
    })
    assert r.status_code == 422


# ── Successful registration ───────────────────────────────────────

def test_register_creates_account(api):
    email = f"reg_{ts()}@test.io"
    r = register_customer(api, email)
    assert r.status_code == 201
    body = r.json()
    assert "user_id" in body
    assert body["email_verification_sent"] is False  # SMTP not configured in dev


def test_register_duplicate_email_returns_409(api):
    email = f"dup_{ts()}@test.io"
    register_customer(api, email)
    r = register_customer(api, email)
    assert r.status_code == 409
    assert "already" in r.json()["detail"].lower()


# ── Email verification ────────────────────────────────────────────

def test_verify_email_bad_token_returns_400(api):
    r = api.get("/auth/verify-email", params={"token": "totally-fake-token-xyz"})
    assert r.status_code == 400


def test_verify_email_success(api):
    email = f"verify_{ts()}@test.io"
    register_customer(api, email)
    token = dev_email_token(api, email)
    r = api.get("/auth/verify-email", params={"token": token})
    assert r.status_code == 200
    assert r.json()["verified"] is True


def test_verify_email_token_reuse_returns_400(api):
    email = f"reuse_{ts()}@test.io"
    register_customer(api, email)
    token = dev_email_token(api, email)
    api.get("/auth/verify-email", params={"token": token})
    r = api.get("/auth/verify-email", params={"token": token})
    assert r.status_code == 400


def test_resend_verification_unknown_email_returns_200(api):
    """Endpoint always responds 200 to prevent email enumeration."""
    r = api.post("/auth/resend-email-verification", json={"email": "ghost@nowhere.io"})
    assert r.status_code == 200


# ── Login ─────────────────────────────────────────────────────────

def test_login_wrong_password_returns_401(api, verified_customer):
    r = login(api, verified_customer["email"], "WrongPass@1!")
    assert r.status_code == 401


def test_login_unknown_email_returns_401(api):
    r = login(api, "nobody@nowhere.io")
    assert r.status_code == 401


def test_login_success_returns_jwt(api, verified_customer):
    r = login(api, verified_customer["email"])
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["refresh_token"]
    assert body["role"] == "customer"
    assert body["email_verified"] is True
    assert body["requires_2fa"] is False


def test_token_refresh(api, customer_tokens):
    r = api.post("/auth/refresh", json={"refresh_token": customer_tokens["refresh_token"]})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["refresh_token"]


def test_refresh_with_bad_token_returns_401(api):
    r = api.post("/auth/refresh", json={"refresh_token": "garbage.token.value"})
    assert r.status_code == 401


# ── Forgot / Reset password ───────────────────────────────────────

def test_forgot_password_unknown_email_still_200(api):
    """Never reveals whether email exists."""
    r = api.post("/auth/forgot-password", json={"email": "ghost@nowhere.io"})
    assert r.status_code == 200


def test_full_password_reset_flow(api):
    email = f"reset_{ts()}@test.io"
    register_customer(api, email)
    verify_email(api, email)

    # Request reset
    r = api.post("/auth/forgot-password", json={"email": email})
    assert r.status_code == 200

    # Get a fresh password reset token via dev endpoint
    token = dev_reset_token(api, email)

    # Reset to new password
    new_pwd = "NewPass@5678!"
    r = api.post("/auth/reset-password", json={
        "token": token, "password": new_pwd, "confirm_password": new_pwd,
    })
    assert r.status_code == 200

    # Login with old password must fail
    r_old = login(api, email, DEFAULT_PASSWORD)
    assert r_old.status_code == 401

    # Login with new password must succeed
    r_new = login(api, email, new_pwd)
    assert r_new.status_code == 200
    assert r_new.json()["access_token"]


def test_reset_bad_token_returns_400(api):
    r = api.post("/auth/reset-password", json={
        "token": "fakefakefake",
        "password": DEFAULT_PASSWORD,
        "confirm_password": DEFAULT_PASSWORD,
    })
    assert r.status_code == 400
