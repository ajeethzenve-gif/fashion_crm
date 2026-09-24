from django.db import models


# =========================================================
# COMMON PLAN CHOICES
# =========================================================

class FashionPlan(models.TextChoices):
    SILVER = "SILVER", "Silver"
    GOLD = "GOLD", "Gold"
    PLATINUM = "PLATINUM", "Platinum"
    PALLADIUM = "PALLADIUM", "Palladium"


# =========================================================
# ONLINE FASHION CREDIT
# =========================================================

class OnlineFashionCredit(models.Model):

    plan = models.CharField(
        max_length=20,
        choices=FashionPlan.choices,
        unique=True,
        db_index=True,
    )

    # Number of catalogues included
    catalogue = models.PositiveIntegerField(
        default=0,
    )

    # Number of products included
    products = models.PositiveIntegerField(
        default=0,
    )

    # Credit points given with this plan
    credit_points = models.PositiveBigIntegerField(
        default=0,
    )

    # Points charged for each catalogue
    catalogue_charge_points = models.PositiveIntegerField(
        default=0,
    )

    # Minimum validity / plan days
    min_days = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "online_fashion_credit"
        ordering = ["id"]
        verbose_name = "Online Fashion Credit"
        verbose_name_plural = "Online Fashion Credits"

    def __str__(self):
        return (
            f"{self.get_plan_display()} - "
            f"{self.credit_points} points"
        )


# =========================================================
# OFFLINE FASHION CREDIT
# =========================================================

class OfflineFashionCredit(models.Model):

    plan = models.CharField(
        max_length=20,
        choices=FashionPlan.choices,
        unique=True,
        db_index=True,
    )

    # Current membership price
    membership_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # Old/original price shown with strike-through
    original_membership_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
    )

    # Credit points given for offline plan
    credit_points = models.PositiveBigIntegerField(
        default=0,
    )

    # Included catalogue count
    included_catalogue = models.PositiveIntegerField(
        default=0,
    )

    # Included catalogue per showroom
    per_showroom = models.PositiveIntegerField(
        default=0,
    )

    # Extra catalogue allowance
    extra_catalogue = models.PositiveIntegerField(
        default=0,
    )

    # Extra catalogue / showroom
    extra_per_showroom = models.PositiveIntegerField(
        default=0,
    )

    # Minimum days
    min_days = models.PositiveIntegerField(
        default=0,
    )

    # Average SKU
    average_sku = models.PositiveIntegerField(
        default=0,
    )

    is_active = models.BooleanField(
        default=True,
        db_index=True,
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
    )

    updated_at = models.DateTimeField(
        auto_now=True,
    )

    class Meta:
        db_table = "offline_fashion_credit"
        ordering = ["id"]
        verbose_name = "Offline Fashion Credit"
        verbose_name_plural = "Offline Fashion Credits"

    def __str__(self):
        return (
            f"{self.get_plan_display()} - "
            f"{self.credit_points} points"
        )

    @property
    def savings_amount(self):

        if (
            self.original_membership_price
            >
            self.membership_price
        ):
            return (
                self.original_membership_price
                -
                self.membership_price
            )

        return 0