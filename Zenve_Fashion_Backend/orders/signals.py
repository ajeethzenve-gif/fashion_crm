from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import OrderItem


@receiver(post_save, sender=OrderItem, dispatch_uid="designer_order_email")
def designer_order_email(sender, instance, created, raw=False, **kwargs):
    if created and not raw:
        from designers.emails import queue_order
        transaction.on_commit(lambda order_id=instance.order_id: queue_order(order_id), robust=True)
