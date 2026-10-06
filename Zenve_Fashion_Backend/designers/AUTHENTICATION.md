Designer approval creates a dedicated auth_user account, links it to the designer,
and creates or updates UserRole with the Designer role. New accounts have no usable
password and sign in through mobile OTP. Repeated approval reuses the linked user.
Normal model saves, API updates, and admin saves trigger provisioning; bulk queryset
updates bypass model save and should use the provisioning command afterward.

Setup:

1. Run `python manage.py migrate`.
2. Run `python manage.py provision_designer_users` for existing approved designers.
3. The default delivery function is accounts.sms.send_designer_otp. Configure
   SMS_API_KEY and SMS_API_URL in the backend .env file. The request body is built
   automatically with authkey, mobile (country code plus digits), otp, sender, and route.
   SMS_SENDER_ID and SMS_ROUTE supply sender and route. SMS_AUTH_KEY supplies
   authkey when configured; otherwise the existing SMS_API_KEY is used. No separate payload environment setting is required.
   The adapter uses HTTPS POST JSON with authkey in the body and header and accepts
   status=200, status=success, or type=success responses. Recipient-free endpoint
   checks confirmed that APITxT requires authkey and mobile. Live SMS delivery
   has not been verified. Provider rejection messages are shown with secrets redacted. Restart Django after changing settings.
   A custom adapter can be selected through DESIGNER_OTP_SMS_SENDER.

POST /api/designer/send-otp/ with phone_number sends an OTP.
POST /api/designer/verify-otp/ with phone_number and otp returns JWT tokens and
the designer profile. OTPs expire in five minutes, allow five incorrect attempts,
and can be used once. Resends require 30 seconds. Ambiguous mobile numbers, inactive
users/designers, and designers outside approved/contract/signed/live/active stages
cannot log in. SMS credentials and a delivery adapter must be configured before
mobile login can send messages. No demo OTP or fixed passcode is accepted.

Login requires both approval and VERIFIED KYC. The KYC status is checked before
sending an OTP, when verifying it, and on each designer dashboard request.
New vendor records do not receive a login account until approval. Approval creates
the linked user and Designer role even when KYC is still pending.

Members who have Designer CRM layer 01 in their database role can create vendors,
approve them, and verify KYC. Django staff and superusers can also manage onboarding.
Designers cannot approve themselves or change their KYC, and see only their own
record and dashboard. CRM and dashboard requests require login tokens.

After approval, staff can click Send WhatsApp Login Link in the CRM. This opens a
WhatsApp draft addressed to the registered mobile number with /designer-login.
Staff must send the draft in WhatsApp; the application does not claim automatic
delivery. The link grants no access by itself. The designer must use their registered
mobile number and OTP after KYC verification. Copy Login Link uses the same page.

Designer access is restricted to Designer Portal (02), Product Catalogue (03),
and Storefront (06). Migration 0010 sets these permissions for the existing
Designer role; approval also maintains this exact set for new designer accounts.
Other roles retain their configured access. Authenticated designer product lists,
details, changes, and stock requests are scoped to their linked designer account;
request filters cannot grant access to another designer's products.
