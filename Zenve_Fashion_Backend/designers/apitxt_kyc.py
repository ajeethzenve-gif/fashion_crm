"""APITXT KYC transport. Keys and identity input never leave the backend except
to the configured APITXT HTTPS endpoints. Unknown responses fail closed.
"""
import re
import uuid
from datetime import date
from urllib.parse import urlparse
import requests
from django.conf import settings
from .kyc_provider import KYCProviderUnavailable


def authentication_key():
    return (getattr(settings, "APITXT_AUTH_KEY", "") or getattr(settings, "SMS_AUTH_KEY", "") or getattr(settings, "SMS_API_KEY", "")).strip()


def safe_error(result, values):
    message = result.get("message", "") if isinstance(result, dict) else ""
    if not isinstance(message, str):
        message = ""
    for value in values:
        if isinstance(value, str) and value:
            message = message.replace(value, "[REDACTED]")
    message = re.sub(r"\b(?:[A-Z]{5}[0-9]{4}[A-Z]|[0-9]{6,12})\b", "[REDACTED]", message)
    return " ".join(message.split())[:240]


def verify_identity(action, payload):
    key = authentication_key()
    if not key:
        raise KYCProviderUnavailable("Set APITXT_AUTH_KEY in the backend .env file before using KYC verification.")
    if action == "pan":
        url = settings.APITXT_PAN_VERIFY_URL
        name = str(payload.get("name", "")).strip()
        if not name:
            raise KYCProviderUnavailable("Name as per PAN is required before checking PAN.")
        try:
            dob = date.fromisoformat(str(payload.get("date_of_birth", ""))).strftime("%d/%m/%Y")
        except ValueError:
            raise KYCProviderUnavailable("The PAN holder's date of birth is required in YYYY-MM-DD format.") from None
        fields = {"pan": payload["pan_number"], "name": name, "dob": dob}
    elif action == "aadhaar_send":
        url = settings.APITXT_AADHAAR_SEND_URL
        fields = {"aadhaar_number": payload["aadhaar_number"], "consent": payload.get("consent") is True}
    elif action == "aadhaar_verify":
        url = settings.APITXT_AADHAAR_VERIFY_URL
        fields = {"reference_id": payload["transaction_id"], "otp": payload["otp"]}
    else:
        raise KYCProviderUnavailable("Unsupported APITXT verification action.")
    parsed = urlparse(url)
    if parsed.scheme != "https" or parsed.hostname not in {"apitxt.com", "www.apitxt.com"} or parsed.username or parsed.password:
        raise KYCProviderUnavailable("KYC API URLs must use the APITXT HTTPS service.")
    connect_timeout = getattr(settings, "APITXT_CONNECT_TIMEOUT", 10)
    read_timeout = getattr(settings, "APITXT_AADHAAR_VERIFY_TIMEOUT", 300) if action == "aadhaar_verify" else getattr(settings, "APITXT_READ_TIMEOUT", 30)
    try:
        # Do not replay OTP verification after a timeout: it may already be consumed.
        response = requests.post(url, json={"authkey": key, **fields}, headers={"authkey": key}, timeout=(connect_timeout, read_timeout), allow_redirects=False)
    except requests.exceptions.SSLError:
        raise KYCProviderUnavailable("The server could not establish a secure connection to APITXT. Ask the administrator to check the server certificate trust and network.", code="provider_tls_error") from None
    except requests.exceptions.ConnectTimeout:
        raise KYCProviderUnavailable("The server timed out connecting to APITXT. Please try again when the connection is available.", code="provider_connect_timeout", status_code=504) from None
    except requests.exceptions.Timeout:
        raise KYCProviderUnavailable("APITXT did not finish responding within the verification timeout. Verification is not confirmed. Request a fresh Aadhaar OTP before trying again.", code="provider_read_timeout", status_code=504) from None
    except requests.exceptions.ConnectionError:
        raise KYCProviderUnavailable("The server could not connect to APITXT or the connection was interrupted. Ask the administrator to check the server internet, DNS and outbound HTTPS access.", code="provider_connection_error") from None
    except requests.RequestException:
        raise KYCProviderUnavailable("The request to APITXT could not be completed. Please try again later.", code="provider_network_error") from None
    try:
        result = response.json()
    except ValueError:
        raise KYCProviderUnavailable(f"APITXT returned an unreadable response (HTTP {response.status_code}) instead of verification JSON. Verification is not confirmed. If this continues, contact APITXT support.", code="provider_invalid_response", status_code=502) from None
    success = isinstance(result, dict) and result.get("status") in (200, "200", "success")
    if not 200 <= response.status_code < 300 or not success:
        error = safe_error(result, [key, *fields.values()])
        if action == "aadhaar_verify" and 200 <= response.status_code < 300:
            message = "APITXT could not verify this Aadhaar OTP. Use the latest OTP from the most recent Aadhaar request. If it still fails, request a new OTP."
            if error:
                message += f" Provider message: {error}"
            request_id = result.get("request_id") if isinstance(result, dict) else None
            if isinstance(request_id, str) and re.fullmatch(r"[A-Za-z0-9_-]{1,100}", request_id):
                reference = safe_error({"message": request_id}, [key, *fields.values()])
                if "[REDACTED]" not in reference:
                    message += f" APITXT support request ID: {reference}."
            raise KYCProviderUnavailable(message)
        raise KYCProviderUnavailable(f"APITXT rejected the request (HTTP {response.status_code})." + (f" {error}" if error else " Check your KYC service activation and account balance."))
    data = result.get("data") if isinstance(result.get("data"), dict) else result
    if action == "aadhaar_send":
        reference = data.get("reference_id") or result.get("reference_id")
        if not isinstance(reference, (str, int)) or isinstance(reference, bool) or not str(reference):
            raise KYCProviderUnavailable("APITXT did not return an OTP reference_id. Check its Aadhaar response format.")
        return {"transaction_id": str(reference)}
    # HTTP 200 alone must never become KYC verification. Require an explicit
    # affirmative identity-verification flag and returned identity name.
    verified = data.get("verified")
    if verified is None:
        verified = data.get("valid")
    if verified is not True:
        if verified is False:
            message = safe_error(result, [key, *fields.values()])
            if message.lower() in ("success", "ok", "verified"):
                message = ""
            return {"verified": False, "failure_code": "otp_rejected" if action == "aadhaar_verify" else "pan_rejected", "provider_message": message}
        raise KYCProviderUnavailable("APITXT returned no explicit verified/valid flag. The identity has not been verified; check the response mapping.")
    reference = data.get("reference_id") or result.get("request_id")
    if action == "aadhaar_verify":
        # The OTP must have an explicit positive result for the server-held session.
        return {"verified": True, "reference": str(reference or payload["transaction_id"]), "verification_type": "OTP"}
    name = data.get("name") or data.get("full_name")
    name_match, dob_match = data.get("name_match"), data.get("dob_match")
    if name_match is False or dob_match is False:
        return {"verified": False, "failure_code": "pan_name_mismatch" if name_match is False else "pan_dob_mismatch"}
    source = "provider"
    if not isinstance(name, str) or not name.strip():
        if name_match is True and dob_match is True:
            name = payload["name"]
            source = "provider_matched_input"
        else:
            raise KYCProviderUnavailable("APITXT verified the PAN but did not return a holder name or explicit name and DOB matches. PAN details cannot be compared yet; check the provider response mapping.")
    normalized = {"verified": True, "name": name.strip(), "reference": str(reference or uuid.uuid4()),
                  "reference_source": "provider" if reference else "local_audit", "name_source": source}
    dob = data.get("date_of_birth")
    if isinstance(dob, str) and dob:
        for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
            try:
                from datetime import datetime
                normalized["date_of_birth"] = datetime.strptime(dob, fmt).date().isoformat()
                break
            except ValueError:
                continue
        else:
            raise KYCProviderUnavailable("APITXT returned an unsupported PAN birth date format.")
    elif dob_match is True:
        normalized["date_of_birth"] = payload["date_of_birth"]
    return normalized
