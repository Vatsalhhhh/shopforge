"""Pytest fixtures — shared across the whole session."""
import pytest
import httpx
from helpers import (
    API_BASE, DEFAULT_PASSWORD, VENDOR_PASSWORD, TEST_PHONE,
    ts, register_customer, register_vendor,
    verify_email, verify_phone, login,
)


@pytest.fixture(scope="session")
def api():
    """One HTTP client shared across the whole test session."""
    with httpx.Client(base_url=API_BASE, timeout=15, follow_redirects=True) as client:
        yield client


@pytest.fixture(scope="session")
def verified_customer(api):
    """Registered + email-verified customer, reused for the session."""
    email = f"c_{ts()}@test.io"
    r = register_customer(api, email)
    assert r.status_code == 201, f"register failed: {r.text}"
    verify_email(api, email)
    return {"email": email, "password": DEFAULT_PASSWORD, **r.json()}


@pytest.fixture(scope="session")
def customer_tokens(api, verified_customer):
    r = login(api, verified_customer["email"])
    assert r.status_code == 200, f"login failed: {r.text}"
    return r.json()


@pytest.fixture(scope="session")
def verified_vendor(api):
    """Vendor with email + phone verified, pending admin approval."""
    sfx = ts()
    email = f"v_{sfx}@test.io"
    r = register_vendor(api, email, sfx)
    assert r.status_code == 201, f"vendor register failed: {r.text}"
    verify_email(api, email)
    verify_phone(api, TEST_PHONE)
    return {"email": email, "password": VENDOR_PASSWORD, **r.json()}
