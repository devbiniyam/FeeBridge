from django.core.management.base import BaseCommand
from fees.models import Invoice, StatusChoices as InvoiceStatusChoices
from payments.models import PaymentChoices
from payments.services import process_payment


class Command(BaseCommand):
    help = "Attempts to pay unpaid or partially paid invoices automatically using parent wallet balances"

    def handle(self, *args, **kwargs):
        invoices_to_pay = Invoice.objects.filter(
            status__in=[InvoiceStatusChoices.UNPAID, InvoiceStatusChoices.PARTIALLY_PAID]
        ).select_related('student__parent')

        for invoice in invoices_to_pay:
            parent = invoice.student.parent
            wallet = getattr(parent, 'wallet', None)

            if not wallet or wallet.balance <= 0:
                continue

            pay_amount = min(wallet.balance, invoice.balance_remaining)
            if pay_amount <= 0:
                continue

            try:
                process_payment(
                    invoice=invoice,
                    paid_by=parent,
                    amount=pay_amount,
                    method=PaymentChoices.WALLET,
                    wallet=wallet
                )
                self.stdout.write(
                    self.style.SUCCESS(f"Auto-deducted {pay_amount} ETB for {invoice} from wallet")
                )
            except Exception as exc:
                self.stdout.write(self.style.ERROR(f"Failed to auto-pay {invoice}: {exc}"))