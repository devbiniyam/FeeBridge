from django.db import models
from fees.models import Invoice
from accounts.models import User
class PaymentChoices(models.TextChoices):
    DIRECT = "DIRECT", "Direct"
    WALLET = "WALLET", "Wallet"
    CHAPA = "CHAPA", "Chapa"
    TELEBIRR = "TELEBIRR", "Telebirr"


class GatewayChoices(models.TextChoices):
    CHAPA = "CHAPA", "Chapa"
    TELEBIRR = "TELEBIRR", "Telebirr"


class GatewayTransactionStatus(models.TextChoices):
    PENDING = "PENDING", "Pending"
    SUCCESS = "SUCCESS", "Success"
    FAILED = "FAILED", "Failed"


class TransactionPurposeChoices(models.TextChoices):
    INVOICE_PAYMENT = "INVOICE_PAYMENT", "Invoice Payment"
    WALLET_DEPOSIT = "WALLET_DEPOSIT", "Wallet Deposit"


class Payment(models.Model):
    invoice = models.ForeignKey(Invoice, on_delete=models.PROTECT, related_name="payments")
    paid_by = models.ForeignKey(User, on_delete=models.PROTECT, related_name="payments")
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    method = models.CharField(max_length=50, choices=PaymentChoices.choices, default=PaymentChoices.DIRECT)
    paid_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.invoice} - {self.paid_by} - {self.amount}"
    

class Receipt(models.Model):
    payment = models.OneToOneField(Payment, on_delete=models.CASCADE, related_name="receipt")
    receipt_number = models.CharField(max_length=50, unique=True)
    issued_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.payment} - {self.receipt_number}"


class GatewayTransaction(models.Model):
    tx_ref = models.CharField(max_length=100, unique=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="gateway_transactions")
    gateway = models.CharField(max_length=20, choices=GatewayChoices.choices, default=GatewayChoices.CHAPA)
    purpose = models.CharField(max_length=30, choices=TransactionPurposeChoices.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(
        max_length=20,
        choices=GatewayTransactionStatus.choices,
        default=GatewayTransactionStatus.PENDING
    )
    related_invoice = models.ForeignKey(
        Invoice,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="gateway_transactions"
    )
    gateway_reference = models.CharField(max_length=100, blank=True, null=True)
    checkout_url = models.URLField(max_length=500, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.gateway} - {self.tx_ref} ({self.purpose}: {self.amount} ETB) - {self.status}"