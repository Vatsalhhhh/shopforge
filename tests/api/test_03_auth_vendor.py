"""Vendor registration, activation gates, and login flow."""
import pytest
from helpers import (
    VENDOR_PASSWORD, TEST_PHONE, ts,
    register_vendor, verify_email, verify_phone, dev_phone_otp,
)


# ── Registration validation ───────────────────────────────────────

def test_vendor_register_missing_business_fields_returns_422(api):
    r = api.post("/vendor/register", json={
        "first_name": "Jane", "last_name": "Doe",
        "email": f"v_{ts()}@test.io",
        "phone": TEST_PHONE,
        "password": VENDOR_PASSWORD,
        "confirm_password": VENDOR_PASSWORD,
        # missing: business_name, business_email, business_phone, business_address
    })
    assert r.status_code == 422


def test_vendor_register_weak_password_returns_422(api):
    sfx = ts()
    r = api.post("/vendor/register", json={
        "first_name": "Jane", "last_name": "Doe",
        "email": f"v_{sfx}@test.io",
        "phone": TEST_PHONE,
        "password": "weak",
        "confirm_password": "weak",
        "business_name": f"Biz {sfx}",
        "business_email": f"biz{sfx}@shop.io",
        "business_phone": TEST_PHONE,
        "business_address": "123 St",
    })
    assert r.status_code == 422


# ── Successful registration ───────────────────────────────────────

def test_vendor_register_creates_account(api):
    sfx = ts()
    email = f"vr_{sfx}@test.io"
    r = register_vendor(api, email, sfx)
    assert r.status_code == 201
    body = r.json()
    assert "vendor_id" in body
    assert body["status"] == "pending"
    assert body["next_step"] == "verify_email"


def test_vendor_register_duplicate_email_returns_409(api):
    sfx = ts()
    email = f"dup_{sfx}@test.io"
    register_vendor(api, email, sfx)
    r = register_vendor(api, email, ts())
    assert r.status_code == 409


# ── Activation gates ──────────────────────────────────────────────

def test_vendor_login_blocks_unverified_email(api):
    sfx = ts()
    email = f"gate_em_{sfx}@test.io"
    register_vendor(api, email, sfx)
    r = api.post("/vendor/login", json={"email": email, "password": VENDOR_PASSWORD})
    assert r.status_code == 403
    assert "email" in r.json()["detail"].lower()


def test_vendor_login_blocks_unverified_phone(api):
    sfx = ts()
    email = f"gate_ph_{sfx}@test.io"
    register_vendor(api, email, sfx)
    verify_email(api, email)
    r = api.post("/vendor/login", json={"email": email, "password": VENDOR_PASSWORD})
    assert r.status_code == 403
    assert "phone" in r.json()["detail"].lower()


# ── Phone OTP ─────────────────────────────────────────────────────

def test_phone_otp_wrong_code_returns_400(api):
    dev_phone_otp(api, TEST_PHONE)  # seed a fresh OTP in DB
    r = api.post("/auth/verify-phone-otp", json={"phone": TEST_PHONE, "code": "000000"})
    assert r.status_code == 400


def test_phone_otp_too_short_returns_422(api):
    r = api.post("/auth/verify-phone-otp", json={"phone": TEST_PHONE, "code": "12"})
    assert r.status_code == 422


# ── Full vendor flow ──────────────────────────────────────────────

def test_vendor_login_after_full_verification_returns_tokens(api, verified_vendor):
    r = api.post("/vendor/login", json={
        "email": verified_vendor["email"],
        "password": VENDOR_PASSWORD,
    })
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"]
    assert body["email_verified"] is True
    assert body["phone_verified"] is True


def test_vendor_status_is_pending_until_admin_approves(api, verified_vendor):
    r = api.post("/vendor/login", json={
        "email": verified_vendor["email"],
        "password": VENDOR_PASSWORD,
    })
    assert r.status_code == 200
    assert r.json()["vendor_status"] == "pending"


def test_vendor_login_wrong_password_returns_401(api, verified_vendor):
    r = api.post("/vendor/login", json={
        "email": verified_vendor["email"],
        "password": "Wrong@9999!",
    })
    assert r.status_code == 401
