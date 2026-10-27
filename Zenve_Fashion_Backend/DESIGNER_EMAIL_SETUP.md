# Designer welcome and order emails

Welcome email and SMS messages are queued when a designer is created, explaining that review/approval is pending. Approval email and SMS messages include the login URL, username, registered-mobile OTP option and the generated initial password only if it still matches the account. A changed password is never reset or exposed. One order email is sent per designer, containing only that designer's catalogue products, SKU, quantities and amounts. Customer names, contact details, addresses, buyer-supplied item snapshots and other designers' items are excluded. Generated initial credentials are reconstructed when sending approval messages; message bodies/passwords are not stored in the delivery table.

## Mailbox setup

`https://host.netherlandsservers` is not sufficient to configure SMTP. Ask the hosting provider for the complete SMTP hostname, outgoing port and TLS/SSL instructions. The SMTP host must be a hostname, without `https://` or a path.

Add these values to the backend `.env` file (replace placeholders locally; never commit mailbox passwords):

```dotenv
EMAIL_HOST=mail.zenvevet.com
EMAIL_PORT=587
EMAIL_USE_TLS=true
EMAIL_USE_SSL=false
EMAIL_HOST_USER=zenvefashion-noreply@zenvevet.com
EMAIL_HOST_PASSWORD=YOUR_MAILBOX_PASSWORD
DESIGNER_FROM_EMAIL=zenvefashion-noreply@zenvevet.com
EMAIL_TIMEOUT=10
DESIGNER_EMAIL_ENABLED=true
DESIGNER_EMAIL_LOGIN_URL=https://zenvefashioncrm.zenvevet.com/designer-login/
```

For provider port 465, use `EMAIL_USE_SSL=true` and `EMAIL_USE_TLS=false`. Never enable both. Keep delivery disabled until correct settings are installed. Existing password-reset emails use the same SMTP connection settings. DESIGNER_FROM_EMAIL controls only the designer email sender.

Apply the migration before restarting the backend:

```powershell
python manage.py migrate
```

After configuring SMTP, new designers, approval transitions and new order items trigger delivery automatically after the transaction commits. Failed messages remain pending and do not roll back approval or orders. Retry pending messages with:

```powershell
python manage.py send_designer_emails
```

Run this retry command using your existing hosting job scheduler if automatic retries are needed. Inspect `DesignerEmail.status`, `attempts` and `last_error` in the database; error descriptions intentionally contain only the exception type, never credentials or message bodies. As with SMTP generally, a process crash after provider acceptance but before recording SENT can cause a duplicate on retry.

Order emails depend on order items being created through this Django application. Writes directly to the database or another site's database do not trigger Django signals. Order creation must be transactional so all items exist before notification delivery. The order serializer now enforces this. Existing designers/orders are not emailed automatically unless a new approval save or order-item creation triggers the flow.

No real delivery has been verified until the correct SMTP settings are supplied and a test message is accepted by the provider. Configure the sender domain's SPF/DKIM using the mail provider's instructions for deliverability.


## Welcome and approval SMS

APITXT's published SMS endpoint is `https://apitxt.com/api/sendMsg` (separate from login OTP). Supply these settings in the backend `.env` after approving matching message templates with your provider:

```dotenv
DESIGNER_SMS_ENABLED=true
DESIGNER_SMS_SENDER_ID=YOUR_APPROVED_SENDER
DESIGNER_SMS_PE_ID=YOUR_ENTITY_ID
DESIGNER_SMS_ROUTE=4
DESIGNER_SMS_WELCOME_TEMPLATE_ID=YOUR_WELCOME_TEMPLATE_ID
DESIGNER_SMS_APPROVAL_TEMPLATE_ID=YOUR_APPROVAL_TEMPLATE_ID
```

`SMS_AUTH_KEY` or `SMS_API_KEY` supplies authentication. No keys are placed in the frontend. `DESIGNER_SMS_WELCOME_TEXT` and `DESIGNER_SMS_APPROVAL_TEXT` can override message text so it exactly matches the approved provider templates. Supported variables: welcome `{name}`, `{login_url}`; approval also `{username}`, `{password}`, `{mobile}`. Do not reuse the login OTP endpoint or OTP template for these messages. The existing retry command now retries both channels independently, without resending successful deliveries.

New migration: `0016_designeremail_channel_alter_designeremail_kind`. Run `python manage.py migrate` before restarting the backend. Email and SMS delivery remain disabled by default. No production message was sent during tests.


## KYC-start emails

Starting verification in Layer 17 now creates the portal request and queues a PAN-only KYC email. The email includes a signed, single-submission link valid for 48 hours. Opening the same active verification again does not send another email. The Send KYC notification action generates a new request/link and email; the earlier link stops working. Retries do not send outdated or already submitted requests. SMS remains disabled until templates are approved.

Apply migration `0017_alter_designeremail_kind` for the KYC delivery type. Creation, approval and order emails remain automatic after transaction commit.
