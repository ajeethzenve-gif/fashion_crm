"""Send designer login OTPs using the configured APITxT gateway."""
from urllib.parse import urlparse

import requests
from django.conf import settings


class SMSConfigurationError(Exception):
    pass


class SMSDeliveryError(Exception):
    pass


def provider_error(result, status_code, secrets):
    message = result.get("message", "") if isinstance(result, dict) else ""
    if not isinstance(message, str):
        message = ""
    for secret in secrets:
        if secret:
            message = message.replace(secret, "[REDACTED]")
    message = " ".join(message.split())[:240]
    return f"SMS provider rejected the request (HTTP {status_code})." + (f" {message}" if message else " Check the provider dashboard.")


def send_designer_otp(phone_number, otp):
    api_key = getattr(settings, "SMS_API_KEY", "").strip()
    auth_key = getattr(settings, "SMS_AUTH_KEY", "").strip() or api_key
    url = getattr(settings, "SMS_API_URL", "").strip()
    if not auth_key:
        raise SMSConfigurationError("SMS_API_KEY or SMS_AUTH_KEY is required in the backend .env file.")
    if urlparse(url).scheme != "https" or not urlparse(url).netloc:
        raise SMSConfigurationError("SMS_API_URL must be the provider's HTTPS OTP endpoint.")
    payload = {
        "authkey": auth_key,
        "mobile": phone_number.lstrip("+"),
        "otp": otp,
        "sender": getattr(settings, "SMS_SENDER_ID", ""),
        "route": getattr(settings, "SMS_ROUTE", "otp"),
    }
    try:
        response = requests.post(
            url, json=payload,
            headers={"authkey": auth_key},
            timeout=15, allow_redirects=False,
        )
        try:
            result = response.json()
        except ValueError:
            result = None
        if not 200 <= response.status_code < 300:
            raise SMSDeliveryError(provider_error(result, response.status_code, (api_key, auth_key, otp, phone_number, phone_number.lstrip("+"))))
        # A 200 HTTP response alone is not sufficient: gateways also return
        # application-level failures. Never treat an unknown response as sent.
        if not isinstance(result, dict) or (
            result.get("status") not in (200, "200", "success")
            and result.get("type") != "success"
        ) or (isinstance(result, dict) and result.get("status") in ("error", "failed")):
            raise SMSDeliveryError(provider_error(result, response.status_code, (api_key, auth_key, otp, phone_number, phone_number.lstrip("+"))))
    except (requests.RequestException, ValueError):
        raise SMSDeliveryError("Unable to reach the SMS provider or read its response. Please try again.") from None
