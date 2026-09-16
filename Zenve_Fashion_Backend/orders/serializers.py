from decimal import Decimal
from rest_framework import serializers
from .models import Order, OrderItem, ReturnRequest, Settlement
from products.models import Product


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.IntegerField(write_only=True, required=False, allow_null=True)
    return_policy = serializers.SerializerMethodField()
    is_returnable = serializers.SerializerMethodField()
    returned_units = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            "id",
            "product",
            "product_id",
            "product_name",
            "sku",
            "brand_name",
            "colour",
            "size",
            "quantity",
            "unit_price",
            "total_price",
            "return_policy",
            "is_returnable",
            "returned_units",
        ]
        read_only_fields = ["id", "total_price", "return_policy", "is_returnable", "returned_units"]

    def get_return_policy(self, obj):
        if obj.product:
            return getattr(obj.product, "return_policy", "RETURNABLE")
        return "RETURNABLE"

    def get_returned_units(self, obj):
        active_returns = obj.returns.exclude(status=ReturnRequest.ReturnStatus.REJECTED)
        return sum(r.quantity for r in active_returns)

    def get_is_returnable(self, obj):
        policy = self.get_return_policy(obj)
        if policy != "RETURNABLE":
            return False
        if obj.order.status != Order.OrderStatus.DELIVERED:
            return False
        return self.get_returned_units(obj) < obj.quantity


class OrderSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(required=False, allow_blank=True)
    items = OrderItemSerializer(many=True, required=False)
    is_open = serializers.ReadOnlyField()
    can_cancel = serializers.ReadOnlyField()

    class Meta:
        model = Order
        fields = [
            "id",
            "order_number",
            "customer_name",
            "customer_email",
            "customer_phone",
            "delivery_pincode",
            "delivery_address",
            "status",
            "total_amount",
            "is_fast_delivery",
            "notes",
            "created_at",
            "updated_at",
            "items",
            "is_open",
            "can_cancel",
        ]
        read_only_fields = [
            "id",
            "created_at",
            "updated_at",
            "is_open",
            "can_cancel",
        ]

    def create(self, validated_data):
        items_data = self.initial_data.get("items", [])
        if "items" in validated_data:
            validated_data.pop("items")

        order = Order.objects.create(**validated_data)
        total_order_amount = Decimal("0.00")

        for item_data in items_data:
            prod_id = item_data.get("product_id") or item_data.get("product")
            product = None
            if prod_id:
                product = Product.objects.filter(pk=prod_id).first()

            p_name = item_data.get("product_name") or (product.product_name if product else "Product")
            p_sku = item_data.get("sku") or (product.sku if product else f"SKU-{order.id}")
            brand = item_data.get("brand_name") or (getattr(product.designer, "brand_name", "") if (product and product.designer) else "")
            color = item_data.get("colour") or (product.colour if product else "")
            size = item_data.get("size") or (product.size if product else "")
            qty = int(item_data.get("quantity", 1))
            unit_price = Decimal(str(item_data.get("unit_price") or (product.selling_price if product else "0.00")))
            item_total = unit_price * qty
            total_order_amount += item_total

            OrderItem.objects.create(
                order=order,
                product=product,
                product_name=p_name,
                sku=p_sku,
                brand_name=brand,
                colour=color,
                size=size,
                quantity=qty,
                unit_price=unit_price,
                total_price=item_total,
            )

            # Atomically reserve stock in inventory
            if product:
                product.reserved_quantity += qty
                product.save()

        order.total_amount = total_order_amount
        order.save()
        return order

    def update(self, instance, validated_data):
        old_status = instance.status
        new_status = validated_data.get("status", old_status)

        for attr, value in validated_data.items():
            if attr != "items":
                setattr(instance, attr, value)
        instance.save()

        # Handle inventory state transitions
        if old_status != new_status:
            for item in instance.items.all():
                product = item.product
                if not product:
                    continue

                qty = item.quantity

                # Shipped: transfer from reserved to in-transit
                if new_status == Order.OrderStatus.SHIPPED and old_status in [
                    Order.OrderStatus.PLACED,
                    Order.OrderStatus.CONFIRMED,
                    Order.OrderStatus.PACKED,
                ]:
                    product.reserved_quantity = max(0, product.reserved_quantity - qty)
                    product.in_transit_quantity += qty
                    product.save()

                # Delivered: deduct from in-transit and physical inventory
                elif new_status == Order.OrderStatus.DELIVERED:
                    if old_status == Order.OrderStatus.SHIPPED or old_status == Order.OrderStatus.OUT_FOR_DELIVERY:
                        product.in_transit_quantity = max(0, product.in_transit_quantity - qty)
                    else:
                        product.reserved_quantity = max(0, product.reserved_quantity - qty)
                    product.inventory_quantity = max(0, product.inventory_quantity - qty)
                    product.save()

                # Cancelled before dispatch: unreserve inventory
                elif new_status == Order.OrderStatus.CANCELLED and old_status in [
                    Order.OrderStatus.PLACED,
                    Order.OrderStatus.CONFIRMED,
                    Order.OrderStatus.PACKED,
                ]:
                    product.reserved_quantity = max(0, product.reserved_quantity - qty)
                    product.save()

            # Automatic Settlement Generation upon Delivery
            if new_status == Order.OrderStatus.DELIVERED:
                for item in instance.items.all():
                    if not item.settlements.filter(is_reversal=False).exists():
                        designer = (item.product.designer if (item.product and item.product.designer) else None)
                        if not designer:
                            from designers.models import Designer
                            designer = Designer.objects.first()

                        if designer:
                            take_rate = getattr(designer, "take_rate", Decimal("15.00")) or Decimal("15.00")
                            gmv = item.total_price
                            commission = (gmv * take_rate) / Decimal("100")
                            payout = gmv - commission
                            Settlement.objects.create(
                                order=instance,
                                order_item=item,
                                designer=designer,
                                gmv=gmv,
                                take_rate=take_rate,
                                commission_amount=commission,
                                payout_amount=payout,
                                status=Settlement.SettlementStatus.PENDING,
                            )

        return instance

    def to_representation(self, instance):
        data = super().to_representation(instance)
        steps = [
            Order.OrderStatus.PLACED,
            Order.OrderStatus.CONFIRMED,
            Order.OrderStatus.PACKED,
            Order.OrderStatus.SHIPPED,
            Order.OrderStatus.OUT_FOR_DELIVERY,
            Order.OrderStatus.DELIVERED,
        ]
        timeline = []
        created_iso = instance.created_at.isoformat() if instance.created_at else ""
        updated_iso = instance.updated_at.isoformat() if instance.updated_at else created_iso

        if instance.status == Order.OrderStatus.CANCELLED:
            timeline.append({"status": "PLACED", "at": created_iso})
            timeline.append({"status": "CANCELLED", "at": updated_iso})
        else:
            try:
                curr_idx = steps.index(instance.status)
                for i in range(curr_idx + 1):
                    timeline.append({
                        "status": steps[i],
                        "at": created_iso if i == 0 else updated_iso,
                    })
            except ValueError:
                timeline.append({"status": instance.status, "at": updated_iso})

        data["timeline"] = timeline
        data["amount"] = float(instance.total_amount)
        data["customer"] = instance.customer_name
        data["pincode"] = instance.delivery_pincode
        data["placedAt"] = created_iso
        data["fast"] = instance.is_fast_delivery
        data["eta"] = "60 minutes" if instance.is_fast_delivery else "≤ 3 working days"
        data["lines"] = [
            {
                "skuId": item.sku or f"SKU-{item.id}",
                "name": item.product_name,
                "qty": item.quantity,
                "price": float(item.unit_price),
            }
            for item in instance.items.all()
        ]
        return data



class ReturnRequestSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    customer_name = serializers.CharField(source="order.customer_name", read_only=True)
    delivery_pincode = serializers.CharField(source="order.delivery_pincode", read_only=True)
    product_name = serializers.CharField(source="order_item.product_name", read_only=True)
    sku = serializers.CharField(source="order_item.sku", read_only=True)
    colour = serializers.CharField(source="order_item.colour", read_only=True)
    size = serializers.CharField(source="order_item.size", read_only=True)
    unit_price = serializers.DecimalField(source="order_item.unit_price", max_digits=10, decimal_places=2, read_only=True)
    return_policy = serializers.SerializerMethodField()

    class Meta:
        model = ReturnRequest
        fields = [
            "id",
            "return_number",
            "order",
            "order_number",
            "order_item",
            "customer_name",
            "delivery_pincode",
            "product_name",
            "sku",
            "colour",
            "size",
            "unit_price",
            "return_policy",
            "quantity",
            "reason",
            "status",
            "refund_amount",
            "pickup_pincode",
            "pickup_address",
            "notes",
            "inspection_notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "return_number",
            "order_number",
            "customer_name",
            "delivery_pincode",
            "product_name",
            "sku",
            "colour",
            "size",
            "unit_price",
            "return_policy",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["orderId"] = instance.order.order_number if instance.order else ""
        data["skuId"] = instance.order_item.sku if instance.order_item else ""
        data["skuName"] = instance.order_item.product_name if instance.order_item else ""
        data["refund"] = float(instance.refund_amount) if instance.refund_amount else 0.0

        st = instance.status
        if st == "INSPECTED_PASSED":
            data["normalized_status"] = "PASSED"
        elif st == "INSPECTED_FAILED":
            data["normalized_status"] = "FAILED"
        else:
            data["normalized_status"] = st

        data["formatted_refund"] = f"₹{int(instance.refund_amount):,}" if instance.refund_amount else "₹0"
        return data

    def to_internal_value(self, data):
        data_copy = data.copy() if hasattr(data, "copy") else dict(data)
        if "orderId" in data_copy and "order" not in data_copy:
            data_copy["order"] = data_copy["orderId"]
        if "skuId" in data_copy and "sku" not in data_copy:
            data_copy["sku"] = data_copy["skuId"]

        # Resolve order if it's an order_number string
        order_val = data_copy.get("order")
        if isinstance(order_val, str) and not order_val.isdigit():
            ord_obj = Order.objects.filter(order_number=order_val).first()
            if ord_obj:
                data_copy["order"] = ord_obj.id

        # Resolve order_item if provided as sku or skuId
        if "order" in data_copy and data_copy.get("order"):
            ord_id = data_copy["order"]
            if "order_item" not in data_copy or not data_copy["order_item"]:
                sku_val = data_copy.get("sku") or data_copy.get("skuId")
                if sku_val:
                    item_obj = OrderItem.objects.filter(order_id=ord_id, sku=sku_val).first()
                    if item_obj:
                        data_copy["order_item"] = item_obj.id

        # Map reason text
        if "reason" in data_copy:
            r = str(data_copy["reason"]).strip()
            choice_keys = [c[0] for c in ReturnRequest.ReturnReason.choices]
            if r.upper() in choice_keys:
                data_copy["reason"] = r.upper()
            else:
                data_copy["notes"] = r
                data_copy["reason"] = ReturnRequest.ReturnReason.OTHER

        return super().to_internal_value(data_copy)

    def get_return_policy(self, obj):
        if obj.order_item and obj.order_item.product:
            return getattr(obj.order_item.product, "return_policy", "RETURNABLE")
        return "RETURNABLE"

    def validate(self, data):
        # On creation, validate order status & returnable constraints
        if self.instance is None:
            order = data.get("order")
            order_item = data.get("order_item")
            qty = data.get("quantity", 1)

            if not order and order_item:
                order = order_item.order
                data["order"] = order

            if not order or not order_item:
                raise serializers.ValidationError("Both order and order_item are required.")

            if order_item.order_id != order.id:
                raise serializers.ValidationError("The selected item does not belong to the specified order.")

            if order.status != Order.OrderStatus.DELIVERED:
                raise serializers.ValidationError(
                    f"Only delivered orders can be returned. Current order status: {order.status}"
                )

            product = order_item.product
            if product and getattr(product, "return_policy", "RETURNABLE") != "RETURNABLE":
                raise serializers.ValidationError(
                    "This product has a NON_RETURNABLE policy."
                )

            # Check quantity limits
            active_returns = order_item.returns.exclude(status=ReturnRequest.ReturnStatus.REJECTED)
            already_returned = sum(r.quantity for r in active_returns)
            remaining = order_item.quantity - already_returned
            if qty > remaining:
                raise serializers.ValidationError(
                    f"Requested return quantity ({qty}) exceeds available returnable quantity ({remaining})."
                )

        return data

    def create(self, validated_data):
        order_item = validated_data.get("order_item")
        qty = validated_data.get("quantity", 1)
        if not validated_data.get("refund_amount") and order_item:
            validated_data["refund_amount"] = order_item.unit_price * qty

        order = validated_data.get("order")
        if order and not validated_data.get("pickup_pincode"):
            validated_data["pickup_pincode"] = order.delivery_pincode
        if order and not validated_data.get("pickup_address"):
            validated_data["pickup_address"] = order.delivery_address

        return super().create(validated_data)

    def update(self, instance, validated_data):
        old_status = instance.status
        new_status = validated_data.get("status", old_status)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Stock ledger synchronization
        if old_status != new_status and instance.order_item:
            product = instance.order_item.product
            qty = instance.quantity

            if product:
                # 1. Physical receipt at warehouse
                if new_status == ReturnRequest.ReturnStatus.RECEIVED and old_status in [
                    ReturnRequest.ReturnStatus.REQUESTED,
                    ReturnRequest.ReturnStatus.PICKUP_SCHEDULED,
                ]:
                    product.returned_quantity += qty
                    product.save()

                # 2. Passed QC -> back to available inventory
                elif new_status == ReturnRequest.ReturnStatus.INSPECTED_PASSED and old_status == ReturnRequest.ReturnStatus.RECEIVED:
                    product.returned_quantity = max(0, product.returned_quantity - qty)
                    product.inventory_quantity += qty
                    product.save()

                # 3. Failed QC -> marked damaged
                elif new_status == ReturnRequest.ReturnStatus.INSPECTED_FAILED and old_status == ReturnRequest.ReturnStatus.RECEIVED:
                    product.returned_quantity = max(0, product.returned_quantity - qty)
                    product.damaged_quantity += qty
                    product.save()

        # Reversal settlement generation on refund
        if new_status == ReturnRequest.ReturnStatus.REFUNDED and old_status != ReturnRequest.ReturnStatus.REFUNDED:
            if not instance.reversal_settlements.exists():
                product = instance.order_item.product if instance.order_item else None
                designer = (product.designer if (product and product.designer) else None)
                if not designer:
                    from designers.models import Designer
                    designer = Designer.objects.first()

                if designer:
                    take_rate = getattr(designer, "take_rate", Decimal("15.00")) or Decimal("15.00")
                    refund_gmv = instance.refund_amount
                    commission_rev = (refund_gmv * take_rate) / Decimal("100")
                    payout_deduction = refund_gmv - commission_rev
                    reason_text = instance.get_reason_display() if hasattr(instance, 'get_reason_display') else instance.reason
                    Settlement.objects.create(
                        order=instance.order,
                        order_item=instance.order_item,
                        designer=designer,
                        return_request=instance,
                        is_reversal=True,
                        gmv=-refund_gmv,
                        take_rate=take_rate,
                        commission_amount=-commission_rev,
                        payout_amount=-payout_deduction,
                        status=Settlement.SettlementStatus.REVERSED,
                        notes=f"Reversal for Return #{instance.return_number} ({reason_text})"
                    )

        return instance


class SettlementSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    brand_name = serializers.CharField(source="designer.brand_name", read_only=True)
    designer_code = serializers.CharField(source="designer.designer_code", read_only=True)
    product_name = serializers.CharField(source="order_item.product_name", read_only=True)
    sku = serializers.CharField(source="order_item.sku", read_only=True)
    quantity = serializers.IntegerField(source="order_item.quantity", read_only=True)
    return_number = serializers.CharField(source="return_request.return_number", read_only=True, default=None)

    class Meta:
        model = Settlement
        fields = [
            "id",
            "settlement_number",
            "order",
            "order_number",
            "order_item",
            "designer",
            "designer_code",
            "brand_name",
            "product_name",
            "sku",
            "quantity",
            "return_request",
            "return_number",
            "is_reversal",
            "gmv",
            "take_rate",
            "commission_amount",
            "tax_amount",
            "payout_amount",
            "status",
            "payout_reference",
            "paid_at",
            "reconciled_at",
            "notes",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "settlement_number",
            "order_number",
            "designer_code",
            "brand_name",
            "product_name",
            "sku",
            "quantity",
            "return_number",
            "created_at",
            "updated_at",
        ]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["orderId"] = instance.order.order_number if instance.order else ""
        data["designerId"] = instance.designer_id
        data["designer"] = (
            instance.designer.brand_name
            if (instance.designer and instance.designer.brand_name)
            else (instance.designer.designer_name if instance.designer else "Independent Studio")
        )
        data["takeRate"] = float(instance.take_rate) if instance.take_rate else 15.0
        data["commission"] = float(instance.commission_amount) if instance.commission_amount else 0.0
        data["net"] = float(instance.payout_amount) if instance.payout_amount else 0.0
        data["gmv"] = float(instance.gmv) if instance.gmv else 0.0
        data["formatted_gmv"] = f"₹{int(instance.gmv):,}" if instance.gmv else "₹0"
        data["formatted_net"] = f"₹{int(instance.payout_amount):,}" if instance.payout_amount else "₹0"
        data["formatted_commission"] = f"₹{int(instance.commission_amount):,}" if instance.commission_amount else "₹0"
        return data


