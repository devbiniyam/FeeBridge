from django.db.models.signals import post_save
from django.dispatch import receiver
from payments.models import Receipt
from notifications.services import send_payment_confirmation


@receiver(post_save, sender=Receipt)
def on_receipt_created(sender, instance, created, **kwargs):
    """
    Trigger payment confirmation notification whenever a payment receipt is issued.
    """
    if created:
        send_payment_confirmation(payment=instance.payment, receipt=instance)
