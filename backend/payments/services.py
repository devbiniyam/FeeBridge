from decimal import Decimal
from django.db import transaction
from rest_framework.exceptions import ValidationError

from fees.models import StatusChoices as InvoiceStatusChoices
from payments.models import Payment, Receipt, PaymentChoices
from wallets.models import Wallet, WalletTransaction, TransactionChoices


@transaction.atomic
def process_payment(invoice, paid_by, amount, method=PaymentChoices.DIRECT, wallet=None):
    """
    Process an invoice payment atomically.
    Supports full and partial payments, updates invoice balance/status,
    deducts from wallet with row-locking if paying via wallet, and generates a receipt.
    """
    amount = Decimal(str(amount))

    if amount <= Decimal('0.00'):
        raise ValidationError("Payment amount must be greater than zero.")

    if invoice.status == InvoiceStatusChoices.PAID or invoice.balance_remaining <= Decimal('0.00'):
        raise ValidationError("Invoice is already fully paid.")

    if amount > invoice.balance_remaining:
        raise ValidationError(
            f"Payment amount ({amount} ETB) exceeds outstanding balance ({invoice.balance_remaining} ETB)."
        )

    # If paying via wallet, lock the wallet row and deduct
    if method == PaymentChoices.WALLET:
        if wallet is None:
            wallet = getattr(paid_by, 'wallet', None)

        if wallet is None:
            raise ValidationError("No wallet found for this user.")

        # Lock wallet row to prevent double-spending race conditions
        locked_wallet = Wallet.objects.select_for_update().get(id=wallet.id)

        if locked_wallet.balance < amount:
            raise ValidationError(
                f"Insufficient wallet balance ({locked_wallet.balance} ETB < {amount} ETB)."
            )

        locked_wallet.balance -= amount
        locked_wallet.save()

        WalletTransaction.objects.create(
            wallet=locked_wallet,
            transaction_type=TransactionChoices.DEDUCTION,
            amount=amount,
            related_invoice=invoice
        )

    # Create Payment record
    payment = Payment.objects.create(
        invoice=invoice,
        paid_by=paid_by,
        amount=amount,
        method=method
    )

    # Update invoice paid balance and status
    invoice.amount_paid += amount
    if invoice.amount_paid >= invoice.amount:
        invoice.status = InvoiceStatusChoices.PAID
    else:
        invoice.status = InvoiceStatusChoices.PARTIALLY_PAID
    invoice.save()

    # Generate Receipt (which also triggers payment confirmation signal)
    Receipt.objects.create(
        payment=payment,
        receipt_number=f"RCP-{payment.id:06d}"
    )

    return payment


@transaction.atomic
def fulfill_gateway_transaction(gateway_transaction, gateway_reference=None):
    """
    Fulfill a gateway transaction (e.g. from Chapa webhook).
    Ensures idempotency, settles invoice or credits wallet, and updates transaction status to SUCCESS.
    """
    from payments.models import (
        GatewayTransaction,
        GatewayTransactionStatus,
        TransactionPurposeChoices,
        PaymentChoices
    )

    # Lock gateway transaction row
    tx = GatewayTransaction.objects.select_for_update().get(id=gateway_transaction.id)

    # Idempotency check: if already processed, return early
    if tx.status == GatewayTransactionStatus.SUCCESS:
        return tx

    if tx.purpose == TransactionPurposeChoices.INVOICE_PAYMENT:
        if not tx.related_invoice:
            raise ValidationError("Transaction has no associated invoice.")

        process_payment(
            invoice=tx.related_invoice,
            paid_by=tx.user,
            amount=tx.amount,
            method=PaymentChoices.CHAPA
        )

    elif tx.purpose == TransactionPurposeChoices.WALLET_DEPOSIT:
        wallet = getattr(tx.user, 'wallet', None)
        if not wallet:
            raise ValidationError("User does not have a wallet.")

        locked_wallet = Wallet.objects.select_for_update().get(id=wallet.id)
        locked_wallet.balance += tx.amount
        locked_wallet.save()

        WalletTransaction.objects.create(
            wallet=locked_wallet,
            transaction_type=TransactionChoices.DEPOSIT,
            amount=tx.amount
        )

    tx.status = GatewayTransactionStatus.SUCCESS
    if gateway_reference:
        tx.gateway_reference = gateway_reference
    tx.save()

    return tx
