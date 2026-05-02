"""Shared test utilities — import this, not conftest."""
import time
import httpx

API_BASE = "http://localhost:8000/api/v1"
DEFAULT_PASSWORD = "Test@1234!"
VENDOR_PASSWORD = "Vendor@9999!"
TEST_PHONE = "+12025550100"


def ts() -> str:
    return str(int(time.time() * 1000))


def register_customer(api: httpx.Client, email: str, password: str = DEFAULT_PASSWORD) -> httpx.Response:
    return api.post("/auth/register", json={
        "first_name": "Auto", "last_name": "Test",
        "email": email, "password": password, "confirm_password": password,
    })


def register_vendor(api: httpx.Client, email: str, biz_suffix: str = "", password: str = VENDOR_PASSWORD) -> httpx.Response:
    sfx = biz_suffix or ts()
    return api.post("/vendor/register", json={
        "first_name": "Jane", "last_name": "Vendor",
        "email": email, "phone": TEST_PHONE,
        "password": password, "confirm_password": password,
        "business_name": f"Biz {sfx}",
        "business_email": f"biz{sfx}@shop.io",
        "business_phone": "+12025550200",
        "business_address": "123 Commerce St, NY",
    })


def dev_email_token(api: httpx.Client, email: str) -> str:
    r = api.get("/auth/dev/verification-token", params={"email": email})
    assert r.status_code == 200, f"dev token endpoint failed ({r.status_code}): {r.text}"
    return r.json()["token"]


def dev_phone_otp(api: httpx.Client, phone: str = TEST_PHONE) -> str:
    r = api.get("/auth/dev/phone-otp", params={"phone": phone})
    assert r.status_code == 200, f"dev OTP endpoint failed ({r.status_code}): {r.text}"
    return r.json()["otp"]


def verify_email(api: httpx.Client, email: str) -> dict:
    token = dev_email_token(api, email)
    r = api.get("/auth/verify-email", params={"token": token})
    assert r.status_code == 200, f"verify-email failed: {r.text}"
    return r.json()


def verify_phone(api: httpx.Client, phone: str = TEST_PHONE) -> dict:
    otp = dev_phone_otp(api, phone)
    r = api.post("/auth/verify-phone-otp", json={"phone": phone, "code": otp})
    assert r.status_code == 200, f"verify-phone-otp failed: {r.text}"
    return r.json()


def dev_reset_token(api: httpx.Client, email: str) -> str:
    r = api.get("/auth/dev/reset-token", params={"email": email})
    assert r.status_code == 200, f"dev reset-token failed ({r.status_code}): {r.text}"
    return r.json()["token"]


def login(api: httpx.Client, email: str, password: str = DEFAULT_PASSWORD) -> httpx.Response:
    return api.post("/auth/login", json={"email": email, "password": password})
