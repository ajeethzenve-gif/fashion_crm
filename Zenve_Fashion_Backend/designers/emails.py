"""Designer mail uses an explicit allowlist. Never render customer/order snapshots."""
from decimal import Decimal
from django.conf import settings
from django.core.mail import EmailMessage
from django.core.validators import validate_email
from django.db import transaction
from django.utils import timezone
from .models import DesignerEmail


def queue_onboarding(designer_id, kind):
    for channel in ("EMAIL", "SMS"):
        job, _ = DesignerEmail.objects.get_or_create(event_key=f"{kind.lower()}:{designer_id}:{channel.lower()}", defaults={"designer_id": designer_id, "kind": kind, "channel": channel})
        deliver_email(job.pk)


def queue_welcome(designer_id):
    queue_onboarding(designer_id, "WELCOME")


def queue_approval(designer_id):
    queue_onboarding(designer_id, "APPROVAL")


def queue_kyc_request(record_id, nonce):
    from .models import DesignerKYC
    record = DesignerKYC.objects.get(pk=record_id)
    job, _ = DesignerEmail.objects.get_or_create(event_key=f"kyc:{record_id}:{nonce}", defaults={"designer_id": record.designer_id, "kind": "KYC", "channel": "EMAIL"})
    deliver_email(job.pk)


def login_details(designer):
    import re
    from .authentication import normalize_phone
    user = designer.user
    if not user:
        return None
    candidate = f"{re.sub(r'[^a-z0-9]', '', designer.designer_name.lower()) or 'designer'}@zf{normalize_phone(designer.phone)[-4:]}"
    return {"name": designer.owner_name or designer.designer_name, "username": user.username,
            "password": candidate if user.check_password(candidate) else "Use your current password",
            "mobile": designer.phone, "login_url": settings.DESIGNER_EMAIL_LOGIN_URL}


def onboarding_sms(job):
    designer = job.designer
    values = {"name": designer.owner_name or designer.designer_name, "login_url": settings.DESIGNER_EMAIL_LOGIN_URL}
    if job.kind == "APPROVAL":
        from .authentication import LOGIN_STAGES
        if designer.stage not in LOGIN_STAGES or not designer.is_active:
            return None
        details = login_details(designer)
        if not details:
            return None
        values.update(details)
    template = getattr(settings, f"DESIGNER_SMS_{job.kind}_TEXT")
    return template.format(**values)


def queue_order(order_id):
    from orders.models import Order
    order = Order.objects.filter(pk=order_id).first()
    if not order or order.order_status.lower() in ("cancelled", "failed"):
        return
    designer_ids = set()
    for item in order.items.all():
        product = item.product
        if product and product.designer_id:
            designer_ids.add(product.designer_id)
    for designer_id in designer_ids:
        job, _ = DesignerEmail.objects.get_or_create(event_key=f"order:{order_id}:designer:{designer_id}", defaults={"designer_id": designer_id, "order_id": order_id, "kind": "ORDER"})
        deliver_email(job.pk)


def email_content(job):
    designer = job.designer
    login_url = settings.DESIGNER_EMAIL_LOGIN_URL
    greeting = f"Hello {designer.owner_name or designer.designer_name},"
    if job.kind == "KYC":
        from django.core import signing
        from .models import DesignerKYC
        from .kyc_requests import SALT
        from urllib.parse import urlsplit, urlunsplit
        _, record_id, nonce = job.event_key.split(":", 2)
        record = DesignerKYC.objects.filter(pk=record_id, designer=designer).first()
        invitation = record.api_checks.get("details_request", {}) if record else {}
        if not record or designer.kyc_status == "VERIFIED" or invitation.get("nonce") != nonce or invitation.get("submitted_at"):
            return None
        token = signing.dumps({"id": record.pk, "nonce": nonce}, salt=SALT)
        parsed = urlsplit(login_url)
        link = urlunsplit((parsed.scheme, parsed.netloc, "/designer-kyc-details", "", token))
        return "Your Zenve Fashion PAN KYC verification has started", f"{greeting}\n\nOur team has started your designer KYC verification. Please provide your name exactly as printed on PAN, date of birth and PAN number using this secure link:\n{link}\n\nThis link is valid for 48 hours and accepts one submission. Do not forward it. No Aadhaar number or OTP is required.\n\nOur team will verify your PAN details and notify you after review. Product uploads become available after KYC approval.\n\nDesigner login: {login_url}\n\nZenve Fashion Team"
    if job.kind == "WELCOME":
        return "Welcome to Zenve Fashion - registration received", f"{greeting}\n\nWelcome to Zenve Fashion! Your designer registration has been received. Our team will review your details and notify you after approval. Login becomes available once approved.\n\nZenve Fashion Team"
    if job.kind == "APPROVAL":
        from .authentication import LOGIN_STAGES
        if designer.stage not in LOGIN_STAGES or not designer.is_active:
            return None
        details = login_details(designer)
        if not details:
            return None
        return "Your Zenve Fashion designer account is approved", f"{greeting}\n\nYour designer account is approved and ready to use.\n\nLogin: {login_url}\nUsername: {details['username']}\nPassword: {details['password']}\n\nYou can also sign in using your registered mobile number {details['mobile']} and login OTP.\n\nZenve Fashion Team"
    if not job.order or job.order.order_status.lower() == "cancelled":
        return None
    rows = []
    total = Decimal("0.00")
    for item in job.order.items.all():
        product = item.product
        if not product or product.designer_id != designer.pk:
            continue
        amount = item.price * item.quantity
        total += amount
        # Product data comes from our catalogue, never the buyer-supplied snapshot.
        rows.append(f"{product.sku} | {product.product_name} | Quantity: {item.quantity} | Amount: INR {amount:.2f}")
    if not rows:
        return None
    body = f"{greeting}\n\nAn order has been placed for your products.\nOrder reference: {job.order.order_number}\n\n" + "\n".join(rows)
    body += f"\n\nYour product total: INR {total:.2f}\nView your products in the designer portal: {login_url}\n\nZenve Fashion Team"
    return "New order for your Zenve Fashion products", body


@transaction.atomic
def deliver_email(job_id):
    job = DesignerEmail.objects.select_for_update().select_related("designer", "order").get(pk=job_id)
    if job.status == "SENT" or not (settings.DESIGNER_SMS_ENABLED if job.channel == "SMS" else settings.DESIGNER_EMAIL_ENABLED):
        return False
    job.attempts += 1
    try:
        if job.channel == "SMS":
            from accounts.sms import send_designer_message
            from .authentication import normalize_phone
            message = onboarding_sms(job)
            if not message:
                raise ValueError("Account is not eligible")
            send_designer_message(normalize_phone(job.designer.phone), message, job.kind)
            sent = 1
            content = None
        else:
            validate_email(job.designer.email)
            content = email_content(job)
        if job.channel == "EMAIL" and not content:
            job.last_error = "No eligible products or cancelled order"
            job.save(update_fields=["attempts", "last_error"])
            return False
        if job.channel == "EMAIL":
            subject, body = content
            sent = EmailMessage(subject=subject, body=body, from_email=settings.DESIGNER_FROM_EMAIL, to=[job.designer.email]).send(fail_silently=False)
        if sent != 1:
            raise RuntimeError("Email not accepted")
    except Exception as exc:
        # Do not store SMTP errors containing mailbox credentials or message content.
        job.last_error = type(exc).__name__[:100]
        job.save(update_fields=["attempts", "last_error"])
        return False
    job.status = "SENT"
    job.sent_at = timezone.now()
    job.last_error = ""
    job.save(update_fields=["attempts", "status", "sent_at", "last_error"])
    return True
