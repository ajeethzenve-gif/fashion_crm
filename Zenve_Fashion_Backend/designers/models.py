from decimal import Decimal
from django.db import models
from django.core.validators import (
    MinValueValidator,
    MaxValueValidator,
    RegexValidator,
)


class Designer(models.Model):
    # =========================================================
    # ONBOARDING / PIPELINE STAGES
    # =========================================================

    class Stage(models.TextChoices):
        LEAD = "LEAD", "Lead"
        QUALIFIED = "QUALIFIED", "Qualified"
        PORTFOLIO = "PORTFOLIO", "Portfolio"
        REVIEW = "REVIEW", "Review"
        APPROVED = "APPROVED", "Approved"
        CONTRACT = "CONTRACT", "Contract"
        SIGNED = "SIGNED", "Signed"
        LIVE = "LIVE", "Live"
        ACTIVE = "ACTIVE", "Active"
        REJECTED = "REJECTED", "Rejected"
        INACTIVE = "INACTIVE", "Inactive"

    # =========================================================
    # DESIGNER TIER
    # =========================================================

    class Tier(models.TextChoices):
        CORE = "CORE", "Core"
        PREMIUM = "PREMIUM", "Premium"
        EMERGING = "EMERGING", "Emerging"

    # =========================================================
    # KYC STATUS
    # =========================================================

    class KYCStatus(models.TextChoices):
        PENDING = "PENDING", "Pending"
        VERIFIED = "VERIFIED", "Verified"
        REJECTED = "REJECTED", "Rejected"

    # =========================================================
    # BASIC DESIGNER INFORMATION
    # =========================================================

    designer_code = models.CharField(
        max_length=30,
        unique=True,
        db_index=True,
        verbose_name="Designer Code",
        help_text="Example: DSG-001",
    )

    designer_name = models.CharField(
        max_length=255,
        verbose_name="Designer Name",
    )

    brand_name = models.CharField(
        max_length=255,
        verbose_name="Brand",
    )

    # =========================================================
    # OWNER / CONTACT DETAILS
    # =========================================================

    owner_name = models.CharField(
        max_length=255,
        verbose_name="Owner Name",
    )

    email = models.EmailField(
        verbose_name="Contact Email",
    )

    phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Contact Phone",
    )

    # =========================================================
    # LOCATION
    # =========================================================

    city = models.CharField(
        max_length=100,
        verbose_name="City",
    )

    state = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="State",
    )

    country = models.CharField(
        max_length=100,
        default="India",
        verbose_name="Country",
    )

    # =========================================================
    # DESIGNER CATEGORY
    # =========================================================

    primary_category = models.CharField(
        max_length=150,
        verbose_name="Primary Category",
        help_text="Example: Pet Occasion Wear",
    )

    # =========================================================
    # BUSINESS / COMMERCIAL DETAILS
    # =========================================================

    tier = models.CharField(
        max_length=30,
        choices=Tier.choices,
        default=Tier.EMERGING,
        verbose_name="Designer Tier",
    )

    take_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=0,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
        verbose_name="Take Rate (%)",
        help_text="Platform commission percentage.",
    )

    # =========================================================
    # GST
    # =========================================================

    gst_number = models.CharField(
        max_length=15,
        blank=True,
        null=True,
        unique=False,
        verbose_name="GST Number",
        validators=[
            RegexValidator(
                regex=r"^[0-9A-Z]{15}$",
                message="Enter a valid 15-character GST number.",
            )
        ],
    )

    # =========================================================
    # KYC
    # =========================================================

    kyc_status = models.CharField(
        max_length=20,
        choices=KYCStatus.choices,
        default=KYCStatus.PENDING,
        db_index=True,
        verbose_name="KYC Status",
    )

    kyc_verified_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="KYC Verified At",
    )

    # =========================================================
    # CONTRACT
    # =========================================================

    contract_start_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Contract Start Date",
    )

    contract_end_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Contract End Date",
    )

    contract_signed = models.BooleanField(
        default=False,
        verbose_name="Contract Signed",
    )

    # =========================================================
    # DESIGNER PIPELINE STATUS
    # =========================================================

    stage = models.CharField(
        max_length=30,
        choices=Stage.choices,
        default=Stage.LEAD,
        db_index=True,
        verbose_name="Pipeline Stage",
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
        verbose_name="Active",
    )

    # =========================================================
    # CRM / PIPELINE SALES TRACKING
    # =========================================================

    lead_source = models.CharField(
        max_length=100,
        default="Referral",
        blank=True,
        verbose_name="Lead Source",
        help_text="Example: Referral, Instagram, Trade show, Direct outreach, Inbound",
    )

    sales_owner = models.CharField(
        max_length=150,
        default="Nisha Kapoor",
        blank=True,
        verbose_name="Sales Owner",
        help_text="Internal sales representative assigned to this designer.",
    )

    next_followup_date = models.DateField(
        blank=True,
        null=True,
        verbose_name="Next Follow-up Date",
    )

    acquisition_cost = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("8000.00"),
        verbose_name="Acquisition Cost (CAC)",
    )

    renewal_likelihood = models.IntegerField(
        default=50,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
        verbose_name="Renewal Likelihood (%)",
    )

    lost_reason = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Lost Reason",
        help_text="Reason when a lead or contract is marked lost.",
    )

    health_score = models.IntegerField(
        default=75,
        validators=[
            MinValueValidator(0),
            MaxValueValidator(100),
        ],
        verbose_name="Health Score (0-100)",
    )

    follow_up_tasks = models.JSONField(
        default=list,
        blank=True,
        verbose_name="Follow-up Tasks",
        help_text="List of tasks: [{'id': 1, 'title': '...', 'due_date': 'YYYY-MM-DD', 'completed': False}]",
    )

    monthly_gmv = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Monthly GMV",
    )

    lifetime_gmv = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Lifetime GMV",
    )

    sku_productivity = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="SKU Productivity",
    )

    # =========================================================
    # PROFILE
    # =========================================================

    logo = models.ImageField(
        upload_to="designers/logos/",
        blank=True,
        null=True,
        verbose_name="Brand Logo",
    )

    profile_image = models.ImageField(
        upload_to="designers/profiles/",
        blank=True,
        null=True,
        verbose_name="Profile Image",
    )

    description = models.TextField(
        blank=True,
        null=True,
        verbose_name="Designer Description",
    )

    website = models.URLField(
        blank=True,
        null=True,
        verbose_name="Website",
    )

    # =========================================================
    # SOCIAL MEDIA
    # =========================================================

    instagram_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="Instagram URL",
    )

    facebook_url = models.URLField(
        blank=True,
        null=True,
        verbose_name="Facebook URL",
    )

    # =========================================================
    # AUDIT FIELDS
    # =========================================================

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    # =========================================================
    # META
    # =========================================================

    class Meta:
        db_table = "designer"

        ordering = ["-created_at"]

        indexes = [
            models.Index(fields=["designer_code"]),
            models.Index(fields=["brand_name"]),
            models.Index(fields=["city"]),
            models.Index(fields=["primary_category"]),
            models.Index(fields=["stage"]),
            models.Index(fields=["kyc_status"]),
            models.Index(fields=["tier"]),
            models.Index(fields=["is_active"]),
        ]

        verbose_name = "Designer"
        verbose_name_plural = "Designers"

    # =========================================================
    # STRING REPRESENTATION
    # =========================================================

    def __str__(self):
        return f"{self.brand_name} ({self.designer_code})"

    # =========================================================
    # PROPERTIES
    # =========================================================

    @property
    def is_kyc_verified(self):
        return self.kyc_status == self.KYCStatus.VERIFIED

    @property
    def is_live(self):
        return self.stage in [
            self.Stage.LIVE,
            self.Stage.ACTIVE,
        ]

    @property
    def contract_is_active(self):
        from django.utils import timezone

        if not self.contract_end_date:
            return False

        return self.contract_end_date >= timezone.localdate()

    @property
    def designer_ltv(self):
        """Designer LTV = Lifetime GMV * (take_rate / 100)"""
        gmv = self.lifetime_gmv or Decimal("0.00")
        tr = self.take_rate or Decimal("0.00")
        return round(gmv * (tr / Decimal("100")), 2)

    @property
    def designer_cac(self):
        return self.acquisition_cost or Decimal("0.00")

    @property
    def ltv_cac_ratio(self):
        cac = self.acquisition_cost or Decimal("0.00")
        if cac <= 0:
            return "0×"
        ratio = float(self.designer_ltv / cac)
        return f"{ratio:.2f}×" if ratio > 0 else "0×"

    @property
    def effective_sku_productivity(self):
        if self.sku_productivity and self.sku_productivity > Decimal("0.00"):
            return self.sku_productivity
        try:
            count = self.products.count()
        except Exception:
            count = 0
        if count > 0:
            return round((self.lifetime_gmv or Decimal("0.00")) / Decimal(count), 2)
        return self.lifetime_gmv or Decimal("0.00")

    @property
    def overdue_tasks_count(self):
        from django.utils import timezone
        today_str = timezone.localdate().isoformat()
        tasks = self.follow_up_tasks or []
        count = 0
        for t in tasks:
            if isinstance(t, dict) and not t.get("completed"):
                due = t.get("due_date")
                if due and due < today_str:
                    count += 1
        return count


class DesignerAccountDetails(models.Model):
    """
    Bank and payout details for a designer.

    One designer can have only one primary account-details record.
    """

    designer = models.OneToOneField(
        Designer,
        on_delete=models.CASCADE,
        related_name="account_details",
        verbose_name="Designer",
    )

    account_holder_name = models.CharField(
        max_length=255,
        verbose_name="Account Holder Name",
    )

    account_number = models.CharField(
        max_length=18,
        validators=[
            RegexValidator(
                regex=r"^[0-9]{9,18}$",
                message="Account number must contain 9 to 18 digits.",
            )
        ],
        verbose_name="Bank Account Number",
    )

    ifsc_code = models.CharField(
        max_length=11,
        validators=[
            RegexValidator(
                regex=r"^[A-Z]{4}0[A-Z0-9]{6}$",
                message="Enter a valid 11-character IFSC code.",
            )
        ],
        verbose_name="IFSC Code",
    )

    pan_number = models.CharField(
        max_length=10,
        validators=[
            RegexValidator(
                regex=r"^[A-Z]{5}[0-9]{4}[A-Z]$",
                message="Enter a valid 10-character PAN number.",
            )
        ],
        verbose_name="PAN Number",
    )

    is_verified = models.BooleanField(
        default=False,
        verbose_name="Account Verified",
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "designer_account_details"
        verbose_name = "Designer Account Details"
        verbose_name_plural = "Designer Account Details"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"{self.designer.brand_name} - {self.account_holder_name}"