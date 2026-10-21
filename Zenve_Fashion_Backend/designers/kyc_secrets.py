import base64
import hashlib
import hmac
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings


def cipher():
    key = hmac.new(settings.SECRET_KEY.encode(), b"designer-kyc-aadhaar-v1", hashlib.sha256).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def encrypt_aadhaar(number):
    return cipher().encrypt(number.encode()).decode()


def decrypt_aadhaar(value):
    try:
        return cipher().decrypt(value.encode()).decode()
    except (InvalidToken, ValueError, AttributeError):
        return None
