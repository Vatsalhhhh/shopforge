"""Tests for password hashing and JWT utilities."""
import pytest
from jose import JWTError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    decode_refresh_token,
    hash_password,
    verify_password,
)


def test_hash_password_is_not_plaintext():
    hashed = hash_password("mysecretpassword")
    assert hashed != "mysecretpassword"
    assert len(hashed) > 20


def test_verify_password_correct():
    plain = "CorrectHorseBatteryStaple"
    hashed = hash_password(plain)
    assert verify_password(plain, hashed) is True


def test_verify_password_wrong():
    hashed = hash_password("correct_password")
    assert verify_password("wrong_password", hashed) is False


def test_create_and_decode_access_token():
    import uuid
    user_id = uuid.uuid4()
    token = create_access_token(user_id, role="customer")
    payload = decode_access_token(token)
    assert payload["sub"] == str(user_id)
    assert payload["role"] == "customer"
    assert payload["type"] == "access"


def test_access_token_rejects_refresh_token():
    import uuid
    refresh = create_refresh_token(uuid.uuid4())
    with pytest.raises(JWTError):
        decode_access_token(refresh)


def test_refresh_token_rejects_access_token():
    import uuid
    access = create_access_token(uuid.uuid4(), role="admin")
    with pytest.raises(JWTError):
        decode_refresh_token(access)


def test_tampered_token_raises():
    import uuid
    token = create_access_token(uuid.uuid4(), role="customer")
    tampered = token[:-5] + "XXXXX"
    with pytest.raises(JWTError):
        decode_access_token(tampered)
