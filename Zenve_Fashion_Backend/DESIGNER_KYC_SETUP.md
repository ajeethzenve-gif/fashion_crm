# Designer KYC Verification — Layer 17

The page uses an unverified-designer calling queue and API comparison workflow.
The built-in APITXT adapter calls PAN verification and Aadhaar OTP endpoints.
Request field names were confirmed using authenticated missing/invalid-field
responses without submitting real identity details. Unrecognized identity
responses fail closed and never mark a designer verified.

## Setup

1. Restore the configured MySQL connection.
2. Run `python manage.py migrate` from the backend directory.
3. Restart the backend and deploy the built frontend.
4. Assign the `KYC Reviewer` role to authorized staff, or grant layer 17 through
   Django admin. Existing roles with layer 01 or 12 receive layer 17 through
   the migration. Designer accounts retain layers 02, 03, and 06.
5. Sign out and sign in to refresh permissions, then open `/designer-kyc`.

## Calling and verification workflow

All designers whose KYC is not VERIFIED appear in the queue, including those
without a document submission. Open Call & Verify to view their registered
owner name, mobile, email and city. Obtain consent before sending identity
details to the provider. Check PAN, send Aadhaar OTP, and verify that OTP.

The full Aadhaar number is transient; only its last four digits are stored.
OTP sessions are bound to the reviewer and submission, expire in five minutes,
and permit at most five attempts. Resend is limited to once per 30 seconds.
The server stores only selected normalized provider evidence, not raw responses.
Names on both identities must match the registered owner; returned birth dates
must match when both are present. Staff must explicitly confirm the comparison.
API success alone does not set KYC VERIFIED. Rejecting requires review notes.

## APITXT connection

`APITXT_KYC_HANDLER` defaults to `designers.apitxt_kyc.verify_identity`.
Set `APITXT_AUTH_KEY` in the backend `.env`, or use the existing APITXT
`SMS_AUTH_KEY`/`SMS_API_KEY` as a fallback. Never put credentials in React.
The adapter sends `authkey` in the JSON body and header. Its requests use:

- `https://apitxt.com/api/panVerify`: `pan`.
- `https://apitxt.com/api/aadhaarSendOTP`: `aadhaar_number`, `consent`.
- `https://apitxt.com/api/aadhaarVerifyOTP`: `reference_id`, `otp`.

The adapter requires a successful provider status and explicit `verified: true`
or `valid: true`, plus returned name and reference. OTP sending requires a
returned `reference_id`. Unknown success formats require response mapping
updates; HTTP 200 alone is never proof of identity verification.

The internal handler interface remains `handler(action, payload)`:

- `pan`: input `pan_number`; return normalized verified boolean, holder `name`,
  and opaque `reference`, optionally ISO `date_of_birth`.
- `aadhaar_send`: input transient `aadhaar_number` and consent; return
  `transaction_id` after confirmed provider acceptance.
- `aadhaar_verify`: input transaction ID and OTP; return normalized verified
  boolean, holder name, opaque reference and optional ISO date of birth.

Never infer successful verification from HTTP 200 alone. Keep API credentials
on the backend and do not log input numbers, OTPs or raw identity responses.
Legacy manual document-review endpoints remain for existing submissions; they
cannot approve a record that has entered the APITXT workflow.

Documents are stored in `kyc_documents/`, outside all configured media routes,
and downloaded only through an authenticated layer-17 endpoint. Keep this
directory outside web-server static aliases and restrict filesystem access to
the backend service. It is excluded from Git. Storage is access-controlled,
not encrypted by this feature; provision encrypted storage separately if needed.
