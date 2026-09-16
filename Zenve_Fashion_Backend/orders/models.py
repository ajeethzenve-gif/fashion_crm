import uuid
from decimal import Decimal
from django.db import models
from django.core.validators import MinValueValidator


class Order(models.Model):
    class OrderStatus(models.TextChoices):
        PLACED = "PLACED", "Placed"
        CONFIRMED = "CONFIRMED", "Confirmed"
        PACKED = "PACKED", "Packed"
        SHIPPED = "SHIPPED", "Shipped"
        OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY", "Out for Delivery"
        DELIVERED = "DELIVERED", "Delivered"
        CANCELLED = "CANCELLED", "Cancelled"

    order_number = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True,
        verbose_name="Order Number"
    )

    customer_name = models.CharField(
        max_length=255,
        default="Guest Customer",
        verbose_name="Customer Name"
    )

    customer_email = models.EmailField(
        blank=True,
        null=True,
        verbose_name="Customer Email"
    )

    customer_phone = models.CharField(
        max_length=20,
        blank=True,
        null=True,
        verbose_name="Customer Phone"
    )

    delivery_pincode = models.CharField(
        max_length=10,
        default="400001",
        verbose_name="Delivery Pincode"
    )

    delivery_address = models.TextField(
        blank=True,
        null=True,
        verbose_name="Delivery Address"
    )

    status = models.CharField(
        max_length=30,
        choices=OrderStatus.choices,
        default=OrderStatus.PLACED,
        db_index=True,
        verbose_name="Order Status"
    )

    total_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Total Amount"
    )

    is_fast_delivery = models.BooleanField(
        default=False,
        verbose_name="Fast Delivery (60 Min)"
    )

    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Order Notes"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created At"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated At"
    )

    class Meta:
        db_table = "orders_order"
        ordering = ["-created_at"]
        verbose_name = "Order"
        verbose_name_plural = "Orders"

    def __str__(self):
        return f"{self.order_number} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.order_number:
            self.order_number = f"ZNV-ORD-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    @property
    def is_open(self): 
        return self.status not in [self.OrderStatus.DELIVERED, self.OrderStatus.CANCELLED]

    @property
    def can_cancel(self):
        return self.status in [
            self.OrderStatus.PLACED,
            self.OrderStatus.CONFIRMED,
            self.OrderStatus.PACKED,
        ]


class OrderItem(models.Model):
    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="items",
        verbose_name="Order"
    )

    product = models.ForeignKey(
        "products.Product",
        on_delete=models.SET_NULL,
        related_name="order_items",
        null=True,
        blank=True,
        verbose_name="Product"
    )

    product_name = models.CharField(
        max_length=255,
        verbose_name="Product Name"
    )

    sku = models.CharField(
        max_length=100,
        verbose_name="SKU"
    )

    brand_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name="Brand Name"
    )

    colour = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Colour"
    )

    size = models.CharField(
        max_length=50,
        blank=True,
        null=True,
        verbose_name="Size"
    )

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="Quantity"
    )

    unit_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Unit Price"
    )

    total_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Total Price"
    )

    class Meta:
        db_table = "orders_order_item"
        verbose_name = "Order Item"
        verbose_name_plural = "Order Items"

    def __str__(self):
        return f"{self.product_name} x {self.quantity} ({self.order.order_number})"

    def save(self, *args, **kwargs):
        if not self.total_price:
            self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class ReturnRequest(models.Model):
    class ReturnStatus(models.TextChoices):
        REQUESTED = "REQUESTED", "Requested"
        PICKUP_SCHEDULED = "PICKUP_SCHEDULED", "Pickup Scheduled"
        RECEIVED = "RECEIVED", "Received at Warehouse"
        INSPECTED_PASSED = "INSPECTED_PASSED", "Inspected - Passed"
        INSPECTED_FAILED = "INSPECTED_FAILED", "Inspected - Failed QC"
        REFUNDED = "REFUNDED", "Refunded"
        REJECTED = "REJECTED", "Rejected"

    class ReturnReason(models.TextChoices):
        SIZE_FIT = "SIZE_FIT", "Size / Fit Issue"
        DEFECTIVE = "DEFECTIVE", "Defective / Damaged Item"
        WRONG_ITEM = "WRONG_ITEM", "Wrong Item Delivered"
        QUALITY_ISSUE = "QUALITY_ISSUE", "Quality Not as Expected"
        NOT_NEEDED = "NOT_NEEDED", "No Longer Needed"
        OTHER = "OTHER", "Other"

    return_number = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True,
        verbose_name="Return Number"
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="returns",
        verbose_name="Order"
    )

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="returns",
        verbose_name="Order Item"
    )

    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        verbose_name="Returned Quantity"
    )

    reason = models.CharField(
        max_length=50,
        choices=ReturnReason.choices,
        default=ReturnReason.SIZE_FIT,
        verbose_name="Reason for Return"
    )

    status = models.CharField(
        max_length=30,
        choices=ReturnStatus.choices,
        default=ReturnStatus.REQUESTED,
        db_index=True,
        verbose_name="Return Status"
    )

    refund_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        verbose_name="Refund Amount"
    )

    pickup_pincode = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name="Pickup Pincode"
    )

    pickup_address = models.TextField(
        blank=True,
        null=True,
        verbose_name="Pickup Address"
    )

    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Customer / Return Notes"
    )

    inspection_notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Inspection / QC Notes"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created At"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated At"
    )

    class Meta:
        db_table = "orders_return_request"
        ordering = ["-created_at"]
        verbose_name = "Return Request"
        verbose_name_plural = "Return Requests"

    def __str__(self):
        return f"{self.return_number} - {self.status}"

    def save(self, *args, **kwargs):
        if not self.return_number:
            self.return_number = f"ZNV-RTN-{uuid.uuid4().hex[:8].upper()}"
        if not self.refund_amount and self.order_item:
            self.refund_amount = self.order_item.unit_price * self.quantity
        if not self.pickup_pincode and self.order:
            self.pickup_pincode = self.order.delivery_pincode
        if not self.pickup_address and self.order:
            self.pickup_address = self.order.delivery_address
        super().save(*args, **kwargs)


class Settlement(models.Model):
    class SettlementStatus(models.TextChoices):
        PENDING = "PENDING", "Pending Approval"
        APPROVED = "APPROVED", "Approved"
        PAID = "PAID", "Paid"
        RECONCILED = "RECONCILED", "Reconciled"
        REVERSED = "REVERSED", "Reversed by Return"

    settlement_number = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        blank=True,
        verbose_name="Settlement Number"
    )

    order = models.ForeignKey(
        Order,
        on_delete=models.CASCADE,
        related_name="settlements",
        verbose_name="Order"
    )

    order_item = models.ForeignKey(
        OrderItem,
        on_delete=models.CASCADE,
        related_name="settlements",
        verbose_name="Order Item"
    )

    designer = models.ForeignKey(
        "designers.Designer",
        on_delete=models.CASCADE,
        related_name="settlements",
        verbose_name="Designer"
    )

    return_request = models.ForeignKey(
        "orders.ReturnRequest",
        on_delete=models.SET_NULL,
        related_name="reversal_settlements",
        null=True,
        blank=True,
        verbose_name="Associated Return"
    )

    is_reversal = models.BooleanField(
        default=False,
        verbose_name="Is Reversal"
    )

    gmv = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Gross Merchandise Value (GMV)"
    )

    take_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal("15.00"),
        verbose_name="Take Rate (%)"
    )

    commission_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Zenve Commission"
    )

    tax_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Tax (GST)"
    )

    payout_amount = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Payable to Designer"
    )

    status = models.CharField(
        max_length=30,
        choices=SettlementStatus.choices,
        default=SettlementStatus.PENDING,
        db_index=True,
        verbose_name="Settlement Status"
    )

    payout_reference = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name="Payout Reference / UTR"
    )

    paid_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Paid At"
    )

    reconciled_at = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name="Reconciled At"
    )

    notes = models.TextField(
        blank=True,
        null=True,
        verbose_name="Settlement Notes"
    )

    created_at = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Created At"
    )

    updated_at = models.DateTimeField(
        auto_now=True,
        verbose_name="Updated At"
    )

    class Meta:
        db_table = "orders_settlement"
        ordering = ["-created_at"]
        verbose_name = "Settlement"
        verbose_name_plural = "Settlements"

    def __str__(self):
        return f"{self.settlement_number} - {self.designer.brand_name} ({self.status})"

    def save(self, *args, **kwargs):
        if not self.settlement_number:
            prefix = "ZNV-REV" if self.is_reversal else "ZNV-STL"
            self.settlement_number = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

        if not self.commission_amount:
            self.commission_amount = (self.gmv * self.take_rate) / Decimal("100")

        if not self.payout_amount:
            self.payout_amount = self.gmv - self.commission_amount - self.tax_amount

        super().save(*args, **kwargs)

