from decimal import Decimal
from django.db import transaction
from rest_framework.exceptions import ValidationError

from fees.models import StatusChoices as InvoiceStatusChoices
from payments.models import Payment, Receipt, PaymentChoices
from wallets.models import Wallet, WalletTransaction, TransactionChoices


@transaction.atomic
def process_payment(invoice, paid_by, amount, method=PaymentChoices.DIRECT, wallet=None, funding_source="", source_account="", reference_number="", installment=None):
    """
    Process an invoice payment atomically.
    Supports full, partial, and installment payments, updates invoice balance/status,
    deducts from wallet with row-locking if paying via wallet, and generates a receipt.
    """
    import uuid
    from django.utils import timezone
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
            related_invoice=invoice,
            funding_source="WALLET",
            source_account=f"Wallet #{locked_wallet.id}",
            reference_number=f"DED-{uuid.uuid4().hex[:8].upper()}"
        )

    if not reference_number:
        prefix = (funding_source or str(method)).upper()
        reference_number = f"{prefix}-{uuid.uuid4().hex[:8].upper()}"

    # Create Payment record
    payment = Payment.objects.create(
        invoice=invoice,
        paid_by=paid_by,
        amount=amount,
        method=method,
        funding_source=funding_source or str(method),
        source_account=source_account,
        reference_number=reference_number
    )

    # Update installment status if applicable
    if installment:
        if installment.invoice_id != invoice.id:
            raise ValidationError("Specified installment does not belong to this invoice.")
        installment.amount_paid += amount
        if installment.amount_paid >= installment.amount:
            installment.status = InvoiceStatusChoices.PAID
            installment.paid_at = timezone.now()
        else:
            installment.status = InvoiceStatusChoices.PARTIALLY_PAID
        installment.save()
    elif invoice.has_installments:
        # Sequentially allocate amount across unpaid installments
        remaining_to_allocate = amount
        for inst in invoice.installments.exclude(status=InvoiceStatusChoices.PAID).order_by('installment_number'):
            if remaining_to_allocate <= Decimal('0.00'):
                break
            can_pay = inst.balance_remaining
            allocation = min(remaining_to_allocate, can_pay)
            inst.amount_paid += allocation
            remaining_to_allocate -= allocation
            if inst.amount_paid >= inst.amount:
                inst.status = InvoiceStatusChoices.PAID
                inst.paid_at = timezone.now()
            else:
                inst.status = InvoiceStatusChoices.PARTIALLY_PAID
            inst.save()

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
def run_auto_pay_settlement_batch(school_id=None):
    """
    Executes automated escrow settlement for all parents with auto_pay_enabled=True.
    Clears due invoices/installments, generates receipts, dispatches notifications,
    and updates overdue invoices.
    """
    import uuid
    from django.utils import timezone
    from fees.models import Invoice, InvoiceInstallment, StatusChoices
    from notifications.models import Notification, NotificationTypeChoices, NotificationStatusChoices

    today = timezone.now().date()
    settled_invoices = []
    low_balance_notices = []

    # 1. Update overdue status for past-due unpaid invoices & installments
    overdue_invoices_qs = Invoice.objects.filter(
        due_date__lt=today,
        status__in=[StatusChoices.UNPAID, StatusChoices.PARTIALLY_PAID]
    )
    if school_id:
        overdue_invoices_qs = overdue_invoices_qs.filter(student__school_id=school_id)
    overdue_invoices_qs.update(status=StatusChoices.OVERDUE)

    InvoiceInstallment.objects.filter(
        due_date__lt=today,
        status__in=[StatusChoices.UNPAID, StatusChoices.PARTIALLY_PAID]
    ).update(status=StatusChoices.OVERDUE)

    # 2. Find eligible parent wallets with auto_pay_enabled=True
    eligible_wallets = Wallet.objects.select_for_update().filter(
        auto_pay_enabled=True,
        parent__role='PARENT'
    ).select_related('parent')

    total_amount_settled = Decimal('0.00')

    for wallet in eligible_wallets:
        parent = wallet.parent

        # Get active pending invoices for parent's children
        pending_invoices = Invoice.objects.filter(
            student__parent=parent,
            status__in=[StatusChoices.UNPAID, StatusChoices.PARTIALLY_PAID, StatusChoices.OVERDUE]
        ).select_related('student', 'student__school').order_by('due_date')

        if school_id:
            pending_invoices = pending_invoices.filter(student__school_id=school_id)

        for inv in pending_invoices:
            # Check if invoice has installments
            unpaid_installments = inv.installments.filter(
                status__in=[StatusChoices.UNPAID, StatusChoices.PARTIALLY_PAID, StatusChoices.OVERDUE]
            ).order_by('installment_number')

            if unpaid_installments.exists():
                for inst in unpaid_installments:
                    due_amt = inst.balance_remaining
                    if due_amt <= Decimal('0.00'):
                        continue
                    if wallet.balance >= due_amt:
                        # Auto-settle this installment
                        ref_code = f"AUTO-{uuid.uuid4().hex[:8].upper()}"
                        pmt = process_payment(
                            invoice=inv,
                            paid_by=parent,
                            amount=due_amt,
                            method=PaymentChoices.WALLET,
                            wallet=wallet,
                            funding_source="WALLET_AUTOPAY",
                            reference_number=ref_code,
                            installment=inst
                        )
                        wallet.refresh_from_db()
                        total_amount_settled += due_amt
                        settled_invoices.append({
                            "invoice_id": inv.id,
                            "student_name": inv.student.full_name,
                            "amount": str(due_amt),
                            "type": "INSTALLMENT",
                            "title": inst.title
                        })
                        # Send confirmation notification
                        Notification.objects.create(
                            recipient=parent,
                            notification_type=NotificationTypeChoices.PAYMENT_CONFIRMATION,
                            message=f"ETB {due_amt:,.2f} was automatically cleared from your escrow wallet for {inv.student.full_name} ({inst.title}).",
                            status=NotificationStatusChoices.SENT,
                            related_invoice=inv
                        )
                    else:
                        # Low balance notice if below threshold
                        Notification.objects.create(
                            recipient=parent,
                            notification_type=NotificationTypeChoices.DUE_REMINDER,
                            message=f"Auto-Pay Pending: Insufficient Balance. Your wallet balance ({wallet.balance:,.2f} ETB) is insufficient to auto-clear {inst.title} ({due_amt:,.2f} ETB) for {inv.student.full_name}. Please top up.",
                            status=NotificationStatusChoices.SENT,
                            related_invoice=inv
                        )
                        low_balance_notices.append({
                            "parent": parent.email,
                            "student": inv.student.full_name,
                            "required": str(due_amt),
                            "available": str(wallet.balance)
                        })
                        break
            else:
                due_amt = inv.balance_remaining
                if due_amt <= Decimal('0.00'):
                    continue
                if wallet.balance >= due_amt:
                    ref_code = f"AUTO-{uuid.uuid4().hex[:8].upper()}"
                    pmt = process_payment(
                        invoice=inv,
                        paid_by=parent,
                        amount=due_amt,
                        method=PaymentChoices.WALLET,
                        wallet=wallet,
                        funding_source="WALLET_AUTOPAY",
                        reference_number=ref_code
                    )
                    wallet.refresh_from_db()
                    total_amount_settled += due_amt
                    month_label = inv.month.strftime("%B %Y") if hasattr(inv.month, 'strftime') else str(inv.month)
                    settled_invoices.append({
                        "invoice_id": inv.id,
                        "student_name": inv.student.full_name,
                        "amount": str(due_amt),
                        "type": "LUMP_SUM",
                        "title": f"Tuition {month_label}"
                    })
                    Notification.objects.create(
                        recipient=parent,
                        notification_type=NotificationTypeChoices.PAYMENT_CONFIRMATION,
                        message=f"ETB {due_amt:,.2f} was automatically cleared from your escrow wallet for {inv.student.full_name} ({month_label}).",
                        status=NotificationStatusChoices.SENT,
                        related_invoice=inv
                    )
                else:
                    Notification.objects.create(
                        recipient=parent,
                        notification_type=NotificationTypeChoices.DUE_REMINDER,
                        message=f"Auto-Pay Pending: Insufficient Balance. Your wallet balance ({wallet.balance:,.2f} ETB) is insufficient to auto-clear tuition ({due_amt:,.2f} ETB) for {inv.student.full_name}. Please top up.",
                        status=NotificationStatusChoices.SENT,
                        related_invoice=inv
                    )
                    low_balance_notices.append({
                        "parent": parent.email,
                        "student": inv.student.full_name,
                        "required": str(due_amt),
                        "available": str(wallet.balance)
                    })

    return {
        "settled_count": len(settled_invoices),
        "total_amount_settled": total_amount_settled,
        "settled_items": settled_invoices,
        "low_balance_count": len(low_balance_notices),
        "low_balance_items": low_balance_notices
    }


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
            amount=tx.amount,
            funding_source="CHAPA",
            source_account=getattr(tx.user, 'phone_number', '') or tx.user.email,
            reference_number=gateway_reference or tx.tx_ref
        )


    tx.status = GatewayTransactionStatus.SUCCESS
    if gateway_reference:
        tx.gateway_reference = gateway_reference
    tx.save()

    return tx
