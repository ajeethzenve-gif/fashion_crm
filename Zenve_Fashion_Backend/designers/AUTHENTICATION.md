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
