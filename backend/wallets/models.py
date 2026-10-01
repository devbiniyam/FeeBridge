from decimal import Decimal
from django.db import models
from accounts.models import User
from fees.models import Invoice


class Wallet(models.Model):
    parent = models.OneToOneField(User, on_delete=models.PROTECT, related_name="wallet")
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    auto_pay_enabled = models.BooleanField(default=False)
    low_balance_threshold = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('1000.00'))

    def __str__(self):
        return f"{self.parent} - Balance: {self.balance} ETB (Auto-Pay: {self.auto_pay_enabled})"


class TransactionChoices(models.TextChoices):
    DEPOSIT = "DEPOSIT", "Deposit"
    DEDUCTION = "DEDUCTION", "Deduction"


class WalletTransaction(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.PROTECT, related_name="transactions")
    transaction_type = models.CharField(max_length=20, choices=TransactionChoices.choices)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    related_invoice = models.ForeignKey(Invoice, on_delete=models.SET_NULL, null=True, blank=True, related_name="wallet_transactions")
    funding_source = models.CharField(max_length=50, blank=True, default="DIRECT")
    source_account = models.CharField(max_length=100, blank=True, default="")
    reference_number = models.CharField(max_length=100, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.wallet} - {self.transaction_type} - {self.amount} ETB ({self.funding_source})"