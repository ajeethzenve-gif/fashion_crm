"""Server-side provider adapter contract; no guessed APITXT request/response fields.

Configure APITXT_KYC_HANDLER after mapping the provider's documented API.
The callable accepts (action, payload) and returns normalized provider evidence:
PAN verify: verified=True, name, reference, optional date_of_birth.
Aadhaar verify: verified=True, reference; no holder name is required.
Aadhaar send: transaction_id. Never return or retain full Aadhaar or OTP data.
"""
from django.conf import settings
from django.utils.module_loading import import_string


class KYCProviderUnavailable(Exception):
    def __init__(self, message, code="provider_unavailable", status_code=503):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


def provider_configured():
    path = getattr(settings, "APITXT_KYC_HANDLER", "")
    if path == "designers.apitxt_kyc.verify_identity":
        from .apitxt_kyc import authentication_key
        return bool(authentication_key())
    return bool(path)


def verify_identity(action, payload):
    path = getattr(settings, "APITXT_KYC_HANDLER", "")
    if not path:
        raise KYCProviderUnavailable("APITXT verification is not connected yet. Configure its documented PAN and Aadhaar OTP requests and responses on the backend.")
    try:
        result = import_string(path)(action, payload)
    except KYCProviderUnavailable:
        raise
    except Exception:
        raise KYCProviderUnavailable("APITXT verification is unavailable. Please try again or contact the administrator.") from None
    if not isinstance(result, dict):
        raise KYCProviderUnavailable("APITXT returned an unsupported response. Verification was not completed.")
    return result
