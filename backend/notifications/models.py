from django.db import models
from accounts.models import User


class NotificationTypeChoices(models.TextChoices):
    PAYMENT_CONFIRMATION = "PAYMENT_CONFIRMATION", "Payment Confirmation"
    DUE_REMINDER = "DUE_REMINDER", "Due Reminder"
    OVERDUE_ALERT = "OVERDUE_ALERT", "Overdue Alert"
    GENERAL = "GENERAL", "General"


class NotificationStatusChoices(models.TextChoices):
    PENDING = "PENDING", "Pending"
    SENT = "SENT", "Sent"
    FAILED = "FAILED", "Failed"


class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=30, choices=NotificationTypeChoices.choices)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=NotificationStatusChoices.choices, default=NotificationStatusChoices.PENDING)
    is_read = models.BooleanField(default=False)
    related_invoice = models.ForeignKey(
        'fees.Invoice',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="notifications"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.notification_type} to {self.recipient} ({self.status})"